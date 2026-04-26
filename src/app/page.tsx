import { CompactInfoSection } from "@/components/CompactInfoSection";
import { Footer } from "@/components/Footer";
import { PackagesSection } from "@/components/PackagesSection";

export default function Home() {
  return (
    <main>
      <PackagesSection />
      <CompactInfoSection />
      <Footer />
    </main>
  );
}
