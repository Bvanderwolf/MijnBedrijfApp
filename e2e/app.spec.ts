import { expect, test, type Page } from "@playwright/test";

async function fillShownSolution(page: Page) {
  const solution = page.locator("details");
  await solution.locator("summary").click();
  const rows = solution.locator("p");
  const rowCount = await rows.count();

  for (let index = 2; index < rowCount; index += 1) {
    await page.getByRole("button", { name: /voeg boekingsregel toe/i }).click();
  }

  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    const accountName = (await row.locator("strong").innerText()).trim();
    const [sideLabel, amountLabel] = (await row.locator("span").innerText()).split("·");
    const accountSelect = page.locator("select").nth(index * 2);
    const accountId = await accountSelect.locator("option").filter({ hasText: accountName }).first().getAttribute("value");
    if (!accountId) throw new Error(`Geen rekening gevonden voor ${accountName}`);

    await accountSelect.selectOption(accountId);
    await page.locator("select").nth(index * 2 + 1).selectOption(sideLabel.trim() === "Debet" ? "debit" : "credit");
    await page.locator('input[inputmode="decimal"]').nth(index).fill(
      amountLabel.replace(/[^\d,.-]/g, "").replaceAll(".", "").replace(",", "."),
    );
  }
}

test("onboarding, dagelijkse feedback en balans werken op mobiel", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-20T10:00:00+02:00"));
  await page.goto("/");
  await page.getByLabel("Bedrijfsnaam").fill("Studio Spruit");
  await page.getByRole("button", { name: /Kies mijn sector/ }).click();
  await page.getByRole("button", { name: /Webshop/ }).click();
  await page.getByRole("button", { name: /Kies mijn aanbod/ }).click();
  await page.getByRole("button", { name: "Woonaccessoires" }).click();
  await page.getByRole("button", { name: /Open mijn bedrijf/ }).click();

  const selects = page.locator("select");
  await selects.nth(0).selectOption("bank");
  await selects.nth(2).selectOption("capital");
  const amounts = page.locator('input[inputmode="decimal"]');
  await amounts.nth(0).fill("5000");
  await amounts.nth(1).fill("5000");
  await expect(page.getByText("In balans", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Controleer mijn boeking/ }).click();
  await expect(page.getByRole("heading", { name: "De cijfers kloppen!" })).toBeVisible();
  await page.getByRole("button", { name: "Bekijk mijn bedrijf" }).click();

  await expect(page.getByText("€ 5.000,00").first()).toBeVisible();

  await page.clock.setFixedTime(new Date("2026-10-21T10:00:00+02:00"));
  await page.getByRole("button", { name: "Overzicht" }).click();
  await page.getByRole("button", { name: "Bedrijf" }).click();

  await page.getByRole("button", { name: "Open scenario" }).click();
  const checkBooking = page.getByRole("button", { name: /Controleer mijn boeking/ });
  await checkBooking.click();
  await expect(page.getByRole("alert")).toContainText(/Debet en credit zijn nog niet gelijk/);
  await checkBooking.click();
  await checkBooking.click();
  await expect(page.getByText("Bekijk de uitgewerkte oplossing")).toBeVisible();

  await fillShownSolution(page);
  await checkBooking.click();
  await expect(page.getByRole("heading", { name: "De cijfers kloppen!" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Bekijk de uitgewerkte oplossing")).toHaveCount(0);
  await expect(page.getByRole("button")).toHaveCount(1);
  await page.getByRole("button", { name: "Terug naar Bedrijf" }).click();

  await expect(page.getByText("Klaar voor vandaag")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Studio Spruit" })).toBeVisible();
  await page.getByRole("button", { name: "Overzicht" }).click();
  await expect(page.getByText("Schulden + vermogen + resultaat")).toBeVisible();
  await expect(page.getByText("Je eerste startkapitaal")).toBeVisible();
  expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test("na wissen kan in dezelfde sessie een nieuw fotografiebedrijf worden aangemaakt", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");

  await page.getByLabel("Bedrijfsnaam").fill("Eerste bedrijf");
  await page.getByRole("button", { name: /Kies mijn sector/ }).click();
  await page.getByRole("button", { name: /Kies mijn aanbod/ }).click();
  await page.getByRole("button", { name: /Open mijn bedrijf/ }).click();
  await page.getByRole("button", { name: "Terug" }).click();
  await page.getByRole("button", { name: "Profiel" }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Wis mijn bedrijf" }).click();
  await expect(page.getByRole("heading", { name: "Hoe heet jouw bedrijf?" })).toBeVisible();

  await page.getByLabel("Bedrijfsnaam").fill("Nieuwe fotostudio");
  await page.getByRole("button", { name: /Kies mijn sector/ }).click();
  await page.getByRole("button", { name: /Kies mijn aanbod/ }).click();
  await page.getByRole("button", { name: "Fotografie" }).click();
  await page.getByRole("button", { name: /Open mijn bedrijf/ }).click();

  await expect(page.getByText("Eerste boeking")).toBeVisible();
  expect(pageErrors).toEqual([]);
});
