import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { PackagesSection } from "@/components/PackagesSection";
import { PreviousWinners } from "@/components/PreviousWinners";
import { ProgressBar } from "@/components/ProgressBar";
import { WallpaperGallery } from "@/components/WallpaperGallery";

export default function Home() {
  return (
    <main>
      <Hero />
      <PackagesSection />
      <ProgressBar />
      <WallpaperGallery />
      <PreviousWinners />
      <FAQ />
      <Footer />
    </main>
  );
}
