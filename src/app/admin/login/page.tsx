"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data?.error || "No se pudo iniciar sesion.");
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/admin");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0a0a] px-4 text-white">
      <form onSubmit={login} className="w-full max-w-sm rounded-[8px] border border-white/12 bg-white/[0.045] p-5 shadow-2xl shadow-black/30">
        <div className="mb-5 grid size-12 place-items-center rounded-[8px] bg-lime-300 text-black">
          <LockKeyhole className="size-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Admin</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold uppercase">Iniciar sesion</h1>

        <label className="mt-6 block">
          <span className="text-sm font-bold text-white/75">Usuario</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold text-white/75">Contrasena</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300"
          />
        </label>

        {error && <p className="mt-4 rounded-[8px] border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}

        <button disabled={loading} className="mt-5 w-full rounded-[8px] bg-lime-300 px-5 py-3 font-extrabold uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Entrando" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
