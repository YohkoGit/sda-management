import { useAuth } from "@/contexts/AuthContext";
import { SetupChecklist } from "@/components/setup";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { MyAssignmentsSection } from "@/components/assignments/MyAssignmentsSection";
import { DashboardUpcomingSection } from "@/components/dashboard/DashboardUpcomingSection";

export default function DashboardPage() {
  const { user } = useAuth();
  const isOwner = user?.role?.toUpperCase() === "OWNER";

  return (
    <div className="mx-auto max-w-6xl space-y-14">
      <DashboardGreeting />
      {isOwner && <SetupChecklist />}
      <MyAssignmentsSection />
      <DashboardUpcomingSection />
    </div>
  );
}
