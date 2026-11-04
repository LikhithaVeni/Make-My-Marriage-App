import { CeremonyStrip } from "@/components/landing/CeremonyStrip";
import { Hero } from "@/components/landing/Hero";
import { LandingHeader } from "@/components/landing/LandingHeader";

/** Public landing page, from the Stitch design (docs/decisions.md, decision 47). */
export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
        <CeremonyStrip />
      </main>
    </>
  );
}
