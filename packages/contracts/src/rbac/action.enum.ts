/**
 * CASL action vocabulary shared by every subsystem that checks permissions.
 * `MANAGE` is CASL's special "any action" wildcard.
 */
export enum Action {
  MANAGE = 'manage',
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  INVITE = 'invite',
  REMOVE_MEMBER = 'remove_member',
  TRIGGER_BUILD = 'trigger_build',
  DOWNLOAD_ARTIFACT = 'download_artifact',
}
