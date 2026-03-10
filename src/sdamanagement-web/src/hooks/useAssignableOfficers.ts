import { useQuery } from "@tanstack/react-query";
import { userService, type AssignableOfficer } from "@/services/userService";

export interface DepartmentGroup {
  departmentName: string;
  officers: AssignableOfficer[];
}

export function groupByDepartment(officers: AssignableOfficer[]): DepartmentGroup[] {
  const groupMap = new Map<string, AssignableOfficer[]>();

  for (const officer of officers) {
    if (officer.departments.length === 0) {
      const key = "Sans département";
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(officer);
    } else {
      for (const dept of officer.departments) {
        if (!groupMap.has(dept.name)) groupMap.set(dept.name, []);
        groupMap.get(dept.name)!.push(officer);
      }
    }
  }

  return Array.from(groupMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([departmentName, officers]) => ({ departmentName, officers }));
}

export function useAssignableOfficers() {
  const { data, isPending, error } = useQuery({
    queryKey: ["assignable-officers"],
    queryFn: async () => {
      const res = await userService.getAssignableOfficers();
      return res.data.items;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    officers: data ?? [],
    isPending,
    error,
  };
}
