import { Accordion } from '@base-ui/react/accordion';
import { Plus } from 'lucide-react';

const QUESTIONS = [
  { q: 'is it free?', a: 'yes. MIT licensed, open source, no paid tier.' },
  { q: 'where do my keys live?', a: 'in ~/.recompose on your machine. nothing leaves it.' },
  {
    q: 'which clients work?',
    a: 'any client that speaks the Anthropic or OpenAI dialect: Claude Code, Codex CLI, Cursor, Cline and friends.',
  },
  {
    q: 'how do subscriptions work?',
    a: "the provider's own tool signs in and spends. recompose never does either.",
  },
  {
    q: 'do I need API keys?',
    a: 'subscriptions, API keys, or both. they wire into the same gateway.',
  },
  { q: 'which platforms?', a: 'macOS, Windows and Linux.' },
];

export function FaqSection() {
  return (
    <section className="bg-stage">
      <div className="mx-auto grid max-w-360 gap-10 px-5 py-16 md:px-10 md:py-20 lg:grid-cols-faq lg:gap-24 lg:px-16 lg:py-28">
        <h2 className="text-2xl font-medium md:text-3xl lg:text-4xl">
          <span className="block text-stage-ink">questions,</span>
          <span className="block text-stage-faint">answered.</span>
        </h2>

        <Accordion.Root defaultValue={[QUESTIONS[0]?.q ?? '']} className="flex flex-col">
          {QUESTIONS.map(({ q, a }) => (
            <Accordion.Item key={q} value={q} className="border-t border-stage-line">
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-start">
                  <span className="text-lg font-medium text-stage-ink underline-offset-4 group-hover:underline md:text-xl">
                    {q}
                  </span>
                  <Plus className="size-4 shrink-0 text-stage-faint transition-transform duration-200 group-data-[panel-open]:rotate-45" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className="faq-panel">
                <div className="max-w-xl pb-6 text-body leading-relaxed text-stage-dim">{a}</div>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
