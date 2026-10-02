/** 待公司提供正式費率。空陣列代表未知，不代表免費。
 * 級距以材積 cm³ 表示，minVolume 含下界、maxVolume 不含上界；null 表示無上限。
 * 若正式費率還依賴重量、尺寸或品類，請先擴充輸入與 resolver，不要硬套材積規則。
 */
export interface FeeBand {
  minVolume: number;
  maxVolume: number | null;
  handling: number;
  logistics: number;
}
export interface FeeTable {
  version: string;
  status: "placeholder" | "active";
  bands: FeeBand[];
}
export interface Fees {
  handling: number;
  logistics: number;
  source: "manual" | "table";
  tableVersion: string;
}
export const feeTable: FeeTable = {
  version: "pending",
  status: "placeholder",
  bands: [],
};
export function resolveFees(
  volume: number,
  table: FeeTable = feeTable,
): Fees | null {
  if (!Number.isFinite(volume) || volume <= 0 || table.status !== "active")
    return null;
  const matches = table.bands.filter(
    (b) =>
      volume >= b.minVolume && (b.maxVolume === null || volume < b.maxVolume),
  );
  if (matches.length !== 1) return null;
  const b = matches[0];
  if (![b.handling, b.logistics].every((n) => Number.isFinite(n) && n >= 0))
    return null;
  return {
    handling: b.handling,
    logistics: b.logistics,
    source: "table",
    tableVersion: table.version,
  };
}
