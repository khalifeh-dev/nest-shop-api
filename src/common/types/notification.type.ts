export interface NotificationOptions {
  targetAudience?: 'ALL' | 'ACTIVE_USERS' | 'INACTIVE_USERS' | 'ADMINS';
  customUserIds?: string[];
  batchSize?: number;
}
