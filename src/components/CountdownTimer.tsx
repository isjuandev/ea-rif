"use client";

import { useEffect, useMemo, useState } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(targetDate: string): TimeLeft {
  const diff = Math.max(new Date(targetDate).getTime() - Date.now(), 0);

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function CountdownTimer({ drawDate }: { drawDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(drawDate));

  useEffect(() => {
    const interval = window.setInterval(() => setTimeLeft(getTimeLeft(drawDate)), 1000);
    return () => window.clearInterval(interval);
  }, [drawDate]);

  const units = useMemo(
    () => [
      { label: "Dias", value: timeLeft.days },
      { label: "Horas", value: timeLeft.hours },
      { label: "Min", value: timeLeft.minutes },
      { label: "Seg", value: timeLeft.seconds },
    ],
    [timeLeft],
  );

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-label="Cuenta regresiva del sorteo">
      {units.map((unit) => (
        <div key={unit.label} className="relative overflow-hidden rounded-[8px] border border-white/12 bg-white/[0.06] p-2 text-center shadow-xl shadow-black/30 sm:p-4">
          <div className="absolute inset-x-0 top-1/2 h-px bg-black/40" />
          <div className="font-heading text-3xl font-bold leading-none tracking-normal text-white sm:text-5xl">
            {String(unit.value).padStart(2, "0")}
          </div>
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-300 sm:text-xs">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}
