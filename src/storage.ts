import { calculateQuote, validInput } from "./pricing";
import type { QuoteInput, QuoteResult } from "./pricing";
import type { Fees } from "./feeTable";
export const STORAGE_KEY = "legou.products.v1";
export interface SheetFields {
  cost: number;
  taxInclusiveCost: number | null;
  checkFixed: string;
  retailMargin: number;
  actualPrice: number;
}
export interface ProductRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  input: QuoteInput;
  fees: Fees | null;
  result: QuoteResult;
  sheet: SheetFields;
}
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
export function isProductRecord(value: unknown): value is ProductRecord {
  if (!value || typeof value !== "object") return false;
  const p = value as ProductRecord;
  try {
    return (
      typeof p.id === "string" &&
      typeof p.createdAt === "string" &&
      Number.isFinite(Date.parse(p.createdAt)) &&
      typeof p.updatedAt === "string" &&
      Number.isFinite(Date.parse(p.updatedAt)) &&
      validInput(p.input) &&
      (p.fees === null ||
        (["manual", "table"].includes(p.fees.source) &&
          typeof p.fees.tableVersion === "string" &&
          (p.fees.channel === undefined ||
            ["standard", "discounted"].includes(p.fees.channel)) &&
          (p.fees.productValue === undefined ||
            (Number.isSafeInteger(p.fees.productValue) &&
              p.fees.productValue >= 0)) &&
          (p.fees.discountMultiplier === undefined ||
            [0.5, 0.75, 1].includes(p.fees.discountMultiplier)))) &&
      JSON.stringify(calculateQuote(p.input, p.fees)) ===
        JSON.stringify(p.result) &&
      finite(p.sheet.cost) &&
      p.sheet.cost >= 0 &&
      (p.sheet.taxInclusiveCost === null ||
        (finite(p.sheet.taxInclusiveCost) && p.sheet.taxInclusiveCost >= 0)) &&
      typeof p.sheet.checkFixed === "string" &&
      finite(p.sheet.retailMargin) &&
      finite(p.sheet.actualPrice) &&
      p.sheet.actualPrice >= 0
    );
  } catch {
    return false;
  }
}
export function loadProducts(): ProductRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (
    data.version !== 1 ||
    !Array.isArray(data.products) ||
    !data.products.every(isProductRecord) ||
    new Set(data.products.map((p: ProductRecord) => p.id)).size !==
      data.products.length
  ) {
    throw new Error("商品紀錄格式不符，原始資料已保留，請先備份。");
  }
  return data.products;
}
export function saveProducts(products: ProductRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, products }));
}
