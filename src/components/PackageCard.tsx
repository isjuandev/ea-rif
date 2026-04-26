"use client";

import { Ticket } from "lucide-react";
import { type RifaPackage } from "@/config/rifa";
import { cn, formatCOP } from "@/components/utils";

export function PackageCard({ pack, onBuy }: { pack: RifaPackage; onBuy: (pack: RifaPackage) => void }) {
  return (
    <article
      className={cn(
        "group relative flex min-w-[260px] flex-col rounded-[8px] border border-white/12 bg-white/[0.045] p-5 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-lime-300/70 hover:shadow-[0_0_34px_rgba(170,255,0,0.22)]",
        pack.featured && "border-lime-300/80 shadow-[0_0_28px_rgba(170,255,0,0.18)]",
      )}
    >
      {pack.featured && (
        <div className="absolute -top-3 left-4 rounded-full bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-black">
          Mas popular
        </div>
      )}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-heading text-3xl font-bold text-white">{pack.name}</h3>
        <div className="grid size-11 place-items-center rounded-full bg-lime-300/12 text-lime-300">
          <Ticket className="size-5" />
        </div>
      </div>
      <p className="font-heading text-4xl font-bold text-lime-300">{formatCOP(pack.price)}</p>
      <div className="mt-6 space-y-3 text-sm text-white/72">
        <p>{pack.wallpapers} wallpaper{pack.wallpapers > 1 ? "s" : ""} digital{pack.wallpapers > 1 ? "es" : ""}</p>
        <p>{pack.rifas} numero{pack.rifas > 1 ? "s" : ""} aleatorio{pack.rifas > 1 ? "s" : ""} de 4 cifras</p>
      </div>
      <button onClick={() => onBuy(pack)} className="mt-7 rounded-[8px] bg-white px-5 py-3 font-extrabold uppercase text-black transition group-hover:bg-lime-300">
        Comprar
      </button>
    </article>
  );
}
