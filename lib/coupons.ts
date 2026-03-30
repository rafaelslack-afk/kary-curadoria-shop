export interface AppliedCoupon {
  code: string;
  discount: number;
  type: "percent" | "fixed";
  minOrder: number;
}

export function calculateCouponDiscount(
  subtotal: number,
  coupon: AppliedCoupon | null
): number {
  if (!coupon) return 0;
  if (subtotal < coupon.minOrder) return 0;

  if (coupon.type === "percent") {
    return (subtotal * coupon.discount) / 100;
  }

  return Math.min(coupon.discount, subtotal);
}
