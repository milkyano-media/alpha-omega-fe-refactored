// Pricing calculation utilities for booking system

export const TAX_RATE = 0.10; // 10% GST for Australia
export const DEPOSIT_PERCENTAGE = 0.50; // 50% deposit required

export interface Service {
  base_price_cents?: number;
  price_amount?: number;
}

export interface BookingPricing {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  // Formatted dollar values
  subtotal: string;
  tax: string;
  total: string;
  deposit: string;
  balance: string;
}

/**
 * Calculate booking pricing with tax and deposit
 *
 * Pricing Formula:
 * - Subtotal: Sum of all service prices
 * - Tax: 10% GST on subtotal
 * - Total: Subtotal + Tax
 * - Deposit: 50% of subtotal + full tax amount
 * - Balance: Remaining 50% of subtotal (tax already paid)
 *
 * Example:
 * Services: $30 + $50 = $80
 * Tax (10%): $8
 * Total: $88
 * Deposit (50% + tax): $48 ($40 + $8)
 * Balance: $40
 */
export function calculateBookingPricing(services: Service[]): BookingPricing {
  // Calculate subtotal from all services
  const subtotalCents = services.reduce((total, service) => {
    const priceCents = service.base_price_cents ?? service.price_amount ?? 0;
    return total + priceCents;
  }, 0);

  // Calculate 10% GST tax
  const taxCents = Math.round(subtotalCents * TAX_RATE);

  // Total includes subtotal + tax
  const totalCents = subtotalCents + taxCents;

  // Deposit = 50% of services + full tax
  const halfSubtotal = Math.round(subtotalCents * DEPOSIT_PERCENTAGE);
  const depositCents = halfSubtotal + taxCents;

  // Balance = remaining 50% of services (no tax, already paid in deposit)
  const balanceCents = Math.round(subtotalCents * DEPOSIT_PERCENTAGE);

  // Format to dollar strings
  const formatCents = (cents: number): string => {
    return (cents / 100).toFixed(2);
  };

  return {
    subtotalCents,
    taxCents,
    totalCents,
    depositCents,
    balanceCents,
    subtotal: formatCents(subtotalCents),
    tax: formatCents(taxCents),
    total: formatCents(totalCents),
    deposit: formatCents(depositCents),
    balance: formatCents(balanceCents),
  };
}

/**
 * Get payment breakdown for storage in database
 */
export function getPaymentBreakdown(pricing: BookingPricing) {
  return {
    subtotal_cents: pricing.subtotalCents,
    tax_cents: pricing.taxCents,
    tax_rate: TAX_RATE,
    total_cents: pricing.totalCents,
    deposit_cents: pricing.depositCents,
    balance_cents: pricing.balanceCents,
  };
}
