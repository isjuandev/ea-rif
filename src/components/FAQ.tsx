import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const questions = [
  {
    q: "Como recibo mis wallpapers?",
    a: "Al registrar la compra, el sistema asigna wallpapers aleatorios disponibles del 0000 al 9999 y los envía al correo registrado.",
  },
  {
    q: "Que estoy comprando exactamente?",
    a: "Cada wallpaper cuesta $500 COP e incluye un wallpaper digital. Puedes comprar paquetes de 5, 10, 20 o 50 wallpapers.",
  },
  {
    q: "Puedo elegir mis wallpapers?",
    a: "No. Para mantener el proceso transparente, los wallpapers se asignan aleatoriamente según la cantidad de rifas incluidas en tu paquete.",
  },
  {
    q: "Como se anuncia el ganador?",
    a: "En un directo en instagram se anuncia el ganador",
  },
  {
    q: "Hay mas premios ademas del mayor?",
    a: "Si. En cada sorteo se registran 10 wallpapers premiados aleatorios con recompensas menores.",
  },
];

export function FAQ() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-4xl font-bold text-white sm:text-5xl">FAQ</h2>
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
