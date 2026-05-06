import { describe, expect, it } from "vitest";

import {
  buildCatalogFields,
  buildCatalogSyncRequest,
  buildDocumentId,
  buildUpdateDocumentPayload,
} from "./firestore";
import type { GitHubRepositoryEnv, ToolConfig } from "./types";

const repositoryEnv: GitHubRepositoryEnv = {
  repository: "omoch1-2357/example-tool",
  repositoryOwner: "omoch1-2357",
  repositoryName: "example-tool",
};

const baseConfig: ToolConfig = {
  namespace: "omoch1-2357",
  id: "example-tool",
  name: "Example Tool",
  description: "Example description",
  owner: "omoch1-2357",
  repo: "example-tool",
  tags: ["sample", "text"],
  catalogMode: "publish",
  visible: true,
  sortOrder: 100,
};

describe("catalog sync Firestore payloads", () => {
  it("builds the catalog document id from namespace and id", () => {
    expect(buildDocumentId("omoch1-2357", "example-tool")).toBe("omoch1-2357__example-tool");
  });

  it("builds publish fields from tool config and GitHub env", () => {
    expect(buildCatalogFields(baseConfig, repositoryEnv)).toEqual({
      toolId: { stringValue: "example-tool" },
      name: { stringValue: "Example Tool" },
      description: { stringValue: "Example description" },
      url: { stringValue: "https://omoch1-2357.github.io/example-tool/" },
      repo: { stringValue: "omoch1-2357/example-tool" },
      tags: {
        arrayValue: {
          values: [{ stringValue: "sample" }, { stringValue: "text" }],
        },
      },
      visible: { booleanValue: true },
      sortOrder: { integerValue: "100" },
    });
  });

  it("keeps publish visible false when config.visible is false", () => {
    expect(
      buildCatalogFields(
        {
          ...baseConfig,
          visible: false,
        },
        repositoryEnv,
      ).visible,
    ).toEqual({ booleanValue: false });
  });

  it("forces hidden catalog items to invisible", () => {
    expect(
      buildCatalogFields(
        {
          ...baseConfig,
          catalogMode: "hide",
          visible: true,
        },
        repositoryEnv,
      ).visible,
    ).toEqual({ booleanValue: false });
  });

  it("builds the Firestore REST commit payload", () => {
    const fields = buildCatalogFields(baseConfig, repositoryEnv);

    expect(
      buildUpdateDocumentPayload("firebase-project", "omoch1-2357__example-tool", fields),
    ).toEqual({
      writes: [
        {
          update: {
            name: "projects/firebase-project/databases/(default)/documents/tools/omoch1-2357__example-tool",
            fields,
          },
          updateMask: {
            fieldPaths: [
              "toolId",
              "name",
              "description",
              "url",
              "repo",
              "tags",
              "visible",
              "sortOrder",
            ],
          },
          updateTransforms: [
            {
              fieldPath: "updatedAt",
              setToServerValue: "REQUEST_TIME",
            },
          ],
        },
      ],
    });
  });

  it("uses commit for publish catalog mode", () => {
    expect(buildCatalogSyncRequest(baseConfig, repositoryEnv, "firebase-project")).toMatchObject({
      mode: "upsert",
      documentId: "omoch1-2357__example-tool",
      commitUrl:
        "https://firestore.googleapis.com/v1/projects/firebase-project/databases/(default)/documents:commit",
    });
  });

  it("uses commit with invisible fields for hide catalog mode", () => {
    const request = buildCatalogSyncRequest(
      {
        ...baseConfig,
        catalogMode: "hide",
      },
      repositoryEnv,
      "firebase-project",
    );

    expect(request.mode).toBe("upsert");
    if (request.mode === "upsert") {
      expect(request.body.writes[0]?.update.fields.visible).toEqual({ booleanValue: false });
    }
  });

  it("uses delete for remove catalog mode", () => {
    expect(
      buildCatalogSyncRequest(
        {
          ...baseConfig,
          catalogMode: "remove",
        },
        repositoryEnv,
        "firebase-project",
      ),
    ).toEqual({
      mode: "remove",
      documentId: "omoch1-2357__example-tool",
      documentUrl:
        "https://firestore.googleapis.com/v1/projects/firebase-project/databases/(default)/documents/tools/omoch1-2357__example-tool",
    });
  });
});
