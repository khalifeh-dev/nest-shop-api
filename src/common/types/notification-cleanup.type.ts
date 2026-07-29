export interface CleanUpResult {
  notifications: {
    count: number;
    method: 'batch' | 'normal';
    message: string;
  };
  userNotifications: {
    count: number;
    method: 'batch' | 'normal';
    message: string;
  };
  totalCount: number;
  cutoffDate: Date;
  duration: string;
}
