import {
  BookingStatus,
  NotificationType,
  OpsTaskType,
  PrismaClient,
  PropertyDocumentType,
  PropertyStatus,
  RefundStatus,
  UserRole,
} from '@prisma/client';

type DemoVerificationInput = {
  adminEmail: string;
  vendorEmails: string[];
  customerEmails: string[];
  propertySlugPrefix: string;
  bookingWindowStart: Date;
  bookingWindowEnd: Date;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[demo-verify] ${message}`);
  }
}

function withinWindow(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

export async function verifyDemoSeed(
  prisma: PrismaClient,
  input: DemoVerificationInput,
) {
  const {
    adminEmail,
    vendorEmails,
    customerEmails,
    propertySlugPrefix,
    bookingWindowStart,
    bookingWindowEnd,
  } = input;

  const [adminCount, vendorCount, customerCount] = await Promise.all([
    prisma.user.count({
      where: {
        email: adminEmail,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.count({
      where: {
        email: { in: vendorEmails },
        role: UserRole.VENDOR,
      },
    }),
    prisma.user.count({
      where: {
        email: { in: customerEmails },
        role: UserRole.CUSTOMER,
      },
    }),
  ]);

  assert(adminCount === 1, `Expected 1 admin, got ${adminCount}.`);
  assert(vendorCount === 4, `Expected 4 vendors, got ${vendorCount}.`);
  assert(customerCount === 7, `Expected 7 customers, got ${customerCount}.`);

  const [
    totalProperties,
    publishedPropertiesCount,
    draftPropertiesCount,
    underReviewPropertiesCount,
    rejectedPropertiesCount,
  ] = await Promise.all([
    prisma.property.count({
      where: {
        slug: { startsWith: propertySlugPrefix },
      },
    }),
    prisma.property.count({
      where: {
        slug: { startsWith: propertySlugPrefix },
        status: PropertyStatus.PUBLISHED,
      },
    }),
    prisma.property.count({
      where: {
        slug: { startsWith: propertySlugPrefix },
        status: PropertyStatus.DRAFT,
      },
    }),
    prisma.property.count({
      where: {
        slug: { startsWith: propertySlugPrefix },
        status: PropertyStatus.UNDER_REVIEW,
      },
    }),
    prisma.property.count({
      where: {
        slug: { startsWith: propertySlugPrefix },
        status: PropertyStatus.REJECTED,
      },
    }),
  ]);

  assert(totalProperties === 15, `Expected 15 properties, got ${totalProperties}.`);
  assert(
    publishedPropertiesCount === 10,
    `Expected 10 published properties, got ${publishedPropertiesCount}.`,
  );
  assert(draftPropertiesCount === 2, `Expected 2 drafts, got ${draftPropertiesCount}.`);
  assert(
    underReviewPropertiesCount === 2,
    `Expected 2 under review, got ${underReviewPropertiesCount}.`,
  );
  assert(
    rejectedPropertiesCount === 1,
    `Expected 1 rejected property, got ${rejectedPropertiesCount}.`,
  );

  const publishedMedia = await prisma.property.findMany({
    where: {
      slug: { startsWith: propertySlugPrefix },
      status: PropertyStatus.PUBLISHED,
    },
    select: {
      id: true,
      title: true,
      _count: { select: { media: true } },
    },
  });

  for (const property of publishedMedia) {
    assert(
      property._count.media >= 10,
      `Published property ${property.title} has ${property._count.media} images (<10).`,
    );
  }

  const docRequiredProperties = await prisma.property.findMany({
    where: {
      slug: { startsWith: propertySlugPrefix },
      status: {
        in: [
          PropertyStatus.PUBLISHED,
          PropertyStatus.UNDER_REVIEW,
          PropertyStatus.REJECTED,
        ],
      },
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  const ownershipDocs = await prisma.propertyDocument.findMany({
    where: {
      type: PropertyDocumentType.OWNERSHIP_PROOF,
      property: {
        slug: { startsWith: propertySlugPrefix },
      },
    },
    select: {
      propertyId: true,
    },
  });

  const ownershipDocCountByProperty = new Map<string, number>();
  for (const doc of ownershipDocs) {
    ownershipDocCountByProperty.set(
      doc.propertyId,
      (ownershipDocCountByProperty.get(doc.propertyId) ?? 0) + 1,
    );
  }

  for (const property of docRequiredProperties) {
    const docCount = ownershipDocCountByProperty.get(property.id) ?? 0;
    assert(
      docCount >= 1,
      `Property ${property.title} (${property.status}) is missing ownership proof.`,
    );
  }

  const demoBookings = await prisma.booking.findMany({
    where: {
      property: {
        slug: { startsWith: propertySlugPrefix },
      },
    },
    select: {
      id: true,
      propertyId: true,
      customerId: true,
      status: true,
      checkIn: true,
      checkOut: true,
      property: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
    orderBy: [{ propertyId: 'asc' }, { checkIn: 'asc' }],
  });

  assert(
    demoBookings.length >= 8 && demoBookings.length <= 10,
    `Expected 8-10 bookings, got ${demoBookings.length}.`,
  );

  for (const booking of demoBookings) {
    assert(
      withinWindow(booking.checkIn, bookingWindowStart, bookingWindowEnd),
      `Booking ${booking.id} check-in outside window.`,
    );
    assert(
      withinWindow(booking.checkOut, bookingWindowStart, bookingWindowEnd),
      `Booking ${booking.id} check-out outside window.`,
    );
  }

  const bookingsByProperty = new Map<string, typeof demoBookings>();
  for (const booking of demoBookings) {
    if (!bookingsByProperty.has(booking.propertyId)) {
      bookingsByProperty.set(booking.propertyId, []);
    }
    bookingsByProperty.get(booking.propertyId)?.push(booking);
  }

  for (const [propertyId, bookings] of bookingsByProperty.entries()) {
    const sorted = [...bookings].sort(
      (a, b) => a.checkIn.getTime() - b.checkIn.getTime(),
    );
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      assert(
        current.checkIn.getTime() >= prev.checkOut.getTime(),
        `Bookings overlap on property ${propertyId}: ${prev.id} and ${current.id}.`,
      );
    }
  }

  const confirmedBookings = demoBookings.filter(
    (booking) => booking.status === BookingStatus.CONFIRMED,
  );
  const cancelledBookings = demoBookings.filter(
    (booking) => booking.status === BookingStatus.CANCELLED,
  );

  const opsTasks = await prisma.opsTask.findMany({
    where: {
      bookingId: { in: confirmedBookings.map((booking) => booking.id) },
    },
    select: {
      bookingId: true,
      type: true,
    },
  });

  const opsByBooking = new Map<string, Set<OpsTaskType>>();
  for (const task of opsTasks) {
    if (!task.bookingId) continue;
    if (!opsByBooking.has(task.bookingId)) {
      opsByBooking.set(task.bookingId, new Set());
    }
    opsByBooking.get(task.bookingId)?.add(task.type);
  }

  for (const booking of confirmedBookings) {
    const taskTypes = opsByBooking.get(booking.id) ?? new Set<OpsTaskType>();
    assert(taskTypes.size > 0, `No ops tasks for confirmed booking ${booking.id}.`);
    assert(
      taskTypes.has(OpsTaskType.CLEANING),
      `Missing CLEANING task for booking ${booking.id}.`,
    );
    assert(
      taskTypes.has(OpsTaskType.INSPECTION),
      `Missing INSPECTION task for booking ${booking.id}.`,
    );
  }

  const bookingNotifications = await prisma.notificationEvent.findMany({
    where: {
      entityType: 'BOOKING',
      entityId: { in: demoBookings.map((booking) => booking.id) },
      type: {
        in: [
          NotificationType.BOOKING_CONFIRMED,
          NotificationType.NEW_BOOKING_RECEIVED,
          NotificationType.OPS_TASKS_CREATED,
          NotificationType.BOOKING_CANCELLED,
        ],
      },
    },
    select: {
      entityId: true,
      type: true,
      recipientUserId: true,
    },
  });

  for (const booking of confirmedBookings) {
    const matching = bookingNotifications.filter(
      (row) => row.entityId === booking.id,
    );

    const hasConfirmedToCustomer = matching.some(
      (row) =>
        row.type === NotificationType.BOOKING_CONFIRMED &&
        row.recipientUserId === booking.customerId,
    );
    const hasVendorReceived = matching.some(
      (row) => row.type === NotificationType.NEW_BOOKING_RECEIVED,
    );
    const hasOpsCreated = matching.some(
      (row) => row.type === NotificationType.OPS_TASKS_CREATED,
    );

    assert(
      hasConfirmedToCustomer,
      `BOOKING_CONFIRMED notification missing for booking ${booking.id}.`,
    );
    assert(
      hasVendorReceived,
      `NEW_BOOKING_RECEIVED notification missing for booking ${booking.id}.`,
    );
    assert(
      hasOpsCreated,
      `OPS_TASKS_CREATED notification missing for booking ${booking.id}.`,
    );
  }

  for (const booking of cancelledBookings) {
    const hasCancelled = bookingNotifications.some(
      (row) =>
        row.entityId === booking.id &&
        row.type === NotificationType.BOOKING_CANCELLED,
    );
    assert(
      hasCancelled,
      `BOOKING_CANCELLED notification missing for booking ${booking.id}.`,
    );
  }

  const succeededRefunds = await prisma.refund.findMany({
    where: {
      bookingId: { in: cancelledBookings.map((booking) => booking.id) },
      status: RefundStatus.SUCCEEDED,
    },
    select: {
      id: true,
      bookingId: true,
    },
  });

  const refundNotifications = await prisma.notificationEvent.findMany({
    where: {
      type: NotificationType.REFUND_PROCESSED,
      entityType: 'REFUND',
      entityId: { in: succeededRefunds.map((refund) => refund.id) },
    },
    select: {
      entityId: true,
    },
  });

  const processedRefundIds = new Set(refundNotifications.map((row) => row.entityId));
  for (const refund of succeededRefunds) {
    assert(
      processedRefundIds.has(refund.id),
      `REFUND_PROCESSED notification missing for refund ${refund.id}.`,
    );
  }

  const customerRows = await prisma.user.findMany({
    where: {
      email: { in: customerEmails },
    },
    select: {
      id: true,
      email: true,
    },
  });

  const bookingCountByCustomer = new Map<string, number>();
  for (const customer of customerRows) {
    bookingCountByCustomer.set(customer.id, 0);
  }

  for (const booking of demoBookings) {
    if (bookingCountByCustomer.has(booking.customerId)) {
      bookingCountByCustomer.set(
        booking.customerId,
        (bookingCountByCustomer.get(booking.customerId) ?? 0) + 1,
      );
    }
  }

  const counts = Array.from(bookingCountByCustomer.values());
  const customersWithBookings = counts.filter((count) => count >= 1);
  const customersWithoutBookings = counts.filter((count) => count === 0);

  assert(
    customersWithBookings.length >= 5,
    `Expected at least 5 customers with bookings, got ${customersWithBookings.length}.`,
  );
  assert(
    customersWithoutBookings.length >= 2,
    `Expected at least 2 customers with no bookings, got ${customersWithoutBookings.length}.`,
  );

  for (const count of customersWithBookings) {
    assert(count <= 2, `Customer booking count exceeds 2 (${count}).`);
  }

  const summaryRows = [
    { metric: 'Admins', value: adminCount },
    { metric: 'Vendors', value: vendorCount },
    { metric: 'Customers', value: customerCount },
    { metric: 'Properties', value: totalProperties },
    { metric: 'Published', value: publishedPropertiesCount },
    { metric: 'Under Review', value: underReviewPropertiesCount },
    { metric: 'Draft', value: draftPropertiesCount },
    { metric: 'Rejected', value: rejectedPropertiesCount },
    { metric: 'Bookings', value: demoBookings.length },
    { metric: 'Confirmed', value: confirmedBookings.length },
    { metric: 'Cancelled', value: cancelledBookings.length },
    {
      metric: 'Pending Payment',
      value: demoBookings.filter((booking) => booking.status === BookingStatus.PENDING_PAYMENT)
        .length,
    },
    { metric: 'Succeeded Refunds', value: succeededRefunds.length },
    { metric: 'Ops Tasks', value: opsTasks.length },
    { metric: 'Notifications', value: bookingNotifications.length + refundNotifications.length },
  ];

  // eslint-disable-next-line no-console
  console.table(summaryRows);
  // eslint-disable-next-line no-console
  console.log('[demo-verify] All hard assertions passed.');
}
