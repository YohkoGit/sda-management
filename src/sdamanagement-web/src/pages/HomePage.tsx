import HeroSection from "@/components/public/HeroSection";
import YouTubeSection from "@/components/public/YouTubeSection";
import UpcomingActivitiesSection from "@/components/public/UpcomingActivitiesSection";
import ProgramTimesSection from "@/components/public/ProgramTimesSection";
import DepartmentOverviewSection from "@/components/public/DepartmentOverviewSection";

export default function HomePage() {
  return (
    <div>
      <HeroSection />

      <YouTubeSection />

      <UpcomingActivitiesSection />

      <ProgramTimesSection />

      <DepartmentOverviewSection />
    </div>
  );
}
