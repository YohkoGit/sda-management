export interface ActivityNotification {
  activityId: number;
  title: string;
  date: string;
  departmentId: number | null;
  visibility: string;
  concurrencyToken: number;
  timestamp: string;
  updatedFields: string | null;
}

export interface ActivityDeletedNotification {
  activityId: number;
  departmentId: number | null;
  visibility: string;
  timestamp: string;
}
