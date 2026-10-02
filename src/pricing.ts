import type { Fees } from "./feeTable";
export const DEFAULT_TARGET_MARGIN = 0.1;
export const RATES = {
  purchase: 0.85,
  incomeTax: 0.02,
  businessTax: 0.05,
  reward: 0.03,
  sponsorship: 0.015,
} as const;
export interface QuoteInput {
  name: string;
  retailPrice: number;
  length: number;
  width: number;
  height: number;
  vendorPrice: number;
  targetMargin: number;
}
export function validPricingInput(q: QuoteInput): boolean {
  return (
    [q.retailPrice, q.length, q.width, q.height].every(
      (n) => Number.isFinite(n) && n > 0 && n <= 1e9,
    ) &&
    Number.isFinite(q.vendorPrice) &&
    q.vendorPrice >= 0 &&
    q.vendorPrice <= 1e9 &&
    Number.isFinite(q.targetMargin) &&
    q.targetMargin >= 0 &&
    q.targetMargin < 1
  );
}
/** A name is required only when recording a product, not when calculating. */
export function validInput(q: QuoteInput): boolean {
  return (
    typeof q.name === "string" &&
    q.name.trim().length > 0 &&
    q.name.length <= 200 &&
    validPricingInput(q)
  );
}
export function calculateQuote(q: QuoteInput, fees: Fees | null) {
  if (!validPricingInput(q))
    throw new Error("請完整填寫商品資料，金額與尺寸需為有效數值。");
  if (
    fees &&
    ![fees.handling, fees.logistics].every(
      (n) => Number.isFinite(n) && n >= 0 && n <= 1e9,
    )
  ) {
    throw new Error("平台費用必須是非負有效數值。");
  }
  const volume = q.length * q.width * q.height;
  const purchasePrice = Math.floor(q.retailPrice * RATES.purchase);
  const incomeTax = purchasePrice * RATES.incomeTax;
  const businessTax = (purchasePrice - q.vendorPrice) * RATES.businessTax;
  const reward = purchasePrice * RATES.reward;
  const sponsorship = purchasePrice * RATES.sponsorship;
  const retailMargin = (q.retailPrice - purchasePrice) / q.retailPrice;
  const payout = fees
    ? purchasePrice - fees.handling - fees.logistics - reward - sponsorship
    : null;
  const maxVendorCost =
    payout !== null && payout > 0
      ? (payout * (1 - q.targetMargin) -
          purchasePrice * (RATES.incomeTax + RATES.businessTax)) /
        (1 - RATES.businessTax)
      : null;
  const profit =
    payout === null ? null : payout - q.vendorPrice - incomeTax - businessTax;
  const profitMargin =
    payout !== null && payout > 0 && profit !== null ? profit / payout : null;
  const status =
    payout === null
      ? "pending"
      : payout <= 0
        ? "invalid"
        : profitMargin !== null && profitMargin + 1e-12 >= q.targetMargin
          ? "pass"
          : "fail";
  return {
    volume,
    purchasePrice,
    incomeTax,
    businessTax,
    reward,
    sponsorship,
    retailMargin,
    payout,
    maxVendorCost,
    profit,
    profitMargin,
    status,
  } as const;
}
export type QuoteResult = ReturnType<typeof calculateQuote>;
export const money = (n: number | null) =>
  n === null
    ? "—"
    : n.toLocaleString("zh-TW", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
export const percent = (n: number) => `${Number((n * 100).toFixed(2))}%`;
export function statusLabel(result: QuoteResult, target: number) {
  return result.status === "pending"
    ? "待提供費率"
    : result.status === "invalid"
      ? "撥款不足，無法提交"
      : result.status === "pass"
        ? "可提交"
        : `不符合 ${percent(target)} 淨利`;
}
