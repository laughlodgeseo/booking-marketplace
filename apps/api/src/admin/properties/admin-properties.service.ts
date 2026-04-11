import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  ActivationInvoiceStatus,
  BookingStatus,
  LocaleCode,
  NotificationType,
  PaymentProvider,
  PropertyMediaCategory,
  Prisma,
  PropertyDeletionRequestStatus,
  PropertyUnpublishRequestStatus,
  PropertyReviewDecision,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { PROPERTY_IMAGES_DIR } from '../../common/upload/storage-paths';
import { resolvePropertyImageUrl } from '../../common/upload/property-media-storage';
import { AdminCreatePropertyDto } from './dto/admin-create-property.dto';
import { AdminUpdatePropertyDto } from './dto/admin-update-property.dto';
import {
  ReorderMediaDto,
  type PropertyTranslationsInput,
  UpdateMediaCategoryDto,
} from '../../vendor/vendor-properties.dto';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import {
  appendReviewHistoryEntry,
  computePropertyChanges,
  findLastReviewAnchor,
  parseReviewHistory,
  toJsonSnapshot,
} from '../../common/property-review-history';

type ReviewDto = {
  notes?: string;
  note?: string;
  reason?: string;
  checklistJson?: string;
};

@Injectable()
export class AdminPropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // -------------------------
  // Shared slug helpers (copy of vendor behavior)
  // -------------------------

  private slugify(input: string): string {
    const slug = input
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug.length > 180 ? slug.slice(0, 180).replace(/-+$/g, '') : slug;
  }

  private isSlugUniqueViolation(err: unknown): boolean {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (err.code !== 'P2002') return false;

    const target = (err.meta as { target?: unknown } | undefined)?.target;
    if (Array.isArray(target)) return target.includes('slug');
    return false;
  }

  private async generateUniqueSlug(base: string): Promise<string> {
    const b = base.trim();
    if (!b) {
      throw new BadRequestException('Invalid title/slug for slug generation.');
    }

    const existing = await this.prisma.property.findUnique({
      where: { slug: b },
      select: { id: true },
    });
    if (!existing) return b;

    for (let i = 2; i <= 50; i++) {
      const candidate = `${b}-${i}`.slice(0, 180).replace(/-+$/g, '');
      const exists = await this.prisma.property.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }

    throw new BadRequestException(
      'Could not generate a unique slug. Try a different title.',
    );
  }

  private async mustFindProperty(propertyId: string) {
    const prop = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { documents: true, media: true },
    });
    if (!prop) throw new NotFoundException('Property not found.');
    return prop;
  }

  private async mustFindPropertyTx(
    tx: Prisma.TransactionClient,
    propertyId: string,
  ) {
    const prop = await tx.property.findUnique({
      where: { id: propertyId },
    });
    if (!prop) throw new NotFoundException('Property not found.');
    return prop;
  }

  private reviewNote(dto: ReviewDto): string | null {
    const note = dto.notes ?? dto.note ?? dto.reason;
    return typeof note === 'string' && note.trim().length > 0
      ? note.trim()
      : null;
  }

  private async buildReviewSnapshot(
    db: PrismaService | Prisma.TransactionClient,
    propertyId: string,
  ): Promise<Prisma.InputJsonValue> {
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        slug: true,
        propertyType: true,
        description: true,
        city: true,
        area: true,
        address: true,
        lat: true,
        lng: true,
        maxGuests: true,
        bedrooms: true,
        bathrooms: true,
        basePrice: true,
        cleaningFee: true,
        currency: true,
        minNights: true,
        maxNights: true,
        checkInFromMin: true,
        checkInToMax: true,
        checkOutMin: true,
        isInstantBook: true,
        status: true,
        media: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            url: true,
            alt: true,
            sortOrder: true,
            category: true,
          },
        },
        documents: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            type: true,
            url: true,
            storageKey: true,
            originalName: true,
            mimeType: true,
          },
        },
        amenities: {
          orderBy: [{ amenityId: 'asc' }],
          select: {
            amenityId: true,
          },
        },
        translations: {
          orderBy: [{ locale: 'asc' }],
          select: {
            locale: true,
            title: true,
            description: true,
            areaLabel: true,
            tagline: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found.');
    }

    return toJsonSnapshot(property);
  }

  private async readinessIssuesAfterMediaDelete(
    propertyId: string,
    mediaId: string,
  ): Promise<string[]> {
    const remainingMedia = await this.prisma.media.findMany({
      where: { propertyId, id: { not: mediaId } },
      select: { category: true },
    });

    const issues: string[] = [];
    if (remainingMedia.length < 4) {
      issues.push('Listing must keep at least 4 photos.');
    }

    const requiredCategories: PropertyMediaCategory[] = [
      PropertyMediaCategory.LIVING_ROOM,
      PropertyMediaCategory.BEDROOM,
      PropertyMediaCategory.BATHROOM,
      PropertyMediaCategory.KITCHEN,
    ];

    const present = new Set(remainingMedia.map((item) => item.category));
    const missing = requiredCategories.filter(
      (category) => !present.has(category),
    );
    if (missing.length > 0) {
      issues.push(`Missing required photo categories: ${missing.join(', ')}`);
    }

    return issues;
  }

  private activationDepositAmountMinor(): number {
    const raw = Number(process.env.ACTIVATION_DEPOSIT_AMOUNT_MINOR || '25000');
    if (!Number.isFinite(raw) || raw < 0) return 25000;
    return Math.trunc(raw);
  }

  private activationDepositCurrency(): string {
    const v = (process.env.ACTIVATION_DEPOSIT_CURRENCY || 'AED').trim();
    return v.length > 0 ? v : 'AED';
  }

  private normalizeTranslationString(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const value = input.trim();
    return value.length > 0 ? value : null;
  }

  private async upsertPropertyTranslations(
    propertyId: string,
    translations: PropertyTranslationsInput | undefined,
    fallback: {
      title: string;
      description: string | null;
      areaLabel: string | null;
    },
  ): Promise<void> {
    const ops: Array<Promise<unknown>> = [];

    ops.push(
      this.prisma.propertyTranslation.upsert({
        where: {
          propertyId_locale: {
            propertyId,
            locale: LocaleCode.en,
          },
        },
        update: {
          title: fallback.title,
          description: fallback.description,
          areaLabel: fallback.areaLabel,
        },
        create: {
          propertyId,
          locale: LocaleCode.en,
          title: fallback.title,
          description: fallback.description,
          areaLabel: fallback.areaLabel,
        },
      }),
    );

    const ar = translations?.ar;
    if (ar) {
      const title = this.normalizeTranslationString(ar.title);
      if (title) {
        ops.push(
          this.prisma.propertyTranslation.upsert({
            where: {
              propertyId_locale: {
                propertyId,
                locale: LocaleCode.ar,
              },
            },
            update: {
              title,
              description:
                this.normalizeTranslationString(ar.description) ?? null,
              areaLabel: this.normalizeTranslationString(ar.areaLabel) ?? null,
              tagline: this.normalizeTranslationString(ar.tagline) ?? null,
            },
            create: {
              propertyId,
              locale: LocaleCode.ar,
              title,
              description:
                this.normalizeTranslationString(ar.description) ?? null,
              areaLabel: this.normalizeTranslationString(ar.areaLabel) ?? null,
              tagline: this.normalizeTranslationString(ar.tagline) ?? null,
            },
          }),
        );
      }
    }

    await Promise.all(ops);
  }

  async getOneByAdmin(propertyId: string) {
    const item = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        translations: true,
        media: { orderBy: { sortOrder: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        amenities: {
          include: {
            amenity: {
              include: { group: true },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Property not found.');
    return item;
  }

  async listAmenitiesCatalog() {
    const amenities = await this.prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: [{ groupId: 'asc' }, { name: 'asc' }],
      include: { group: true },
    });

    const grouped = new Map<
      string,
      {
        group: { id: string; name: string } | null;
        amenities: Array<{
          id: string;
          key: string;
          name: string;
          icon: string | null;
          groupId: string | null;
        }>;
      }
    >();

    for (const amenity of amenities) {
      const key = amenity.group ? amenity.group.id : '__none__';
      const payload = {
        id: amenity.id,
        key: amenity.key,
        name: amenity.name,
        icon: amenity.icon ?? null,
        groupId: amenity.groupId ?? null,
      };

      const existing = grouped.get(key);
      if (existing) existing.amenities.push(payload);
      else {
        grouped.set(key, {
          group: amenity.group
            ? { id: amenity.group.id, name: amenity.group.name }
            : null,
          amenities: [payload],
        });
      }
    }

    const amenitiesGrouped = Array.from(grouped.values()).sort((a, b) => {
      const left = a.group?.name ?? 'Other';
      const right = b.group?.name ?? 'Other';
      return left.localeCompare(right);
    });

    return { amenitiesGrouped };
  }

  async setAmenitiesByAdmin(
    _adminId: string,
    propertyId: string,
    amenityIds: string[],
  ) {
    await this.mustFindProperty(propertyId);

    const uniqueIds = Array.from(
      new Set(
        (amenityIds ?? []).map((id) => String(id).trim()).filter(Boolean),
      ),
    );

    const existing = await this.prisma.amenity.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    if (existing.length !== uniqueIds.length) {
      throw new BadRequestException('One or more amenities are invalid.');
    }

    await this.prisma.$transaction([
      this.prisma.propertyAmenity.deleteMany({ where: { propertyId } }),
      ...(uniqueIds.length > 0
        ? [
            this.prisma.propertyAmenity.createMany({
              data: uniqueIds.map((amenityId) => ({ propertyId, amenityId })),
            }),
          ]
        : []),
    ]);

    return this.getOneByAdmin(propertyId);
  }

  // -------------------------
  // Admin Listing Management (NEW)
  // -------------------------

  async createByAdmin(adminId: string, dto: AdminCreatePropertyDto) {
    // Vendor assignment: explicit vendorId or default to adminId (still a valid FK)
    const vendorId = dto.vendorId ?? adminId;

    // Validate vendorId exists (and if it’s not adminId, it should be a real user)
    const vendorUser = await this.prisma.user.findUnique({
      where: { id: vendorId },
      select: { id: true, role: true },
    });
    if (!vendorUser) {
      throw new BadRequestException('vendorId is invalid.');
    }

    const rawBase = dto.slug?.trim() ? dto.slug : dto.title;
    const baseSlug = this.slugify(rawBase);
    const safeBase = baseSlug && baseSlug.length > 0 ? baseSlug : 'property';
    let slug = await this.generateUniqueSlug(safeBase);

    const publishNow = dto.publishNow === true;

    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        const created = await this.prisma.property.create({
          data: {
            vendorId,
            createdByAdminId: adminId,
            title: dto.title.trim(),
            slug,
            propertyType: dto.propertyType,
            description: dto.description?.trim() || null,
            city: dto.city.trim(),
            area: dto.area?.trim() || null,
            address: dto.address?.trim() || null,
            lat: dto.lat ?? null,
            lng: dto.lng ?? null,
            maxGuests: dto.maxGuests ?? 2,
            bedrooms: dto.bedrooms ?? 1,
            bathrooms: dto.bathrooms ?? 1,
            basePrice: dto.basePrice,
            cleaningFee: dto.cleaningFee ?? 0,
            currency: dto.currency ?? 'AED',
            minNights: dto.minNights ?? 1,
            maxNights: dto.maxNights ?? null,
            checkInFromMin: dto.checkInFromMin ?? null,
            checkInToMax: dto.checkInToMax ?? null,
            checkOutMin: dto.checkOutMin ?? null,
            isInstantBook: dto.isInstantBook ?? false,

            // ✅ Admin is its own approval:
            status: publishNow
              ? PropertyStatus.PUBLISHED
              : PropertyStatus.APPROVED,
          },
          include: {
            media: { orderBy: { sortOrder: 'asc' } },
            documents: { orderBy: { createdAt: 'desc' } },
          },
        });

        await this.upsertPropertyTranslations(created.id, dto.translations, {
          title: created.title,
          description: created.description ?? null,
          areaLabel: created.area ?? null,
        });

        return this.getOneByAdmin(created.id);
      } catch (err) {
        if (!this.isSlugUniqueViolation(err)) throw err;

        if (attempt <= 6) {
          slug = await this.generateUniqueSlug(safeBase);
        } else {
          const rand = Math.random().toString(36).slice(2, 6);
          slug = `${safeBase}-${Date.now()}-${rand}`
            .slice(0, 180)
            .replace(/-+$/g, '');
        }
      }
    }

    throw new BadRequestException(
      'Could not create property due to slug conflicts. Please retry.',
    );
  }

  async updateByAdmin(
    adminId: string,
    propertyId: string,
    dto: AdminUpdatePropertyDto,
  ) {
    const existing = await this.mustFindProperty(propertyId);

    let slug: string | undefined;
    if (dto.slug?.trim()) {
      const base = this.slugify(dto.slug);
      const existing = await this.prisma.property.findUnique({
        where: { slug: base },
        select: { id: true },
      });
      slug =
        existing && existing.id !== propertyId
          ? await this.generateUniqueSlug(base)
          : base;
    }

    if (
      typeof dto.vendorId === 'string' &&
      dto.vendorId.trim().length > 0 &&
      dto.vendorId !== existing.vendorId
    ) {
      throw new BadRequestException(
        'Property ownership cannot be changed from admin edit.',
      );
    }

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        vendorId: undefined,
        // keep createdByAdminId as original creator; we don't overwrite here
        title: dto.title?.trim(),
        slug,
        propertyType: dto.propertyType,
        description: dto.description?.trim(),
        city: dto.city?.trim(),
        area: dto.area?.trim(),
        address: dto.address?.trim(),
        lat: dto.lat,
        lng: dto.lng,
        maxGuests: dto.maxGuests,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        basePrice: dto.basePrice,
        cleaningFee: dto.cleaningFee,
        currency: dto.currency,
        minNights: dto.minNights,
        maxNights: dto.maxNights,
        checkInFromMin: dto.checkInFromMin,
        checkInToMax: dto.checkInToMax,
        checkOutMin: dto.checkOutMin,
        isInstantBook: dto.isInstantBook,
        lastEditedAt: new Date(),
      },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });

    await this.upsertPropertyTranslations(propertyId, dto.translations, {
      title: updated.title,
      description: updated.description ?? null,
      areaLabel: updated.area ?? null,
    });

    return this.getOneByAdmin(propertyId);
  }

  async publishByAdmin(adminId: string, propertyId: string) {
    const prop = await this.mustFindProperty(propertyId);

    // Admin can publish from most states except SUSPENDED
    if (prop.status === PropertyStatus.SUSPENDED) {
      throw new BadRequestException('Property is suspended.');
    }

    if (
      prop.status === PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT &&
      !prop.createdByAdminId
    ) {
      throw new BadRequestException(
        'Activation payment is required before publishing this vendor listing.',
      );
    }

    if (prop.lat == null || prop.lng == null) {
      throw new BadRequestException(
        'Property must have a map location (lat/lng) before publishing.',
      );
    }

    return this.prisma.property.update({
      where: { id: propertyId },
      data: { status: PropertyStatus.PUBLISHED },
    });
  }

  async unpublishByAdmin(adminId: string, propertyId: string) {
    const prop = await this.mustFindProperty(propertyId);

    if (prop.status !== PropertyStatus.PUBLISHED) {
      throw new BadRequestException('Property is not published.');
    }

    // For admin: go back to APPROVED (admin-approved state), not DRAFT
    return this.prisma.property.update({
      where: { id: propertyId },
      data: { status: PropertyStatus.APPROVED },
    });
  }

  async addMediaByAdmin(
    adminId: string,
    propertyId: string,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File upload failed.');
    await this.mustFindProperty(propertyId);
    let mediaUrl: string;
    try {
      mediaUrl = await resolvePropertyImageUrl({
        file,
        propertyId,
        scope: 'admin',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown media upload error';
      throw new BadRequestException(`Media upload failed: ${message}`);
    }

    const last = await this.prisma.media.findFirst({
      where: { propertyId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.media.create({
      data: {
        propertyId,
        url: mediaUrl,
        sortOrder: last ? last.sortOrder + 1 : 0,
        category: 'OTHER',
      },
    });
  }

  /**
   * Persist a Cloudinary URL that the browser uploaded directly.
   * Used by POST :id/media/register — no file handling on the server.
   */
  async addMediaByUrlAdmin(adminId: string, propertyId: string, url: string) {
    const trimmed = (url ?? '').trim();
    if (!trimmed) throw new BadRequestException('url is required.');

    await this.mustFindProperty(propertyId);

    const last = await this.prisma.media.findFirst({
      where: { propertyId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.media.create({
      data: {
        propertyId,
        url: trimmed,
        sortOrder: last ? last.sortOrder + 1 : 0,
        category: 'OTHER',
      },
    });
  }

  async updateMediaCategoryByAdmin(
    adminId: string,
    propertyId: string,
    mediaId: string,
    dto: UpdateMediaCategoryDto,
  ) {
    await this.mustFindProperty(propertyId);

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });
    if (!media || media.propertyId !== propertyId) {
      throw new NotFoundException('Media not found.');
    }

    return this.prisma.media.update({
      where: { id: mediaId },
      data: { category: dto.category },
    });
  }

  async reorderMediaByAdmin(
    adminId: string,
    propertyId: string,
    dto: ReorderMediaDto,
  ) {
    await this.mustFindProperty(propertyId);

    await this.prisma.$transaction(
      dto.orderedMediaIds.map((id, index) =>
        this.prisma.media.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.prisma.media.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async deleteMediaByAdmin(
    _adminId: string,
    propertyId: string,
    mediaId: string,
    overrideReadiness = false,
  ) {
    await this.mustFindProperty(propertyId);

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { status: true },
    });
    if (!property) throw new NotFoundException('Property not found.');

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });
    if (!media || media.propertyId !== propertyId) {
      throw new NotFoundException('Media not found.');
    }

    if (
      !overrideReadiness &&
      (property.status === PropertyStatus.PUBLISHED ||
        property.status === PropertyStatus.UNDER_REVIEW)
    ) {
      const issues = await this.readinessIssuesAfterMediaDelete(
        propertyId,
        mediaId,
      );
      if (issues.length > 0) {
        throw new BadRequestException(
          `Cannot delete media while property is ${property.status}. ${issues.join(
            ' ',
          )}`,
        );
      }
    }

    await this.prisma.media.delete({ where: { id: mediaId } });

    const remaining = await this.prisma.media.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });

    await this.prisma.$transaction(
      remaining.map((row, index) =>
        this.prisma.media.update({
          where: { id: row.id },
          data: { sortOrder: index },
        }),
      ),
    );

    const filename = media.url.split('/').pop();
    if (filename) {
      const absolute = join(PROPERTY_IMAGES_DIR, filename);
      if (existsSync(absolute)) {
        try {
          unlinkSync(absolute);
        } catch {
          // best-effort cleanup
        }
      }
    }

    return this.prisma.media.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listDeletionRequests(params?: {
    status?: PropertyDeletionRequestStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params?.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const where = params?.status ? { status: params.status } : {};

    const [total, items] = await this.prisma.$transaction([
      this.prisma.propertyDeletionRequest.count({ where }),
      this.prisma.propertyDeletionRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          property: {
            select: { id: true, title: true, city: true, status: true },
          },
          requestedByVendor: {
            select: { id: true, email: true, fullName: true },
          },
          reviewedByAdmin: {
            select: { id: true, email: true, fullName: true },
          },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items,
    };
  }

  async listUnpublishRequests(params?: {
    status?: PropertyUnpublishRequestStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params?.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const where = params?.status ? { status: params.status } : {};

    const [total, items] = await this.prisma.$transaction([
      this.prisma.propertyUnpublishRequest.count({ where }),
      this.prisma.propertyUnpublishRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          property: {
            select: { id: true, title: true, city: true, status: true },
          },
          requestedByVendor: {
            select: { id: true, email: true, fullName: true },
          },
          reviewedByAdmin: {
            select: { id: true, email: true, fullName: true },
          },
        },
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async approveDeletionRequest(
    adminId: string,
    requestId: string,
    notes?: string,
  ) {
    const request = await this.prisma.propertyDeletionRequest.findUnique({
      where: { id: requestId },
      include: {
        property: {
          select: { id: true },
        },
      },
    });

    if (!request) throw new NotFoundException('Deletion request not found.');
    if (request.status !== PropertyDeletionRequestStatus.PENDING) {
      throw new BadRequestException('Deletion request is not pending.');
    }

    if (request.propertyId) {
      const activeBookings = await this.prisma.booking.count({
        where: {
          propertyId: request.propertyId,
          status: {
            in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
          },
        },
      });

      if (activeBookings > 0) {
        throw new BadRequestException(
          'Cannot archive property with active bookings. Resolve stays first.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (request.propertyId) {
        await tx.property.update({
          where: { id: request.propertyId },
          data: { status: PropertyStatus.ARCHIVED },
        });
      }

      return tx.propertyDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: PropertyDeletionRequestStatus.APPROVED,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          adminNotes: notes?.trim() || null,
        },
      });
    });
  }

  async rejectDeletionRequest(
    adminId: string,
    requestId: string,
    notes?: string,
  ) {
    const request = await this.prisma.propertyDeletionRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true },
    });

    if (!request) throw new NotFoundException('Deletion request not found.');
    if (request.status !== PropertyDeletionRequestStatus.PENDING) {
      throw new BadRequestException('Deletion request is not pending.');
    }

    return this.prisma.propertyDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: PropertyDeletionRequestStatus.REJECTED,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        adminNotes: notes?.trim() || null,
      },
    });
  }

  async approveUnpublishRequest(
    adminId: string,
    requestId: string,
    notes?: string,
  ) {
    const request = await this.prisma.propertyUnpublishRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        propertyId: true,
      },
    });

    if (!request) throw new NotFoundException('Unpublish request not found.');
    if (request.status !== PropertyUnpublishRequestStatus.PENDING) {
      throw new BadRequestException('Unpublish request is not pending.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (request.propertyId) {
        await tx.property.update({
          where: { id: request.propertyId },
          data: { status: PropertyStatus.APPROVED },
        });
      }

      return tx.propertyUnpublishRequest.update({
        where: { id: requestId },
        data: {
          status: PropertyUnpublishRequestStatus.APPROVED,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          adminNotes: notes?.trim() || null,
        },
      });
    });
  }

  async rejectUnpublishRequest(
    adminId: string,
    requestId: string,
    notes?: string,
  ) {
    const request = await this.prisma.propertyUnpublishRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true },
    });

    if (!request) throw new NotFoundException('Unpublish request not found.');
    if (request.status !== PropertyUnpublishRequestStatus.PENDING) {
      throw new BadRequestException('Unpublish request is not pending.');
    }

    return this.prisma.propertyUnpublishRequest.update({
      where: { id: requestId },
      data: {
        status: PropertyUnpublishRequestStatus.REJECTED,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        adminNotes: notes?.trim() || null,
      },
    });
  }

  async deleteAdminOwnedPropertyNow(adminId: string, propertyId: string) {
    await this.mustFindProperty(propertyId);

    const activeBookings = await this.prisma.booking.count({
      where: {
        propertyId,
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
        },
      },
    });

    if (activeBookings > 0) {
      throw new BadRequestException(
        'Cannot archive property with active bookings. Resolve stays first.',
      );
    }

    await this.prisma.property.update({
      where: { id: propertyId },
      data: { status: PropertyStatus.ARCHIVED },
    });
    return { ok: true, id: propertyId, archivedBy: adminId };
  }

  // -------------------------
  // Existing review workflow
  // -------------------------

  async reviewQueue(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const normalized =
      typeof params?.status === 'string' && params.status.trim().length > 0
        ? params.status.trim().toUpperCase()
        : 'UNDER_REVIEW';

    const page =
      typeof params?.page === 'number' && params.page > 0
        ? Math.floor(params.page)
        : 1;
    const pageSize =
      typeof params?.pageSize === 'number' && params.pageSize > 0
        ? Math.min(100, Math.floor(params.pageSize))
        : 20;

    const allowed = new Set([
      'UNDER_REVIEW',
      'CHANGES_REQUESTED',
      'REJECTED',
      'APPROVED',
      'APPROVED_PENDING_ACTIVATION_PAYMENT',
      'DRAFT',
      'PUBLISHED',
      'SUSPENDED',
      'ARCHIVED',
    ]);

    if (!allowed.has(normalized)) {
      throw new BadRequestException('Invalid status filter for review-queue.');
    }

    const where = { status: normalized as PropertyStatus };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          media: { orderBy: { sortOrder: 'asc' } },
          documents: { orderBy: { createdAt: 'desc' } },
          vendor: { select: { id: true, email: true, fullName: true } },
          reviews: { orderBy: { createdAt: 'desc' }, take: 3 },
        },
      }),
    ]);

    return {
      status: normalized,
      page,
      pageSize,
      total,
      items,
    };
  }

  async approve(adminId: string, propertyId: string, dto: ReviewDto) {
    const note = this.reviewNote(dto);
    const result = await this.prisma.$transaction(async (tx) => {
      const prop = await this.mustFindPropertyTx(tx, propertyId);

      if (prop.status !== PropertyStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Cannot approve property from status: ${prop.status}`,
        );
      }

      if (
        prop.lastReviewedAt &&
        prop.lastEditedAt &&
        prop.lastEditedAt > prop.lastReviewedAt &&
        (!prop.lastSubmittedAt || prop.lastEditedAt > prop.lastSubmittedAt)
      ) {
        throw new BadRequestException(
          'Property has been modified after review.',
        );
      }

      const requiresActivation = !prop.createdByAdminId;
      const nextStatus = requiresActivation
        ? PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT
        : PropertyStatus.APPROVED;
      const snapshot = await this.buildReviewSnapshot(tx, propertyId);
      const now = new Date();

      const updated = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: nextStatus,
          lastReviewedAt: now,
          reviewHistory: appendReviewHistoryEntry(prop.reviewHistory, {
            action: 'APPROVED',
            note,
            adminId,
            createdAt: now,
            snapshot,
          }),
        },
      });

      await tx.propertyReview.create({
        data: {
          propertyId,
          adminId,
          decision: PropertyReviewDecision.APPROVE,
          notes: note,
          checklistJson: dto.checklistJson ?? null,
        },
      });

      if (requiresActivation) {
        const existingInvoice = await tx.propertyActivationInvoice.findFirst({
          where: {
            propertyId,
            vendorId: prop.vendorId,
            status: {
              in: [
                ActivationInvoiceStatus.PENDING,
                ActivationInvoiceStatus.PROCESSING,
              ],
            },
          },
          orderBy: [{ createdAt: 'desc' }],
          select: { id: true },
        });

        if (!existingInvoice) {
          await tx.propertyActivationInvoice.create({
            data: {
              propertyId,
              vendorId: prop.vendorId,
              amount: this.activationDepositAmountMinor(),
              currency: this.activationDepositCurrency(),
              status: ActivationInvoiceStatus.PENDING,
              provider: PaymentProvider.MANUAL,
            },
          });
        }
      }

      return { ok: true, item: updated, requiresActivation };
    });

    if (result.requiresActivation) {
      await this.notifications.emit({
        type: NotificationType.PROPERTY_APPROVED_ACTIVATION_REQUIRED,
        entityType: 'property',
        entityId: propertyId,
        recipientUserId: result.item.vendorId,
        payload: {
          propertyId,
          title: result.item.title,
          status: result.item.status,
          activationAmount: this.activationDepositAmountMinor(),
          currency: this.activationDepositCurrency(),
          actionUrl: `/vendor/properties/${propertyId}/activation`,
        },
      });
    }

    return { ok: result.ok, item: result.item };
  }

  async requestChanges(adminId: string, propertyId: string, dto: ReviewDto) {
    const note = this.reviewNote(dto);
    return this.prisma.$transaction(async (tx) => {
      const prop = await this.mustFindPropertyTx(tx, propertyId);

      if (prop.status !== PropertyStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Cannot request changes from status: ${prop.status}`,
        );
      }

      const snapshot = await this.buildReviewSnapshot(tx, propertyId);
      const now = new Date();
      const updated = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.CHANGES_REQUESTED,
          lastReviewedAt: now,
          reviewHistory: appendReviewHistoryEntry(prop.reviewHistory, {
            action: 'CHANGES_REQUESTED',
            note,
            adminId,
            createdAt: now,
            snapshot,
          }),
        },
      });

      await tx.propertyReview.create({
        data: {
          propertyId,
          adminId,
          decision: PropertyReviewDecision.REQUEST_CHANGES,
          notes: note,
          checklistJson: dto.checklistJson ?? null,
        },
      });

      return { ok: true, item: updated };
    });
  }

  async reject(adminId: string, propertyId: string, dto: ReviewDto) {
    const note = this.reviewNote(dto);
    return this.prisma.$transaction(async (tx) => {
      const prop = await this.mustFindPropertyTx(tx, propertyId);

      if (prop.status !== PropertyStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Cannot reject property from status: ${prop.status}`,
        );
      }

      const snapshot = await this.buildReviewSnapshot(tx, propertyId);
      const now = new Date();
      const updated = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.REJECTED,
          lastReviewedAt: now,
          reviewHistory: appendReviewHistoryEntry(prop.reviewHistory, {
            action: 'REJECTED',
            note,
            adminId,
            createdAt: now,
            snapshot,
          }),
        },
      });

      await tx.propertyReview.create({
        data: {
          propertyId,
          adminId,
          decision: PropertyReviewDecision.REJECT,
          notes: note,
          checklistJson: dto.checklistJson ?? null,
        },
      });

      return { ok: true, item: updated };
    });
  }

  async getChanges(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        status: true,
        reviewHistory: true,
        lastSubmittedAt: true,
        lastReviewedAt: true,
        lastEditedAt: true,
      },
    });
    if (!property) throw new NotFoundException('Property not found.');

    const currentSnapshot = await this.buildReviewSnapshot(this.prisma, propertyId);
    const reviewHistory = parseReviewHistory(property.reviewHistory);
    const lastReview = findLastReviewAnchor(reviewHistory);
    const changes = lastReview
      ? computePropertyChanges(lastReview.snapshot, currentSnapshot)
      : [];

    return {
      propertyId: property.id,
      status: property.status,
      baseline: lastReview
        ? {
            action: lastReview.action,
            createdAt: lastReview.createdAt,
          }
        : null,
      changes,
      reviewHistory,
      lastSubmittedAt: property.lastSubmittedAt?.toISOString() ?? null,
      lastReviewedAt: property.lastReviewedAt?.toISOString() ?? null,
      lastEditedAt: property.lastEditedAt?.toISOString() ?? null,
    };
  }
}
