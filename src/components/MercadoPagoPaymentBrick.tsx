"use client";

import { useEffect, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { rifaConfig, type RifaPackage } from "@/config/rifa";

type Buyer = {
  name: string;
  whatsapp: string;
  email: string;
};

const MERCADO_PAGO_MIN_CARD_AMOUNT = 1000;
const MERCADO_PAGO_MIN_BANK_TRANSFER_AMOUNT = 1600;

function getPaymentMethods(amount: number) {
  if (amount < MERCADO_PAGO_MIN_CARD_AMOUNT) return null;

  const paymentMethods: Record<string, "all" | number> = {
    creditCard: "all",
    debitCard: "all",
    maxInstallments: 1,
  };

  if (amount >= MERCADO_PAGO_MIN_BANK_TRANSFER_AMOUNT) {
    paymentMethods.bankTransfer = "all";
  }

  return paymentMethods;
}

export function MercadoPagoPaymentBrick({
  buyer,
  selectedPackage,
  onApproved,
  onPending,
  onError,
}: {
  buyer: Buyer;
  selectedPackage: RifaPackage;
  onApproved: (ticketNumbers: string[]) => void;
  onPending: (message: string, statusUrl: string, externalResourceUrl?: string) => void;
  onError: (message: string) => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

    if (!publicKey) {
      onError("Falta NEXT_PUBLIC_MP_PUBLIC_KEY para Mercado Pago.");
      return;
    }

    initMercadoPago(publicKey, { locale: "es-CO" });
    setReady(true);
  }, [onError]);

  if (!ready) {
    return <div className="rounded-[8px] border border-white/12 bg-white/[0.04] p-4 text-sm text-white/60">Cargando Mercado Pago...</div>;
  }

  const paymentMethods = getPaymentMethods(selectedPackage.price);

  if (!paymentMethods) {
    return (
      <div className="rounded-[8px] border border-yellow-300/25 bg-yellow-300/10 p-4 text-sm text-yellow-50">
        Mercado Pago solo esta disponible desde {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(MERCADO_PAGO_MIN_CARD_AMOUNT)}. Elige un paquete de mayor valor o compra por WhatsApp.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-white/12 bg-white p-2 text-black">
      <Payment
        initialization={{
          amount: selectedPackage.price,
          payer: {
            email: buyer.email,
            entityType: "individual",
          },
          items: {
            totalItemsAmount: selectedPackage.price,
            itemsList: [
              {
                units: 1,
                value: selectedPackage.price,
                name: `${rifaConfig.eventName} - ${selectedPackage.name}`,
                description: `${selectedPackage.rifas} numeros + ${selectedPackage.wallpapers} wallpapers`,
              },
            ],
          },
        }}
        customization={{
          visual: {
            style: {
              theme: "default",
            },
          },
          paymentMethods: paymentMethods as any,
        }}
        locale="es-CO"
        onSubmit={async ({ formData }) => {
          const response = await fetch("/api/mercadopago/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              packageId: selectedPackage.id,
              buyerName: buyer.name,
              buyerWhatsapp: buyer.whatsapp,
              buyerEmail: buyer.email,
              formData,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            const message = data.error || "No se pudo procesar el pago.";
            onError(message);
            throw new Error(message);
          }

          if (data.approved) {
            onApproved(data.ticketNumbers ?? []);
            return data;
          }

          const redirectUrl = data.externalResourceUrl as string | undefined;
          const statusUrl = (data.statusUrl || (data.paymentId ? `/pago/estado?id=${encodeURIComponent(String(data.paymentId))}` : "/pago/estado")) as string;
          onPending(data.message || "Tu pago esta pendiente de aprobacion. Te enviaremos los numeros cuando Mercado Pago lo apruebe.", statusUrl, redirectUrl);
          if (redirectUrl) {
            window.location.assign(redirectUrl);
          } else {
            window.location.assign(statusUrl);
          }
          return data;
        }}
        onError={(brickError) => {
          onError(brickError.message || "Mercado Pago no pudo cargar el formulario.");
        }}
      />
    </div>
  );
}
