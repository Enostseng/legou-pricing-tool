import rates from "./data/fee-rates.json";

export type ShippingChannel = "standard" | "discounted";
export const CHANNEL_LABELS: Record<ShippingChannel, string> = {
  standard: "一般渠道（原費率）",
  discounted: "優惠渠道（無外箱環境友善／宅配隔日到貨）",
};
export interface FeeRow {
  minVolume: number;
  minExclusive?: boolean;
  handling: number[];
  logistics: number[];
}
export interface FeeTable {
  version: string;
  status: "active" | "placeholder";
  priceMinimums: number[];
  rows: FeeRow[];
}
export interface Fees {
  handling: number;
  logistics: number;
  source: "manual" | "table";
  tableVersion: string;
  // Optional to preserve compatibility with already saved manual/pending records.
  channel?: ShippingChannel;
  productValue?: number;
  discountMultiplier?: number;
}
/** Source: 費率.xlsx, 寄倉處理費 D4:S55 / 物流運送費 F4:U55.
 * Product value is G=floor(retailPrice*0.85), confirmed by the user.
 * Thresholds follow the sheet's approximate lookup, except >50000 is exclusive
 * as explicitly confirmed by the user. No extra rounding or tax is added.
 * Since 2026-01-01, ONLY eligible shipping channels receive the low-value discount.
 * Matrices are BASE fees; apply the multiplier exactly once to each fee.
 */
export const feeTable: FeeTable = {
  version: "2026-07-24-v1.0-r1",
  status: "active",
  ...rates,
};
export function resolveFees(
  volume: number,
  productValue: number,
  channel: ShippingChannel = "standard",
  table: FeeTable = feeTable,
): Fees | null {
  if (
    !Number.isFinite(volume) ||
    volume <= 0 ||
    !Number.isSafeInteger(productValue) ||
    productValue < 0 ||
    !["standard", "discounted"].includes(channel) ||
    table.status !== "active"
  )
    return null;
  const row = table.rows.findLast((r) =>
    r.minExclusive ? volume > r.minVolume : volume >= r.minVolume,
  );
  const column = table.priceMinimums.findLastIndex((p) => productValue >= p);
  if (!row || column < 0) return null;
  const handling = row.handling[column],
    logistics = row.logistics[column];
  if (![handling, logistics].every((n) => Number.isFinite(n) && n >= 0))
    return null;
  const discountMultiplier =
    channel === "discounted"
      ? productValue <= 25
        ? 0.5
        : productValue <= 50
          ? 0.75
          : 1
      : 1;
  // Remove binary floating-point noise only (e.g. 5.8*.75), not cents rounding.
  const apply = (value: number) =>
    Number((value * discountMultiplier).toFixed(6));
  return {
    handling: apply(handling),
    logistics: apply(logistics),
    source: "table",
    tableVersion: table.version,
    channel,
    productValue,
    discountMultiplier,
  };
}
