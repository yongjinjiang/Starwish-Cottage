import { test, expect, type Page } from "@playwright/test";
const switchLanguage = (page: Page, name: "English" | "中文") =>
  page.locator("header").getByRole("button", { name, exact: true }).click();
async function identity(page: Page, handle: string) {
  await page.getByTestId("preview-identity").selectOption(handle);
  if (handle)
    await expect(page.locator(".member-name")).toContainText(
      handle === "sonya12"
        ? "Sonya"
        : handle === "Mia14"
          ? "Mia"
          : handle === "Aletheia10"
            ? "Aletheia"
            : handle === "mom45"
              ? /Mom|妈妈/
              : /Dad|爸爸/,
    );
  else await expect(page.locator(".member-name")).toHaveCount(0);
}
test("guest follows browser language, remembers a switch, and keeps navigation usable on mobile", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: /A little home for wishes/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/english-home-desktop.png",
    fullPage: true,
  });
  await switchLanguage(page, "中文");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page
      .locator("header")
      .getByRole("button", { name: "English", exact: true }),
  ).toBeVisible();
  await switchLanguage(page, "English");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.screenshot({
    path: "test-results/english-home-mobile.png",
    fullPage: true,
  });
});
test("Chinese browser starts in Chinese without a saved preference", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "zh-TW" });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5174/?preview=1");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await context.close();
});
test("family defaults and each account preference are independent of guest and other accounts", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  await switchLanguage(page, "中文");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const handle of ["sonya12", "Mia14", "Aletheia10"]) {
    await identity(page, handle);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  }
  for (const handle of ["mom45", "dad51"]) {
    await identity(page, handle);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  }
  await identity(page, "Mia14");
  await switchLanguage(page, "中文");
  await expect(page.getByRole("status")).toContainText("语言偏好已保存。");
  await identity(page, "dad51");
  await switchLanguage(page, "English");
  await expect(page.getByRole("status")).toContainText(
    "Language preference saved.",
  );
  await identity(page, "Mia14");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await identity(page, "dad51");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/english-family-mobile.png",
    fullPage: true,
  });
  await identity(page, "");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});
