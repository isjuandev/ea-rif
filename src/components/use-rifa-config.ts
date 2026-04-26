"use client";

import { useEffect, useState } from "react";
import { rifaConfig, type RifaConfig } from "@/config/rifa";

export function useRifaConfig() {
  const [config, setConfig] = useState<RifaConfig>(rifaConfig);

  useEffect(() => {
    let active = true;

    fetch("/api/rifa/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active && data?.config) setConfig(data.config);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return config;
}
