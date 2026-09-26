import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeIndianPhone } from "./normalization";
import { registrationSchema } from "./validation";

describe("participant normalization", () => {
  it("normalizes email without rewriting provider aliases", () => {
    expect(normalizeEmail("  Name+Festival@GMAIL.COM ")).toBe(
      "name+festival@gmail.com",
    );
  });

  it.each([
    ["98765 43210", "+919876543210"],
    ["+91-98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it("rejects an underage registration", () => {
    const result = registrationSchema.safeParse({
      name: "Example Person",
      age: 17,
      city: "Kochi",
      email: "person@example.com",
      phone: "9876543210",
      consent: true,
      turnstileToken: "token",
      submissionKey: crypto.randomUUID(),
      website: "",
      startedAt: Date.now() - 10_000,
    });

    expect(result.success).toBe(false);
  });
});
