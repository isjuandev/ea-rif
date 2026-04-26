"use client";

import { useState } from "react";
import { PackageCard } from "@/components/PackageCard";
import { PurchaseModal } from "@/components/PurchaseModal";
import { rifaConfig, type RifaPackage } from "@/config/rifa";

export function PackagesSection() {
  const [selectedPackage, setSelectedPackage] = useState<RifaPackage | null>(null);
  const [open, setOpen] = useState(false);

  function handleBuy(pack: RifaPackage) {
    setSelectedPackage(pack);
    setOpen(true);
  }

  return (
    <section id="paquetes" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Paquetes</p>
          <h2 className="mt-3 font-heading text-4xl font-bold text-white sm:text-5xl">Compra wallpapers, recibe rifas</h2>
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {rifaConfig.packages.map((pack) => (
            <div key={pack.id} className="snap-center sm:min-w-0">
              <PackageCard pack={pack} onBuy={handleBuy} />
            </div>
          ))}
        </div>
      </div>
      <PurchaseModal selectedPackage={selectedPackage} open={open} onOpenChange={setOpen} />
    </section>
  );
}
