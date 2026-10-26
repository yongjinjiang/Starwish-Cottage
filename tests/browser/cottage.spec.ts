import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("starwish.locale.guest.v1", "zh-CN"),
  );
});
test("home is responsive and production visitors cannot open private results", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  await expect(
    page.getByRole("heading", { name: /把心愿放进小屋/ }),
  ).toBeVisible();
  await page.goto("/?preview=1#results");
  await expect(
    page.getByRole("heading", { name: "这是 Sonya 的私密页面" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?preview=1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
});
test("family publishes a snapshot; Sonya sees it only after reveal and parents never see quiz results", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  await page.getByTestId("preview-identity").selectOption("Mia14");
  await expect(page.locator(".member-name")).toContainText("Mia");
  await page
    .locator("header")
    .getByRole("button", { name: "中文", exact: true })
    .click();
  await expect(page.locator(".member-name")).toBeVisible();
  await page.goto("/?preview=1#studio");
  await page.getByTestId("preview-identity").selectOption("Mia14");
  await expect(page.locator(".member-name")).toContainText("Mia");
  await page
    .locator("header")
    .getByRole("button", { name: "中文", exact: true })
    .click();
  await page.getByRole("button", { name: "新建一份心意" }).click();
  await page.getByLabel("作品标题").fill("给妹妹的一封信");
  await page.getByLabel("想对 Sonya 说的话").fill("愿你一直好奇，也一直勇敢。");
  await page.getByRole("button", { name: "发布到生日时刻" }).click();
  await expect(
    page.getByText("已放进生日惊喜，10 月 26 日晚 8 点（加州时间）一起揭晓。"),
  ).toBeVisible();
  await page.getByLabel("想对 Sonya 说的话").fill("未发布的新草稿");
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await page.getByTestId("preview-identity").selectOption("sonya12");
  await expect(page.locator(".member-name")).toContainText("Sonya");
  await page
    .locator("header")
    .getByRole("button", { name: "中文", exact: true })
    .click();
  await page
    .locator("header")
    .getByRole("link", { name: /家人的心意/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "写给你的爱，正在路上" }),
  ).toBeVisible();
  await expect(page.getByText("给妹妹的一封信")).toHaveCount(0);
  await page.getByTestId("preview-reveal").check();
  await page.getByRole("button", { name: /给妹妹的一封信/ }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("愿你一直好奇，也一直勇敢。", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("未发布的新草稿")).toHaveCount(0);
  await page.getByRole("button", { name: "关闭作品" }).click();
  await page.getByTestId("preview-identity").selectOption("mom45");
  await page.evaluate(() => (location.hash = "results"));
  await expect(
    page.getByRole("heading", { name: "这是 Sonya 的私密页面" }),
  ).toBeVisible();
});
test("Sonya edits a quiz, friend takes it, and only Sonya can manage rewards", async ({
  page,
}) => {
  await page.goto("/?preview=1#quiz-manage");
  await page.getByTestId("preview-identity").selectOption("sonya12");
  await expect(page.locator(".member-name")).toContainText("Sonya");
  await page
    .locator("header")
    .getByRole("button", { name: "中文", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sonya 的生日问答" }),
  ).toBeVisible();
  for (let i = 1; i <= 4; i++)
    await page.getByLabel(`第 ${i} 题正确答案 A`, { exact: true }).check();
  await page.getByRole("button", { name: "发布并生成链接" }).click();
  await expect(
    page.getByText("问答已发布！把专属链接分享给朋友吧。"),
  ).toBeVisible();
  const link = await page.getByLabel("问答分享链接").inputValue();
  const hash = new URL(link).hash;
  await page.getByTestId("preview-identity").selectOption("");
  await page.evaluate((h) => (location.hash = h), hash);
  await page.getByPlaceholder("你的名字或昵称").fill("小星星");
  for (const field of await page.locator(".player-question").all())
    await field.getByRole("radio").first().check();
  await page.getByRole("button", { name: "提交我的回答" }).click();
  await expect(
    page.getByRole("heading", { name: "谢谢你，为 Sonya 的生日添了一颗星" }),
  ).toBeVisible();
  await page.getByTestId("preview-identity").selectOption("sonya12");
  await expect(page.locator(".member-name")).toContainText("Sonya");
  await page
    .locator("header")
    .getByRole("button", { name: "中文", exact: true })
    .click();
  await page.locator("header").getByRole("link", { name: "问答结果" }).click();
  await expect(page.getByRole("heading", { name: "小星星" })).toBeVisible();
  await page.getByLabel("小礼物状态", { exact: true }).selectOption("given");
  await expect(page.getByLabel("小礼物状态", { exact: true })).toHaveValue(
    "given",
  );
  await expect(
    page.getByText("只有你可以查看，不受生日揭晓时间影响。"),
  ).toBeVisible();
});
test("desktop visual inspection", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/?preview=1");
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
});
