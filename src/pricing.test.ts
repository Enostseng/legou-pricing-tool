import { describe, it, expect } from "vitest";
import { calculateQuote, DEFAULT_TARGET_MARGIN, statusLabel } from "./pricing";
import { resolveFees } from "./feeTable";
const input = {
  name: "測試商品",
  retailPrice: 1000,
  length: 10,
  width: 20,
  height: 30,
  vendorPrice: 600,
  targetMargin: DEFAULT_TARGET_MARGIN,
};
const fees = {
  handling: 20,
  logistics: 30,
  source: "manual" as const,
  tableVersion: "test-only",
};
describe("pricing", () => {
  it("calculates the specified formulas without intermediate rounding", () => {
    const r = calculateQuote(input, fees);
    expect(r.volume).toBe(6000);
    expect(r.purchasePrice).toBe(850);
    expect(r.incomeTax).toBe(17);
    expect(r.businessTax).toBe(12.5);
    expect(r.reward).toBe(25.5);
    expect(r.sponsorship).toBe(12.75);
    expect(r.payout).toBe(761.75);
    expect(r.profit).toBe(132.25);
    expect(r.maxVendorCost).toBeCloseTo(659.026315789);
    expect(r.profitMargin).toBeCloseTo(132.25 / 761.75);
    expect(r.retailMargin).toBeCloseTo(0.15);
    expect(r.status).toBe("pass");
  });
  it("floors the purchase price", () => {
    expect(
      calculateQuote({ ...input, retailPrice: 999 }, fees).purchasePrice,
    ).toBe(849);
  });
  it.each([0, 0.1, 0.2, 0.35, 0.99])(
    "uses the saved adjustable target %s at the exact boundary",
    (targetMargin) => {
      const r = calculateQuote({ ...input, targetMargin }, fees);
      if (r.maxVendorCost! >= 0) {
        expect(
          calculateQuote(
            { ...input, targetMargin, vendorPrice: r.maxVendorCost! },
            fees,
          ).status,
        ).toBe("pass");
        expect(
          calculateQuote(
            { ...input, targetMargin, vendorPrice: r.maxVendorCost! + 0.01 },
            fees,
          ).status,
        ).toBe("fail");
      } else expect(r.status).toBe("fail");
    },
  );
  it("uses the target in failure text", () => {
    const r = calculateQuote({ ...input, targetMargin: 0.2 }, fees);
    expect(r.maxVendorCost).toBeCloseTo(578.842105263);
    expect(statusLabel(r, 0.2)).toBe("不符合 20% 淨利");
  });
  it("does not invent fees or allow unknown fees to pass", () => {
    const r = calculateQuote(input, null);
    expect(r.payout).toBeNull();
    expect(r.maxVendorCost).toBeNull();
    expect(r.profitMargin).toBeNull();
    expect(r.status).toBe("pending");
    expect(resolveFees(6000, NaN)).toBeNull();
  });
  it("rejects zero or negative payout as non-submittable", () => {
    const r = calculateQuote(input, { ...fees, handling: 1000 });
    expect(r.status).toBe("invalid");
    expect(r.profitMargin).toBeNull();
    expect(r.maxVendorCost).toBeNull();
  });
  it.each([
    { targetMargin: 1 },
    { targetMargin: -0.1 },
    { retailPrice: NaN },
    { length: 0 },
    { vendorPrice: -1 },
  ])("rejects invalid input %o", (override) => {
    expect(() => calculateQuote({ ...input, ...override }, fees)).toThrow();
  });
  it("preserves the specified business tax formula when vendor cost exceeds purchase price", () => {
    expect(
      calculateQuote({ ...input, vendorPrice: 900 }, fees).businessTax,
    ).toBe(-2.5);
  });
});

it("calculates identical amounts without a product name", () => {
  expect(calculateQuote({ ...input, name: "" }, fees)).toEqual(
    calculateQuote(input, fees),
  );
  expect(calculateQuote({ ...input, name: "   " }, fees)).toEqual(
    calculateQuote(input, fees),
  );
});
