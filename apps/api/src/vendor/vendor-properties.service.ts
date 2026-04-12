import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import {
  ActivationInvoiceStatus,
  LocaleCode,
  PaymentProvider,
  Prisma,
  PropertyActivationPaymentStatus,
  PropertyDeletionRequestStatus,
  PropertyUnpublishRequestStatus,
  PropertyMediaCategory,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import {
  PROPERTY_DOCUMENTS_DIR,
  PROPERTY_DOCUMENTS_LEGACY_DIR,
  PROPERTY_IMAGES_DIR,
} from '../common/upload/storage-paths';
import { resolvePropertyImageUrl } from '../common/upload/property-media-storage';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  ReorderMediaDto,
  UpdateMediaCategoryDto,
  UploadPropertyDocumentDto,
  type PropertyTranslationsInput,
} from './vendor-properties.dto';
import { UpdatePropertyLocationDto } from './dto/update-property-location.dto';
import { PROPERTY_DOCUMENT_REQUIREMENTS } from '../modules/properties/property-document-requirements';
import { ActivationPaymentService } from '../modules/payments/activation-payment.service';
import cloudinary from '../infra/cloudinary/cloudinary.service';
import {
  appendReviewHistoryEntry,
  computePropertyChanges,
  findLastReviewAnchor,
  parseReviewHistory,
  toJsonSnapshot,
} from '../common/property-review-history';

