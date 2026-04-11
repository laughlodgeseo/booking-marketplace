/**
 * BullMQ queue names.
 *
 * Keep all queue names in one place to avoid typos and allow
 * easy cross-reference between producers and processors.
 */
export const QUEUE_NAMES = {
  /** Stripe webhook events — validated but not yet processed. */
  STRIPE_WEBHOOK: 'stripe-webhook',
  /** Stripe refund execution + ledger updates. */
  REFUND: 'refund',
  /** Vendor payout batch processing. */
  PAYOUT: 'payout',
  /** Transactional + marketing notifications. */
  NOTIFICATION: 'notification',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Job names within each queue (used for processor routing).
 */
export const JOB_NAMES = {
  stripe: {
    PROCESS_EVENT: 'process-stripe-event',
  },
  refund: {
    EXECUTE_STRIPE_REFUND: 'execute-stripe-refund',
    CREATE_LEDGER_REVERSAL: 'create-ledger-reversal',
  },
  payout: {
    PROCESS_MONTHLY: 'process-monthly-payouts',
    TRIGGER_TRANSFER: 'trigger-stripe-transfer',
  },
  notification: {
    SEND: 'send-notification',
  },
} as const;
