import { describe, it, expect } from "vitest";
import { findPetPreferences, upsertPetPreferences } from "../../src/repositories/petPreferences";

describe("petPreferences repository", () => {
  it("findPetPreferences returns null for new user", async () => {
    const prefs = await findPetPreferences(99999);
    expect(prefs).toBeNull();
  });

  it("upsertPetPreferences creates then updates", async () => {
    const created = await upsertPetPreferences(99999, { theme: "cute-animal" });
    expect(created.theme).toBe("cute-animal");

    const updated = await upsertPetPreferences(99999, { voiceEnabled: false });
    expect(updated.theme).toBe("cute-animal");
    expect(updated.voiceEnabled).toBe(false);
  });
});
