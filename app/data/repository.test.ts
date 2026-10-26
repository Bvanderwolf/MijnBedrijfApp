import { beforeEach, describe, expect, it } from "vitest";
import { createRepository, freshProgress } from "./repository";

describe("IndexedDB-repository", () => {
  beforeEach(async () => {
    await createRepository().reset();
  });

  it("bewaart profiel en voorkomt dubbele journaalposten", async () => {
    const repository = createRepository();
    const profile = { id: "company", name: "Testzaak", sectorId: "shop" as const, offeringId: "stationery", createdAt: new Date().toISOString() };
    await repository.saveProfile(profile);
    await repository.saveProgress(freshProgress());
    const entry = { id: "entry-1", scenarioInstanceId: "scenario-1", description: "Start", postedAt: new Date().toISOString(), lines: [
      { accountId: "bank", side: "debit" as const, amountCents: 1000 },
      { accountId: "capital", side: "credit" as const, amountCents: 1000 },
    ] };
    expect(await repository.postEntry(entry)).toBe(true);
    expect(await repository.postEntry(entry)).toBe(false);
    const result = await repository.load();
    expect(result.profile?.name).toBe("Testzaak");
    expect(result.entries).toHaveLength(1);
  });

  it("kan na het wissen in dezelfde sessie een nieuw bedrijf opslaan", async () => {
    const repository = createRepository();
    await repository.saveProfile({
      id: "old-company",
      name: "Oude zaak",
      sectorId: "shop",
      offeringId: "stationery",
      createdAt: "2026-10-20T10:00:00.000Z",
    });

    await repository.reset();
    await repository.saveProfile({
      id: "new-company",
      name: "Nieuwe fotostudio",
      sectorId: "creative",
      offeringId: "photography",
      createdAt: "2026-10-20T11:00:00.000Z",
    });
    await repository.saveProgress(freshProgress());

    const result = await repository.load();
    expect(result.profile?.name).toBe("Nieuwe fotostudio");
    expect(result.progress).toEqual(freshProgress());
  });
});
