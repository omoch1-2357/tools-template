import { describe, expect, it } from "vitest";

import { hasToolStateContent, initialToolState } from "./toolState";

describe("tool-specific state defaults", () => {
  it("keeps the template state shape explicit", () => {
    expect(initialToolState).toEqual({
      draft: "",
      draftUpdatedAt: null,
    });
  });

  it("detects whether local state has content to sync", () => {
    expect(hasToolStateContent(initialToolState)).toBe(false);
    expect(hasToolStateContent({ draft: "memo", draftUpdatedAt: null })).toBe(true);
    expect(hasToolStateContent({ draft: "", draftUpdatedAt: "2026-05-01T00:00:00.000Z" })).toBe(
      true,
    );
  });
});
