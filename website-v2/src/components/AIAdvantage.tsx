import { motion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";

const others = [
  "Agent generates plausible store code → breaks at runtime",
  "Agent doesn't know what data changes together → prop drilling",
  "Agent can't reason about mount/unmount → animation bugs",
  "Agent generates 4 files per feature (Redux) → token waste",
  "getStore('name') returns unknown → type errors everywhere",
];

const stateAgent = [
  "Schema IS the planning language → agent reads once, generates correctly",
  "Together/Separate rules → agent groups data correctly every time",
  "When/Gate/Presence → agent knows exactly which primitive to use",
  "One file per store → 66% fewer tokens for AI context",
  "defineStore() returns typed result → zero casting, zero guessing",
];

export function AIAdvantage() {
  return (
    <section className="py-32 bg-zinc-950 relative border-t border-zinc-900">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16 text-center mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Built for agents.
            <br />
            <span className="text-zinc-500">Not retrofitted.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Others */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 opacity-60"
          >
            <h3 className="text-xl font-semibold mb-8 text-zinc-400 flex items-center gap-3">
              <XCircle className="text-red-500" /> Other libraries
            </h3>
            <ul className="space-y-6">
              {others.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 mt-2.5 shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* state-agent */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-8 shadow-[0_0_30px_rgba(16,185,129,0.05)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
            <h3 className="text-xl font-semibold mb-8 text-emerald-400 flex items-center gap-3 relative z-10">
              <CheckCircle2 className="text-emerald-400" /> state-agent
            </h3>
            <ul className="space-y-6 relative z-10">
              {stateAgent.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-zinc-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2.5 shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center max-w-2xl mx-auto"
        >
          <p className="text-xl font-medium text-zinc-300">
            <span className="text-emerald-400">Bottom line:</span> The AI
            doesn't need to "understand" your state library. The library was
            designed to be understood by AI.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
