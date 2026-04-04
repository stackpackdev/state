import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

const primitives = [
  {
    question: "What data changes together?",
    name: "Together",
    desc: "Group into one store",
    code: `export const userStore = defineStore({
  name: 'user',
  schema: z.object({
    profile: UserSchema,
    preferences: PrefsSchema,
    session: SessionSchema
  })
})`,
  },
  {
    question: "What's independent?",
    name: "Separate",
    desc: "Split into separate stores",
    code: `// UI state is separate from Domain state
export const uiStore = defineStore({
  name: 'ui',
  schema: z.object({
    sidebarOpen: z.boolean(),
    theme: z.enum(['light', 'dark'])
  })
})`,
  },
  {
    question: "What changes appearance?",
    name: "When",
    desc: "Cheap style-edge re-render",
    code: `// Only re-renders when condition flips
const isDark = useWhen('ui', s => s.theme === 'dark')

return <div className={isDark ? 'bg-black' : 'bg-white'} />`,
  },
  {
    question: "What controls mounting?",
    name: "Gate",
    desc: "Component mounts/unmounts",
    code: `// Only mounts when user is logged in
const isLoggedIn = useGate('user', s => !!s.session)

if (!isLoggedIn) return null;
return <Dashboard />`,
  },
  {
    question: "What animates in/out?",
    name: "Presence",
    desc: "Deferred unmount with lifecycle phases",
    code: `<Presence store="ui" gate="modalOpen" timeout={300}>
  {({ phase, ref }) => (
    <div ref={ref} className={\`modal modal--\${phase}\`}>
      <Content />
    </div>
  )}
</Presence>`,
  },
];

export function Primitives() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-32 bg-zinc-900/20 relative border-t border-zinc-900 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Five questions.
            <br />
            <span className="text-emerald-400">
              Every state decision answered.
            </span>
          </h2>
          <p className="text-xl text-zinc-400">
            These rules are unambiguous. When an agent reads your schema, it
            knows EXACTLY where new state belongs. No guessing.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 flex flex-col gap-3">
            {primitives.map((p, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`text-left p-6 rounded-2xl border transition-all duration-300 ${
                  active === i
                    ? "bg-zinc-800 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                    : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/50"
                }`}
              >
                <div className="text-sm text-zinc-500 font-mono mb-2">
                  {p.question}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-zinc-200">
                    {p.name}
                  </span>
                  <span
                    className={`text-sm ${active === i ? "text-emerald-400" : "text-zinc-500"}`}
                  >
                    {p.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-7 relative h-[400px] lg:h-auto lg:min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                transition={{ duration: 0.4, ease: "circOut" }}
                className="absolute inset-0 bg-[#0d1117] rounded-3xl border border-zinc-800 overflow-hidden flex flex-col"
              >
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 bg-[#161b22]">
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <span className="ml-2 text-xs font-mono text-zinc-400">
                    Primitive: {primitives[active].name}
                  </span>
                </div>
                <div className="p-8 flex-1 overflow-auto flex items-center">
                  <pre className="text-sm font-mono text-zinc-300 w-full">
                    <code>{primitives[active].code}</code>
                  </pre>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
