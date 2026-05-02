import { beforeEach, describe, expect, it } from "vitest";

import { currentTool } from "../../config/tool";
import { clearLocalState, loadLocalState, saveLocalState } from "./storage";

const storageKey = `tool-state:${currentTool.toolId}`;

describe("tool state storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns the empty state when nothing is saved", () => {
    expect(loadLocalState()).toEqual({
      draft: "",
      draftUpdatedAt: null,
    });
  });

  it("round-trips saved state", () => {
    const state = {
      draft: "hello",
      draftUpdatedAt: "2026-05-01T00:00:00.000Z",
    };

    expect(saveLocalState(state)).toBe(true);
    expect(loadLocalState()).toEqual(state);
  });

  it("falls back to legacy updatedAt values", () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        draft: "legacy",
        updatedAt: "2026-04-01T00:00:00.000Z",
      }),
    );

    expect(loadLocalState()).toEqual({
      draft: "legacy",
      draftUpdatedAt: "2026-04-01T00:00:00.000Z",
    });
  });

  it("returns the empty state for malformed JSON", () => {
    window.localStorage.setItem(storageKey, "{");

    expect(loadLocalState()).toEqual({
      draft: "",
      draftUpdatedAt: null,
    });
  });

  it("clears saved state", () => {
    expect(
      saveLocalState({
        draft: "temporary",
        draftUpdatedAt: "2026-05-01T00:00:00.000Z",
      }),
    ).toBe(true);

    expect(clearLocalState()).toBe(true);
    expect(loadLocalState()).toEqual({
      draft: "",
      draftUpdatedAt: null,
    });
  });
});
