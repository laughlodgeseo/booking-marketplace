export type StripeErrorLike = {
  type?: string;
  code?: string;
  message?: string;
  decline_code?: string;
};

/**
 * Maps a Stripe error object to a human-readable message for the vendor fee payment UI.
 * Technical detail stays in the console; users see a clear, actionable message.
 */
export function stripeErrorMessage(error: StripeErrorLike): string {
  const type = error.type ?? "";
  const code = error.code ?? "";
  const declineCode = error.decline_code ?? "";

  if (type === "validation_error") {
    return error.message ?? "Your card details are incomplete.";
  }

  if (code === "card_declined") {
    if (declineCode === "insufficient_funds") return "Your card has insufficient funds.";
    if (declineCode === "lost_card" || declineCode === "stolen_card")
      return "This card cannot be used. Please use a different card.";
    return "This card was declined. Please use another card or contact your bank.";
  }

  if (code === "expired_card") return "This card has expired. Please use another card.";
  if (code === "incorrect_cvc") return "The security code (CVC) is incorrect.";
  if (code === "incorrect_number" || code === "invalid_number")
    return "The card number is incorrect.";
  if (code === "invalid_expiry_month" || code === "invalid_expiry_year")
    return "The card's expiry date is invalid.";
  if (code === "processing_error")
    return "Stripe could not process this card. Please try again.";
  if (code === "payment_intent_unexpected_state")
    return "This payment session is no longer active. Please close and try again.";

  if (error.message) return error.message;
  return "Payment failed. Please try again.";
}
