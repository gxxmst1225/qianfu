const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const root = __dirname;
const output = path.join(root, "screenshots");
const stateKey = "qianfu-workplace-role-test-v3";
const source = fs.readFileSync(path.join(root, "app-data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const data = context.window.APP_DATA;

const locationFor = (file) => pathToFileURL(path.join(root, file)).href;

const makeCompletedState = () => {
  const preferredRole = "李涯";
  const answers = data.questions.map((question) => {
    const matchingOption = question.options.findIndex((option) => option.scores.includes(preferredRole));
    return matchingOption >= 0 ? matchingOption : 0;
  });
  return {
    version: 3,
    current: data.totalQuestions - 1,
    answers,
    startedAt: Date.now() - 167000,
    completedAt: Date.now(),
  };
};

const seedState = async (page, state) => {
  await page.evaluate(
    ({ key, value }) => window.sessionStorage.setItem(key, JSON.stringify(value)),
    { key: stateKey, value: state },
  );
};

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  await page.goto(locationFor("index.html"), { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(output, "01-首页.png") });

  await page.goto(locationFor("overview.html"), { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(output, "02-同事一览表.png") });

  await page.goto(locationFor("quiz.html"), { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(output, "03-答题页.png") });

  const firstQuestionTop = await page.locator(".quiz-paper-copy").evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingTop));
  if (firstQuestionTop < 165) {
    throw new Error(`答题纸张标题留白不足: ${firstQuestionTop}px`);
  }

  const judgmentIndex = data.questions.findIndex((question) => question.kind === "judgement");
  if (judgmentIndex < 0) {
    throw new Error("题库中未找到判断题");
  }
  await seedState(page, {
    version: 3,
    current: judgmentIndex,
    answers: Array(data.totalQuestions).fill(null),
    startedAt: Date.now(),
    completedAt: null,
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(output, "03-答题页-判断题.png") });

  const completeState = makeCompletedState();
  await seedState(page, completeState);
  await page.goto(locationFor("ready.html"), { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(output, "04-准备看结果.png") });

  await page.goto(locationFor("result.html"), { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(output, "05-结果页-首屏.png") });
  await page.screenshot({ path: path.join(output, "05-结果页-全页.png"), fullPage: true });
  const composition = await page.locator(".composition-percent").allTextContents();
  const compositionTotal = composition.reduce((sum, value) => sum + Number.parseInt(value, 10), 0);
  if (composition.length !== 3 || compositionTotal !== 100) {
    throw new Error(`角色元素占比异常: ${composition.join(", ")}`);
  }
  await page.getByRole("button", { name: "分享给同事" }).click();
  const shareField = page.locator(".share-link-field");
  const shareText = await shareField.inputValue();
  if (shareText !== "复制粘贴这个网址，看看你是《潜伏里的谁》：www.xxxxxx.com") {
    throw new Error(`分享字段异常: ${shareText}`);
  }
  await page.screenshot({ path: path.join(output, "05-分享弹窗.png") });
  await page.getByRole("button", { name: "关闭" }).click();

  await page.goto(locationFor("colleagues.html"), { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(output, "06-同事底细-首屏.png") });
  await page.screenshot({ path: path.join(output, "06-同事底细-全页.png"), fullPage: true });
  await page.locator(".colleagues-return").screenshot({ path: path.join(output, "06-同事底细-底部返回.png") });

  await page.goto(locationFor("index.html"), { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "开始测评" }).click();
  await page.waitForLoadState("domcontentloaded");
  if (!page.url().endsWith("/overview.html")) {
    throw new Error(`首页导航异常: ${page.url()}`);
  }
  await page.getByRole("link", { name: "开始答题" }).click();
  await page.waitForLoadState("domcontentloaded");
  if (!page.url().endsWith("/quiz.html")) {
    throw new Error(`同事一览表导航异常: ${page.url()}`);
  }

  for (let index = 0; index < data.totalQuestions; index += 1) {
    await page.locator(".answer-option").first().click();
    await page.getByRole("button", { name: index === data.totalQuestions - 1 ? "完成答题" : "下一题" }).click();
    if (index < data.totalQuestions - 1) {
      await page.waitForTimeout(20);
    }
  }

  await page.waitForLoadState("domcontentloaded");
  if (!page.url().endsWith("/ready.html")) {
    throw new Error(`答题完成导航异常: ${page.url()}`);
  }
  const completedText = await page.locator("#ready-answered").textContent();
  if (completedText !== String(data.totalQuestions)) {
    throw new Error(`完成题数异常: ${completedText}`);
  }

  await page.getByRole("link", { name: "打开最终档案" }).click();
  await page.waitForLoadState("domcontentloaded");
  if (!page.url().endsWith("/result.html")) {
    throw new Error(`结果页导航异常: ${page.url()}`);
  }
  await page.getByRole("link", { name: "偷看其他同事底细" }).click();
  await page.waitForLoadState("domcontentloaded");
  if (!page.url().endsWith("/colleagues.html")) {
    throw new Error(`同事底细导航异常: ${page.url()}`);
  }
  const profileCount = await page.locator(".role-card").count();
  if (profileCount !== data.roles.length) {
    throw new Error(`人物数量异常: ${profileCount}`);
  }
  const firstCardOrder = await page.locator(".role-card").first().evaluate((card) => [
    card.firstElementChild?.className,
    card.querySelector(".bottom-back") !== null,
  ]);
  if (firstCardOrder[0] !== "role-portrait") {
    throw new Error(`人物头像顺序异常: ${firstCardOrder[0]}`);
  }
  if ((await page.locator(".bottom-back").count()) !== 1) {
    throw new Error("同事底细页缺少底部返回箭头");
  }

  await browser.close();
})();
