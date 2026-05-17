import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../src/config/database";
import { petPreferences } from "../../src/schemas/petPreferences";
import { findPetPreferences, upsertPetPreferences } from "../../src/repositories/petPreferences";

const TEST_USER_ID = 99999;

describe("petPreferences repository", () => {
  beforeEach(async () => {
    await db.delete(petPreferences).where(eq(petPreferences.userId, TEST_USER_ID));
  });

  it("findPetPreferences returns null for new user", async () => {
    const prefs = await findPetPreferences(TEST_USER_ID);
    expect(prefs).toBeNull();
  });

  it("upsertPetPreferences creates then updates", async () => {
    const created = await upsertPetPreferences(TEST_USER_ID, { theme: "cute-animal" });
    expect(created.theme).toBe("cute-animal");

    const updated = await upsertPetPreferences(TEST_USER_ID, { voiceEnabled: false });
    expect(updated.theme).toBe("cute-animal");
    expect(updated.voiceEnabled).toBe(false);
  });
});
