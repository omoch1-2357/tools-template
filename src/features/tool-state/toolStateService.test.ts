import { describe, expect, it } from "vitest";

import { currentTool } from "../../config/tool";
import {
  mapToolStateData,
  toolStateWriteData,
  userToolStateDocumentPath,
} from "./toolStateService";

function timestamp(date: string) {
  return {
    toDate: () => new Date(date),
  };
}

describe("tool state persistence helpers", () => {
  it("keeps the Firestore document path stable", () => {
    expect(userToolStateDocumentPath("user-1", currentTool.toolId)).toEqual([
      "users",
      "user-1",
      "apps",
      currentTool.toolId,
    ]);
  });

  it("maps Firestore data into tool state", () => {
    expect(
      mapToolStateData({
        draft: "hello",
        draftUpdatedAt: timestamp("2026-05-01T00:00:00.000Z"),
      }),
    ).toEqual({
      draft: "hello",
      draftUpdatedAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("uses empty defaults for missing Firestore fields", () => {
    expect(mapToolStateData(undefined)).toEqual({
      draft: "",
      draftUpdatedAt: null,
    });

    expect(
      mapToolStateData({
        draft: 123,
        draftUpdatedAt: "not-a-firestore-timestamp",
      }),
    ).toEqual({
      draft: "",
      draftUpdatedAt: null,
    });
  });

  it("builds write payloads without changing the Firestore schema", () => {
    const serverTimestampValue = { sentinel: "serverTimestamp" };

    expect(
      toolStateWriteData(
        {
          draft: "saved text",
          draftUpdatedAt: "client-only",
        },
        serverTimestampValue,
      ),
    ).toEqual({
      draft: "saved text",
      draftUpdatedAt: serverTimestampValue,
    });
  });
});
