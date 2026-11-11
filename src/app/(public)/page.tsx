import { CeremonyStrip } from "@/components/landing/CeremonyStrip";
import { Hero } from "@/components/landing/Hero";
import { landingAccount } from "@/components/landing/landing-account";
import { LandingHeader } from "@/components/landing/LandingHeader";

/**
 * Public landing page, from the Stitch design (docs/decisions.md, decision
 * 47). Signed-in visitors see a way back into their wedding (decision 59).
 */
export default async function LandingPage() {
  const account = await landingAccount();
  return (
    <>
      <LandingHeader />
      <main>
        <Hero account={account} />
        <CeremonyStrip />
      </main>
    </>
  );
}
