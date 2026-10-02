import { describe, it, expect } from "vitest";
import { feeTable, resolveFees } from "./feeTable";

describe("workbook fee lookup", () => {
  it("includes all 52 volume bands and 16 purchase-price columns", () => {
    expect(feeTable.rows).toHaveLength(52);
    expect(feeTable.priceMinimums).toHaveLength(16);
    expect(
      feeTable.rows.every(
        (r) => r.handling.length === 16 && r.logistics.length === 16,
      ),
    ).toBe(true);
  });
  // Independent values from 寄倉處理費 D4:S55 and 物流運送費 F4:U55.
  it.each([
    [100, 25, 4.7, 2.9],
    [100, 26, 5.8, 3.7],
    [100, 50, 5.8, 3.7],
    [100, 51, 6.1, 4.3],
    [100, 1000, 22.1, 32.3],
    [100, 1001, 26.8, 36.3],
    [100.5, 51, 6.1, 4.3],
    [101, 51, 6.2, 4.4],
    [6000, 850, 23.8, 59.4],
    [20001, 850, 37.4, 71.4],
    [22001, 850, 38.5, 72.5],
    [49999.9, 850, 60.1, 94.3],
    [50000, 850, 60.1, 94.3],
    [50000.1, 850, 94.1, 95],
    [100000, 850, 94.1, 95],
  ])(
    "volume %s, purchase price %s uses the source base fees",
    (volume, value, handling, logistics) => {
      expect(resolveFees(volume, value)).toMatchObject({
        handling,
        logistics,
        source: "table",
        productValue: value,
        channel: "standard",
        discountMultiplier: 1,
      });
    },
  );
  it.each([
    [0, 2.35, 1.45, 0.5],
    [25, 2.35, 1.45, 0.5],
    [26, 4.35, 2.775, 0.75],
    [50, 4.35, 2.775, 0.75],
    [51, 6.1, 4.3, 1],
  ])(
    "eligible channel applies the discount once at purchase price %s",
    (value, handling, logistics, discountMultiplier) => {
      expect(resolveFees(100, value, "discounted")).toMatchObject({
        handling,
        logistics,
        discountMultiplier,
      });
    },
  );
  it.each([
    [0, 25],
    [-1, 25],
    [NaN, 25],
    [Infinity, 25],
    [100, -1],
    [100, NaN],
    [100, 25.5],
  ])("rejects invalid volume/value %s/%s", (volume, value) => {
    expect(resolveFees(volume, value)).toBeNull();
  });
  it("rejects missing, corrupt, or placeholder rates instead of treating them as zero", () => {
    expect(
      resolveFees(100, 25, "standard", { ...feeTable, status: "placeholder" }),
    ).toBeNull();
    expect(
      resolveFees(100, 25, "standard", { ...feeTable, rows: [] }),
    ).toBeNull();
    expect(
      resolveFees(100, 25, "standard", {
        ...feeTable,
        rows: [{ minVolume: 0, handling: [-1], logistics: [2] }],
      }),
    ).toBeNull();
  });
});
