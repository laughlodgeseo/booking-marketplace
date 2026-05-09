import { PrismaClient } from '@prisma/client';

type DeleteStep = {
  label: string;
  run: () => Promise<{ count: number }>;
};

export async function cleanupShowcaseData(prisma: PrismaClient): Promise<void> {
  const steps: DeleteStep[] = [
    { label: 'event outbox', run: () => prisma.eventOutbox.deleteMany() },
    {
      label: 'notifications',
      run: () => prisma.notificationEvent.deleteMany(),
    },
    { label: 'messages', run: () => prisma.message.deleteMany() },
    { label: 'message threads', run: () => prisma.messageThread.deleteMany() },
    { label: 'work orders', run: () => prisma.workOrder.deleteMany() },
    {
      label: 'maintenance requests',
      run: () => prisma.maintenanceRequest.deleteMany(),
    },
    { label: 'ops tasks', run: () => prisma.opsTask.deleteMany() },
    { label: 'block requests', run: () => prisma.blockRequest.deleteMany() },
    {
      label: 'activation invoices',
      run: () => prisma.propertyActivationInvoice.deleteMany(),
    },
    { label: 'payouts', run: () => prisma.payout.deleteMany() },
    { label: 'ledger entries', run: () => prisma.ledgerEntry.deleteMany() },
    {
      label: 'vendor statements',
      run: () => prisma.vendorStatement.deleteMany(),
    },
    {
      label: 'security deposits',
      run: () => prisma.securityDeposit.deleteMany(),
    },
    {
      label: 'booking cancellations',
      run: () => prisma.bookingCancellation.deleteMany(),
    },
    { label: 'refunds', run: () => prisma.refund.deleteMany() },
    { label: 'payment events', run: () => prisma.paymentEvent.deleteMany() },
    { label: 'payments', run: () => prisma.payment.deleteMany() },
    {
      label: 'booking documents',
      run: () => prisma.bookingDocument.deleteMany(),
    },
    { label: 'guest reviews', run: () => prisma.guestReview.deleteMany() },
    {
      label: 'booking idempotency',
      run: () => prisma.bookingIdempotency.deleteMany(),
    },
    {
      label: 'booking blocked dates',
      run: () => prisma.bookingBlockedDate.deleteMany(),
    },
    { label: 'bookings', run: () => prisma.booking.deleteMany() },
    { label: 'holds', run: () => prisma.propertyHold.deleteMany() },
    {
      label: 'calendar days',
      run: () => prisma.propertyCalendarDay.deleteMany(),
    },
    {
      label: 'availability settings',
      run: () => prisma.propertyAvailabilitySettings.deleteMany(),
    },
    {
      label: 'cancellation policies',
      run: () => prisma.cancellationPolicyConfig.deleteMany(),
    },
    {
      label: 'security deposit policies',
      run: () => prisma.securityDepositPolicy.deleteMany(),
    },
    { label: 'pricing rules', run: () => prisma.pricingRule.deleteMany() },
    { label: 'promo codes', run: () => prisma.promoCode.deleteMany() },
    { label: 'wishlists', run: () => prisma.wishlistItem.deleteMany() },
    {
      label: 'property amenities',
      run: () => prisma.propertyAmenity.deleteMany(),
    },
    { label: 'media', run: () => prisma.media.deleteMany() },
    {
      label: 'property documents',
      run: () => prisma.propertyDocument.deleteMany(),
    },
    {
      label: 'property reviews',
      run: () => prisma.propertyReview.deleteMany(),
    },
    {
      label: 'deletion requests',
      run: () => prisma.propertyDeletionRequest.deleteMany(),
    },
    {
      label: 'unpublish requests',
      run: () => prisma.propertyUnpublishRequest.deleteMany(),
    },
    {
      label: 'property translations',
      run: () => prisma.propertyTranslation.deleteMany(),
    },
    {
      label: 'property service configs',
      run: () => prisma.propertyServiceConfig.deleteMany(),
    },
    { label: 'properties', run: () => prisma.property.deleteMany() },
    {
      label: 'vendor agreements',
      run: () => prisma.vendorServiceAgreement.deleteMany(),
    },
    { label: 'vendor profiles', run: () => prisma.vendorProfile.deleteMany() },
    {
      label: 'customer documents',
      run: () => prisma.customerDocument.deleteMany(),
    },
    { label: 'refresh tokens', run: () => prisma.refreshToken.deleteMany() },
    {
      label: 'email verification tokens',
      run: () => prisma.emailVerificationToken.deleteMany(),
    },
    {
      label: 'password reset tokens',
      run: () => prisma.passwordResetToken.deleteMany(),
    },
    {
      label: 'contact submissions',
      run: () => prisma.contactSubmission.deleteMany(),
    },
    { label: 'users', run: () => prisma.user.deleteMany() },
    { label: 'locations', run: () => prisma.location.deleteMany() },
    {
      label: 'amenity translations',
      run: () => prisma.amenityTranslation.deleteMany(),
    },
    {
      label: 'amenity group translations',
      run: () => prisma.amenityGroupTranslation.deleteMany(),
    },
    { label: 'amenities', run: () => prisma.amenity.deleteMany() },
    { label: 'amenity groups', run: () => prisma.amenityGroup.deleteMany() },
    { label: 'fx snapshots', run: () => prisma.fxSnapshot.deleteMany() },
    { label: 'fx rates', run: () => prisma.fxRate.deleteMany() },
    {
      label: 'stripe webhook events',
      run: () => prisma.stripeWebhookEvent.deleteMany(),
    },
    { label: 'service plans', run: () => prisma.servicePlan.deleteMany() },
  ];

  for (const step of steps) {
    const result = await step.run();
    if (result.count > 0) {
      // eslint-disable-next-line no-console
      console.log(`[showcase-seed] deleted ${result.count} ${step.label}`);
    }
  }
}
