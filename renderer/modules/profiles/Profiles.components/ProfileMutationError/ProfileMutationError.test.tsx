import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  useProfilesShallow: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useProfilesShallow: storeMocks.useProfilesShallow,
}));

import { ProfileMutationError } from "./ProfileMutationError";

describe("ProfileMutationError", () => {
  it("renders profile mutation failures as an alert", () => {
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({ error: "Profile update failed" }),
    );

    const html = renderToStaticMarkup(
      <ProfileMutationError className="test-position" />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Profile update failed");
    expect(html).toContain("test-position");
  });

  it("does not render without a profile error", () => {
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({ error: null }),
    );

    expect(renderToStaticMarkup(<ProfileMutationError />)).toBe("");
  });
});
