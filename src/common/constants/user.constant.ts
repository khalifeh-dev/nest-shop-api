export enum AccountAction {
    USER_DELETE_REASON = "USER_REQUEST_ACTION",
    ADMIN_DELETE_REASON = "ADMIN_REQUEST_ACTION",
}

export enum UserStatus {
  Active = 'ACTIVE',
  In_Active = 'INACTIVE',
  Banned = 'BANNED',
  Restore = "RESTORE",
  SoftDelete = "SOFTDELETE"
}
export enum UserActions {
  SoftDelete = "soft_delete",
  Restore = "restore",
  Ban = "ban",
  InActive = "inactive",
  Active = "active",
}