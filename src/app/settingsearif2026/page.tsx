"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Save, Star, Trash2 } from "lucide-react";
import { rifaConfig, type RifaConfig, type RifaPackage } from "@/config/rifa";
import { formatCOP } from "@/components/utils";

function emptyPackage(index: number): RifaPackage {
  return {
    id: `paquete-${index + 1}`,
    name: `Paquete ${index + 1}`,
    wallpapers: 5,
    rifas: 5,
    price: 2500,
    featured: false,
  };
}

export default function AdminRifaSettingsPage() {
  const [config, setConfig] = useState<RifaConfig>(rifaConfig);
  const [status, setStatus] = useState("Cargando configuracion...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/rifa/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data?.config) setConfig(data.config);
        setStatus(data?.configured ? "Configuracion cargada desde Supabase." : "Usando configuracion base. Guarda para persistir cambios.");
      })
      .catch(() => setStatus("No se pudo leer la configuracion. Revisa Supabase."));
  }, []);

  function updatePackage(index: number, patch: Partial<RifaPackage>) {
    setConfig((current) => ({
      ...current,
      packages: current.packages.map((pack, itemIndex) => (itemIndex === index ? { ...pack, ...patch } : pack)),
    }));
  }

  function markFeatured(index: number) {
    setConfig((current) => ({
      ...current,
      packages: current.packages.map((pack, itemIndex) => ({ ...pack, featured: itemIndex === index })),
    }));
  }

  function removePackage(index: number) {
    setConfig((current) => ({
      ...current,
      packages: current.packages.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("Guardando...");

    const response = await fetch("/api/rifa/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setStatus(data?.error || "No se pudo guardar.");
      return;
    }

    setConfig(data.config);
    setStatus("Cambios guardados. La pagina publica ya puede leer esta configuracion.");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <form onSubmit={save} className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Admin interno</p>
            <h1 className="mt-3 font-heading text-4xl font-extrabold uppercase leading-none sm:text-6xl">
              Rifa settings
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">{status}</p>
          </div>
          <button
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-lime-300 px-5 py-3 font-extrabold uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-5" />
            {saving ? "Guardando" : "Guardar cambios"}
          </button>
        </header>

        <section className="grid gap-4 py-6 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm font-bold text-white/76">Nombre de la rifa</span>
            <input value={config.eventName} onChange={(event) => setConfig({ ...config, eventName: event.target.value })} className="mt-2 w-full rounded-[8px] border border-white/12 bg-white/[0.045] px-4 py-3 text-white outline-none focus:border-lime-300" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Vendedor / marca</span>
            <input value={config.sellerName} onChange={(event) => setConfig({ ...config, sellerName: event.target.value })} className="mt-2 w-full rounded-[8px] border border-white/12 bg-white/[0.045] px-4 py-3 text-white outline-none focus:border-lime-300" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Loteria</span>
            <input value={config.lotteryName} onChange={(event) => setConfig({ ...config, lotteryName: event.target.value })} className="mt-2 w-full rounded-[8px] border border-white/12 bg-white/[0.045] px-4 py-3 text-white outline-none focus:border-lime-300" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Total numeros</span>
            <input type="number" min={1} value={config.totalTickets} onChange={(event) => setConfig({ ...config, totalTickets: Number(event.target.value) })} className="mt-2 w-full rounded-[8px] border border-white/12 bg-white/[0.045] px-4 py-3 text-white outline-none focus:border-lime-300" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Precio base por numero</span>
            <input type="number" min={0} value={config.ticketPrice} onChange={(event) => setConfig({ ...config, ticketPrice: Number(event.target.value) })} className="mt-2 w-full rounded-[8px] border border-white/12 bg-white/[0.045] px-4 py-3 text-white outline-none focus:border-lime-300" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-bold text-white/76">Hora</span>
              <input type="number" min={0} max={23} value={config.drawHour} onChange={(event) => setConfig({ ...config, drawHour: Number(event.target.value) })} className="mt-2 w-full rounded-[8px] border border-white/12 bg-white/[0.045] px-4 py-3 text-white outline-none focus:border-lime-300" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-white/76">Minuto</span>
              <input type="number" min={0} max={59} value={config.drawMinute} onChange={(event) => setConfig({ ...config, drawMinute: Number(event.target.value) })} className="mt-2 w-full rounded-[8px] border border-white/12 bg-white/[0.045] px-4 py-3 text-white outline-none focus:border-lime-300" />
            </label>
          </div>
        </section>

        <section className="py-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Paquetes</p>
              <h2 className="mt-2 font-heading text-3xl font-bold">Precios y rifas</h2>
            </div>
            <button type="button" onClick={() => setConfig({ ...config, packages: [...config.packages, emptyPackage(config.packages.length)] })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-white/14 px-4 py-2 font-bold text-white transition hover:border-lime-300 hover:text-lime-300">
              <Plus className="size-5" />
              Agregar paquete
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {config.packages.map((pack, index) => (
              <article key={`${pack.id}-${index}`} className="rounded-[8px] border border-white/12 bg-white/[0.045] p-4 shadow-xl shadow-black/20">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-2xl font-bold text-lime-300">{formatCOP(pack.price || 0)}</p>
                    <p className="mt-1 text-sm text-white/55">{pack.rifas} numeros</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => markFeatured(index)} className={`grid size-10 place-items-center rounded-[8px] border transition ${pack.featured ? "border-lime-300 bg-lime-300 text-black" : "border-white/12 text-white/65 hover:text-lime-300"}`} title="Marcar popular">
                      <Star className="size-5" />
                    </button>
                    <button type="button" onClick={() => removePackage(index)} className="grid size-10 place-items-center rounded-[8px] border border-white/12 text-white/65 transition hover:border-red-300 hover:text-red-200" title="Eliminar">
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">ID</span>
                    <input value={pack.id} onChange={(event) => updatePackage(index, { id: event.target.value })} className="mt-1 w-full rounded-[8px] border border-white/12 bg-black/30 px-3 py-2 text-white outline-none focus:border-lime-300" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">Nombre</span>
                    <input value={pack.name} onChange={(event) => updatePackage(index, { name: event.target.value })} className="mt-1 w-full rounded-[8px] border border-white/12 bg-black/30 px-3 py-2 text-white outline-none focus:border-lime-300" />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">Wallpapers</span>
                      <input type="number" min={1} value={pack.wallpapers} onChange={(event) => updatePackage(index, { wallpapers: Number(event.target.value) })} className="mt-1 w-full rounded-[8px] border border-white/12 bg-black/30 px-3 py-2 text-white outline-none focus:border-lime-300" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">Rifas</span>
                      <input type="number" min={1} value={pack.rifas} onChange={(event) => updatePackage(index, { rifas: Number(event.target.value) })} className="mt-1 w-full rounded-[8px] border border-white/12 bg-black/30 px-3 py-2 text-white outline-none focus:border-lime-300" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">Precio</span>
                      <input type="number" min={0} value={pack.price} onChange={(event) => updatePackage(index, { price: Number(event.target.value) })} className="mt-1 w-full rounded-[8px] border border-white/12 bg-black/30 px-3 py-2 text-white outline-none focus:border-lime-300" />
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </form>
    </main>
  );
}
