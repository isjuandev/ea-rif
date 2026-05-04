import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const questions = [
  {
    q: "Como recibo mis entradas?",
    a: "Al registrar la compra, el sistema asigna entradas aleatorias disponibles dentro del rango configurado para esta rifa y las envía al correo registrado.",
  },
  {
    q: "Que estoy comprando exactamente?",
    a: "Cada entrada cuesta $1000 COP e incluye una entrada digital para ser un feliz ganador. Puedes comprar paquetes de 5, 10, 20, 50 o hasta 500 entradas.",
  },
  {
    q: "Puedo elegir mis entradas?",
    a: "No. Para mantener el proceso transparente, las entradas se asignan aleatoriamente según la cantidad de rifas incluidas en tu paquete.",
  },
  {
    q: "Como se anuncia el ganador?",
    a: "En un directo en instagram se anuncia el ganador",
  },
  {
    q: "Hay más premios además del mayor?",
    a: "Sí. En cada sorteo se registran 10 entradas premiados aleatorios con recompensas menores.",
  },
];

export function FAQ() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-4xl font-bold text-foreground sm:text-5xl">FAQ</h2>
        <Accordion type="single" collapsible className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {questions.map((item, index) => (
            <AccordionItem key={item.q} value={`item-${index}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
