import { motion } from "motion/react";
import { Database, Zap, Layers } from "lucide-react";

const features = [
  {
    category: "State",
    icon: Database,
    items: [
      "Zod-validated mutations",
      "Immer drafts",
      "Path-based read/write",
      "Actor attribution",
      "Computed values",
    ],
  },
  {
    category: "Conditions",
    icon: Zap,
    items: [
      "When (style-edge)",
      "Gate (mount-edge)",
      "Presence (animated lifecycle)",
      "Discriminated union modes",
      "Transition graphs",
    ],
  },
  {
    category: "Advanced",
    icon: Layers,
    items: [
      "Optimistic updates + rollback",
      "Effects (debounce, retry, abort)",
      "Cross-store pub/sub",
      "Persistence + migrations",
      "Undo/redo",
      "Runtime introspection",
      "Property invariants",
    ],
  },
];

export function Features() {
  return (
    <section className="py-32 bg-zinc-900/20 relative border-t border-zinc-900">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Everything you need.
            <br />
            <span className="text-zinc-500">Nothing you don't.</span>
          </h2>
          <div className="flex gap-4 mt-8">
            <span className="px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm font-mono text-zinc-400">
              dependency: <span className="text-emerald-400">immer</span>
            </span>
            <span className="px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm font-mono text-zinc-400">
              dependency: <span className="text-emerald-400">zod</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((col, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                  <col.icon size={20} />
                </div>
                <h3 className="text-xl font-bold">{col.category}</h3>
              </div>
              <ul className="space-y-4">
                {col.items.map((item, j) => (
                  <li key={j} className="text-zinc-400 flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-zinc-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
