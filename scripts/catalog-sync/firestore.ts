import type { GitHubRepositoryEnv, ToolConfig } from "./types";

export type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: Array<{ stringValue: string }> } };

export type CatalogSyncRequest =
  | {
      mode: "remove";
      documentId: string;
      documentUrl: string;
    }
  | {
      mode: "upsert";
      documentId: string;
      commitUrl: string;
      body: FirestoreCommitBody;
    };

type FirestoreCommitBody = {
  writes: Array<{
    update: {
      name: string;
      fields: Record<string, FirestoreValue>;
    };
    updateMask: {
      fieldPaths: string[];
    };
    updateTransforms: Array<{
      fieldPath: string;
      setToServerValue: "REQUEST_TIME";
    }>;
  }>;
};

export function buildDocumentId(namespace: string, id: string) {
  return `${namespace}__${id}`;
}

export function buildCatalogSyncRequest(
  config: ToolConfig,
  repositoryEnv: GitHubRepositoryEnv,
  projectId: string,
): CatalogSyncRequest {
  const documentId = buildDocumentId(config.namespace, config.id);

  if (config.catalogMode === "remove") {
    return {
      mode: "remove",
      documentId,
      documentUrl: documentUrl(projectId, documentId),
    };
  }

  const fields = buildCatalogFields(config, repositoryEnv);

  return {
    mode: "upsert",
    documentId,
    commitUrl: commitUrl(projectId),
    body: buildUpdateDocumentPayload(projectId, documentId, fields),
  };
}

export function buildCatalogFields(
  config: ToolConfig,
  repositoryEnv: GitHubRepositoryEnv,
): Record<string, FirestoreValue> {
  return {
    toolId: stringValue(config.id),
    name: stringValue(config.name),
    description: stringValue(config.description),
    url: stringValue(
      `https://${repositoryEnv.repositoryOwner}.github.io/${repositoryEnv.repositoryName}/`,
    ),
    repo: stringValue(repositoryEnv.repository),
    tags: arrayValue(config.tags),
    visible: booleanValue(config.catalogMode === "hide" ? false : config.visible),
    sortOrder: integerValue(config.sortOrder),
  };
}

export function buildUpdateDocumentPayload(
  projectId: string,
  documentId: string,
  fields: Record<string, FirestoreValue>,
): FirestoreCommitBody {
  return {
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
  };
}

export function documentUrl(projectId: string, documentId: string) {
  return `https://firestore.googleapis.com/v1/${documentName(projectId, documentId)}`;
}

export function documentName(projectId: string, documentId: string) {
  return `projects/${projectId}/databases/(default)/documents/tools/${encodeURIComponent(documentId)}`;
}

export function commitUrl(projectId: string) {
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
