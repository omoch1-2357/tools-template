import { Buffer } from "node:buffer";
import { createSign } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  loadToolConfig,
  parseServiceAccountJson,
  readGitHubRepositoryEnv,
  validateToolConfigForCatalogSync,
} from "./catalog-sync/config";
import { buildCatalogSyncRequest, type CatalogSyncRequest } from "./catalog-sync/firestore";
import type { ServiceAccount } from "./catalog-sync/types";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  console.log("Skipped catalog sync because FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  console.log("::notice::Skipped catalog sync because FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  await appendStepSummary(
    "Skipped catalog sync because `FIREBASE_SERVICE_ACCOUNT_JSON` is not set.",
  );
  process.exit(0);
}

const serviceAccount = parseServiceAccountJson(serviceAccountJson);
const configPath = resolve(process.cwd(), "tool.config.json");
const config = await loadToolConfig(configPath);
const repositoryEnv = readGitHubRepositoryEnv(process.env);

validateToolConfigForCatalogSync(config, repositoryEnv);

const syncRequest = buildCatalogSyncRequest(config, repositoryEnv, serviceAccount.projectId);
const token = await getAccessToken(serviceAccount);

await executeCatalogSyncRequest(syncRequest, token);

if (syncRequest.mode === "remove") {
  console.log(`Removed tools/${syncRequest.documentId}`);
} else {
  console.log(`Synced tools/${syncRequest.documentId}`);
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

async function executeCatalogSyncRequest(request: CatalogSyncRequest, token: string) {
  if (request.mode === "remove") {
    const response = await fetch(request.documentUrl, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Firestore catalog delete failed: ${await response.text()}`);
    }

    return;
  }

  const response = await fetch(request.commitUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(request.body),
  });

  if (!response.ok) {
    throw new Error(`Firestore catalog sync failed: ${await response.text()}`);
  }
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
