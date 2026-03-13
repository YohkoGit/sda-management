import HeroSection from "@/components/public/HeroSection";
import YouTubeSection from "@/components/public/YouTubeSection";
import UpcomingActivitiesSection from "@/components/public/UpcomingActivitiesSection";
import ProgramTimesSection from "@/components/public/ProgramTimesSection";

export default function HomePage() {
  return (
    <div>
      <HeroSection />

      <YouTubeSection />

      <UpcomingActivitiesSection />

      <ProgramTimesSection />

      {/* Future: Story 5.4 — Public department overview */}
      <section className="mx-auto max-w-7xl px-4 py-6">{/* Departments */}</section>
    </div>
  );
}
