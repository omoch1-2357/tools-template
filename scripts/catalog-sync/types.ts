export type CatalogMode = "publish" | "hide" | "remove";

export type ToolConfig = {
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

export type ServiceAccount = {
  clientEmail: string;
  privateKey: string;
  projectId: string;
};

export type GitHubRepositoryEnv = {
  repository: string;
  repositoryOwner: string;
  repositoryName: string;
};
