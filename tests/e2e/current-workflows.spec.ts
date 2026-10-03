import { expect, test } from "@playwright/test";

test("public map loads current jobs before historical records", async ({ page }) => {
  let archiveRequests = 0;
  await page.route("**/api/jobs/expired", async (route) => {
    archiveRequests += 1;
    await route.fulfill({ json: { jobs: [] } });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Matching opportunities" })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByRole("button", { name: /expired postings hidden/ })).toBeVisible();
  const initial = await page.locator(".cpgis-job-hit-target").count();
  expect(initial).toBeGreaterThan(0);
  expect(initial).toBeLessThan(100);
  expect(archiveRequests).toBe(0);
  await page.getByRole("button", { name: /expired postings hidden/ }).click();
  await expect(page.getByRole("button", { name: "Hide expired postings" })).toBeVisible();
  expect(archiveRequests).toBe(1);
});

test("map themes remain usable above the list on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const map = page.locator(".leaflet-container");
  await expect(map).toBeVisible();
  const mapBox = await map.boundingBox();
  const listBox = await page.getByRole("heading", { name: "Matching opportunities" }).boundingBox();
  expect(mapBox).not.toBeNull();
  expect(listBox).not.toBeNull();
  expect(mapBox!.y).toBeLessThan(listBox!.y);

  await expect(page.locator(".leaflet-control-attribution")).toBeVisible();
  const attributionBox = await page.locator(".leaflet-control-attribution").boundingBox();
  expect(attributionBox!.height).toBeLessThan(45);

  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator(".cpgis-vector-map-dark")).toBeVisible();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator(".cpgis-vector-map-dark")).toHaveCount(0);
});

test("admin review filters fetch a bounded page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Moderate submitted opportunities" })).toBeVisible();
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/admin/jobs?") && response.request().method() === "GET",
  );
  await page.getByRole("button", { name: /^Published \(/ }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const payload = await response.json() as { jobs: unknown[]; total: number };
  expect(payload.jobs.length).toBeLessThanOrEqual(25);
  expect(payload.total).toBeGreaterThan(25);
});

test("plan-ahead history loads only after the visitor requests it", async ({ page }) => {
  let historyRequests = 0;
  await page.route("**/api/plan-ahead/history", async (route) => {
    historyRequests += 1;
    await route.fulfill({ json: {
      currentMonth: "2026-10", upcoming: [],
      past: [{ label: "2026-09", value: 1 }],
      jobsByMonth: {}, rolling: [],
    } });
  });
  await page.goto("/plan-ahead");
  const toggle = page.getByRole("switch", { name: "Show past months" });
  await expect(toggle).toBeVisible();
  expect(historyRequests).toBe(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(historyRequests).toBe(1);
});
