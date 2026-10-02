import { test, expect } from "@playwright/test";
test("quote, custom target, persistence, edit, search, CSV and confirmed deletion", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "好商品，好報價。" }),
  ).toBeVisible();
  const values = {
    商品名稱: "陶瓷杯",
    商品市售價: "1000",
    長: "10",
    寬: "20",
    高: "30",
    廠商實際報價: "600",
  };
  for (const [label, value] of Object.entries(values))
    await page.getByLabel(label, { exact: true }).fill(value);
  await expect(page.locator(".quote-status")).toHaveText("待提供費率");
  await page.getByLabel("費率來源").selectOption("manual");
  await page.getByLabel("寄倉處理費", { exact: true }).fill("20");
  await page.getByLabel("物流運送費", { exact: true }).fill("30");
  await expect(page.getByTestId("max-vendor-cost")).toHaveText("$ 659.03");
  await expect(page.locator(".quote-status")).toHaveText("可提交");
  await page.getByLabel("目標淨利率").fill("20");
  await expect(page.getByTestId("max-vendor-cost")).toHaveText("$ 578.84");
  await expect(page.locator(".quote-status")).toHaveText("不符合 20% 淨利");
  await page.getByRole("button", { name: "記錄商品並清空" }).click();
  await expect(page.getByLabel("商品名稱")).toHaveValue("");
  await expect(page.getByLabel("目標淨利率")).toHaveValue("20");
  await page.reload();
  await page.getByRole("button", { name: /商品清單/ }).click();
  await expect(page.getByRole("heading", { name: "陶瓷杯" })).toBeVisible();
  await expect(page.locator(".badge")).toHaveText("不符合 20% 淨利");
  await page.getByRole("button", { name: "編輯", exact: true }).click();
  await expect(page.getByLabel("目標淨利率")).toHaveValue("20");
  await page.getByLabel("廠商實際報價").fill("500");
  await page.getByRole("button", { name: "更新紀錄並清空" }).click();
  await page.getByRole("button", { name: /商品清單/ }).click();
  await expect(page.locator(".badge")).toHaveText("可提交");
  await page.getByLabel("搜尋商品").fill("不存在");
  await expect(
    page.getByRole("heading", { name: "找不到符合的商品" }),
  ).toBeVisible();
  await page.getByLabel("搜尋商品").fill("陶瓷");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出 I:S CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toContain("I-S");
  const stream = await file.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain('"陶瓷杯","10","20","30","6000"');
  expect(csv.split("\n")).toHaveLength(1);
  await page.getByRole("button", { name: "清空全部紀錄", exact: true }).click();
  await page.getByRole("button", { name: "保留紀錄" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "刪除", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /商品清單/ }).click();
  await expect(
    page.getByRole("heading", { name: "從第一筆報價開始" }),
  ).toBeVisible();
});
test("pending records require explicit confirmation before clearing all", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of ["商品甲", "商品乙"]) {
    for (const [label, value] of Object.entries({
      商品名稱: name,
      商品市售價: "1000",
      長: "10",
      寬: "20",
      高: "30",
      廠商實際報價: "600",
    }))
      await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("button", { name: "記錄商品並清空" }).click();
  }
  await page.getByRole("button", { name: /商品清單/ }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByRole("button", { name: "清空全部紀錄", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByRole("button", { name: "確認清空全部", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /商品清單/ }).click();
  await expect(page.locator(".product-card")).toHaveCount(0);
});
test("fits viewport and can reload the PWA offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "商品資料", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "商品資料", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
