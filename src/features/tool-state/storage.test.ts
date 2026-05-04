import { beforeEach, describe, expect, it } from "vitest";

import { currentTool } from "../../config/tool";
import {
  clearLocalState,
  loadLocalState,
  saveLocalState,
  STORAGE_KEY,
  type StorageLike,
} from "./storage";

const storageKey = `tool-state:${currentTool.toolId}`;

function createMemoryStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("tool state storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps the localStorage key stable", () => {
    expect(STORAGE_KEY).toBe(storageKey);
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

  it("can use an injected Storage-like adapter", () => {
    const storage = createMemoryStorage();
    const state = {
      draft: "adapter",
      draftUpdatedAt: "2026-05-01T00:00:00.000Z",
    };

    expect(saveLocalState(state, storage)).toBe(true);
    expect(loadLocalState(storage)).toEqual(state);
    expect(clearLocalState(storage)).toBe(true);
    expect(loadLocalState(storage)).toEqual({
      draft: "",
      draftUpdatedAt: null,
    });
  });

  it("reports write failures from injected storage", () => {
    const storage: StorageLike = {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => {
        throw new Error("blocked");
      },
    };

    expect(
      saveLocalState(
        {
          draft: "",
          draftUpdatedAt: null,
        },
        storage,
      ),
    ).toBe(false);
  });
});
