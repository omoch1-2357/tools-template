import { describe, expect, it } from "vitest";

import {
  isPlaceholderValue,
  parseServiceAccount,
  parseServiceAccountJson,
  parseToolConfig,
  readGitHubRepositoryEnv,
  validateToolConfigForCatalogSync,
} from "./config";
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
  tags: ["sample"],
  catalogMode: "publish",
  visible: true,
  sortOrder: 100,
};

describe("catalog sync config", () => {
  it("detects tool template placeholders", () => {
    expect(isPlaceholderValue("replace-this-tool-id")).toBe(true);
    expect(isPlaceholderValue("replace-this-owner")).toBe(true);
    expect(isPlaceholderValue("replace-this-repo-name")).toBe(true);
    expect(isPlaceholderValue("Replace This Tool Name")).toBe(true);
    expect(isPlaceholderValue("example-tool")).toBe(false);
  });

  it("parses tool.config.json values with existing defaults", () => {
    expect(
      parseToolConfig({
        namespace: "omoch1-2357",
        id: "example-tool",
        name: "Example Tool",
        description: "Example description",
        owner: "omoch1-2357",
        repo: "example-tool",
        tags: ["sample", 123, "text"],
      }),
    ).toEqual({
      ...baseConfig,
      tags: ["sample", "text"],
      sortOrder: 9999,
    });
  });

  it("rejects unsupported catalogMode values", () => {
    expect(() =>
      parseToolConfig({
        ...baseConfig,
        catalogMode: "archive",
      }),
    ).toThrow("catalogMode は publish / hide / remove");
  });

  it("reports the missing required tool.config.json field", () => {
    expect(() => parseToolConfig({})).toThrow("tool.config.json の必須項目 namespace");
  });

  it("reads GitHub repository metadata from env", () => {
    expect(
      readGitHubRepositoryEnv({
        GITHUB_REPOSITORY: "omoch1-2357/example-tool",
        GITHUB_REPOSITORY_OWNER: "omoch1-2357",
        GITHUB_EVENT_REPOSITORY_NAME: "example-tool",
      }),
    ).toEqual(repositoryEnv);
  });

  it("reports missing GitHub repository env vars", () => {
    expect(() => readGitHubRepositoryEnv({})).toThrow(
      "GitHub Actions の repository 情報が不足しています: GITHUB_REPOSITORY, GITHUB_REPOSITORY_OWNER, GITHUB_EVENT_REPOSITORY_NAME",
    );
  });

  it("rejects placeholder values before catalog sync", () => {
    expect(() =>
      validateToolConfigForCatalogSync(
        {
          ...baseConfig,
          id: "replace-this-tool-id",
        },
        repositoryEnv,
      ),
    ).toThrow("tool.config.json の id がプレースホルダーのままです。");
  });

  it("keeps repository owner and name validation explicit", () => {
    expect(() =>
      validateToolConfigForCatalogSync(
        {
          ...baseConfig,
          repo: "other-tool",
        },
        repositoryEnv,
      ),
    ).toThrow("repo (other-tool) と実際の repo 名 (example-tool) が一致しません");

    expect(() =>
      validateToolConfigForCatalogSync(
        {
          ...baseConfig,
          owner: "someone-else",
        },
        repositoryEnv,
      ),
    ).toThrow("owner (someone-else) と実際の owner (omoch1-2357) が一致しません");
  });

  it("validates Firebase service account JSON shape", () => {
    expect(
      parseServiceAccount({
        client_email: "catalog@example.iam.gserviceaccount.com",
        private_key: "private-key",
        project_id: "firebase-project",
      }),
    ).toEqual({
      clientEmail: "catalog@example.iam.gserviceaccount.com",
      privateKey: "private-key",
      projectId: "firebase-project",
    });
  });

  it("rejects malformed Firebase service account values", () => {
    expect(() => parseServiceAccount({})).toThrow(
      "Firebase service account JSON の形式が不正です。",
    );
  });

  it("parses Firebase service account JSON strings", () => {
    expect(
      parseServiceAccountJson(
        JSON.stringify({
          client_email: "catalog@example.iam.gserviceaccount.com",
          private_key: "private-key",
          project_id: "firebase-project",
        }),
      ),
    ).toEqual({
      clientEmail: "catalog@example.iam.gserviceaccount.com",
      privateKey: "private-key",
      projectId: "firebase-project",
    });
  });

  it("rejects malformed Firebase service account JSON strings", () => {
    expect(() => parseServiceAccountJson("{")).toThrow(
      "FIREBASE_SERVICE_ACCOUNT_JSON が有効な JSON ではありません。",
    );
  });
});
