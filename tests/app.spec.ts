import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Banana Bread Chat App tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");
  });

  test("Import a chat, send/edit/delete messages, search, and view analytics on desktop", async ({ page }) => {
    // Check initial state (conditionally for desktop/mobile)
    const isMobileViewport = page.viewportSize() && page.viewportSize().width < 768;

    await expect(page.locator("button:has-text('Import chat')").first()).toBeVisible();
    if (!isMobileViewport) {
      await expect(page.locator("text=Your Messages")).toBeVisible();
    }

    // 1. Import a chat export
    const filePath = path.resolve("tests/dummy-chat.txt");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("button:has-text('Import chat')").first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // 2. Select the chat if on desktop (on mobile it opens automatically)
    if (!isMobileViewport) {
      const chatListItem = page.locator('button:has-text("set \\"you\\"")').first();
      await expect(chatListItem).toBeVisible();
      await chatListItem.click();
    }

    // Verify chat view is open (shows participant count, e.g., "4 participants")
    await expect(page.locator("text=participants").filter({ visible: true })).toBeVisible();
    
    // 3. Test sending a message
    const input = page.locator("textarea[placeholder^='Message']");
    await expect(input).toBeVisible();
    await input.fill("Hello this is a test message from playwright!");
    await input.press("Enter");

    // Verify the message bubble specifically (avoid matching the sidebar preview to prevent strict mode violation)
    await expect(page.locator('div.whitespace-pre-wrap:has-text("Hello this is a test message from playwright!")')).toBeVisible();

    // 4. Test Search panel
    await page.locator("button:has(svg.lucide-search)").click();
    const searchInput = page.locator("input[placeholder='Search in conversation']");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Hello!");
    
    // There should be matches found
    await expect(page.locator("text=occurrence").first()).toBeVisible();
    
    // Close search
    await page.locator("button:has(svg.lucide-x)").first().click();

    // 5. Open Info / Analytics Panel
    // Click the chat header title button to open the about panel
    await page.locator("button.flex.min-w-0.flex-1").click();
    await expect(page.locator("text=General & Setup").filter({ visible: true })).toBeVisible();

    // Switch to Deep Analytics
    await page.locator("text=Deep Analytics").filter({ visible: true }).click();
    
    // Verify analytics widgets are loaded (e.g. active threads, calendar heatmap or graphs)
    await expect(page.locator("text=Active Threads").filter({ visible: true })).toBeVisible();
    
    // Expand Active Threads
    await page.locator("button:has-text('Active Threads')").first().click();

    await expect(page.locator("text=budget").or(page.locator("text=server")).first()).toBeVisible();
    await expect(page.locator("text=Chat Heatmap").filter({ visible: true })).toBeVisible();
    await expect(page.locator("text=24-Hour Activity Clock").filter({ visible: true })).toBeVisible();

    // Take screenshot of desktop view with analytics
    await page.screenshot({ path: "tests/screenshots/desktop-analytics.png" });

    // Test Jump to thread from list (closes modal and scrolls to the message)
    await page.locator("button:has-text('Jump')").first().click();
    
    // The About modal should close automatically
    await expect(page.locator("text=General & Setup").first()).toBeHidden();
  });

  test("Mobile view navigation and modal interaction", async ({ page, isMobile }) => {
    const isMobileViewport = page.viewportSize() && page.viewportSize().width < 768;

    // Import chat
    const filePath = path.resolve("tests/dummy-chat.txt");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("button:has-text('Import chat')").first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Select the chat if on desktop
    if (!isMobileViewport) {
      const chatListItem = page.locator('button:has-text("set \\"you\\"")').first();
      await expect(chatListItem).toBeVisible();
      await chatListItem.click();
    }

    // Verify chat view is open
    await expect(page.locator("text=participants").filter({ visible: true })).toBeVisible();

    // In mobile view, the sidebar should hide and ChatView should show
    if (isMobileViewport) {
      await expect(page.locator("button:has(svg.lucide-arrow-left)")).toBeVisible();
      // Open Info / Analytics Panel
      await page.locator("button.flex.min-w-0.flex-1").click();
      // In General & Setup tab, scroll to Monthly Trend and take screenshot
      const generalHeader = page.locator("text=General & Setup").filter({ visible: true });
      await expect(generalHeader).toBeVisible();
      
      const monthlyTrendHeader = page.locator("text=Monthly Trend").filter({ visible: true }).first();
      await monthlyTrendHeader.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "tests/screenshots/mobile-general-monthly-trend.png" });

      // Go to analytics
      await page.locator("text=Deep Analytics").filter({ visible: true }).click();
      await page.screenshot({ path: "tests/screenshots/mobile-analytics.png" });

      // Scroll to Monthly Messages Stacked
      const chartHeader = page.locator("text=Monthly Messages Stacked");
      await chartHeader.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "tests/screenshots/mobile-analytics-monthly-chart.png" });

      // Close the modal
      await page.locator(".sticky button:has(svg.lucide-x)").filter({ visible: true }).click();
      
      // Go back to chat list
      await page.locator("button:has(svg.lucide-arrow-left)").click();
      await expect(page.locator('button:has-text("set \\"you\\"")').first()).toBeVisible();
    }
  });
});
