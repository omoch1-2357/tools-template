import { currentTool } from "../../config/tool";
import type { ToolState } from "./types";

const STORAGE_KEY = `tool-state:${currentTool.id}`;

const emptyState: ToolState = {
  draft: "",
  updatedAt: null,
};

export function loadLocalState(): ToolState {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return emptyState;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as ToolState;
    return {
      draft: typeof parsedValue.draft === "string" ? parsedValue.draft : "",
      updatedAt: typeof parsedValue.updatedAt === "string" ? parsedValue.updatedAt : null,
    };
  } catch {
    return emptyState;
  }
}

export function saveLocalState(state: ToolState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearLocalState() {
  window.localStorage.removeItem(STORAGE_KEY);
}
