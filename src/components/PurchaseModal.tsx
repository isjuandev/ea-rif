"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle, Smartphone } from "lucide-react";
import { rifaConfig, type RifaPackage } from "@/config/rifa";
import { formatCOP } from "@/components/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Buyer = {
  name: string;
  whatsapp: string;
  email: string;
};

export function PurchaseModal({
  selectedPackage,
  open,
  onOpenChange,
}: {
  selectedPackage: RifaPackage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(1);
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [buyer, setBuyer] = useState<Buyer>({ name: "", whatsapp: "+57 ", email: "" });
  const [ticketNumbers, setTicketNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validBuyer = buyer.name.trim().length >= 3 && buyer.whatsapp.replace(/\D/g, "").length >= 10 && buyer.email.includes("@");

  function buildWhatsappHref(numbers: string[]) {
    if (!selectedPackage) return "#";
    const message = [
      `Hola, quiero comprar el paquete ${selectedPackage.name}.`,
      `Nombre: ${buyer.name}`,
      `WhatsApp: ${buyer.whatsapp}`,
      buyer.email ? `Email: ${buyer.email}` : "",
      `Wallpapers: ${selectedPackage.wallpapers}`,
      `Rifas incluidas: ${selectedPackage.rifas}`,
      numbers.length ? `Numeros asignados: ${numbers.join(", ")}` : "",
      `Precio: ${formatCOP(selectedPackage.price)}`,
    ]
      .filter(Boolean)
      .join("\n");

    return `https://wa.me/${rifaConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  async function registerPurchase(paymentMethod: "whatsapp" | "nequi" | "daviplata") {
    if (!selectedPackage || !validBuyer) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          buyerName: buyer.name,
          buyerWhatsapp: buyer.whatsapp,
          buyerEmail: buyer.email,
          paymentMethod,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo registrar la compra.");

      const numbers = data.ticketNumbers ?? [];
      setTicketNumbers(numbers);

      if (paymentMethod === "whatsapp") {
        window.open(buildWhatsappHref(numbers), "_blank", "noopener,noreferrer");
      }

      setStep(3);
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : "No se pudo registrar la compra.");
    } finally {
      setLoading(false);
    }
  }

  function reset(openValue: boolean) {
    onOpenChange(openValue);
    if (!openValue) {
      window.setTimeout(() => {
        setStep(1);
        setShowManualPayment(false);
        setBuyer({ name: "", whatsapp: "+57 ", email: "" });
        setTicketNumbers([]);
        setError("");
        setLoading(false);
      }, 200);
    }
  }

  if (!selectedPackage) return null;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compra tu paquete {selectedPackage.name}</DialogTitle>
          <DialogDescription>Paso {step} de 3</DialogDescription>
        </DialogHeader>

        <div className="mb-6 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-lime-300" : "bg-white/10"}`} />
          ))}
        </div>

        {step === 1 && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (validBuyer) setStep(2);
            }}
          >
            <label className="block">
              <span className="text-sm font-bold text-white/80">Nombre completo</span>
              <input
                required
                value={buyer.name}
                onChange={(event) => setBuyer({ ...buyer, name: event.target.value })}
                className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-lime-300"
                placeholder="Tu nombre"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-white/80">Numero de WhatsApp</span>
              <input
                required
                value={buyer.whatsapp}
                onChange={(event) => setBuyer({ ...buyer, whatsapp: event.target.value })}
                className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-lime-300"
                placeholder="+57 300 123 4567"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-white/80">Email para entrega</span>
              <input
                type="email"
                required
                value={buyer.email}
                onChange={(event) => setBuyer({ ...buyer, email: event.target.value })}
                className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-lime-300"
                placeholder="correo@ejemplo.com"
              />
            </label>
            <button disabled={!validBuyer} className="w-full rounded-[8px] bg-lime-300 px-5 py-3 font-extrabold uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
              Continuar
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-[8px] border border-white/12 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-2xl font-bold">{selectedPackage.name}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {selectedPackage.wallpapers} wallpapers + {selectedPackage.rifas} rifas
                  </p>
                </div>
                <p className="font-heading text-2xl font-bold text-lime-300">{formatCOP(selectedPackage.price)}</p>
              </div>
            </div>
            {error && <p className="rounded-[8px] border border-red-400/35 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
            <button disabled={loading} onClick={() => registerPurchase("whatsapp")} className="flex w-full items-center justify-center gap-3 rounded-[8px] bg-lime-300 px-5 py-3 font-extrabold uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
              <MessageCircle className="size-5" />
              {loading ? "Asignando numeros..." : "Pagar por WhatsApp"}
            </button>
            <button onClick={() => setShowManualPayment(true)} className="flex w-full items-center justify-center gap-3 rounded-[8px] border border-white/14 bg-white/[0.06] px-5 py-3 font-extrabold uppercase text-white transition hover:border-lime-300/60">
              <Smartphone className="size-5" />
              Pagar por Nequi/Daviplata
            </button>
            {showManualPayment && (
              <div className="rounded-[8px] border border-lime-300/35 bg-lime-300/8 p-4 text-sm text-white/76">
                <p>Nequi: <strong className="text-white">{rifaConfig.nequiNumber}</strong></p>
                <p>Daviplata: <strong className="text-white">{rifaConfig.daviplataNumber}</strong></p>
                <button disabled={loading} onClick={() => registerPurchase("nequi")} className="mt-4 w-full rounded-[8px] bg-white px-5 py-3 font-extrabold uppercase text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? "Asignando numeros..." : "Ya pague"}
                </button>
              </div>
            )}
            <button onClick={() => setStep(1)} className="w-full py-2 text-sm font-bold text-white/55 transition hover:text-white">
              Volver a mis datos
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto size-16 text-lime-300" />
            <h3 className="mt-5 font-heading text-3xl font-bold">Gracias</h3>
            <p className="mx-auto mt-3 max-w-sm text-white/68">
              Tus numeros quedaron asignados y tambien los enviaremos a tu correo.
            </p>
            {ticketNumbers.length > 0 && (
              <div className="mx-auto mt-5 flex max-w-sm flex-wrap justify-center gap-2">
                {ticketNumbers.map((number) => (
                  <span key={number} className="rounded-[6px] border border-lime-300/50 bg-lime-300/10 px-3 py-2 font-heading text-lg font-bold text-lime-300">
                    {number}
                  </span>
                ))}
              </div>
            )}
            <button onClick={() => reset(false)} className="mt-7 rounded-[8px] bg-lime-300 px-8 py-3 font-extrabold uppercase text-black">
              Cerrar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
