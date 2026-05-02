import { Buffer } from "node:buffer";
import { createSign } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

type CatalogMode = "publish" | "hide" | "remove";

type ToolConfig = {
  namespace: string;
  id: string;
  name: string;
  description: string;
  owner: string;
  repo: string;
  tags: string[];
  catalogMode: CatalogMode;
  visible: boolean;
  sortOrder: number;
};

type ServiceAccount = {
  clientEmail: string;
  privateKey: string;
  projectId: string;
};

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: Array<{ stringValue: string }> } };

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  console.log("Skipped catalog sync because FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  console.log("::notice::Skipped catalog sync because FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  await appendStepSummary(
    "Skipped catalog sync because `FIREBASE_SERVICE_ACCOUNT_JSON` is not set.",
  );
  process.exit(0);
}

const serviceAccount = parseServiceAccount(JSON.parse(serviceAccountJson));
const configPath = resolve(process.cwd(), "tool.config.json");
const config = parseToolConfig(JSON.parse(await readFile(configPath, "utf8")));
const placeholderValues = new Set([
  "replace-this-tool-id",
  "replace-this-owner",
  "replace-this-repo-name",
  "Replace This Tool Name",
]);

const repository = process.env.GITHUB_REPOSITORY;
const repositoryOwner = process.env.GITHUB_REPOSITORY_OWNER;
const repositoryName = process.env.GITHUB_EVENT_REPOSITORY_NAME;

if (!repository || !repositoryOwner || !repositoryName) {
  throw new Error("GitHub Actions の repository 情報が不足しています。");
}

if (config.repo !== repositoryName) {
  throw new Error(
    `tool.config.json の repo (${config.repo}) と実際の repo 名 (${repositoryName}) が一致しません。`,
  );
}

if (config.owner !== repositoryOwner) {
  throw new Error(
    `tool.config.json の owner (${config.owner}) と実際の owner (${repositoryOwner}) が一致しません。`,
  );
}

for (const key of ["id", "name", "owner", "repo"] as const) {
  if (placeholderValues.has(config[key])) {
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

const documentId = `${config.namespace}__${config.id}`;
const token = await getAccessToken(serviceAccount);

if (config.catalogMode === "remove") {
  await deleteDocument(serviceAccount.projectId, token, documentId);
  console.log(`Removed tools/${documentId}`);
} else {
  await updateDocument(serviceAccount.projectId, token, documentId, {
    toolId: stringValue(config.id),
    name: stringValue(config.name),
    description: stringValue(config.description),
    url: stringValue(`https://${repositoryOwner}.github.io/${repositoryName}/`),
    repo: stringValue(repository),
    tags: arrayValue(config.tags),
    visible: booleanValue(config.catalogMode === "hide" ? false : config.visible),
    sortOrder: integerValue(config.sortOrder),
  });

  console.log(`Synced tools/${documentId}`);
}

async function getAccessToken(account: ServiceAccount) {
  const tokenEndpoint = "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {
      alg: "RS256",
      typ: "JWT",
    },
    {
      iss: account.clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: tokenEndpoint,
      iat: now,
      exp: now + 3600,
    },
    account.privateKey,
  );

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const body = (await response.json()) as unknown;
  if (!isObject(body) || !response.ok || typeof body.access_token !== "string") {
    throw new Error(`Google OAuth token を取得できませんでした: ${JSON.stringify(body)}`);
  }

  return body.access_token;
}

function signJwt(
  header: Record<string, string>,
  payload: Record<string, string | number>,
  privateKey: string,
) {
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256").update(unsignedToken).sign(privateKey, "base64url");

  return `${unsignedToken}.${signature}`;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function updateDocument(
  projectId: string,
  token: string,
  documentId: string,
  fields: Record<string, FirestoreValue>,
) {
  const response = await fetch(commitUrl(projectId), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: documentName(projectId, documentId),
            fields,
          },
          updateMask: {
            fieldPaths: Object.keys(fields),
          },
          updateTransforms: [
            {
              fieldPath: "updatedAt",
              setToServerValue: "REQUEST_TIME",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Firestore catalog sync failed: ${await response.text()}`);
  }
}

async function deleteDocument(projectId: string, token: string, documentId: string) {
  const response = await fetch(documentUrl(projectId, documentId), {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Firestore catalog delete failed: ${await response.text()}`);
  }
}

function documentUrl(projectId: string, documentId: string) {
  return `https://firestore.googleapis.com/v1/${documentName(projectId, documentId)}`;
}

function documentName(projectId: string, documentId: string) {
  return `projects/${projectId}/databases/(default)/documents/tools/${encodeURIComponent(documentId)}`;
}

function commitUrl(projectId: string) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
}

function stringValue(value: string): FirestoreValue {
  return { stringValue: value };
}

function booleanValue(value: boolean): FirestoreValue {
  return { booleanValue: value };
}

function integerValue(value: number): FirestoreValue {
  return { integerValue: String(value) };
}

function arrayValue(values: string[]): FirestoreValue {
  return {
    arrayValue: {
      values: values.map((value) => ({ stringValue: value })),
    },
  };
}

function parseServiceAccount(value: unknown): ServiceAccount {
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

function parseToolConfig(value: unknown): ToolConfig {
  if (!isObject(value)) {
    throw new Error("tool.config.json の形式が不正です。");
  }

  const catalogMode = value.catalogMode ?? "publish";
  if (catalogMode !== "publish" && catalogMode !== "hide" && catalogMode !== "remove") {
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

function readRequiredString(value: Record<string, unknown>, key: string) {
  const fieldValue = value[key];
  if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
    throw new Error("tool.config.json の必須項目が不足しています。");
  }

  return fieldValue;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function appendStepSummary(message: string) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  await appendFile(summaryPath, `${message}\n`);
}
