export enum ApiKeyScope {
  PROJECTS_READ = 'projects:read',
  PROJECTS_WRITE = 'projects:write',
  BUILDS_READ = 'builds:read',
  BUILDS_TRIGGER = 'builds:trigger',
}

export const API_KEY_SCOPES: readonly ApiKeyScope[] = Object.values(ApiKeyScope);
