import { Suspense } from "react";
import { CheckoutPaymentPage } from "@/components/CheckoutPaymentPage";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#080808] p-6 text-white">Cargando pasarela...</main>}>
      <CheckoutPaymentPage />
    </Suspense>
  );
}
