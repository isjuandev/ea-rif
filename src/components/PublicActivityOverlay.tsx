"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRifaConfigState } from "@/components/use-rifa-config";
import khalifaDesktopImage from "@/public/images/khalifaD.png";

const ADMIN_PATH_PREFIX = "/admin";
const LEGACY_ADMIN_PATH = "/settingsearif2026";

function isPublicPath(pathname: string) {
  if (!pathname) return true;
  if (pathname.startsWith(ADMIN_PATH_PREFIX)) return false;
  if (pathname.startsWith(LEGACY_ADMIN_PATH)) return false;
  return true;
}

export default function PublicActivityOverlay({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { config, loading } = useRifaConfigState();
  const isPublic = isPublicPath(pathname);
  const shouldBlock = isPublic && (loading || config.activityClosed);

  return (
    <>
      {children}
      {shouldBlock ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-6 text-center" role="alert" aria-live="polite">
          <Image
            src={khalifaDesktopImage}
            alt=""
            fill
            priority
            className="absolute inset-0 object-cover opacity-100"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/85" />
          {config.activityClosed ? (
            <div className="relative z-10 space-y-3 text-center">
              <p className="text-2xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-4xl">esta actividad finalizo - atento a nuestras redes</p>
              {config.socialLinks?.instagram ? (
                <a
                  href={config.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md border border-lime-300/60 bg-lime-300/15 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-lime-200 transition hover:bg-lime-300 hover:text-primary-foreground"
                >
                  Ir a Instagram
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
