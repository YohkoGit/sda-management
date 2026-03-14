export interface CoAssignee {
  userId: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isGuest: boolean;
}

export interface MyAssignmentItem {
  activityId: number;
  activityTitle: string;
  date: string; // "yyyy-MM-dd"
  startTime: string; // "HH:mm:ss"
  endTime: string; // "HH:mm:ss"
  departmentName: string;
  departmentAbbreviation: string;
  departmentColor: string;
  specialType: string | null;
  roleName: string;
  coAssignees: CoAssignee[];
}
