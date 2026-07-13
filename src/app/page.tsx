import type { Metadata } from "next";
import { LandingPage } from "@/components/turnos/landing-page";
import { JsonLd } from "@/components/seo/json-ld";
import {
  SITE,
  LANDING_FAQ,
  organizationLd,
  websiteLd,
  softwareApplicationLd,
  faqLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: `${SITE.name} | ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd(), softwareApplicationLd(), faqLd(LANDING_FAQ)]} />
      <LandingPage />
    </>
  );
}
