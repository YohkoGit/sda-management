import HeroSection from "@/components/public/HeroSection";

export default function HomePage() {
  return (
    <div>
      <HeroSection />

      {/* Future: Story 5.2 — YouTube live stream embed */}
      <section className="mx-auto max-w-7xl px-4 py-6">{/* YouTube embed */}</section>

      {/* Future: Story 5.3 — Upcoming activities & program times */}
      <section className="mx-auto max-w-7xl px-4 py-6">{/* Upcoming activities */}</section>

      {/* Future: Story 5.4 — Public department overview */}
      <section className="mx-auto max-w-7xl px-4 py-6">{/* Departments */}</section>
    </div>
  );
}
