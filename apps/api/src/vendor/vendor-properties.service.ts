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
  PropertyDeletionRequestStatus,
  PropertyUnpublishRequestStatus,
  PropertyDocumentType,
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

@Injectable()
export class VendorPropertiesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        translations: true,
        media: { orderBy: { sortOrder: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        amenities: { include: { amenity: true } },
        location: true,
      },
    });
  }

  /* ---------------------------------------------
   * Amenities (Batch V3)
   * --------------------------------------------- */

  async listAmenitiesCatalog() {
    const amenities = await this.prisma.amenity.findMany({
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

    if (this.shouldResetToDraftOnVendorEdit(prop.status)) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });
    }

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
      },
    });

    await this.upsertPropertyTranslations(propertyId, dto.translations, {
      title: updated.title,
      description: updated.description ?? null,
      areaLabel: updated.area ?? null,
    });

    if (this.shouldResetToDraftOnVendorEdit(prop.status)) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });
      return this.getOne(vendorUserId, propertyId);
    }

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

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        city,
        area: this.normalizeOptionalString(dto.area),
        address: this.normalizeOptionalString(dto.address),
        lat: dto.lat,
        lng: dto.lng,
      },
    });

    if (this.shouldResetToDraftOnVendorEdit(prop.status)) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });
      return this.prisma.property.findUnique({ where: { id: propertyId } });
    }

    return updated;
  }

  /* ---------------------------------------------
   * Review workflow
   * --------------------------------------------- */

  async submitForReview(vendorUserId: string, propertyId: string) {
    const prop = await this.assertOwnership(vendorUserId, propertyId);

    if (
      prop.status !== PropertyStatus.DRAFT &&
      prop.status !== PropertyStatus.CHANGES_REQUESTED
    ) {
      throw new BadRequestException(
        'Property must be in DRAFT or CHANGES_REQUESTED to submit for review.',
      );
    }

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

    const hasOwnershipProof = docs.some(
      (d) => d.type === PropertyDocumentType.OWNERSHIP_PROOF,
    );
    if (!hasOwnershipProof) {
      missingLines.push(`- Upload document: OWNERSHIP_PROOF.`);
    }

    const hasOwnerId = docs.some(
      (d) => d.type === PropertyDocumentType.OWNER_ID,
    );
    if (!hasOwnerId) {
      missingLines.push(`- Upload document: OWNER_ID.`);
    }

    const hasAuthorizationProof = docs.some(
      (d) => d.type === PropertyDocumentType.AUTHORIZATION_PROOF,
    );
    if (!hasAuthorizationProof) {
      missingLines.push(`- Upload document: AUTHORIZATION_PROOF.`);
    }

    if (missingLines.length > 0) {
      throw new BadRequestException(
        `Cannot submit for review. Please complete:\n${missingLines.join('\n')}`,
      );
    }

    return this.prisma.property.update({
      where: { id: propertyId },
      data: { status: PropertyStatus.UNDER_REVIEW },
    });
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

    if (prop.status !== PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT) {
      throw new BadRequestException(
        `Activation payment is not required in status ${prop.status}.`,
      );
    }

    const existing = await this.prisma.propertyActivationInvoice.findFirst({
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

    if (existing) {
      return {
        propertyId: prop.id,
        propertyStatus: prop.status,
        invoice: this.serializeActivationInvoice(existing),
      };
    }

    const created = await this.prisma.propertyActivationInvoice.create({
      data: {
        propertyId: prop.id,
        vendorId: vendorUserId,
        amount: this.activationDepositAmountMinor(),
        currency: this.activationDepositCurrency(),
        provider: input?.provider ?? PaymentProvider.MANUAL,
        providerRef: input?.providerRef?.trim() || null,
        status: ActivationInvoiceStatus.PENDING,
      },
    });

    return {
      propertyId: prop.id,
      propertyStatus: prop.status,
      invoice: this.serializeActivationInvoice(created),
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
      return {
        ok: true,
        invoice: this.serializeActivationInvoice(targetInvoice),
        propertyStatus: PropertyStatus.APPROVED,
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
        data: { status: PropertyStatus.APPROVED },
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

    if (prop.status === PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT) {
      throw new BadRequestException(
        'Activation payment is required before publishing.',
      );
    }

    if (prop.status !== PropertyStatus.APPROVED) {
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
    await this.assertOwnership(vendorUserId, propertyId);
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

    const prop = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (prop && this.shouldResetToDraftOnVendorEdit(prop.status)) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });
    }

    return created;
  }

  /**
   * Persist a Cloudinary URL the browser uploaded directly.
   * Used by POST :id/media/register — no file handling on the server.
   */
  async addMediaByUrl(
    vendorUserId: string,
    propertyId: string,
    url: string,
  ) {
    const trimmed = (url ?? '').trim();
    if (!trimmed) throw new BadRequestException('url is required.');

    await this.assertOwnership(vendorUserId, propertyId);

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

    const prop = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (prop && this.shouldResetToDraftOnVendorEdit(prop.status)) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });
    }

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

    if (this.shouldResetToDraftOnVendorEdit(prop.status)) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });
    }

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

    if (this.shouldResetToDraftOnVendorEdit(prop.status)) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });
    }

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

    if (this.shouldResetToDraftOnVendorEdit(prop.status)) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });
    }

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

    const created = await this.prisma.propertyDocument.create({
      data: {
        propertyId,
        type: dto.type,
        uploadedByUserId: vendorUserId,
        storageKey: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        url: null,
      },
    });

    const url = `/api/vendor/properties/${propertyId}/documents/${created.id}/download`;
    const doc = await this.prisma.propertyDocument.update({
      where: { id: created.id },
      data: { url },
    });

    if (this.shouldResetToDraftOnVendorEdit(prop.status)) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });
    }

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
