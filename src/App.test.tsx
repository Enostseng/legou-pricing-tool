import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import App from "./App";
import { loadProducts } from "./storage";
function fill() {
  for (const [label, value] of Object.entries({
    商品名稱: "測試杯",
    商品市售價: "1000",
    長: "10",
    寬: "20",
    高: "30",
    廠商實際報價: "600",
    目標淨利率: "20",
  }))
    fireEvent.change(screen.getByLabelText(label, { exact: true }), {
      target: { value },
    });
}
it("records automatic table fees, clears product input, and retains the target", () => {
  render(<App />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "記錄商品並清空" }));
  expect(loadProducts()).toHaveLength(1);
  expect(loadProducts()[0].fees).toMatchObject({
    handling: 23.8,
    logistics: 59.4,
    productValue: 850,
    channel: "standard",
  });
  expect(loadProducts()[0].result.status).toBe("fail");
  expect(loadProducts()[0].input.targetMargin).toBe(0.2);
  expect(screen.getByLabelText("商品名稱")).toHaveValue("");
  expect(screen.getByLabelText("目標淨利率")).toHaveValue(20);
});
it("keeps user input when storage fails", () => {
  render(<App />);
  fill();
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("full", "QuotaExceededError");
  });
  fireEvent.click(screen.getByRole("button", { name: "記錄商品並清空" }));
  expect(screen.getByRole("alert")).toHaveTextContent("儲存失敗");
  expect(screen.getByLabelText("商品名稱")).toHaveValue("測試杯");
  spy.mockRestore();
});
it("does not silently record incomplete manual fees", () => {
  render(<App />);
  fill();
  fireEvent.change(screen.getByLabelText("費率來源"), {
    target: { value: "manual" },
  });
  fireEvent.click(screen.getByRole("button", { name: "記錄商品並清空" }));
  expect(screen.getByRole("alert")).toHaveTextContent("請完整填入");
  expect(loadProducts()).toHaveLength(0);
});

it("shows calculated prices with no name but requires a name to save", () => {
  render(<App />);
  fill();
  fireEvent.change(screen.getByLabelText("商品名稱"), {
    target: { value: "" },
  });
  expect(screen.getByTestId("max-vendor-cost")).toHaveTextContent("$ 550.88");
  expect(screen.getByText("廠商淨利")).toBeInTheDocument();
  expect(screen.getByText("廠商淨利率")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "記錄商品並清空" })).toBeDisabled();
  expect(loadProducts()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("商品名稱"), {
    target: { value: "商品" },
  });
  expect(screen.getByRole("button", { name: "記錄商品並清空" })).toBeEnabled();
});
