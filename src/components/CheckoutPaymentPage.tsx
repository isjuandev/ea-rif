"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { PhoneInput, defaultCountries, type CountryIso2 } from "react-international-phone";
import "react-international-phone/style.css";
import { Banknote, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useRifaConfig } from "@/components/use-rifa-config";
import { formatCOP } from "@/components/utils";

type CheckoutBuyer = {
  name: string;
  whatsapp: string;
  email: string;
  zipCode: string;
  streetName: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  federalUnit: string;
};

type Department = {
  id: number;
  name: string;
};

type City = {
  id: number;
  name: string;
  postalCode?: string | null;
};

type PseBank = {
  id: string;
  description: string;
};

type PsePaymentForm = {
  entityType: "individual" | "association";
  identificationType: string;
  identificationNumber: string;
  financialInstitution: string;
};

type PaymentMethodMode = "card" | "pse";
type CardBrand = "visa" | "mástercard" | "amex" | "diners" | "discover" | "unknown";


const COLOMBIA_API_BASE = "https://api-colombia.com/api/v1";
const NATURAL_DOC_TYPES = [
  { label: "C.C", value: "CC" },
  { label: "C.E.", value: "CE" },
  { label: "Pasaporte", value: "PAS" },
  { label: "Tarjeta de Extranjeria", value: "TE" },
  { label: "Tarjeta de Identidad", value: "TI" },
  { label: "Registro Civil", value: "RC" },
  { label: "Documento de Identificacion", value: "DI" },
];
const COMPANY_DOC_TYPES = [{ label: "NIT", value: "NIT" }];
const CARD_SECURE_FIELD_CLASS = "flex h-12 items-center rounded-md border border-white/12 bg-black/30 text-foreground transition focus-within:border-lime-300/70";
const CARD_SECURE_FIELD_INNER_CLASS = "min-w-0 flex-1 px-4";
const CHECKOUT_INPUT_CLASS = "mt-2 h-12 w-full rounded-md border border-white/12 bg-black/30 px-4 text-foreground outline-none transition placeholder:text-white/30 focus:border-transparent focus:ring-2 focus:ring-primary";

const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: "Visa",
  mástercard: "Mastercard",
  amex: "Amex",
  diners: "Diners",
  discover: "Discover",
  unknown: "Tarjeta",
};

