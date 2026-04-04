import { motion, useScroll } from "motion/react";
import { useRef } from "react";

const steps = [
  {
    title: "1. Define",
    desc: "Types, validation, selectors, conditions — all from one declaration. Your AI reads this and knows everything.",
    code: `export const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(z.object({ 
      id: z.string(), 
      text: z.string(), 
      done: z.boolean() 
    })),
    filter: z.enum(['all', 'active', 'done']),
  }),
  initial: { items: [], filter: 'all' as const },
  when: { isEmpty: (s) => s.items.length === 0 },
  gates: { hasItems: (s) => s.items.length > 0 },
  computed: { 
    activeCount: (s) => s.items.filter(i => !i.done).length 
  },
})`,
  },
  {
    title: "2. Use",
    desc: "No actor boilerplate. No dispatch. No action creators. Just mutate.",
    code: `const { value, change, update } = useStore('todos')

// Simple property update
change('filter', 'active')

// Deep mutation with Immer
update(draft => { 
  draft.items.push(newItem) 
})`,
  },
  {
    title: "3. Animate",
    desc: "CSS-only animations. No Framer Motion. No useEffect hacks. The element stays in the DOM until leaving phase completes.",
    code: `<Presence store="modal" gate="isOpen" timeout={300}>
  {({ phase, ref }) => (
    <div 
      ref={ref} 
      className={\`modal modal--\${phase}\`}
    >
      <Content />
    </div>
  )}
</Presence>`,
  },
];

export function HowItWorks() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  return (
    <section
      className="py-32 bg-zinc-900/20 relative border-t border-zinc-900"
      ref={containerRef}
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-24 text-center mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            One schema.
            <br />
            <span className="text-emerald-400">Everything derives.</span>
          </h2>
        </div>

        <div className="max-w-5xl mx-auto relative">
          {/* Vertical Line */}
          <div className="absolute left-[27px] md:left-1/2 top-0 bottom-0 w-px bg-zinc-800 md:-translate-x-1/2" />

          <motion.div
            className="absolute left-[27px] md:left-1/2 top-0 bottom-0 w-px bg-emerald-500 md:-translate-x-1/2 origin-top"
            style={{ scaleY: scrollYProgress }}
          />

          <div className="space-y-24">
            {steps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <div
                  key={i}
                  className={`relative flex flex-col md:flex-row items-center gap-8 md:gap-16 ${isEven ? "" : "md:flex-row-reverse"}`}
                >
                  {/* Node */}
                  <div className="absolute left-[16px] md:left-1/2 w-6 h-6 rounded-full bg-zinc-950 border-2 border-emerald-500 md:-translate-x-1/2 z-10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>

                  {/* Content */}
                  <div className="w-full md:w-1/2 pl-16 md:pl-0 flex flex-col justify-center">
                    <div
                      className={`${isEven ? "md:text-right md:pr-12" : "md:text-left md:pl-12"}`}
                    >
                      <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                      <p className="text-zinc-400 leading-relaxed mb-6">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {/* Code */}
                  <div className="w-full md:w-1/2 pl-16 md:pl-0">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      className="bg-[#0d1117] rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl"
                    >
                      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 bg-[#161b22]">
                        <div className="w-3 h-3 rounded-full bg-zinc-700" />
                        <div className="w-3 h-3 rounded-full bg-zinc-700" />
                        <div className="w-3 h-3 rounded-full bg-zinc-700" />
                      </div>
                      <div className="p-6 overflow-x-auto">
                        <pre className="text-sm font-mono text-zinc-300">
                          <code>{step.code}</code>
                        </pre>
                      </div>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
