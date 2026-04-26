"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard } from "lucide-react";
import { MercadoPagoPaymentBrick } from "@/components/MercadoPagoPaymentBrick";
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

const COUNTRY_CODE = "+57";
const COLOMBIA_API_BASE = "https://api-colombia.com/api/v1";

function formatWhatsapp(localNumber: string) {
  return `${COUNTRY_CODE}${localNumber.replace(/\D/g, "")}`;
}

function countLetters(value: string) {
  return (value.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const initialBuyer: CheckoutBuyer = {
  name: "",
  whatsapp: "",
  email: "",
  zipCode: "",
  streetName: "",
  streetNumber: "1",
  neighborhood: "Centro",
  city: "",
  federalUnit: "",
};

export function CheckoutPaymentPage() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get("package");
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
  const [ticketNumbers, setTicketNumbers] = useState<string[]>([]);
  const [pendingMessage, setPendingMessage] = useState("");

  const selectedPackage = useMemo(() => {
    return rifaConfig.packages.find((pack) => pack.id === packageId) ?? null;
  }, [packageId, rifaConfig.packages]);

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
        if (active) setLocationsError("No se pudieron cargar departamentos y ciudades. Intenta recargar la pagina.");
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

  const validName = countLetters(buyer.name) >= 4;
  const validWhatsapp = buyer.whatsapp.replace(/\D/g, "").length === 10;
  const validEmail = isValidEmail(buyer.email);
  const validAddress =
    buyer.streetName.trim().length >= 1 &&
    buyer.streetName.trim().length <= 18 &&
    buyer.city.trim().length >= 1 &&
    buyer.city.trim().length <= 18 &&
    buyer.federalUnit.trim().length >= 1 &&
    buyer.federalUnit.trim().length <= 18;
  const validBuyer = validName && validWhatsapp && validEmail && validAddress;

  function updateBuyer(nextBuyer: Partial<CheckoutBuyer>) {
    setPaymentReady(false);
    setPaymentError("");
    setPendingMessage("");
    setBuyer((current) => ({ ...current, ...nextBuyer }));
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
    if (!selectedPackage) {
      setFormError("Selecciona un paquete antes de pagar.");
      return;
    }
    if (!validBuyer) {
      setFormError("Revisa tus datos: nombre minimo 4 letras, WhatsApp de 10 digitos, correo valido, departamento, ciudad y direccion.");
      return;
    }

    setFormError("");
    setPaymentError("");
    setPendingMessage("");
    setPaymentReady(true);
  }

  const paymentBuyer: CheckoutBuyer = {
    ...buyer,
    whatsapp: formatWhatsapp(buyer.whatsapp),
  };

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:py-8">
        <aside className="self-start rounded-[8px] border border-white/12 bg-white/[0.045] p-5">
          <Link href="/#paquetes" className="text-sm font-bold text-lime-300 transition hover:text-lime-200">
            Volver a paquetes
          </Link>
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Checkout</p>
            <h1 className="mt-2 font-heading text-3xl font-bold">Pasarela de pago</h1>
          </div>

          {selectedPackage ? (
            <div className="mt-6 rounded-[8px] border border-white/12 bg-black/25 p-4">
              <p className="font-heading text-2xl font-bold">{selectedPackage.name}</p>
              <p className="mt-1 text-sm text-white/60">
                {selectedPackage.wallpapers} wallpapers + {selectedPackage.rifas} rifas
              </p>
              <p className="mt-4 font-heading text-3xl font-bold text-lime-300">{formatCOP(selectedPackage.price)}</p>
            </div>
          ) : (
            <p className="mt-6 rounded-[8px] border border-yellow-300/25 bg-yellow-300/10 p-4 text-sm text-yellow-50">
              No encontramos el paquete seleccionado.
            </p>
          )}
        </aside>

        <section className="min-w-0 rounded-[8px] border border-white/12 bg-white/[0.04] p-4 sm:p-5">
          {ticketNumbers.length === 0 && (
            <div className="grid gap-6">
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
                <div className="sm:col-span-2">
                  <h2 className="font-heading text-2xl font-bold">Datos para el pago</h2>
                </div>
                {(formError || locationsError) && (
                  <p className="sm:col-span-2 rounded-[8px] border border-red-400/35 bg-red-400/10 p-3 text-sm text-red-100">
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
                    className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30"
                    placeholder="Tu nombre"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-white/80">WhatsApp</span>
                  <div className="mt-2 flex rounded-[8px] border border-white/12 bg-black/30">
                    <span className="grid place-items-center border-r border-white/12 px-4 py-3 font-bold text-white/70" aria-hidden="true">
                      {COUNTRY_CODE}
                    </span>
                    <input
                      required
                      inputMode="numeric"
                      autoComplete="tel-national"
                      minLength={10}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      value={buyer.whatsapp}
                      onChange={(event) => updateBuyer({ whatsapp: event.target.value.replace(/\D/g, "").slice(0, 10) })}
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/30"
                      placeholder="3001234567"
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
                    className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30"
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
                    className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none transition disabled:opacity-50"
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
                    className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none transition disabled:opacity-50"
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
                    className="mt-2 w-full rounded-[8px] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30"
                    placeholder="Calle 10"
                  />
                </label>
                <button
                  disabled={!selectedPackage || !validBuyer}
                  className="sm:col-span-2 mt-2 flex w-full items-center justify-center gap-3 rounded-[8px] bg-lime-300 px-5 py-3 text-sm font-extrabold uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
                >
                  <CreditCard className="size-5" />
                  Continuar a medios de pago
                </button>
              </form>

              {paymentReady && selectedPackage && (
                <div className="space-y-4 border-t border-white/12 pt-5">
                  <div className="flex items-center gap-3 text-white/80">
                    <CreditCard className="size-5 text-lime-300" />
                    <p className="font-bold">Elige tu metodo de pago en Mercado Pago</p>
                  </div>
                  {paymentError && <p className="rounded-[8px] border border-red-400/35 bg-red-400/10 p-3 text-sm text-red-100">{paymentError}</p>}
                  {pendingMessage && <p className="rounded-[8px] border border-lime-300/25 bg-lime-300/10 p-3 text-sm text-lime-50">{pendingMessage}</p>}
                  <MercadoPagoPaymentBrick
                    buyer={paymentBuyer}
                    selectedPackage={selectedPackage}
                    onApproved={(numbers) => {
                      setTicketNumbers(numbers);
                      setPaymentError("");
                      setPendingMessage("");
                    }}
                    onPending={(message, _statusUrl, externalResourceUrl) => {
                      setPendingMessage(externalResourceUrl ? `${message} Redirigiendo al banco...` : `${message} Abriendo estado del pago...`);
                    }}
                    onError={(message) => setPaymentError(message)}
                  />
                </div>
              )}
            </div>
          )}

          {ticketNumbers.length > 0 && (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto size-16 text-lime-300" />
              <h2 className="mt-5 font-heading text-3xl font-bold">Gracias</h2>
              <p className="mx-auto mt-3 max-w-sm text-white/68">
                Tus numeros quedaron asignados y tambien los enviaremos a tu correo.
              </p>
              <div className="mx-auto mt-5 flex max-w-sm flex-wrap justify-center gap-2">
                {ticketNumbers.map((number) => (
                  <span key={number} className="rounded-[6px] border border-lime-300/50 bg-lime-300/10 px-3 py-2 font-heading text-lg font-bold text-lime-300">
                    {number}
                  </span>
                ))}
              </div>
              <Link href="/#paquetes" className="mt-7 inline-flex rounded-[8px] bg-lime-300 px-8 py-3 font-extrabold uppercase text-black">
                Volver
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
