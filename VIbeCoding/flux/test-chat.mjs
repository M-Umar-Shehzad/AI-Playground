import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on("console", (msg) => console.log(`[Browser Engine Console] ${msg.type().toUpperCase()}:`, msg.text()));
    page.on("pageerror", (err) => console.log("[Browser Engine Error]:", err.message));
    page.on("request", (req) => console.log("[Network] Request:", req.method(), req.url()));

    console.log("Navigating to http://localhost:3000...");
    await page.goto("http://localhost:3000");

    console.log("Waiting for the input field...");
    await page.waitForSelector("input[type='text']");

    console.log("Typing 'hello world'...");
    await page.fill("input[type='text']", "hello world");

    console.log("Pressing Enter...");
    await page.press("input[type='text']", "Enter");

    console.log("Waiting 3 seconds...");
    await page.waitForTimeout(3000);

    const inputVal = await page.inputValue("input[type='text']");
    console.log("Input value after submit:", inputVal);

    await browser.close();
})();
