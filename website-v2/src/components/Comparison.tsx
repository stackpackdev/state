import { motion } from "motion/react";
import { X } from "lucide-react";

const comparisonData = [
  {
    feature: "AI-readable schema",
    sa: "Built-in",
    redux: "No",
    zustand: "No",
    jotai: "No",
    xstate: "Partial",
  },
  {
    feature: "Files per store",
    sa: "1",
    redux: "3-4",
    zustand: "1",
    jotai: "N atoms",
    xstate: "1-2",
  },
  {
    feature: "Zod validation",
    sa: "Every mutation",
    redux: "Manual",
    zustand: "Manual",
    jotai: "Manual",
    xstate: "Manual",
  },
  {
    feature: "Conditions (when/gate)",
    sa: "Declarative",
    redux: "Manual",
    zustand: "Manual",
    jotai: "Manual",
    xstate: "Guards",
  },
  {
    feature: "Animated lifecycle",
    sa: "Presence primitive",
    redux: "No",
    zustand: "No",
    jotai: "No",
    xstate: "No",
  },
  {
    feature: "Undo/redo",
    sa: "Built-in",
    redux: "Middleware",
    zustand: "No",
    jotai: "No",
    xstate: "No",
  },
  {
    feature: "Optimistic updates",
    sa: "Built-in",
    redux: "Middleware",
    zustand: "Manual",
    jotai: "No",
    xstate: "No",
  },
  {
    feature: "Cross-store events",
    sa: "Pub/sub",
    redux: "Manual",
    zustand: "Manual",
    jotai: "Manual",
    xstate: "Actors",
  },
  {
    feature: "Persistence + migrations",
    sa: "Built-in",
    redux: "Manual",
    zustand: "Middleware",
    jotai: "Middleware",
    xstate: "No",
  },
  {
    feature: "Actor attribution",
    sa: "Every mutation",
    redux: "No",
    zustand: "No",
    jotai: "No",
    xstate: "No",
  },
  {
    feature: "Bundle overhead",
    sa: "~15KB (immer+zod)",
    redux: "~7KB",
    zustand: "~1KB",
    jotai: "~3KB",
    xstate: "~25KB",
  },
];

function Cell({
  value,
  isHighlight = false,
}: {
  value: string;
  isHighlight?: boolean;
}) {
  if (value === "No") return <X size={18} className="mx-auto text-zinc-700" />;
  if (
    value === "Manual" ||
    value === "Middleware" ||
    value === "Partial" ||
    value === "Guards" ||
    value === "Actors"
  )
    return <span className="text-zinc-500 text-sm">{value}</span>;

  return (
    <span
      className={`text-sm font-medium ${isHighlight ? "text-emerald-400" : "text-zinc-300"}`}
    >
      {value}
    </span>
  );
}

export function Comparison() {
  return (
    <section className="py-32 bg-zinc-950 relative border-t border-zinc-900 overflow-x-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            How state-agent compares
          </h2>
        </div>

        <div className="overflow-x-auto pb-8">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="py-6 px-4 text-left font-medium text-zinc-400 w-1/4">
                  Feature
                </th>
                <th className="py-6 px-4 font-bold text-emerald-400 w-[15%]">
                  state-agent
                </th>
                <th className="py-6 px-4 font-medium text-zinc-500 w-[15%]">
                  Redux
                </th>
                <th className="py-6 px-4 font-medium text-zinc-500 w-[15%]">
                  Zustand
                </th>
                <th className="py-6 px-4 font-medium text-zinc-500 w-[15%]">
                  Jotai
                </th>
                <th className="py-6 px-4 font-medium text-zinc-500 w-[15%]">
                  XState
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="py-5 px-4 text-left text-zinc-300 text-sm">
                    {row.feature}
                  </td>
                  <td className="py-5 px-4 bg-emerald-500/5 border-x border-emerald-500/10">
                    <Cell value={row.sa} isHighlight />
                  </td>
                  <td className="py-5 px-4">
                    <Cell value={row.redux} />
                  </td>
                  <td className="py-5 px-4">
                    <Cell value={row.zustand} />
                  </td>
                  <td className="py-5 px-4">
                    <Cell value={row.jotai} />
                  </td>
                  <td className="py-5 px-4">
                    <Cell value={row.xstate} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
