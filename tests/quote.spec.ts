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
  await expect(page.locator(".quote-status")).toHaveText("可提交");
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
test("table records require explicit confirmation before clearing all", async ({
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

test("automatic fees use purchase price, preserve discount precision, and restore channel on edit", async ({
  page,
}) => {
  await page.goto("/");
  for (const [label, value] of Object.entries({
    商品名稱: "費率驗證商品",
    商品市售價: "31",
    長: "10",
    寬: "10",
    高: "1",
    廠商實際報價: "10",
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  const platform = page.locator(".platform-card");
  await expect(platform).toContainText("查價金額：蝦皮直營採購價 $ 26.00");
  await expect(platform).toContainText("$ 5.80");
  await expect(platform).toContainText("$ 3.70");
  await page.getByLabel("運送渠道").selectOption("discounted");
  await expect(platform).toContainText("$ 4.35");
  await expect(platform).toContainText("$ 2.78");
  await page.getByRole("button", { name: "記錄商品並清空" }).click();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("legou.products.v1")!),
  );
  expect(data.products[0].fees.logistics).toBe(2.775);
  expect(data.products[0].fees.productValue).toBe(26);
  await page.reload();
  await page.getByRole("button", { name: /商品清單/ }).click();
  await page.getByRole("button", { name: "編輯", exact: true }).click();
  await expect(page.getByLabel("運送渠道")).toHaveValue("discounted");
  await expect(platform).toContainText("$ 4.35");
  await page.getByLabel("商品市售價").fill("1000");
  await page.getByLabel("長", { exact: true }).fill("50");
  await page.getByLabel("寬", { exact: true }).fill("50");
  await page.getByLabel("高", { exact: true }).fill("20");
  await expect(platform).toContainText("$ 60.10");
  await page.getByLabel("高", { exact: true }).fill("20.0001");
  await expect(platform).toContainText("$ 94.10");
});

test("public tool calculates without a product name and uses the new labels", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("蝦皮直營提品試算工具");
  for (const [label, value] of Object.entries({
    商品市售價: "1000",
    長: "10",
    寬: "20",
    高: "30",
    廠商實際報價: "600",
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await expect(page.getByLabel("商品名稱")).toHaveValue("");
  await expect(page.getByTestId("max-vendor-cost")).toHaveText("$ 627.57");
  await expect(page.locator(".quote-status")).toHaveText("可提交");
  await expect(page.getByText("廠商淨利", { exact: true })).toBeVisible();
  await expect(page.getByText("廠商淨利率", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "蝦皮直營平台收費（以下皆由蝦皮直營收取）",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "記錄商品並清空" }),
  ).toBeDisabled();
  await expect(page.locator("body")).not.toContainText("樂購");
  await expect(page.locator("body")).not.toContainText("強哥");
  await page.getByLabel("商品名稱").fill("新名稱驗證");
  await page.getByRole("button", { name: "記錄商品並清空" }).click();
  await page.getByRole("button", { name: /商品清單/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出完整 CSV" }).click();
  const stream = await (await download).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain('"廠商淨利","廠商淨利率"');
  expect(csv).not.toContain("強哥");
  await page.setViewportSize({ width: 320, height: 700 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
