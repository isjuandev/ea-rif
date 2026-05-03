"use client";

import { useEffect, useState } from "react";
import { rifaConfig, type RifaConfig } from "@/config/rifa";

type RifaConfigState = {
  config: RifaConfig;
  loading: boolean;
  configured: boolean;
};

export function useRifaConfigState(): RifaConfigState {
  const [config, setConfig] = useState<RifaConfig>(rifaConfig);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/rifa/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        if (data?.config) setConfig(data.config);
        setConfigured(Boolean(data?.configured));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { config, loading, configured };
}

export function useRifaConfig() {
  const { config } = useRifaConfigState();
  return config;
}
