const wallpapers = [
  "from-lime-300 via-cyan-300 to-fuchsia-500",
  "from-orange-300 via-lime-300 to-emerald-500",
  "from-white via-lime-200 to-yellow-300",
  "from-rose-500 via-purple-500 to-lime-300",
  "from-sky-300 via-lime-300 to-black",
  "from-amber-200 via-red-400 to-lime-300",
];

export function WallpaperGallery() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Wallpapers incluidos</p>
          <h2 className="mt-3 font-heading text-4xl font-bold text-white sm:text-5xl">Previews listos para desbloquear</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          {wallpapers.map((gradient, index) => (
            <div key={gradient} className="aspect-[3/4] overflow-hidden rounded-[8px] border border-white/12 bg-white/[0.04] p-2">
              <div className={`relative h-full rounded-[6px] bg-gradient-to-br ${gradient}`}>
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.05),rgba(0,0,0,0.42)),repeating-linear-gradient(90deg,rgba(255,255,255,0.12)_0_1px,transparent_1px_28px)]" />
                <div className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                  Drop {String(index + 1).padStart(2, "0")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
