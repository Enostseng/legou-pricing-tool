import { it, expect } from "vitest";
import { calculateQuote } from "./pricing";
import { loadProducts, saveProducts, STORAGE_KEY } from "./storage";
import type { ProductRecord } from "./storage";
import { exportCsv, SHEET_HEADERS } from "./csv";
const input = {
  name: '杯子,"限定"',
  retailPrice: 1000,
  length: 10,
  width: 20,
  height: 30,
  vendorPrice: 600,
  targetMargin: 0.2,
};
const record: ProductRecord = {
  id: "1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  input,
  fees: null,
  result: calculateQuote(input, null),
  sheet: {
    cost: 600,
    taxInclusiveCost: null,
    checkFixed: "",
    retailMargin: 0.15,
    actualPrice: 850,
  },
};
it("round trips the target, fee snapshot, export fields, and pending status", () => {
  saveProducts([record]);
  expect(loadProducts()).toEqual([record]);
  expect(loadProducts()[0].input.targetMargin).toBe(0.2);
});
it("preserves malformed storage instead of silently replacing it", () => {
  localStorage.setItem(STORAGE_KEY, "{bad");
  expect(loadProducts).toThrow();
  expect(localStorage.getItem(STORAGE_KEY)).toBe("{bad");
});
it("rejects invalid shapes and inconsistent results", () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, products: [{ ...record, result: {} }] }),
  );
  expect(loadProducts).toThrow();
});
it("exports the exact I:S order with empty undefined fields and escaped names", () => {
  const csv = exportCsv([record], "sheet", false);
  expect(SHEET_HEADERS).toHaveLength(11);
  expect(csv).toBe(
    '\uFEFF"杯子,""限定""","10","20","30","6000","600","","","1000","15%","850"',
  );
});
it("includes all 11 headers only when requested", () => {
  expect(exportCsv([], "sheet")).toBe(
    "\uFEFF" + SHEET_HEADERS.map((h) => `"${h}"`).join(","),
  );
});
it("protects spreadsheet text fields from formula injection and exports the target", () => {
  const p = {
    ...record,
    input: { ...input, name: "=1+1" },
    sheet: { ...record.sheet, checkFixed: "@SUM(A1)" },
  };
  const csv = exportCsv([p], "full");
  expect(csv).toContain('"\'=1+1"');
  expect(csv).toContain('"\'@SUM(A1)"');
  expect(csv).toContain('"20%"');
});
