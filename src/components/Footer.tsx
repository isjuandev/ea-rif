import { Camera, MessageCircle } from "lucide-react";
import { rifaConfig } from "@/config/rifa";

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-2xl font-bold text-white">{rifaConfig.sellerName}</p>
          <p className="mt-2 max-w-xl text-xs leading-5 text-white/45">
            Compra de wallpapers digitales con numeros asignados para sorteo. Participan unicamente compras registradas antes del cierre.
          </p>
        </div>
        <div className="flex gap-3">
          <a href={rifaConfig.socialLinks.instagram} target="_blank" rel="noreferrer" className="grid size-11 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-lime-300 hover:text-lime-300">
            <Camera className="size-5" />
            <span className="sr-only">Instagram</span>
          </a>
          <a href={rifaConfig.socialLinks.whatsapp} target="_blank" rel="noreferrer" className="grid size-11 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-lime-300 hover:text-lime-300">
            <MessageCircle className="size-5" />
            <span className="sr-only">WhatsApp</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
