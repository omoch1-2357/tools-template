import { currentTool } from "../../config/tool";
import { initialToolState } from "../../tool/toolState";
import type { ToolState } from "./types";

export const STORAGE_KEY = `tool-state:${currentTool.toolId}`;

export type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function getDefaultStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function safeGetItem(storage: StorageLike | null, key: string) {
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(storage: StorageLike | null, key: string, value: string) {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(storage: StorageLike | null, key: string) {
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function loadLocalState(storage: StorageLike | null = getDefaultStorage()): ToolState {
  const rawValue = safeGetItem(storage, STORAGE_KEY);
  if (!rawValue) {
    return initialToolState;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as ToolState & { updatedAt?: string | null };
    return {
      draft: typeof parsedValue.draft === "string" ? parsedValue.draft : "",
      draftUpdatedAt:
        typeof parsedValue.draftUpdatedAt === "string"
          ? parsedValue.draftUpdatedAt
          : typeof parsedValue.updatedAt === "string"
            ? parsedValue.updatedAt
            : null,
    };
  } catch {
    return initialToolState;
  }
}

export function saveLocalState(
  state: ToolState,
  storage: StorageLike | null = getDefaultStorage(),
) {
  return safeSetItem(storage, STORAGE_KEY, JSON.stringify(state));
}

export function clearLocalState(storage: StorageLike | null = getDefaultStorage()) {
  return safeRemoveItem(storage, STORAGE_KEY);
}
