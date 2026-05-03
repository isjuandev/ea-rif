"use client";

import { useRifaConfig } from "@/components/use-rifa-config";

export function Footer() {
  const rifaConfig = useRifaConfig();

  return (
    <footer className="border-t border-white/10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-2xl font-bold text-white">{rifaConfig.sellerName}</p>
          <p className="mt-2 max-w-xl text-xs leading-5 text-white/45">
            Compra tus entradas digitales. Entrega inmediata.
          </p>
        </div>
        <div className="flex gap-3">
          <a href={rifaConfig.socialLinks.instagram} target="_blank" rel="noreferrer" className="grid size-11 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-lime-300 hover:text-lime-300">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
              <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.5 1.8h-8.5A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95ZM12 7.6a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8Zm0 1.8a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Zm4.95-2.4a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z" />
            </svg>
            <span className="sr-only">Instagram</span>
          </a>
          <a href={rifaConfig.socialLinks.whatsapp} target="_blank" rel="noreferrer" className="grid size-11 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-lime-300 hover:text-lime-300">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
              <path d="M12 2.2c-5.4 0-9.8 4.2-9.8 9.5 0 1.9.6 3.7 1.7 5.3L2.2 22l5.2-1.6a9.9 9.9 0 0 0 4.6 1.1c5.4 0 9.8-4.2 9.8-9.5s-4.4-9.8-9.8-9.8Zm0 17.5c-1.4 0-2.8-.4-4-1.1l-.3-.2-3.1.9.9-3-.2-.3a7.8 7.8 0 0 1-1.2-4.1c0-4.3 3.5-7.8 7.9-7.8s7.9 3.5 7.9 7.8-3.5 7.8-7.9 7.8Zm4.3-5.8c-.2-.1-1.3-.6-1.5-.7-.2-.1-.3-.1-.5.1l-.7.8c-.1.1-.3.2-.4.1-.2-.1-.9-.3-1.7-1a6.4 6.4 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.3-.3.2-.4c.1-.1.1-.3 0-.4l-.7-1.5c-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.4.1-.5.3-.2.2-.7.7-.7 1.7s.7 1.9.8 2.1c.1.1 1.4 2.2 3.4 3 .5.2 1 .3 1.3.4.5.2 1 .1 1.4.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1 0-.1-.2-.2-.4-.3Z" />
            </svg>
            <span className="sr-only">WhatsApp</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
