import { afterEach, describe, expect, it } from "vitest";
import { isConfiguredAdmin } from "./config";

const originalAdminEmails = process.env.ADMIN_EMAILS;
const originalAdminEmail = process.env.ADMIN_EMAIL;

afterEach(() => {
  if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = originalAdminEmails;
  if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = originalAdminEmail;
});

describe("admin email allowlist", () => {
  it("matches any normalized address in the comma-separated list", () => {
    process.env.ADMIN_EMAILS = " first@example.com, SECOND@example.com ";

    expect(isConfiguredAdmin(" second@example.com ")).toBe(true);
    expect(isConfiguredAdmin("other@example.com")).toBe(false);
  });

  it("supports the legacy single-admin variable", () => {
    delete process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAIL = "admin@example.com";

    expect(isConfiguredAdmin("ADMIN@example.com")).toBe(true);
  });

  it("adds the allowlist without removing the legacy admin", () => {
    process.env.ADMIN_EMAILS = "Crm.armson@gmail.com";
    process.env.ADMIN_EMAIL = "admin@example.com";

    expect(isConfiguredAdmin("crm.armson@gmail.com")).toBe(true);
    expect(isConfiguredAdmin("admin@example.com")).toBe(true);
  });
});
