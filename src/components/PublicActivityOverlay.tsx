"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useRifaConfigState } from "@/components/use-rifa-config";

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
          {config.activityClosed ? (
            <p className="text-2xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-4xl">esta actividad finalizo</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