@Injectable()
export class VendorPropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activationPayments: ActivationPaymentService,
  ) {}

  /* ---------------------------------------------
   * Utilities
   * --------------------------------------------- */

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

  private async assertOwnership(vendorUserId: string, propertyId: string) {
    const prop = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { media: true },
    });

    if (!prop) throw new NotFoundException('Property not found.');
    if (prop.vendorId !== vendorUserId) {
      throw new ForbiddenException('Not your property.');
    }

    return prop;
  }

  private normalizeOptionalString(input?: string | null) {
    const v = input?.trim();
    return v ? v : null;
  }

  private isCloudinaryDocumentUrl(url: string | null | undefined): boolean {
    return typeof url === 'string' && url.trim().includes('res.cloudinary.com');
  }

  private async destroyCloudinaryDocument(
    publicId: string | null | undefined,
  ): Promise<void> {
    const id = typeof publicId === 'string' ? publicId.trim() : '';
    if (!id) return;

    try {
      await cloudinary.uploader.destroy(id, {
        resource_type: 'auto' as unknown as 'image',
      });
    } catch {
      // Best-effort cleanup only.
    }
  }

  private cleanupLegacyDocumentFile(
    storageKey: string | null | undefined,
  ): void {
    const key = typeof storageKey === 'string' ? storageKey.trim() : '';
    if (!key) return;

    const privatePath = join(PROPERTY_DOCUMENTS_DIR, key);
    const legacyPath = join(PROPERTY_DOCUMENTS_LEGACY_DIR, key);

    for (const target of [privatePath, legacyPath]) {
      if (!existsSync(target)) continue;
      try {
        unlinkSync(target);
      } catch {
        // Best-effort cleanup only.
      }
    }
  }

  private async ensureActivationFeeCurrencyAed(params: {
    propertyId: string;
    currency: string | null | undefined;
  }): Promise<'AED'> {
    const normalized =
      typeof params.currency === 'string'
        ? params.currency.trim().toUpperCase()
        : '';
    if (normalized === 'AED') return 'AED';

    await this.prisma.property.update({
      where: { id: params.propertyId },
      data: { activationFeeCurrency: 'AED' },
    });
    return 'AED';
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
    const upserts: Array<Promise<unknown>> = [];

    // Always keep EN in sync with canonical property fields.
    upserts.push(
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

    const arInput = translations?.ar;
    if (arInput) {
      const title = this.normalizeTranslationString(arInput.title);
      if (title) {
        upserts.push(
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
                this.normalizeTranslationString(arInput.description) ?? null,
              areaLabel:
                this.normalizeTranslationString(arInput.areaLabel) ?? null,
              tagline: this.normalizeTranslationString(arInput.tagline) ?? null,
            },
            create: {
              propertyId,
              locale: LocaleCode.ar,
              title,
              description:
                this.normalizeTranslationString(arInput.description) ?? null,
              areaLabel:
                this.normalizeTranslationString(arInput.areaLabel) ?? null,
              tagline: this.normalizeTranslationString(arInput.tagline) ?? null,
            },
          }),
        );
      }
    }

    await Promise.all(upserts);
  }

  private ensureCoords(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Invalid coordinates.');
    }
    if (lat < -90 || lat > 90)
      throw new BadRequestException('Invalid latitude.');
    if (lng < -180 || lng > 180)
      throw new BadRequestException('Invalid longitude.');
  }

  private shouldResetToDraftOnVendorEdit(status: PropertyStatus): boolean {
    // ✅ Production-safety rule:
    // Any meaningful change to an approved/reviewed/published listing must re-enter workflow.
    return (
      status === PropertyStatus.APPROVED ||
      status === PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT ||
      status === PropertyStatus.UNDER_REVIEW ||
      status === PropertyStatus.PUBLISHED
    );
  }

  private async applyVendorEditState(
    propertyId: string,
    currentStatus: PropertyStatus,
  ): Promise<void> {
    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        lastEditedAt: new Date(),
        status: this.shouldResetToDraftOnVendorEdit(currentStatus)
          ? PropertyStatus.DRAFT
          : undefined,
      },
    });
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

  private async ensureReadyForSubmission(
    propertyId: string,
    prop: {
      lat: number | null;
      lng: number | null;
    },
  ): Promise<void> {
    const [media, docs] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where: { propertyId },
        select: { id: true, category: true },
      }),
      this.prisma.propertyDocument.findMany({
        where: { propertyId },
        select: { id: true, type: true },
      }),
    ]);

    const missingLines: string[] = [];

    if (prop.lat == null || prop.lng == null) {
      missingLines.push(
        `- Set the property location on the map (lat/lng required).`,
      );
    }

    if (media.length < 4) {
      missingLines.push(
        `- Upload at least 4 photos (currently ${media.length}).`,
      );
    }

    const requiredCategories: PropertyMediaCategory[] = [
      PropertyMediaCategory.LIVING_ROOM,
      PropertyMediaCategory.BEDROOM,
      PropertyMediaCategory.BATHROOM,
      PropertyMediaCategory.KITCHEN,
    ];

    const present = new Set<PropertyMediaCategory>();
    for (const m of media) {
      if (m.category && requiredCategories.includes(m.category)) {
        present.add(m.category);
      }
    }

    const missingCategories = requiredCategories.filter((c) => !present.has(c));
    if (missingCategories.length > 0) {
      missingLines.push(
        `- Tag photos with categories (missing: ${missingCategories.join(', ')}).`,
      );
    }

    const docTypes = new Set(docs.map((d) => d.type));
    const missingRequiredDocs = PROPERTY_DOCUMENT_REQUIREMENTS.filter(
      (requirement) => requirement.required && !docTypes.has(requirement.id),
    );
    if (missingRequiredDocs.length > 0) {
      missingLines.push(
        `- Upload required documents: ${missingRequiredDocs
          .map((item) => item.label)
          .join(', ')}.`,
      );
    }

    if (missingLines.length > 0) {
      throw new BadRequestException(
        `Cannot submit for review. Please complete:\n${missingLines.join('\n')}`,
      );
    }
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

  /* ---------------------------------------------
   * Queries
   * --------------------------------------------- */

  async listMine(vendorUserId: string) {
    const items = await this.prisma.property.findMany({
      where: { vendorId: vendorUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        translations: true,
        media: { orderBy: { sortOrder: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });

    return { items };
  }

  async getOne(vendorUserId: string, propertyId: string) {
    await this.assertOwnership(vendorUserId, propertyId);

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        translations: true,
        media: { orderBy: { sortOrder: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        amenities: { include: { amenity: true } },
        location: true,
      },
    });

    if (!property) return null;

    const activationFeeCurrency = await this.ensureActivationFeeCurrencyAed({
      propertyId,
      currency: property.activationFeeCurrency,
    });

    return {
      ...property,
      activationFeeCurrency,
    };
  }

  /* ---------------------------------------------
   * Amenities (Batch V3)
   * --------------------------------------------- */

  async listAmenitiesCatalog() {
    const amenities = await this.prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: [{ groupId: 'asc' }, { name: 'asc' }],
      include: { group: true },
    });

    const groupsMap = new Map<
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

    for (const a of amenities) {
      const key = a.group ? a.group.id : '__none__';

      const item = {
        id: a.id,
        key: a.key,
        name: a.name,
        icon: a.icon ?? null,
        groupId: a.groupId ?? null,
      };

      const existing = groupsMap.get(key);
      if (existing) existing.amenities.push(item);
      else {
        groupsMap.set(key, {
          group: a.group ? { id: a.group.id, name: a.group.name } : null,
          amenities: [item],
        });
      }
    }

    const amenitiesGrouped = Array.from(groupsMap.values()).sort((x, y) => {
      const ax = x.group?.name ?? 'Other';
      const by = y.group?.name ?? 'Other';
      return ax.localeCompare(by);
    });

    return { amenitiesGrouped };
  }

  async getAmenitiesForProperty(vendorUserId: string, propertyId: string) {
    await this.assertOwnership(vendorUserId, propertyId);

    const rows = await this.prisma.propertyAmenity.findMany({
      where: { propertyId },
      select: { amenityId: true },
    });

    return { amenityIds: rows.map((r) => r.amenityId) };
  }

  async setAmenities(
    vendorUserId: string,
    propertyId: string,
    amenityIds: string[],
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    const ids = Array.from(
      new Set((amenityIds ?? []).map((x) => String(x).trim()).filter(Boolean)),
    );

    const found = await this.prisma.amenity.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (found.length !== ids.length) {
      throw new BadRequestException('One or more amenities are invalid.');
    }

    await this.prisma.$transaction([
      this.prisma.propertyAmenity.deleteMany({ where: { propertyId } }),
      ...(ids.length > 0
        ? [
            this.prisma.propertyAmenity.createMany({
              data: ids.map((amenityId) => ({ propertyId, amenityId })),
            }),
          ]
        : []),
    ]);

    await this.applyVendorEditState(propertyId, prop.status);

    return this.getOne(vendorUserId, propertyId);
  }

  /* ---------------------------------------------
   * Create / Update
   * --------------------------------------------- */

  async create(vendorUserId: string, dto: CreatePropertyDto) {
    const rawBase = dto.slug?.trim() ? dto.slug : dto.title;
    const baseSlug = this.slugify(rawBase);

    // Edge-case: title like "----" becomes empty slug
    const safeBase = baseSlug && baseSlug.length > 0 ? baseSlug : 'property';

    // Generate candidate slug (nice UX), but still race-safe below
    let slug = await this.generateUniqueSlug(safeBase);

    // ✅ Concurrency-safe create:
    // Even after checking, slug can still collide under concurrent creates.
    // Retry on P2002 (slug) with a new unique slug.
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        const created = await this.prisma.property.create({
          data: {
            vendorId: vendorUserId,
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
            status: PropertyStatus.DRAFT,
          },
        });

        await this.upsertPropertyTranslations(created.id, dto.translations, {
          title: created.title,
          description: created.description ?? null,
          areaLabel: created.area ?? null,
        });

        return this.getOne(vendorUserId, created.id);
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

  async update(
    vendorUserId: string,
    propertyId: string,
    dto: UpdatePropertyDto,
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    let slug: string | undefined;
    if (dto.slug?.trim()) {
      const base = this.slugify(dto.slug);
      const existing = await this.prisma.property.findUnique({
        where: { slug: base },
      });
      slug =
        existing && existing.id !== propertyId
          ? await this.generateUniqueSlug(base)
          : base;
    }

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        title: dto.title?.trim(),
        slug,
        propertyType: dto.propertyType,
        description: dto.description?.trim(),
        city: dto.city?.trim(),
        area: dto.area?.trim(),
        address: dto.address?.trim(),
        lat: dto.lat,
        lng: dto.lng,
        locationId: dto.locationId,
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
    });

    await this.upsertPropertyTranslations(propertyId, dto.translations, {
      title: updated.title,
      description: updated.description ?? null,
      areaLabel: updated.area ?? null,
    });

    await this.applyVendorEditState(propertyId, prop.status);
    return this.getOne(vendorUserId, propertyId);
  }

  /**
   * ✅ Portal-driven location update (Google Maps pin → backend)
   * Production safety: if listing is PUBLISHED/APPROVED/UNDER_REVIEW, location change forces DRAFT.
   */
  async updateLocation(
    vendorUserId: string,
    propertyId: string,
    dto: UpdatePropertyLocationDto,
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    if (prop.status === PropertyStatus.SUSPENDED) {
      throw new BadRequestException(
        'Property is suspended. Contact support to update location.',
      );
    }
    if (prop.status === PropertyStatus.REJECTED) {
      throw new BadRequestException(
        'Property is rejected. Contact support or create a new listing.',
      );
    }

    const city = dto.city.trim();
    if (!city) throw new BadRequestException('city is required.');

    this.ensureCoords(dto.lat, dto.lng);

    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        city,
        area: this.normalizeOptionalString(dto.area),
        address: this.normalizeOptionalString(dto.address),
        lat: dto.lat,
        lng: dto.lng,
        lastEditedAt: new Date(),
      },
    });

    await this.applyVendorEditState(propertyId, prop.status);
    return this.prisma.property.findUnique({ where: { id: propertyId } });
  }

  /* ---------------------------------------------
   * Review workflow
   * --------------------------------------------- */

  async submitForReview(vendorUserId: string, propertyId: string) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    if (prop.status === PropertyStatus.CHANGES_REQUESTED) {
      return this.resubmitForReview(vendorUserId, propertyId);
    }

    if (prop.status !== PropertyStatus.DRAFT) {
      throw new BadRequestException(
        'Property must be in DRAFT to submit for review.',
      );
    }

    await this.ensureReadyForSubmission(propertyId, prop);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.property.findUnique({
        where: { id: propertyId },
        select: { reviewHistory: true },
      });
      if (!current) throw new NotFoundException('Property not found.');

      const snapshot = await this.buildReviewSnapshot(tx, propertyId);
      await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.UNDER_REVIEW,
          lastSubmittedAt: now,
          reviewHistory: appendReviewHistoryEntry(current.reviewHistory, {
            action: 'SUBMITTED',
            createdAt: now,
            snapshot,
          }),
        },
      });
    });

    return this.getOne(vendorUserId, propertyId);
  }

  async resubmitForReview(vendorUserId: string, propertyId: string) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    if (prop.status !== PropertyStatus.CHANGES_REQUESTED) {
      throw new BadRequestException(
        'Only properties with requested changes can be resubmitted.',
      );
    }

    await this.ensureReadyForSubmission(propertyId, prop);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.property.findUnique({
        where: { id: propertyId },
        select: { reviewHistory: true },
      });
      if (!current) throw new NotFoundException('Property not found.');

      const snapshot = await this.buildReviewSnapshot(tx, propertyId);
      await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.UNDER_REVIEW,
          lastSubmittedAt: now,
          reviewHistory: appendReviewHistoryEntry(current.reviewHistory, {
            action: 'RESUBMITTED',
            createdAt: now,
            snapshot,
          }),
        },
      });
    });

    return this.getOne(vendorUserId, propertyId);
  }

  async getChanges(vendorUserId: string, propertyId: string) {
    await this.assertOwnership(vendorUserId, propertyId);

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

    const currentSnapshot = await this.buildReviewSnapshot(
      this.prisma,
      propertyId,
    );
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

  private serializeActivationInvoice(
    invoice: {
      id: string;
      propertyId: string;
      vendorId: string;
      amount: number;
      currency: string;
      status: ActivationInvoiceStatus;
      provider: PaymentProvider;
      providerRef: string | null;
      stripePaymentIntentId: string | null;
      lastError: string | null;
      createdAt: Date;
      paidAt: Date | null;
      updatedAt: Date;
    } | null,
  ) {
    if (!invoice) return null;
    return {
      ...invoice,
      createdAt: invoice.createdAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() ?? null,
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  async getActivationStatus(vendorUserId: string, propertyId: string) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);
    const activationFeeCurrency = await this.ensureActivationFeeCurrencyAed({
      propertyId,
      currency: prop.activationFeeCurrency,
    });
    const latest = await this.prisma.propertyActivationInvoice.findFirst({
      where: {
        propertyId,
        vendorId: vendorUserId,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return {
      propertyId: prop.id,
      propertyStatus: prop.status,
      activationFee: prop.activationFee ?? null,
      activationFeeCurrency,
      activationPaymentStatus: prop.activationPaymentStatus,
      activationRequired:
        prop.status === PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT,
      invoice: this.serializeActivationInvoice(latest),
    };
  }

  async createActivationInvoice(
    vendorUserId: string,
    propertyId: string,
    input?: { provider?: PaymentProvider; providerRef?: string | null },
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);
    const activationFeeCurrency = await this.ensureActivationFeeCurrencyAed({
      propertyId: prop.id,
      currency: prop.activationFeeCurrency,
    });

    if (prop.status !== PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT) {
      throw new BadRequestException(
        `Activation payment is not required in status ${prop.status}.`,
      );
    }

    const activationFee = prop.activationFee;
    if (
      activationFee == null ||
      !Number.isInteger(activationFee) ||
      activationFee <= 0
    ) {
      throw new BadRequestException(
        'Activation fee is not configured. Ask admin to approve with a valid activation fee.',
      );
    }

    const ensured = await this.activationPayments.ensurePendingInvoice({
      propertyId: prop.id,
      vendorId: vendorUserId,
      amount: activationFee,
      currency: activationFeeCurrency,
    });

    const provider = input?.provider ?? PaymentProvider.STRIPE;
    const invoice =
      provider === PaymentProvider.STRIPE
        ? ensured
        : await this.prisma.propertyActivationInvoice.update({
            where: { id: ensured.id },
            data: {
              provider,
              providerRef: input?.providerRef?.trim() || null,
            },
          });

    return {
      propertyId: prop.id,
      propertyStatus: prop.status,
      invoice: this.serializeActivationInvoice(invoice),
    };
  }

  async payActivation(
    vendorUserId: string,
    propertyId: string,
    input?: { idempotencyKey?: string | null },
  ) {
    const property = await this.assertOwnership(vendorUserId, propertyId);
    await this.ensureActivationFeeCurrencyAed({
      propertyId: property.id,
      currency: property.activationFeeCurrency,
    });
    const payment =
      await this.activationPayments.createOrReuseStripePaymentIntent({
        propertyId,
        vendorId: vendorUserId,
        idempotencyKey: input?.idempotencyKey,
      });

    return {
      ...payment,
      amount: property.activationFee ?? payment.invoice.amount,
      currency: 'AED',
    };
  }

  async confirmActivationManual(
    vendorUserId: string,
    propertyId: string,
    input?: { invoiceId?: string; providerRef?: string | null },
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    if (prop.status !== PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT) {
      throw new BadRequestException(
        `Activation payment is not required in status ${prop.status}.`,
      );
    }

    const targetInvoice = input?.invoiceId
      ? await this.prisma.propertyActivationInvoice.findFirst({
          where: {
            id: input.invoiceId,
            propertyId,
            vendorId: vendorUserId,
          },
        })
      : await this.prisma.propertyActivationInvoice.findFirst({
          where: {
            propertyId,
            vendorId: vendorUserId,
            status: {
              in: [
                ActivationInvoiceStatus.PENDING,
                ActivationInvoiceStatus.PROCESSING,
              ],
            },
          },
          orderBy: [{ createdAt: 'desc' }],
        });

    if (!targetInvoice) {
      throw new NotFoundException('Activation invoice not found.');
    }

    if (targetInvoice.status === ActivationInvoiceStatus.PAID) {
      const latestProperty = await this.prisma.property.findUnique({
        where: { id: prop.id },
        select: { status: true },
      });
      return {
        ok: true,
        invoice: this.serializeActivationInvoice(targetInvoice),
        propertyStatus: latestProperty?.status ?? prop.status,
      };
    }

    const paidAt = new Date();
    const { invoice, property } = await this.prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.propertyActivationInvoice.update({
        where: { id: targetInvoice.id },
        data: {
          status: ActivationInvoiceStatus.PAID,
          providerRef: input?.providerRef?.trim() || targetInvoice.providerRef,
          paidAt,
        },
      });

      const updatedProperty = await tx.property.update({
        where: { id: prop.id },
        data: {
          status: PropertyStatus.PUBLISHED,
          activationPaymentStatus: PropertyActivationPaymentStatus.PAID,
        },
        select: { status: true },
      });

      return { invoice: updatedInvoice, property: updatedProperty };
    });

    return {
      ok: true,
      invoice: this.serializeActivationInvoice(invoice),
      propertyStatus: property.status,
    };
  }

  async publish(vendorUserId: string, propertyId: string) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    if (
      prop.status === PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT &&
      prop.activationPaymentStatus !== PropertyActivationPaymentStatus.PAID
    ) {
      throw new BadRequestException(
        'Activation payment is required before publishing.',
      );
    }

    if (
      prop.status !== PropertyStatus.APPROVED &&
      prop.status !== PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT
    ) {
      throw new BadRequestException(
        'Property must be approved before publishing.',
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

  async unpublish(vendorUserId: string, propertyId: string) {
    return this.requestUnpublish(vendorUserId, propertyId);
  }

  async getUnpublishRequest(vendorUserId: string, propertyId: string) {
    await this.assertOwnership(vendorUserId, propertyId);

    return this.prisma.propertyUnpublishRequest.findFirst({
      where: { propertyId, requestedByVendorId: vendorUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestUnpublish(
    vendorUserId: string,
    propertyId: string,
    reason?: string,
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    if (prop.status !== PropertyStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only published properties can request unpublish.',
      );
    }

    const existingPending =
      await this.prisma.propertyUnpublishRequest.findFirst({
        where: {
          propertyId,
          requestedByVendorId: vendorUserId,
          status: PropertyUnpublishRequestStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
      });

    if (existingPending) return existingPending;

    return this.prisma.propertyUnpublishRequest.create({
      data: {
        propertyId,
        propertyTitleSnapshot: prop.title,
        propertyCitySnapshot: prop.city,
        requestedByVendorId: vendorUserId,
        reason: reason?.trim() || null,
        status: PropertyUnpublishRequestStatus.PENDING,
      },
    });
  }

  async getDeletionRequest(vendorUserId: string, propertyId: string) {
    await this.assertOwnership(vendorUserId, propertyId);

    return this.prisma.propertyDeletionRequest.findFirst({
      where: { propertyId, requestedByVendorId: vendorUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestDeletion(
    vendorUserId: string,
    propertyId: string,
    reason?: string,
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    const existingPending = await this.prisma.propertyDeletionRequest.findFirst(
      {
        where: {
          propertyId,
          requestedByVendorId: vendorUserId,
          status: PropertyDeletionRequestStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
      },
    );

    if (existingPending) return existingPending;

    return this.prisma.propertyDeletionRequest.create({
      data: {
        propertyId,
        propertyTitleSnapshot: prop.title,
        propertyCitySnapshot: prop.city,
        requestedByVendorId: vendorUserId,
        reason: reason?.trim() || null,
        status: PropertyDeletionRequestStatus.PENDING,
      },
    });
  }

  /* ---------------------------------------------
   * Media
   * --------------------------------------------- */

  async addMedia(
    vendorUserId: string,
    propertyId: string,
    file: Express.Multer.File,
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);
    let mediaUrl: string;
    try {
      mediaUrl = await resolvePropertyImageUrl({
        file,
        propertyId,
        scope: 'vendor',
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

    const created = await this.prisma.media.create({
      data: {
        propertyId,
        url: mediaUrl,
        sortOrder: last ? last.sortOrder + 1 : 0,
        category: PropertyMediaCategory.OTHER,
      },
    });

    await this.applyVendorEditState(propertyId, prop.status);

    return created;
  }

  /**
   * Persist a Cloudinary URL the browser uploaded directly.
   * Used by POST :id/media/register — no file handling on the server.
   */
  async addMediaByUrl(vendorUserId: string, propertyId: string, url: string) {
    const trimmed = (url ?? '').trim();
    if (!trimmed) throw new BadRequestException('url is required.');

    const prop = await this.assertOwnership(vendorUserId, propertyId);

    const last = await this.prisma.media.findFirst({
      where: { propertyId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const created = await this.prisma.media.create({
      data: {
        propertyId,
        url: trimmed,
        sortOrder: last ? last.sortOrder + 1 : 0,
        category: PropertyMediaCategory.OTHER,
      },
    });

    await this.applyVendorEditState(propertyId, prop.status);

    return created;
  }

  async updateMediaCategory(
    vendorUserId: string,
    propertyId: string,
    mediaId: string,
    dto: UpdateMediaCategoryDto,
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });
    if (!media || media.propertyId !== propertyId) {
      throw new NotFoundException('Media not found.');
    }

    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: { category: dto.category },
    });

    await this.applyVendorEditState(propertyId, prop.status);

    return updated;
  }

  async reorderMedia(
    vendorUserId: string,
    propertyId: string,
    dto: ReorderMediaDto,
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    await this.prisma.$transaction(
      dto.orderedMediaIds.map((id, index) =>
        this.prisma.media.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.applyVendorEditState(propertyId, prop.status);

    return this.prisma.media.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async deleteMedia(vendorUserId: string, propertyId: string, mediaId: string) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });
    if (!media || media.propertyId !== propertyId) {
      throw new NotFoundException('Media not found.');
    }

    if (
      prop.status === PropertyStatus.PUBLISHED ||
      prop.status === PropertyStatus.UNDER_REVIEW
    ) {
      const issues = await this.readinessIssuesAfterMediaDelete(
        propertyId,
        mediaId,
      );
      if (issues.length > 0) {
        throw new BadRequestException(
          `Cannot delete media while property is ${prop.status}. ${issues.join(
            ' ',
          )}`,
        );
      }
    }

    await this.prisma.media.delete({ where: { id: mediaId } });

    const remaining = await this.prisma.media.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, sortOrder: true },
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
          // ignore best-effort cleanup failures
        }
      }
    }

    await this.applyVendorEditState(propertyId, prop.status);

    return this.prisma.media.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /* ---------------------------------------------
   * Documents
   * --------------------------------------------- */

  async addDocument(
    vendorUserId: string,
    propertyId: string,
    dto: UploadPropertyDocumentDto,
    file: Express.Multer.File,
  ) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);
    const existingDocumentPublicId =
      typeof (prop as { documentPublicId?: unknown }).documentPublicId ===
      'string'
        ? ((prop as { documentPublicId?: string | null }).documentPublicId ??
          null)
        : null;

    const uploadedUrl =
      typeof (file as { path?: unknown }).path === 'string'
        ? (file as { path: string }).path
        : null;
    const publicId =
      typeof (file as { filename?: unknown }).filename === 'string'
        ? (file as { filename: string }).filename
        : null;

    if (!uploadedUrl || !publicId) {
      throw new BadRequestException(
        'Document upload failed: Cloudinary URL/public_id missing.',
      );
    }

    const doc = await this.prisma.propertyDocument.create({
      data: {
        propertyId,
        type: dto.type,
        uploadedByUserId: vendorUserId,
        storageKey: publicId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        url: uploadedUrl,
      },
    });

    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        documentUrl: uploadedUrl,
        documentPublicId: publicId,
        documentStatus: 'pending',
        documentRejectionReason: null,
      },
    });

    if (
      typeof existingDocumentPublicId === 'string' &&
      existingDocumentPublicId.trim().length > 0 &&
      existingDocumentPublicId !== publicId
    ) {
      await this.destroyCloudinaryDocument(existingDocumentPublicId);
    }

    const replacedDocs = await this.prisma.propertyDocument.findMany({
      where: {
        propertyId,
        type: dto.type,
        id: { not: doc.id },
      },
      select: {
        id: true,
        storageKey: true,
        url: true,
      },
    });

    if (replacedDocs.length > 0) {
      await this.prisma.propertyDocument.deleteMany({
        where: { id: { in: replacedDocs.map((item) => item.id) } },
      });

      for (const replaced of replacedDocs) {
        if (this.isCloudinaryDocumentUrl(replaced.url)) {
          await this.destroyCloudinaryDocument(replaced.storageKey);
          continue;
        }
        this.cleanupLegacyDocumentFile(replaced.storageKey);
      }
    }

    await this.applyVendorEditState(propertyId, prop.status);

    return doc;
  }

  async getDocumentDownload(params: {
    actorUserId: string;
    actorRole: 'VENDOR' | 'ADMIN';
    propertyId: string;
    documentId: string;
  }) {
    const { actorUserId, actorRole, propertyId, documentId } = params;

    if (actorRole === 'VENDOR') {
      await this.assertOwnership(actorUserId, propertyId);
    }

    const doc = await this.prisma.propertyDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.propertyId !== propertyId) {
      throw new NotFoundException('Document not found.');
    }

    const storageKey =
      doc.storageKey ?? (doc.url ? doc.url.split('/').pop() : null);

    if (!storageKey) {
      throw new NotFoundException('Document file is missing.');
    }

    const privatePath = join(PROPERTY_DOCUMENTS_DIR, storageKey);
    const legacyPath = join(PROPERTY_DOCUMENTS_LEGACY_DIR, storageKey);

    const absolutePath = existsSync(privatePath)
      ? privatePath
      : existsSync(legacyPath)
        ? legacyPath
        : null;

    if (!absolutePath) {
      throw new NotFoundException('Document file not found on disk.');
    }

    return {
      doc,
      absolutePath,
      downloadName: doc.originalName ?? storageKey,
      mimeType: doc.mimeType ?? 'application/octet-stream',
    };
  }
}
