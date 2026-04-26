"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard } from "lucide-react";
import { MercadoPagoPaymentBrick } from "@/components/MercadoPagoPaymentBrick";
import { type RifaPackage } from "@/config/rifa";
import { formatCOP } from "@/components/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Buyer = {
  name: string;
  whatsapp: string;
  email: string;
};

const COUNTRY_CODE = "+57";

function formatWhatsapp(localNumber: string) {
  return `${COUNTRY_CODE}${localNumber.replace(/\D/g, "")}`;
}

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
  const [showMercadoPago, setShowMercadoPago] = useState(false);
  const [buyer, setBuyer] = useState<Buyer>({ name: "", whatsapp: "", email: "" });
  const [ticketNumbers, setTicketNumbers] = useState<string[]>([]);
  const [error, setError] = useState("");

  const validBuyer = buyer.name.trim().length >= 3 && formatWhatsapp(buyer.whatsapp).replace(/\D/g, "").length >= 12 && buyer.email.includes("@");

  function reset(openValue: boolean) {
    onOpenChange(openValue);
    if (!openValue) {
      window.setTimeout(() => {
        setStep(1);
        setShowMercadoPago(false);
        setBuyer({ name: "", whatsapp: "", email: "" });
        setTicketNumbers([]);
        setError("");
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

        <div className="mb-5 grid grid-cols-3 gap-2 sm:mb-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-lime-300" : "bg-white/10"}`} />
          ))}
        </div>

        {step === 1 && (
          <form
            className="space-y-3 sm:space-y-4"
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
              <div className="mt-2 flex rounded-[8px] border border-white/12 bg-black/30 transition focus-within:border-lime-300">
                <span className="grid place-items-center border-r border-white/12 px-4 py-3 font-bold text-white/70" aria-hidden="true">
                  {COUNTRY_CODE}
                </span>
                <input
                  required
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={buyer.whatsapp}
                  onChange={(event) => setBuyer({ ...buyer, whatsapp: event.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/30"
                  placeholder="3001234567"
                />
              </div>
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="font-heading text-2xl font-bold">{selectedPackage.name}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {selectedPackage.wallpapers} wallpapers + {selectedPackage.rifas} rifas
                  </p>
                </div>
                <p className="font-heading text-2xl font-bold text-lime-300 sm:text-right">{formatCOP(selectedPackage.price)}</p>
              </div>
            </div>
            {error && <p className="rounded-[8px] border border-red-400/35 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
            <button onClick={() => setShowMercadoPago((value) => !value)} className="flex w-full items-center justify-center gap-3 rounded-[8px] bg-lime-300 px-5 py-3 text-sm font-extrabold uppercase text-black transition hover:brightness-110 sm:text-base">
              <CreditCard className="size-5" />
              Pagar con Mercado Pago
            </button>
            {showMercadoPago && (
              <MercadoPagoPaymentBrick
                buyer={{ ...buyer, whatsapp: formatWhatsapp(buyer.whatsapp) }}
                selectedPackage={selectedPackage}
                onApproved={(numbers) => {
                  setTicketNumbers(numbers);
                  setError("");
                  setStep(3);
                }}
                onPending={(message, _statusUrl, externalResourceUrl) => {
                  setError(externalResourceUrl ? `${message} Redirigiendo al banco...` : `${message} Abriendo estado del pago...`);
                }}
                onError={(message) => setError(message)}
              />
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
