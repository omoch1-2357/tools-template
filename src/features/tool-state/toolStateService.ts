import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { currentTool } from "../../config/tool";
import { db } from "../../lib/firebase/client";
import { timestampToIso } from "../../lib/firebase/firestoreData";
import type { AuthUser } from "../auth/types";
import type { ToolState } from "./types";

export function userToolStateDocumentPath(uid: string, toolId: string) {
  return ["users", uid, "apps", toolId] as [string, string, string, string];
}

export function mapToolStateData(data: Record<string, unknown> | undefined): ToolState {
  return {
    draft: typeof data?.draft === "string" ? data.draft : "",
    draftUpdatedAt: timestampToIso(data?.draftUpdatedAt) ?? null,
  };
}

export function toolStateWriteData(state: ToolState, draftUpdatedAt: unknown) {
  return {
    draft: state.draft,
    draftUpdatedAt,
  };
}

function getDocumentRef(user: AuthUser) {
  if (!db) {
    throw new Error("Firestore が利用できません。");
  }

  return doc(db, ...userToolStateDocumentPath(user.uid, currentTool.toolId));
}

export async function fetchCloudState(user: AuthUser): Promise<ToolState> {
  const snapshot = await getDoc(getDocumentRef(user));
  return mapToolStateData(snapshot.data());
}

export async function saveCloudState(user: AuthUser, state: ToolState) {
  await setDoc(getDocumentRef(user), toolStateWriteData(state, serverTimestamp()), { merge: true });
}
