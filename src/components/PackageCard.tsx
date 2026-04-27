"use client";

import { Ticket } from "lucide-react";
import { type RifaPackage } from "@/config/rifa";
import { cn, formatCOP } from "@/components/utils";

export function PackageCard({
  pack,
  disabled = false,
  disabledReason = "Agotado",
  onBuy,
}: {
  pack: RifaPackage;
  disabled?: boolean;
  disabledReason?: string;
  onBuy: (pack: RifaPackage) => void;
}) {
  return (
    <article
      className={cn(
        "group relative flex h-full min-w-0 flex-col rounded-[8px] border border-white/12 bg-white/[0.045] p-4 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-lime-300/70 hover:shadow-[0_0_34px_rgba(170,255,0,0.22)]",
        pack.featured && "border-lime-300/80 shadow-[0_0_28px_rgba(170,255,0,0.18)]",
        disabled && "opacity-55 hover:translate-y-0 hover:border-white/12 hover:shadow-xl",
      )}
    >
      {pack.featured && (
        <div className="absolute -top-3 left-4 rounded-full bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-black">
          Mas popular
        </div>
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-heading text-2xl font-bold leading-tight text-white">{pack.name}</h3>
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-lime-300/12 text-lime-300">
          <Ticket className="size-5" />
        </div>
      </div>
      <p className="font-heading text-3xl font-bold text-lime-300">{formatCOP(pack.price)}</p>
      <div className="mt-5 space-y-2 text-sm text-white/72">
        <p>{pack.wallpapers} wallpaper{pack.wallpapers > 1 ? "s" : ""} digital{pack.wallpapers > 1 ? "es" : ""}</p>
        <p>{pack.rifas} numeros de rifa</p>

      </div>
      <button
        disabled={disabled}
        onClick={() => onBuy(pack)}
        className="mt-6 rounded-[8px] bg-white px-5 py-3 font-extrabold uppercase text-black transition group-hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-white/18 disabled:text-white/45"
      >
        {disabled ? disabledReason : "Comprar"}
      </button>
    </article>
  );
}
