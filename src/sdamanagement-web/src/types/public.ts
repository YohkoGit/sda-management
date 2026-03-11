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
