import { readFile } from "node:fs/promises";

import type { CatalogMode, GitHubRepositoryEnv, ServiceAccount, ToolConfig } from "./types";

const placeholderValues = new Set([
  "replace-this-tool-id",
  "replace-this-owner",
  "replace-this-repo-name",
  "Replace This Tool Name",
]);

export function isPlaceholderValue(value: string) {
  return placeholderValues.has(value);
}

export async function loadToolConfig(configPath: string) {
  return parseToolConfig(JSON.parse(await readFile(configPath, "utf8")));
}

export function parseToolConfig(value: unknown): ToolConfig {
  if (!isObject(value)) {
    throw new Error("tool.config.json の形式が不正です。");
  }

  const catalogMode = value.catalogMode ?? "publish";
  if (!isCatalogMode(catalogMode)) {
    throw new Error(
      "tool.config.json の catalogMode は publish / hide / remove のいずれかにしてください。",
    );
  }

  return {
    namespace: readRequiredString(value, "namespace"),
    id: readRequiredString(value, "id"),
    name: readRequiredString(value, "name"),
    description: readRequiredString(value, "description"),
    owner: readRequiredString(value, "owner"),
    repo: readRequiredString(value, "repo"),
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    catalogMode,
    visible: value.visible !== false,
    sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : 9999,
  };
}

export function parseServiceAccount(value: unknown): ServiceAccount {
  if (
    !isObject(value) ||
    typeof value.client_email !== "string" ||
    typeof value.private_key !== "string" ||
    typeof value.project_id !== "string"
  ) {
    throw new Error("Firebase service account JSON の形式が不正です。");
  }

  return {
    clientEmail: value.client_email,
    privateKey: value.private_key,
    projectId: value.project_id,
  };
}

export function parseServiceAccountJson(rawValue: string): ServiceAccount {
  try {
    return parseServiceAccount(JSON.parse(rawValue));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON が有効な JSON ではありません。");
    }

    throw error;
  }
}

export function readGitHubRepositoryEnv(env: NodeJS.ProcessEnv): GitHubRepositoryEnv {
  const repository = env.GITHUB_REPOSITORY;
  const repositoryOwner = env.GITHUB_REPOSITORY_OWNER;
  const repositoryName = env.GITHUB_EVENT_REPOSITORY_NAME;

  if (!repository || !repositoryOwner || !repositoryName) {
    const missingVariables = [
      !repository ? "GITHUB_REPOSITORY" : null,
      !repositoryOwner ? "GITHUB_REPOSITORY_OWNER" : null,
      !repositoryName ? "GITHUB_EVENT_REPOSITORY_NAME" : null,
    ].filter((value): value is string => value !== null);

    throw new Error(
      `GitHub Actions の repository 情報が不足しています: ${missingVariables.join(", ")}`,
    );
  }

  return {
    repository,
    repositoryOwner,
    repositoryName,
  };
}

export function validateToolConfigForCatalogSync(
  config: ToolConfig,
  repositoryEnv: GitHubRepositoryEnv,
) {
  if (config.repo !== repositoryEnv.repositoryName) {
    throw new Error(
      `tool.config.json の repo (${config.repo}) と実際の repo 名 (${repositoryEnv.repositoryName}) が一致しません。`,
    );
  }

  if (config.owner !== repositoryEnv.repositoryOwner) {
    throw new Error(
      `tool.config.json の owner (${config.owner}) と実際の owner (${repositoryEnv.repositoryOwner}) が一致しません。`,
    );
  }

  for (const key of ["id", "name", "owner", "repo"] as const) {
    if (isPlaceholderValue(config[key])) {
      throw new Error(`tool.config.json の ${key} がプレースホルダーのままです。`);
    }
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(config.id)) {
    throw new Error("tool.config.json の id は英小文字・数字・ハイフンのみで指定してください。");
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(config.namespace)) {
    throw new Error(
      "tool.config.json の namespace は英小文字・数字・ハイフンのみで指定してください。",
    );
  }
}

function isCatalogMode(value: unknown): value is CatalogMode {
  return value === "publish" || value === "hide" || value === "remove";
}

function readRequiredString(value: Record<string, unknown>, key: string) {
  const fieldValue = value[key];
  if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
    throw new Error(`tool.config.json の必須項目 ${key} が不足しています。`);
  }

  return fieldValue;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
