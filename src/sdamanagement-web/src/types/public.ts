export interface PublicNextActivity {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  departmentName: string | null;
  departmentAbbreviation: string | null;
  departmentColor: string | null;
  predicateurName: string | null;
  predicateurAvatarUrl: string | null;
  specialType: string | null;
}

export interface LiveStatus {
  isLive: boolean;
  liveVideoId: string | null;
  liveTitle: string | null;
}

export interface PublicActivityListItem {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  departmentName: string | null;
  departmentAbbreviation: string | null;
  departmentColor: string | null;
  predicateurName: string | null;
  predicateurAvatarUrl: string | null;
  specialType: string | null;
}

export interface PublicDepartment {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
  description: string | null;
  nextActivityTitle: string | null;
  nextActivityDate: string | null;
  nextActivityStartTime: string | null;
}

export interface PublicProgramSchedule {
  title: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string;
  endTime: string;
  hostName: string | null;
  departmentName: string | null;
  departmentColor: string | null;
}