function countLetters(value: string) {
  return (value.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}


function normalizeCardBrand(paymentMethodId?: string): CardBrand {
  const normalized = (paymentMethodId || "").toLowerCase();
  if (normalized.includes("visa")) return "visa";
  if (normalized.includes("máster")) return "mástercard";
  if (normalized.includes("amex") || normalized.includes("american")) return "amex";
  if (normalized.includes("diners")) return "diners";
  if (normalized.includes("discover")) return "discover";
  return "unknown";
}

function CardBrandBadge({ brand }: { brand: CardBrand }) {
  if (brand === "visa") {
    return <span className="text-[18px] font-black italic tracking-[0.08em] text-[#1434CB]">VISA</span>;
  }

  if (brand === "mástercard") {
    return (
      <span className="relative block h-7 w-11" aria-label="Mastercard">
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-[#EB001B]" />
        <span className="absolute right-1 top-1 h-5 w-5 rounded-full bg-[#F79E1B] mix-blend-multiply" />
      </span>
    );
  }

  if (brand === "amex") {
    return <span className="rounded-[4px] bg-[#2E77BC] px-2 py-1 text-[11px] font-black tracking-[0.04em] text-foreground">AMEX</span>;
  }

  if (brand === "diners") {
    return <span className="rounded-[4px] bg-[#0079BE] px-2 py-1 text-[11px] font-black tracking-[0.04em] text-foreground">DINERS</span>;
  }

  if (brand === "discover") {
    return <span className="rounded-[4px] bg-[#F58220] px-2 py-1 text-[11px] font-black tracking-[0.04em] text-primary-foreground">DISC</span>;
  }

  return <CreditCard className="size-5 text-primary-foreground/45" />;
}

const initialBuyer: CheckoutBuyer = {
  name: "",
  whatsapp: "+57 ",
  email: "",
  zipCode: "",
  streetName: "",
  streetNumber: "1",
  neighborhood: "Centro",
  city: "",
  federalUnit: "",
};

const initialPsePaymentForm: PsePaymentForm = {
  entityType: "individual",
  identificationType: "CC",
  identificationNumber: "",
  financialInstitution: "",
};

export function CheckoutPaymentPage() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get("package");
  const requestedQuantity = Number(searchParams.get("quantity"));
  const rifaConfig = useRifaConfig();
  const [buyer, setBuyer] = useState<CheckoutBuyer>(initialBuyer);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [cityId, setCityId] = useState("");
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [locationsError, setLocationsError] = useState("");
  const [formError, setFormError] = useState("");
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [ticketNumbers, setTicketNumbers] = useState<string[]>([]);
  const [pendingMessage, setPendingMessage] = useState("");
  const [paymentMethodMode, setPaymentMethodMode] = useState<PaymentMethodMode>("card");
  const [pseBanks, setPseBanks] = useState<PseBank[]>([]);
  const [loadingPseBanks, setLoadingPseBanks] = useState(false);
  const [psePaymentForm, setPsePaymentForm] = useState<PsePaymentForm>(initialPsePaymentForm);
  const [cardFormReady, setCardFormReady] = useState(false);
  const [cardFormError, setCardFormError] = useState("");
  const [cardBrand, setCardBrand] = useState<CardBrand>("unknown");
  const [customTicketCount, setCustomTicketCount] = useState(5);
  const [ticketCountError, setTicketCountError] = useState("");
  const cardFormMountedRef = useRef(false);

  const selectedPackage = useMemo(() => {
    return rifaConfig.packages.find((pack) => pack.id === packageId) ?? null;
  }, [packageId, rifaConfig.packages]);

  const isCustomPurchase = packageId === "custom";
  const minTickets = 5;
  const maxTickets = 500;
  const resolvedTicketCount = isCustomPurchase ? customTicketCount : (selectedPackage?.rifas ?? 0);
  const resolvedAmount = isCustomPurchase ? resolvedTicketCount * rifaConfig.ticketPrice : (selectedPackage?.price ?? 0);

  const paymentBuyer: CheckoutBuyer = { ...buyer };

  useEffect(() => {
    let active = true;

    fetch(`${COLOMBIA_API_BASE}/Department?sortBy=name&sortDirection=asc`)
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los departamentos.");
        return response.json() as Promise<Department[]>;
      })
      .then((data) => {
        if (!active) return;
        setDepartments(data.map((department) => ({ id: department.id, name: department.name })).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (active) setLocationsError("No se pudieron cargar departamentos y ciudades. Intenta recargar la página.");
      })
      .finally(() => {
        if (active) setLoadingDepartments(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!departmentId) {
      setCities([]);
      return;
    }

    let active = true;
    setLoadingCities(true);
    setCities([]);

    fetch(`${COLOMBIA_API_BASE}/Department/${departmentId}/cities?sortBy=name&sortDirection=asc`)
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar las ciudades.");
        return response.json() as Promise<City[]>;
      })
      .then((data) => {
        if (!active) return;
        setCities(data.map((city) => ({ id: city.id, name: city.name, postalCode: city.postalCode })).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (active) setLocationsError("No se pudieron cargar las ciudades del departamento seleccionado.");
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [departmentId]);

  useEffect(() => {
    if (isCustomPurchase) {
      const initialValue = Number.isInteger(requestedQuantity) ? requestedQuantity : 5;
      const bounded = Math.max(minTickets, Math.min(maxTickets, initialValue));
      setCustomTicketCount(bounded);
      setTicketCountError("");
    } else if (selectedPackage) {
      setCustomTicketCount(selectedPackage.rifas);
      setTicketCountError("");
    }
  }, [isCustomPurchase, requestedQuantity, selectedPackage]);

  useEffect(() => {
    if (!paymentReady || paymentMethodMode !== "pse") return;

    let active = true;
    setLoadingPseBanks(true);
    setPaymentError("");

    fetch("/api/mercadopago/payment-methods", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los bancos PSE.");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        const pse = data.methods?.find((method: any) => method.id === "pse");
        const banks = ((pse?.financial_institutions ?? []) as Array<{ id?: string | number; description?: string }>)
          .filter((bank) => bank.id && bank.description)
          .map((bank) => ({ id: String(bank.id), description: String(bank.description) }))
          .sort((a, b) => a.description.localeCompare(b.description));

        setPseBanks(banks);
        setPsePaymentForm((current) => ({
          ...current,
          financialInstitution: current.financialInstitution || banks[0]?.id || "",
        }));
      })
      .catch((error: any) => {
        if (active) setPaymentError(error?.message || "No se pudieron cargar los bancos PSE.");
      })
      .finally(() => {
        if (active) setLoadingPseBanks(false);
      });

    return () => {
      active = false;
    };
  }, [paymentReady, paymentMethodMode]);

  useEffect(() => {
    if (!paymentReady || paymentMethodMode !== "card" || resolvedAmount <= 0 || cardFormMountedRef.current) return;

    let active = true;
    cardFormMountedRef.current = true;
    setCardFormReady(false);
    setCardFormError("");
    setCardBrand("unknown");

    loadMercadoPago()
      .then(() => {
        if (!active) return;
        const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
        const MercadoPago = (window as any).MercadoPago;

        if (!publicKey || !MercadoPago) {
          throw new Error("Mercado Pago no esta configurado para tarjetas.");
        }

        const mp = new MercadoPago(publicKey, { locale: "es-CO" });
        const cardForm = mp.cardForm({
          amount: String(resolvedAmount),
          iframe: true,
          style: {
            input: {
              color: "#F5F5F5",
              fontSize: "16px",
            },
            "::placeholder": {
              color: "rgba(245, 245, 245, 0.45)",
            },
          },
          form: {
            id: "card-checkout-form",
            cardNumber: {
              id: "card-checkout__cardNumber",
              placeholder: "Numero de tarjeta",
            },
            expirationDate: {
              id: "card-checkout__expirationDate",
              placeholder: "MM/AA",
            },
            securityCode: {
              id: "card-checkout__securityCode",
              placeholder: "CVV",
            },
            cardholderName: {
              id: "card-checkout__cardholderName",
              placeholder: "Nombre en la tarjeta",
            },
            issuer: {
              id: "card-checkout__issuer",
              placeholder: "Banco emisor",
            },
            installments: {
              id: "card-checkout__installments",
              placeholder: "Cuotas",
            },
            identificationType: {
              id: "card-checkout__identificationType",
              placeholder: "Tipo de documento",
            },
            identificationNumber: {
              id: "card-checkout__identificationNumber",
              placeholder: "Numero de documento",
            },
            cardholderEmail: {
              id: "card-checkout__cardholderEmail",
              placeholder: "Email",
            },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (!active) return;
              if (error) {
                setCardFormError("No se pudo cargar el formulario de tarjeta.");
                return;
              }
              setCardFormReady(true);
            },
            onSubmit: async (event: Event) => {
              event.preventDefault();
              setProcessingPayment(true);
              setPaymentError("");
              setPendingMessage("");

              try {
                const {
                  paymentMethodId: payment_method_id,
                  issuerId: issuer_id,
                  cardholderEmail,
                  amount,
                  token,
                  installments,
                  identificationNumber,
                  identificationType,
                } = cardForm.getCardFormData();

                const response = await fetch("/api/mercadopago/payments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    packageId: selectedPackage?.id || "custom",
                    ticketCount: resolvedTicketCount,
                    buyerName: buyer.name,
                    buyerWhatsapp: paymentBuyer.whatsapp,
                    buyerEmail: buyer.email,
                    formData: {
                      token,
                      issuer_id,
                      payment_method_id,
                      transaction_amount: Number(amount),
                      installments: Number(installments),
                      payer: {
                        email: cardholderEmail || buyer.email,
                        identification: {
                          type: identificationType,
                          number: identificationNumber,
                        },
                      },
                    },
                  }),
                });
                const data = await response.json();

                if (!response.ok) {
                  throw new Error(data.error || "No se pudo procesar la tarjeta.");
                }

                if (data.approved) {
                  setTicketNumbers(data.ticketNumbers ?? []);
                  return;
                }

                const statusUrl = (data.statusUrl || (data.paymentId ? `/pago/estado?id=${encodeURIComponent(String(data.paymentId))}` : "/pago/estado")) as string;
                setPendingMessage(data.message || "El pago esta en revision. Abriendo estado del pago...");
                window.location.assign(statusUrl);
              } catch (error: any) {
                setPaymentError(error?.message || "No se pudo procesar la tarjeta.");
              } finally {
                setProcessingPayment(false);
              }
            },
            onFetching: () => {
              setProcessingPayment(true);
              return () => setProcessingPayment(false);
            },
            onPaymentMethodsReceived: (error: any, paymentMethods: any) => {
              if (!active || error) return;
              const paymentMethodId = paymentMethods?.paymentMethodId || paymentMethods?.payment_method_id || paymentMethods?.id || paymentMethods?.[0]?.id;
              setCardBrand(normalizeCardBrand(paymentMethodId));
            },
          },
        });
      })
      .catch((error: any) => {
        if (!active) return;
        setCardFormError(error?.message || "No se pudo cargar Mercado Pago para tarjetas.");
        cardFormMountedRef.current = false;
      });

    return () => {
      active = false;
    };
  }, [buyer.email, buyer.name, paymentBuyer.whatsapp, paymentMethodMode, paymentReady, selectedPackage, resolvedAmount, resolvedTicketCount]);

  const validName = countLetters(buyer.name) >= 4;
  const validWhatsapp = buyer.whatsapp.replace(/\D/g, "").length >= 8;
  const validEmail = isValidEmail(buyer.email);
  const validAddress =
    buyer.streetName.trim().length >= 1 &&
    buyer.streetName.trim().length <= 18 &&
    buyer.city.trim().length >= 1 &&
    buyer.city.trim().length <= 18 &&
    buyer.federalUnit.trim().length >= 1 &&
    buyer.federalUnit.trim().length <= 18;
  const validBuyer = validName && validWhatsapp && validEmail && validAddress;
  const documentOptions = psePaymentForm.entityType === "individual" ? NATURAL_DOC_TYPES : COMPANY_DOC_TYPES;
  const validPsePayment =
    Boolean(psePaymentForm.financialInstitution) &&
    Boolean(psePaymentForm.identificationType) &&
    psePaymentForm.identificationNumber.trim().length >= 1 &&
    psePaymentForm.identificationNumber.trim().length <= 15;

  function updateBuyer(nextBuyer: Partial<CheckoutBuyer>) {
    setPaymentReady(false);
    setPaymentError("");
    setPendingMessage("");
    setCardFormReady(false);
    setCardFormError("");
    setCardBrand("unknown");
    cardFormMountedRef.current = false;
    setBuyer((current) => ({ ...current, ...nextBuyer }));
  }

  function updatePsePaymentForm(nextForm: Partial<PsePaymentForm>) {
    setPaymentError("");
    setPendingMessage("");
    setPsePaymentForm((current) => ({ ...current, ...nextForm }));
  }

  function handleDepartmentChange(nextDepartmentId: string) {
    const department = departments.find((item) => String(item.id) === nextDepartmentId);
    setDepartmentId(nextDepartmentId);
    setCityId("");
    updateBuyer({ federalUnit: department?.name.slice(0, 18) ?? "", city: "", zipCode: "" });
  }

  function handleCityChange(nextCityId: string) {
    const city = cities.find((item) => String(item.id) === nextCityId);
    setCityId(nextCityId);
    const postalCode = city?.postalCode?.replace(/\D/g, "").slice(0, 5);
    updateBuyer({
      city: city?.name.slice(0, 18) ?? "",
      zipCode: postalCode?.length === 5 ? postalCode : "00000",
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPackage && !isCustomPurchase) {
      setFormError("Selecciona un paquete antes de pagar.");
      return;
    }
    if (resolvedTicketCount < minTickets || resolvedTicketCount > maxTickets) {
      setFormError("La cantidad debe estar entre 5 y 500 entradas.");
      return;
    }
    if (!validBuyer) {
      setFormError("Revisa tus datos: nombre mínimo 4 letras, WhatsApp válido para el pais seleccionado, correo válido, departamento, ciudad y direccion.");
      return;
    }

    setFormError("");
    setPaymentError("");
    setPendingMessage("");
    setPaymentReady(true);
  }

  async function handlePseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!selectedPackage && !isCustomPurchase) || !validBuyer || !validPsePayment) {
      setPaymentError("Completa los datos de PSE antes de pagar.");
      return;
    }

    setProcessingPayment(true);
    setPaymentError("");
    setPendingMessage("");

    try {
      const response = await fetch("/api/mercadopago/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackage?.id || "custom",
                    ticketCount: resolvedTicketCount,
          buyerName: buyer.name,
          buyerWhatsapp: paymentBuyer.whatsapp,
          buyerEmail: buyer.email,
          buyerAddress: {
            zipCode: buyer.zipCode,
            streetName: buyer.streetName,
            streetNumber: buyer.streetNumber,
            neighborhood: buyer.neighborhood,
            city: buyer.city,
            federalUnit: buyer.federalUnit,
          },
          formData: {
            payment_method_id: "pse",
            transaction_amount: resolvedAmount,
            payer: {
              email: buyer.email,
              entity_type: psePaymentForm.entityType,
              identification: {
                type: psePaymentForm.identificationType,
                number: psePaymentForm.identificationNumber.trim(),
              },
            },
            transaction_details: {
              financial_institution: psePaymentForm.financialInstitution,
            },
          },
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el pago PSE.");
      }

      if (data.approved) {
        setTicketNumbers(data.ticketNumbers ?? []);
        return;
      }

      const redirectUrl = data.externalResourceUrl as string | undefined;
      const statusUrl = (data.statusUrl || (data.paymentId ? `/pago/estado?id=${encodeURIComponent(String(data.paymentId))}` : "/pago/estado")) as string;
      setPendingMessage(redirectUrl ? "Pago PSE creado. Redirigiendo al banco..." : "Pago PSE creado. Abriendo estado del pago...");
      window.location.assign(redirectUrl || statusUrl);
    } catch (error: any) {
      setPaymentError(error?.message || "No se pudo crear el pago PSE.");
    } finally {
      setProcessingPayment(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:py-8">
        <aside className="self-start rounded-md border border-white/12 bg-white/[0.045] p-5">
          <Link href="/#paquetes" className="text-sm font-bold text-lime-300 transition hover:text-lime-200">
            Volver a paquetes
          </Link>
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Checkout</p>
            <h1 className="mt-2 font-heading text-3xl font-bold">Pasarela de pago</h1>
          </div>

          {(selectedPackage || isCustomPurchase) ? (
            <div className="mt-6 rounded-md border border-white/12 bg-black/25 p-4">
              <p className="font-heading text-2xl font-bold">{resolvedTicketCount} Entradas</p>
              <p className="mt-1 text-sm text-white/60">
                Elite Club
              </p>
              <p className="mt-4 font-heading text-3xl font-bold text-lime-300">{formatCOP(resolvedAmount)}</p>
              {ticketCountError && <p className="mt-2 text-sm text-red-300">{ticketCountError}</p>}
            </div>
          ) : (
            <p className="mt-6 rounded-md border border-yellow-300/25 bg-yellow-300/10 p-4 text-sm text-yellow-50">
              No encontramos el paquete seleccionado.
            </p>
          )}
        </aside>

        <section className="min-w-0 rounded-md border border-white/12 bg-white/[0.04] p-4 sm:p-5">
          {ticketNumbers.length === 0 && (
            <div className="grid gap-6">
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
                <div className="sm:col-span-2">
                  <h2 className="font-heading text-2xl font-bold">Datos para el pago</h2>
                </div>
                {(formError || locationsError) && (
                  <p className="sm:col-span-2 rounded-md border border-red-400/35 bg-red-400/10 p-3 text-sm text-red-100">
                    {formError || locationsError}
                  </p>
                )}
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-white/80">Nombre completo</span>
                  <input
                    required
                    minLength={4}
                    value={buyer.name}
                    onChange={(event) => updateBuyer({ name: event.target.value })}
                    className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-4 py-3 text-foreground outline-none transition placeholder:text-white/30"
                    placeholder="Tu nombre"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-white/80">WhatsApp</span>
                  <div className="phone-field mt-2 rounded-md border border-white/12 bg-black/30 p-1">
                    <PhoneInput
                      defaultCountry={"co" as CountryIso2}
                      countries={defaultCountries}
                      value={buyer.whatsapp}
                      onChange={(value) => updateBuyer({ whatsapp: value })}
                      inputProps={{ required: true, name: "whatsapp", autoComplete: "tel" }}
                      className="phone-field__input"
                      style={{ width: "100%", background: "transparent" }}
                      inputStyle={{ width: "100%", background: "transparent", border: "none", color: "white", height: "40px" }}
                      countrySelectorStyleProps={{ buttonStyle: { background: "transparent", border: "none" }, dropdownArrowStyle: { color: "rgba(255,255,255,0.7)" } }}
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-white/80">Email</span>
                  <input
                    type="email"
                    required
                    value={buyer.email}
                    onChange={(event) => updateBuyer({ email: event.target.value })}
                    className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-4 py-3 text-foreground outline-none transition placeholder:text-white/30"
                    placeholder="correo@ejemplo.com"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-white/80">Departamento</span>
                  <select
                    required
                    disabled={loadingDepartments}
                    value={departmentId}
                    onChange={(event) => handleDepartmentChange(event.target.value)}
                    className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-4 py-3 text-foreground outline-none transition disabled:opacity-50"
                  >
                    <option value="">{loadingDepartments ? "Cargando..." : "Selecciona"}</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id} className="bg-[#111111]">
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-white/80">Ciudad</span>
                  <select
                    required
                    disabled={!departmentId || loadingCities}
                    value={cityId}
                    onChange={(event) => handleCityChange(event.target.value)}
                    className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-4 py-3 text-foreground outline-none transition disabled:opacity-50"
                  >
                    <option value="">{loadingCities ? "Cargando..." : "Selecciona"}</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id} className="bg-[#111111]">
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-white/80">Direccion</span>
                  <input
                    required
                    maxLength={18}
                    value={buyer.streetName}
                    onChange={(event) => updateBuyer({ streetName: event.target.value.slice(0, 18) })}
                    className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-4 py-3 text-foreground outline-none transition placeholder:text-white/30"
                    placeholder="Calle 10"
                  />
                </label>
                <button
                  disabled={(!selectedPackage && !isCustomPurchase) || !validBuyer}
                  className="sm:col-span-2 mt-2 flex w-full items-center justify-center gap-3 rounded-md bg-lime-300 px-5 py-3 text-sm font-extrabold uppercase text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
                >
                  <CreditCard className="size-5" />
                  Continuar a medios de pago
                </button>
              </form>

              {paymentReady && (
                <div className="space-y-4 border-t border-white/12 pt-5">
                  <div className="flex items-center gap-3 text-white/80">
                    {paymentMethodMode === "card" ? <CreditCard className="size-5 text-lime-300" /> : <Banknote className="size-5 text-lime-300" />}
                    <p className="font-bold">Medio de pago</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-md border border-white/12 bg-black/20 p-1">
                    <button
                      type="button"
                      onClick={() => setPaymentMethodMode("card")}
                      className={`flex items-center justify-center gap-2 rounded-[6px] px-3 py-3 text-sm font-extrabold uppercase transition ${
                        paymentMethodMode === "card" ? "bg-lime-300 text-primary-foreground" : "text-white/70 hover:bg-white/8"
                      }`}
                    >
                      <CreditCard className="size-4" />
                      Tarjeta
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethodMode("pse")}
                      className={`flex items-center justify-center gap-2 rounded-[6px] px-3 py-3 text-sm font-extrabold uppercase transition ${
                        paymentMethodMode === "pse" ? "bg-lime-300 text-primary-foreground" : "text-white/70 hover:bg-white/8"
                      }`}
                    >
                      <Banknote className="size-4" />
                      PSE
                    </button>
                  </div>
                  {paymentError && <p className="rounded-md border border-red-400/35 bg-red-400/10 p-3 text-sm text-red-100">{paymentError}</p>}
                  {pendingMessage && <p className="rounded-md border border-lime-300/25 bg-lime-300/10 p-3 text-sm text-lime-50">{pendingMessage}</p>}
                  {paymentMethodMode === "card" && (
                    <form id="card-checkout-form" className="grid gap-3 rounded-md border border-white/12 bg-black/20 p-4 sm:grid-cols-2">
                      {(cardFormError || !cardFormReady) && (
                        <p className="sm:col-span-2 rounded-md border border-white/12 bg-white/[0.04] p-3 text-sm text-white/70">
                          {cardFormError || "Cargando formulario seguro de tarjeta..."}
                        </p>
                      )}
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-bold text-white/80">Numero de tarjeta</span>
                        <div className={`mt-2 ${CARD_SECURE_FIELD_CLASS}`}>
                          <div id="card-checkout__cardNumber" className={CARD_SECURE_FIELD_INNER_CLASS} />
                          <div className="mr-3 grid h-8 min-w-13 place-items-center rounded-[6px] border border-white/10 bg-white px-2" title={CARD_BRAND_LABELS[cardBrand]} aria-label={CARD_BRAND_LABELS[cardBrand]}>
                            <CardBrandBadge brand={cardBrand} />
                          </div>
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-white/80">Vencimiento</span>
                        <div className={`mt-2 ${CARD_SECURE_FIELD_CLASS}`}>
                          <div id="card-checkout__expirationDate" className={CARD_SECURE_FIELD_INNER_CLASS} />
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-white/80">CVV</span>
                        <div className={`mt-2 ${CARD_SECURE_FIELD_CLASS}`}>
                          <div id="card-checkout__securityCode" className={CARD_SECURE_FIELD_INNER_CLASS} />
                        </div>
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-bold text-white/80">Nombre en la tarjeta</span>
                        <input id="card-checkout__cardholderName" className={CHECKOUT_INPUT_CLASS} placeholder="Nombre como aparece en la tarjeta" />
                      </label>
                      <select id="card-checkout__issuer" className="sr-only" tabIndex={-1} aria-hidden="true">
                        <option value="" className="bg-[#111111]">
                          Selecciona
                        </option>
                      </select>
                      <label className="block">
                        <span className="text-sm font-bold text-white/80">Cuotas</span>
                        <select id="card-checkout__installments" className={CHECKOUT_INPUT_CLASS}>
                          <option value="" className="bg-[#111111]">Selecciona</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-white/80">Tipo de documento</span>
                        <select id="card-checkout__identificationType" className={CHECKOUT_INPUT_CLASS}>
                          <option value="" className="bg-[#111111]">Selecciona</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-white/80">Numero de documento</span>
                        <input id="card-checkout__identificationNumber" className={CHECKOUT_INPUT_CLASS} placeholder="123456789" />
                      </label>
                      <input id="card-checkout__cardholderEmail" type="hidden" value={buyer.email} readOnly />
                      <button
                        disabled={!cardFormReady || processingPayment}
                        className="sm:col-span-2 mt-2 flex w-full items-center justify-center gap-3 rounded-md bg-lime-300 px-5 py-3 text-sm font-extrabold uppercase text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
                      >
                        {processingPayment ? <Loader2 className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
                        Pagar con tarjeta
                      </button>
                    </form>
                  )}
                  {paymentMethodMode === "pse" && (
                    <form className="grid gap-3 rounded-md border border-white/12 bg-black/20 p-4 sm:grid-cols-2" onSubmit={handlePseSubmit}>
                    <label className="block">
                      <span className="text-sm font-bold text-white/80">Tipo de persona</span>
                      <select
                        value={psePaymentForm.entityType}
                        onChange={(event) => {
                          const entityType = event.target.value as PsePaymentForm["entityType"];
                          updatePsePaymentForm({
                            entityType,
                            identificationType: entityType === "individual" ? "CC" : "NIT",
                            identificationNumber: "",
                          });
                        }}
                        className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-4 py-3 text-foreground outline-none"
                      >
                        <option value="individual" className="bg-[#111111]">
                          Natural
                        </option>
                        <option value="association" className="bg-[#111111]">
                          Juridica
                        </option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-bold text-white/80">Banco</span>
                      <select
                        required
                        disabled={loadingPseBanks || pseBanks.length === 0}
                        value={psePaymentForm.financialInstitution}
                        onChange={(event) => updatePsePaymentForm({ financialInstitution: event.target.value })}
                        className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-4 py-3 text-foreground outline-none disabled:opacity-50"
                      >
                        <option value="">{loadingPseBanks ? "Cargando bancos..." : "Selecciona banco"}</option>
                        {pseBanks.map((bank) => (
                          <option key={bank.id} value={bank.id} className="bg-[#111111]">
                            {bank.description}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-bold text-white/80">Tipo de documento</span>
                      <select
                        value={psePaymentForm.identificationType}
                        onChange={(event) => updatePsePaymentForm({ identificationType: event.target.value })}
                        className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-4 py-3 text-foreground outline-none"
                      >
                        {documentOptions.map((documentType) => (
                          <option key={documentType.value} value={documentType.value} className="bg-[#111111]">
                            {documentType.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-bold text-white/80">Numero de documento</span>
                      <input
                        required
                        inputMode={psePaymentForm.identificationType === "PAS" ? "text" : "numeric"}
                        maxLength={15}
                        value={psePaymentForm.identificationNumber}
                        onChange={(event) => {
                          const value =
                            psePaymentForm.identificationType === "PAS"
                              ? event.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 15)
                              : event.target.value.replace(/\D/g, "").slice(0, 15);
                          updatePsePaymentForm({ identificationNumber: value });
                        }}
                        className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-4 py-3 text-foreground outline-none placeholder:text-white/30"
                        placeholder="123456789"
                      />
                    </label>
                    <button
                      disabled={!validPsePayment || processingPayment || loadingPseBanks}
                      className="sm:col-span-2 mt-2 flex w-full items-center justify-center gap-3 rounded-md bg-lime-300 px-5 py-3 text-sm font-extrabold uppercase text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
                    >
                      {processingPayment ? <Loader2 className="size-5 animate-spin" /> : <Banknote className="size-5" />}
                      Pagar con PSE
                    </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {ticketNumbers.length > 0 && (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto size-16 text-lime-300" />
              <h2 className="mt-5 font-heading text-3xl font-bold">Gracias</h2>
              <p className="mx-auto mt-3 max-w-sm text-white/68">
                Tus números quedaron asignados y tambien los envíaremos a tu correo.
              </p>
              <div className="mx-auto mt-5 flex max-w-sm flex-wrap justify-center gap-2">
                {ticketNumbers.map((number) => (
                  <span key={number} className="rounded-[6px] border border-lime-300/50 bg-lime-300/10 px-3 py-2 font-heading text-lg font-bold text-lime-300">
                    {number}
                  </span>
                ))}
              </div>
              <Link href="/#paquetes" className="mt-7 inline-flex rounded-md bg-lime-300 px-8 py-3 font-extrabold uppercase text-primary-foreground">
                Volver
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
