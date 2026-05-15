import { useRole } from "@/hooks/useRole";
import { SetupChecklist } from "@/components/setup";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { MyAssignmentsSection } from "@/components/assignments/MyAssignmentsSection";
import { DashboardUpcomingSection } from "@/components/dashboard/DashboardUpcomingSection";
import { SabbathCard } from "@/components/dashboard/SabbathCard";

export default function DashboardPage() {
  const { isOwner } = useRole();

  return (
    <div className="mx-auto max-w-7xl">
      <DashboardGreeting />
      {isOwner && (
        <div className="mt-10">
          <SetupChecklist />
        </div>
      )}
      <div className="mt-12 grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="space-y-14 min-w-0">
          <MyAssignmentsSection />
          <DashboardUpcomingSection />
        </div>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SabbathCard />
        </aside>
      </div>
    </div>
  );
}
