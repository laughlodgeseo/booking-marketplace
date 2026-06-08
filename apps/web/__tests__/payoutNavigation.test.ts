import { describe, expect, it } from "vitest";

import { getRoleNav } from "@/components/portal/layout/portal-navigation";

describe("payout portal navigation", () => {
  it("exposes vendor payout pages under the vendor nav", () => {
    const hrefs = getRoleNav("vendor").map((item) => item.href);

    expect(hrefs).toContain("/vendor/payouts");
    expect(hrefs).toContain("/vendor/payout-settings");
  });

  it("exposes admin vendor payout pages under the admin nav", () => {
    const hrefs = getRoleNav("admin").map((item) => item.href);

    expect(hrefs).toContain("/admin/vendor-payouts");
    expect(hrefs).toContain("/admin/vendor-payout-methods");
  });
});
