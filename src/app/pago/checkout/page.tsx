import { Suspense } from "react";
import { CheckoutPaymentPage } from "@/components/CheckoutPaymentPage";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background p-6 text-foreground">Cargando pasarela...</main>}>
      <CheckoutPaymentPage />
    </Suspense>
  );
}
