import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const questions = [
  {
    q: "Como recibo mis numeros de rifa?",
    a: "Al registrar la compra, el sistema asigna numeros aleatorios disponibles del 0000 al 9999 y los envia al correo registrado.",
  },
  {
    q: "Que estoy comprando exactamente?",
    a: "Cada numero cuesta $500 COP e incluye un wallpaper digital. Puedes comprar paquetes de 5, 10, 20 o 50 numeros.",
  },
  {
    q: "Puedo elegir mis numeros?",
    a: "No. Para mantener el proceso transparente, los numeros se asignan aleatoriamente segun la cantidad de rifas incluidas en tu paquete.",
  },
  {
    q: "Como se anuncia el ganador?",
    a: "El premio mayor juega con la Loteria del Quindio cada jueves habil. Si el jueves es festivo en Colombia, se usa el siguiente jueves habil.",
  },
  {
    q: "Hay mas premios ademas del mayor?",
    a: "Si. En cada sorteo se registran 10 numeros premiados aleatorios con recompensas menores, ademas del premio mayor.",
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