test("quiz edits, correct answers and visible validation errors survive switching languages", async ({
  page,
}) => {
  await page.goto("/?preview=1#quiz-manage");
  await identity(page, "sonya12");
  await page
    .getByLabel("Quiz title", { exact: true })
    .fill("My own birthday questions");
  await page
    .getByLabel("Question 1", { exact: true })
    .fill("My original question 中文");
  await page
    .getByLabel("Question 1 option A", { exact: true })
    .fill("My original option");
  await page.getByLabel("Question 1 correct answer A", { exact: true }).check();
  await page.getByRole("button", { name: "Publish and create a link" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    /Choose the correct answer for question 2/,
  );
  await switchLanguage(page, "中文");
  await expect(page.getByLabel("问答标题", { exact: true })).toHaveValue(
    "My own birthday questions",
  );
  await expect(page.getByLabel("第 1 题", { exact: true })).toHaveValue(
    "My original question 中文",
  );
  await expect(page.getByLabel("第 1 题选项 A", { exact: true })).toHaveValue(
    "My original option",
  );
  await expect(
    page.getByLabel("第 1 题正确答案 A", { exact: true }),
  ).toBeChecked();
  await expect(page.getByRole("alert")).toHaveText(/请为第 2 题选择正确答案/);
});
test("family creation and preview retain the original writing across language switches", async ({
  page,
}) => {
  await page.goto("/?preview=1#studio");
  await identity(page, "dad51");
  await page.getByRole("button", { name: "新建一份心意" }).click();
  await page
    .getByLabel("作品标题", { exact: true })
    .fill("爸爸的信 · A letter from Dad");
  const body = "亲爱的 Sonya，\nStay curious and brave.";
  await page.getByLabel("想对 Sonya 说的话", { exact: true }).fill(body);
  await switchLanguage(page, "English");
  await expect(page.getByLabel("Creation title", { exact: true })).toHaveValue(
    "爸爸的信 · A letter from Dad",
  );
  await expect(
    page.getByLabel("Your message to Sonya", { exact: true }),
  ).toHaveValue(body);
  await page
    .getByRole("button", { name: "Preview creation", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".gift-body")).toHaveText(body);
  await dialog.getByRole("button", { name: "中文", exact: true }).click();
  await expect(dialog.locator(".gift-body")).toHaveText(body);
  await dialog.getByRole("button", { name: "关闭作品" }).click();
  await expect(
    page.getByLabel("想对 Sonya 说的话", { exact: true }),
  ).toHaveValue(body);
});
test("friends keep nickname and chosen answers when changing language, including after submission", async ({
  page,
}) => {
  await page.goto("/?preview=1#quiz-manage");
  await identity(page, "sonya12");
  for (let n = 1; n <= 4; n++)
    await page
      .getByLabel(`Question ${n} correct answer A`, { exact: true })
      .check();
  await page.getByRole("button", { name: "Publish and create a link" }).click();
  const link = await page.getByLabel("Quiz share link").inputValue();
  await identity(page, "");
  await page.evaluate((hash) => (location.hash = hash), new URL(link).hash);
  await page.getByPlaceholder("Your name or nickname").fill("A friend");
  const questions = page.locator(".player-question");
  await questions.nth(0).getByRole("radio").first().check();
  await questions.nth(1).getByRole("radio").first().check();
  await switchLanguage(page, "中文");
  await expect(page.getByPlaceholder("你的名字或昵称")).toHaveValue("A friend");
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(2);
  await page.getByRole("button", { name: "提交我的回答" }).click();
  await expect(page.getByRole("alert")).toContainText("还有题目没有选择答案");
  await switchLanguage(page, "English");
  await expect(page.getByRole("alert")).toContainText(
    "Some questions are still unanswered",
  );
  for (const question of await questions.all())
    await question.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Submit my answers" }).click();
  await expect(
    page.getByRole("heading", { name: /Thanks for adding/ }),
  ).toBeVisible();
  await switchLanguage(page, "中文");
  await expect(
    page.getByRole("heading", { name: "谢谢你，为 Sonya 的生日添了一颗星" }),
  ).toBeVisible();
  await expect(page.locator(".score-circle")).toContainText("4 / 4");
});
test("failed account save shows a retry and a successful retry persists the preference", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  await identity(page, "sonya12");
  await page.evaluate(async () => {
    const path = "/src/lib/preview.ts";
    const { previewApi } = await import(path);
    const original = previewApi.setLocale;
    let calls = 0;
    previewApi.setLocale = async (...args: unknown[]) => {
      if (calls++ === 0) throw new Error("Simulated offline save");
      await original(...args);
    };
  });
  await switchLanguage(page, "中文");
  await expect(
    page.getByText("语言已切换，但账号偏好未保存。请重试。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "重试保存" }).click();
  await expect(page.getByRole("status")).toContainText("语言偏好已保存。");
  await identity(page, "mom45");
  await identity(page, "sonya12");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});
test("rapid selections save in order and the final account preference wins", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  await identity(page, "sonya12");
  await page.evaluate(async () => {
    const path = "/src/lib/preview.ts";
    const { previewApi } = await import(path);
    const original = previewApi.setLocale;
    previewApi.setLocale = async (...args: unknown[]) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await original(...args);
    };
  });
  await switchLanguage(page, "中文");
  await switchLanguage(page, "English");
  await expect(page.getByRole("status")).toContainText(
    "Language preference saved.",
  );
  await identity(page, "mom45");
  await identity(page, "sonya12");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("saved account language is restored after reload and on a second device using the real API client", async ({
  browser,
}) => {
  const userId = "00000000-0000-4000-8000-000000000014";
  const project = "oejcmfuwvwblulbcsxyj";
  let savedLocale = "en";
  let saves = 0;
  const unexpected: string[] = [];
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  // Fictional session for a fully intercepted backend. It is never sent to Supabase.
  const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, role: "authenticated", aud: "authenticated", exp: now + 3600, iat: now })}.test-signature`;
  const session = {
    access_token: accessToken,
    refresh_token: "test-refresh-token",
    expires_at: now + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "mia14@family.starwish.example",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
  async function device() {
    const context = await browser.newContext({ locale: "en-US" });
    await context.addInitScript(
      ({ key, session }) => {
        localStorage.setItem(key, JSON.stringify(session));
      },
      { key: `sb-${project}-auth-token`, session },
    );
    await context.route(`https://${project}.supabase.co/**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      };
      if (url.pathname === "/rest/v1/rpc/cottage_info")
        return route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            title: "Birthday",
            reveal_at: "2026-10-27T03:00:00Z",
            timezone: "America/Los_Angeles",
            server_now: "2026-10-25T00:00:00Z",
          }),
        });
      if (url.pathname === "/rest/v1/family_members") {
        expect(url.searchParams.get("user_id")).toBe(`eq.${userId}`);
        if (request.method() === "PATCH") {
          const body = request.postDataJSON();
          expect(Object.keys(body)).toEqual(["locale"]);
          savedLocale = body.locale;
          saves++;
          return route.fulfill({
            status: 200,
            headers,
            body: JSON.stringify({ locale: savedLocale }),
          });
        }
        return route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify([
            {
              user_id: userId,
              handle: "Mia14",
              display_name: "Mia",
              role: "contributor",
              locale: savedLocale,
            },
          ]),
        });
      }
      unexpected.push(`${request.method()} ${url.pathname}`);
      await route.abort();
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:5174/");
    await expect(page.locator(".member-name")).toContainText("Mia");
    return { context, page };
  }
  const first = await device();
  await switchLanguage(first.page, "中文");
  await expect(first.page.getByRole("status")).toContainText(
    "语言偏好已保存。",
  );
  expect(savedLocale).toBe("zh-CN");
  expect(saves).toBe(1);
  await first.page.reload();
  await expect(first.page.locator(".member-name")).toContainText("Mia");
  await expect(first.page.locator("html")).toHaveAttribute("lang", "zh-CN");
  const second = await device();
  await expect(second.page.locator("html")).toHaveAttribute("lang", "zh-CN");
  expect(unexpected).toEqual([]);
  await first.context.close();
  await second.context.close();
});

test("sign-in fields and validation follow a language switch without losing input", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  await page
    .locator("header")
    .getByRole("button", { name: "Family sign in", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Family username", { exact: true }).fill("dad51");
  await dialog.getByRole("button", { name: "Come on in" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Enter your family username and password.",
  );
  await dialog.getByRole("button", { name: "中文", exact: true }).click();
  await expect(dialog.getByLabel("家庭昵称", { exact: true })).toHaveValue(
    "dad51",
  );
  await expect(dialog.getByRole("alert")).toContainText(
    "请填写家庭昵称和密码。",
  );
  await dialog
    .getByLabel("密码", { exact: true })
    .fill("a fictional test password");
  await dialog.getByRole("button", { name: "English", exact: true }).click();
  await expect(dialog.getByLabel("Password", { exact: true })).toHaveValue(
    "a fictional test password",
  );
});
