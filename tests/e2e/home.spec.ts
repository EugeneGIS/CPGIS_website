import { expect, test } from "@playwright/test";
import { getDisplayJobTitle } from "../../src/lib/job-display";
import jobs from "../../src/data/cpgis-jobs.json";
import legacySlugs from "../../src/data/legacy-job-slug-redirects.json";

test("homepage exposes the primary job discovery routes", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "CPGIS Jobs map" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan ahead" })).toHaveAttribute(
    "href",
    "/plan-ahead",
  );
  await expect(
    page.getByRole("link", { name: "Submit", exact: true }),
  ).toHaveAttribute("href", "/submit");
});

test("homepage presents a batched jobs feed with selection and actions", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("Map first", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Map-linked list", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Matching opportunities" }),
  ).toBeVisible();

  const feed = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Matching opportunities" }) });
  const cards = feed.locator("article");
  await expect.poll(() => cards.count()).toBeGreaterThan(1);
  expect(await cards.count()).toBeLessThanOrEqual(10);
  await expect(cards.first().getByRole("button", { name: "Share" })).toBeVisible();
  await expect(cards.first().getByRole("link", { name: "Apply now" })).toHaveAttribute(
    "href",
    /^https?:\/\//,
  );

  const selectedTitle = await cards.nth(1).getByRole("heading", { level: 3 }).innerText();
  await cards.nth(1).getByRole("button").first().click();
  await expect(cards.first().getByRole("heading", { level: 3 })).toHaveText(
    selectedTitle,
  );
  await expect(cards.first()).toContainText("Selected on map");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole("button", { name: "Back to top" })).toBeVisible();
});

test("homepage renders the ten-dash line in both map themes", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".leaflet-control-attribution")).toContainText(
    "Ten-dash: WGS84; GS(2020)4619 reference",
  );

  const segments = page.locator(".cpgis-south-china-sea-line");
  await expect(segments).toHaveCount(10);
  await expect(segments.first()).toHaveAttribute("stroke", "#8394aa");

  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(segments).toHaveCount(10);
  await expect(segments.first()).toHaveAttribute("stroke", "#a1b2c8");
});

test("long job titles stay inside compact map cards", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByPlaceholder("e.g. remote sensing, EPFL, Lausanne")
    .fill("electric vehicle charging behavior");

  const feed = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Matching opportunities" }) });
  const card = feed.locator("article").first();
  await expect(card).toContainText("The Chinese University of Hong Kong");
  await card.getByRole("button").first().click();
  await page.getByRole("button", { name: "Close search panel" }).click();
  await page.waitForTimeout(1_300);

  const marker = page.locator(".cpgis-job-hit-target");
  await marker.hover();
  const tooltip = page.locator(".cpgis-job-tooltip");
  await expect(tooltip).toBeVisible();
  const tooltipBox = await tooltip.boundingBox();
  const viewport = page.viewportSize();

  expect(tooltipBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(tooltipBox?.width).toBeLessThanOrEqual(320);
  expect(tooltipBox?.x).toBeGreaterThanOrEqual(0);
  expect((tooltipBox?.x ?? 0) + (tooltipBox?.width ?? 0)).toBeLessThanOrEqual(
    viewport?.width ?? 0,
  );

  const tooltipTitle = tooltip.locator(".cpgis-job-tooltip-title");
  const tooltipTitleSize = await tooltipTitle.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(tooltipTitleSize.scrollHeight).toBeGreaterThan(
    tooltipTitleSize.clientHeight,
  );

  await marker.click();
  const popupTitle = page.locator(".cpgis-job-popup .cpgis-job-tooltip-title");
  await expect(popupTitle).toBeVisible();
  const popupTitleSize = await popupTitle.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(popupTitleSize.scrollHeight).toBeGreaterThan(
    popupTitleSize.clientHeight,
  );
  await expect(
    page.locator(".leaflet-popup").getByRole("link", { name: "View details" }),
  ).toHaveAttribute("href", /\/jobs\//);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const mobilePopupBox = await page
    .locator(".leaflet-popup-content-wrapper")
    .boundingBox();
  const mobileZoomControl = await page
    .locator(".leaflet-control-zoom")
    .evaluate((element) => ({
      opacity: window.getComputedStyle(element).opacity,
      pointerEvents: window.getComputedStyle(element).pointerEvents,
    }));

  expect(mobilePopupBox).not.toBeNull();
  expect(mobilePopupBox?.x).toBeGreaterThanOrEqual(0);
  expect(
    (mobilePopupBox?.x ?? 0) + (mobilePopupBox?.width ?? 0),
  ).toBeLessThanOrEqual(390);
  expect(mobileZoomControl).toEqual({ opacity: "0", pointerEvents: "none" });
});

test("a safe legacy job URL permanently redirects to its canonical detail page", async ({
  page,
  request,
}) => {
  const [legacySlug, canonicalSlug] = Object.entries(legacySlugs.redirects)[0];
  const job = jobs.find((candidate) => candidate.slug === canonicalSlug);

  expect(job).toBeDefined();

  const redirectResponse = await request.get(`/jobs/${legacySlug}`, {
    maxRedirects: 0,
  });
  expect(redirectResponse.status()).toBe(308);
  expect(redirectResponse.headers().location).toMatch(
    new RegExp(`/jobs/${canonicalSlug}$`),
  );

  await page.goto(`/jobs/${legacySlug}`);
  await expect(page).toHaveURL(new RegExp(`/jobs/${canonicalSlug}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: getDisplayJobTitle(job!.title) }),
  ).toBeVisible();
  await expect(page.locator(".cpgis-south-china-sea-line")).toHaveCount(10);
  await expect(
    page.getByText(
      "Ten-dash: WGS84; GS(2020)4619 reference",
      { exact: false },
    ),
  ).toBeVisible();
});

test("an ambiguous legacy job URL is not guessed", async ({ page }) => {
  const response = await page.goto(`/jobs/${legacySlugs.ambiguous[0]}`);

  expect(response?.status()).toBe(404);
});
