import HeroSection from "@/components/public/HeroSection";
import YouTubeSection from "@/components/public/YouTubeSection";

export default function HomePage() {
  return (
    <div>
      <HeroSection />

      <YouTubeSection />

      {/* Future: Story 5.3 — Upcoming activities & program times */}
      <section className="mx-auto max-w-7xl px-4 py-6">{/* Upcoming activities */}</section>

      {/* Future: Story 5.4 — Public department overview */}
      <section className="mx-auto max-w-7xl px-4 py-6">{/* Departments */}</section>
    </div>
  );
}
