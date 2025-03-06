import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is Alpha Omega?",
    answer: "Alpha Omega is a service that provides ...",
  },
  {
    question: "How do I book for a consultation?",
    answer:
      "You can book a consultation via our website or contact us directly.",
  },
  {
    question: "Where can I find Alpha Omega?",
    answer:
      "Alpha Omega is located in multiple locations. Visit our website for details.",
  },
  {
    question: "What payment method is available on Alpha Omega?",
    answer:
      "We accept credit/debit cards, PayPal, and other online payment methods.",
  },
  {
    question: "Does Alpha Omega take walk-ins?",
    answer: "Yes, but appointments are recommended for faster service.",
  },
  {
    question: "What time does Alpha Omega open?",
    answer: "We are open from 9 AM to 6 PM, Monday to Saturday.",
  },
];

export function FAQSection() {
  return (
    <Accordion type="single" collapsible className="w-full md:w-xl mx-auto">
      {faqs.map((faq, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent>{faq.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
