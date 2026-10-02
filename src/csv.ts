import type { ProductRecord } from "./storage";
import { CHANNEL_LABELS } from "./feeTable";
import { percent, statusLabel } from "./pricing";
export const SHEET_HEADERS = [
  "品名",
  "長",
  "寬",
  "高",
  "材積(cm³)",
  "成本",
  "稅後進價",
  "check Fixed",
  "市價",
  "市價毛利",
  "實際售價",
];
function cell(value: string | number | null) {
  let s =
    value === null
      ? ""
      : typeof value === "number"
        ? String(Number(value.toFixed(6)))
        : value;
  // Prevent text fields from becoming spreadsheet formulas; numeric negatives remain numbers.
  if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
export function exportCsv(
  products: ProductRecord[],
  mode: "sheet" | "full",
  headers = true,
): string {
  const columns =
    mode === "sheet"
      ? SHEET_HEADERS
      : [
          ...SHEET_HEADERS,
          "廠商實際報價",
          "目標淨利率",
          "寄倉處理費",
          "物流運送費",
          "費率來源",
          "費率版本",
          "強哥淨利",
          "強哥淨利率",
          "報價結果",
          "建立時間",
          "運送渠道",
          "查價金額",
          "費率倍率",
        ];
  const rows = products.map((p) => {
    const base = [
      p.input.name,
      p.input.length,
      p.input.width,
      p.input.height,
      p.result.volume,
      p.sheet.cost,
      p.sheet.taxInclusiveCost,
      p.sheet.checkFixed,
      p.input.retailPrice,
      percent(p.sheet.retailMargin),
      p.sheet.actualPrice,
    ];
    return mode === "sheet"
      ? base
      : [
          ...base,
          p.input.vendorPrice,
          percent(p.input.targetMargin),
          p.fees?.handling ?? null,
          p.fees?.logistics ?? null,
          p.fees?.source ?? "pending",
          p.fees?.tableVersion ?? "",
          p.result.profit,
          p.result.profitMargin === null
            ? null
            : percent(p.result.profitMargin),
          statusLabel(p.result, p.input.targetMargin),
          p.createdAt,
          p.fees?.channel ? CHANNEL_LABELS[p.fees.channel] : "",
          p.fees?.productValue ?? null,
          p.fees?.discountMultiplier ?? null,
        ];
  });
  return (
    "\uFEFF" +
    [...(headers ? [columns] : []), ...rows]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
export function downloadFile(
  content: string,
  name: string,
  type = "text/csv;charset=utf-8;",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
