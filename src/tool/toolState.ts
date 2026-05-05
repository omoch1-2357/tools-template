import type { ToolState } from "../features/tool-state/types";

export const initialToolState: ToolState = {
  draft: "",
  draftUpdatedAt: null,
};

export function hasToolStateContent(state: ToolState) {
  return Boolean(state.draft || state.draftUpdatedAt);
}
