# Rifas Elitе Club — Entradas Digitales

Plataforma web para la venta de entradas (números) de rifa digital de **Club Élite**. Los compradores adquieren paquetes de números, pagan vía **Mercado Pago** o por métodos manuales (WhatsApp, Nequi, Daviplata), reciben sus números por correo y los ganadores se determinan con el resultado oficial de la **Lotería de Boyacá**.

> Proyecto interno de Elitе Club Colombia. En producción se ejecuta sobre **Next.js 15 + Supabase + Mercado Pago**.

## Tabla de contenidos

- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Configuración de entorno](#configuración-de-entorno)
- [Puesta en marcha (desarrollo)](#puesta-en-marcha-desarrollo)
- [Base de datos (Supabase)](#base-de-datos-supabase)
- [Pagos con Mercado Pago](#pagos-con-mercado-pago)
- [Módulo de administración](#módulo-de-administración)
- [Flujo de una compra](#flujo-de-una-compra)
- [Sorteo y ganadores](#sorteo-y-ganadores)
- [Despliegue](#despliegue)
- [Scripts disponibles](#scripts-disponibles)
- [Licencia](#licencia)

## Características

**Lado comprador**

- Landing pública con paquetes de números, barra de progreso de ventas, contador regresivo, galería, FAQ y sección de ganadores anteriores.
- Compra de paquetes predefinidos (5 a 500 números) o cantidades personalizadas con incrementos.
- Checkout con **Mercado Pago** (métodos de pago e identificación dinámicos) y opción de pago manual vía WhatsApp/Nequi/Daviplata.
- Página de estado de pago en tiempo real.
- Envío automático de correo con los números asignados (diseño tipo "boleto" dorado).
- Validación de celulares colombianos (indicativo `+57`) con `libphonenumber-js`.

**Mecánica de rifa**

- Asignación de números aleatoria y atómica (función SQL `sell_random_rifa_tickets` con `FOR UPDATE SKIP LOCKED`).
- **Números bendecidos**: números con premio adicional. Se venden al azar junto con la compra.
- **Liberación progresiva de bendecidos**: al cruzar un umbral de ventas configurable, se libera un lote de números bendecidos que se fuerzan en la siguiente compra.
- **Premio invertido**: premio para el número con los dígitos invertidos del ganador.
- **Premio por paquete** (bulk): premio al alcanzar un umbral de números en una compra.
- Fecha del sorteo calculada a partir del último resultado publicado de la lotería.

**Lado administrador** (`/admin`)

- Login protegido por usuario/contraseña con sesión firmada (cookie con HMAC-SHA256).
- Configuración completa de la rifa: nombre del evento, cantidad de cifras, precio del número, paquetes, lotería, horario del sorteo, redes sociales, premios y toggles de tarjetas.
- Sincronización automática de `rifa_tickets` al cambiar la cantidad de cifras (mientras no haya ventas).
- Gestión de números bendecidos y su umbral de liberación.
- Reportes de ventas por día con cálculo de comisiones de Mercado Pago (3.29 % + $800 por transacción) y exportación a Excel/PDF.
- Búsqueda de compras, reenvío manual de correos y reinicio de la rifa.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 15 (App Router, RSC) + React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4, Radix UI (Dialog, Accordion), lucide-react, class-variance-authority |
| Base de datos | Supabase (PostgreSQL + RPC/security definer) |
| Pagos | Mercado Pago (SDK Node + SDK JS en checkout) |
| Correo | Resend |
| Exportación | xlsx, pdf-lib, pdfkit |
| Validación | libphonenumber-js, react-international-phone |

## Arquitectura

- **Frontend**: componentes React en `src/components/` y páginas en `src/app/`. La configuración de la rifa se lee desde Supabase (`rifa_settings`) con fallback a `src/config/rifa.ts`.
- **API**: rutas server-side en `src/app/api/` (config, pagos, webhooks, admin).
- **Base de datos**: la lógica de venta de números vive en funciones PostgreSQL (`security definer`) para garantizar atomicidad contra condiciones de carrera.
- **Pagos**: webhook + polling de Mercado Pago; ante un pago aprobado se valida el monto contra el paquete y se ejecuta el "fulfillment" (asignación de números + correo). Todo evento queda registrado en tablas de auditoría.

```
Comprador ──▶ Landing / Paquetes
                 │
                 ▼
            Checkout (MP) ──▶ Webhook + Polling ──▶ Supabase (pago registrado)
                 │                                          │
                 └── Pago manual (WhatsApp/Nequi/Daviplata)  ▼
                                              fulfillTicketPurchase
                                                      │
                                      sell_random_rifa_tickets (SQL)
                                                      │
                                      Correo Resend con números + alerta de bendecidos
```

## Estructura del proyecto

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/          # login, logout, ventas, reset, reportes, reenvío de correos
│   │   │   ├── mercadopago/    # checkout, webhook, búsqueda de pagos, métodos de pago
│   │   │   └── rifa/           # config, estado, winners, blessed-status
│   │   ├── admin/              # panel admin (settings, reportes, correos, login)
│   │   ├── pago/               # checkout y estado de pago
│   │   └── page.tsx            # landing pública
│   ├── components/             # UI pública (Hero, Packages, Checkout, FAQ, Footer…)
│   ├── config/rifa.ts          # configuración base de la rifa
│   └── lib/                    # lógica de negocio (tickets, pagos, correo, reportes, admin-auth)
├── supabase/schema.sql         # esquema de BD, funciones RPC y datos iniciales
├── certificates/               # certificados locales para desarrollo HTTPS
└── public/images/              # imágenes y logo
```

## Requisitos previos

- Node.js ≥ 18 y npm.
- Una cuenta en [Supabase](https://supabase.com) (proyecto PostgreSQL).
- Una cuenta en [Mercado Pago](https://www.mercadopago.com.co) con credenciales (producción o test).
- Una cuenta en [Resend](https://resend.com) (envío de correos).

## Configuración de entorno

Copia `.env.example` a `.env.local` y completa las variables:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública/anónima de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (acceso público de solo lectura) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (server-side, nunca exponer) |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Public key de Mercado Pago |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de Mercado Pago (prod o test) |
| `MERCADO_PAGO_TEST_TOKEN` | `true` para enviar token de prueba al checkout |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (se usa en los correos) |
| `RESEND_API_KEY` | API key de Resend |
| `RESEND_FROM` | Remitente de los correos (ej. `Entradas Elite Club <onboarding@resend.dev>`) |
| `ADMIN_DRAW_SECRET` | Secreto para operaciones del sorteo |
| `ADMIN_SETTINGS_USER` | Usuario del panel admin |
| `ADMIN_SETTINGS_PASSWORD` | Contraseña del panel admin |
| `ADMIN_SESSION_SECRET` | Secreto para firmar la cookie de sesión admin |

## Puesta en marcha (desarrollo)

```bash
npm install
npm run dev
```

El proyecto incluye certificados locales en `certificates/` para desarrollo con HTTPS.

## Base de datos (Supabase)

Ejecuta `supabase/schema.sql` en el SQL editor de tu proyecto. Crea:

- **`rifa_settings`**: configuración dinámica de la rifa (JSONB).
- **`rifa_tickets`**: los números disponibles/reservados/vendidos.
- **`rifa_purchases`**: compras y sus números asignados.
- **`rifa_winners`**: resultados históricos de sorteos.
- **`mercado_pago_payments`** y **`mercado_pago_payment_events`**: trazabilidad de pagos y eventos.
- **`rifa_blessed_releases`**: control de liberación/venta de números bendecidos.
- **Funciones `security definer`**:
  - `sell_random_rifa_tickets(...)`: asigna números al azar de forma atómica, registra la compra y marca los boletos vendidos.
  - `regenerate_rifa_tickets_for_digits(...)`: regenera la numeración según la cantidad de cifras (solo sin ventas).
  - `pick_minor_prize_numbers(...)`: selecciona al azar números ganadores secundarios entre los vendidos.

> ⚠️ Al cambiar el número de cifras desde el admin, la tabla de tickets se regenera automáticamente. No es posible hacerlo si ya existen ventas.

## Pagos con Mercado Pago

1. El comprador inicia el checkout desde `/pago/checkout` con el SDK JS de Mercado Pago.
2. El backend crea el pago con metadata del paquete, comprador y monto esperado.
3. El **webhook** (`/api/mercadopago/webhook`) y un **polling de sincronización** actualizan el estado del pago.
4. Cuando el pago está `approved`:
   - Se valida que el monto pagado coincida con el paquete y que la metadata sea completa.
   - Se ejecuta `fulfillTicketPurchase` (asignación de números + correo).
   - Se registra el evento y se vincula el pago con la compra.

Los métodos de pago y tipos de identificación se consultan dinámicamente desde la API de Mercado Pago (`/api/mercadopago/payment-methods`, `/api/mercadopago/identification-types`).

## Módulo de administración

Acceso en `/admin` (protegido por la sesión del middleware). Incluye:

- **Configuración** (`/admin`): todos los parámetros de la rifa y la mecánica de premios.
- **Reportes** (`/admin/reportes`): resumen de ventas, transacciones, bruto, comisiones y neto por día, con exportación a Excel/PDF.
- **Correos** (`/admin/correos`): búsqueda de compras y reenvío de correos.
- **Reinicio**: permite limpiar la rifa y regenerar los números.

## Flujo de una compra

1. El comprador elige un paquete o cantidad personalizada en la landing.
2. Llena nombre, WhatsApp colombiano y correo (validados en el servidor).
3. Paga con Mercado Pago o indica pago manual.
4. Al confirmarse el pago: se verifican disponibilidad y umbral de bendecidos, se asignan los números con `sell_random_rifa_tickets`, y se envía el correo con los boletos.
5. Si la compra incluye números bendecidos, se notifica por correo al equipo.

## Sorteo y ganadores

- La fecha del sorteo se calcula a partir del último resultado publicado de la **Lotería de Boyacá** (`src/lib/lottery-results.ts`), consultando `api-resultadosloterias.com`.
- Los ganadores se registran en `rifa_winners` y se muestran en la landing (`PreviousWinners`).
- La lógica de premios incluye: número ganador (4 dígitos), premio invertido, premio por paquete y premios de números bendecidos.

## Despliegue

La app está lista para **Vercel** (o cualquier host de Next.js). El repositorio incluye `vercel.json`.

1. Conecta el repositorio en Vercel.
2. Añade todas las variables de entorno del `.env.example`.
3. Despliega con `npm run build`.

> Algunos endpoints de admin requieren `SUPABASE_SERVICE_ROLE_KEY`; nunca la expongas en variables `NEXT_PUBLIC_`.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Linter de Next.js/ESLint |

## Licencia

Proyecto privado de Elitе Club. No está autorizada su distribución ni uso externo sin permiso.