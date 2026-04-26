import { PaymentStatusClient } from "@/components/PaymentStatusClient";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readPaymentId(params: Record<string, string | string[] | undefined>) {
  return (
    firstValue(params.id) ||
    firstValue(params.payment_id) ||
    firstValue(params.collection_id) ||
    firstValue(params["data.id"])
  );
}

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  return <PaymentStatusClient initialPaymentId={readPaymentId(resolvedSearchParams)} />;
}
