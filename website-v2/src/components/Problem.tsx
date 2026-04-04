import { motion } from "motion/react";
import { Layers, Network, Timer } from "lucide-react";

const problems = [
  {
    icon: Network,
    title: "The Prop Drilling Spiral",
    desc: "You asked the AI to add a feature. It threaded a new prop through 6 components. Now every parent re-renders when a child changes. The AI doesn't know which data changes together.",
  },
  {
    icon: Layers,
    title: "The State Sprawl",
    desc: "37 useState calls scattered across your app. Loading states duplicated in 4 components. The AI can't see the whole picture because there IS no whole picture.",
  },
  {
    icon: Timer,
    title: "The Animation Hack",
    desc: "You asked for a fade-out animation. The AI added useEffect + setTimeout + a boolean flag + a ref. React still unmounts the element before the animation finishes.",
  },
];

export function Problem() {
  return (
    <section className="py-32 bg-zinc-950 relative border-t border-zinc-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-3xl mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Your AI writes great components.
            <br />
            <span className="text-zinc-500">
              Your state layer is still a mess.
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.2 }}
              className="bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-3xl hover:bg-zinc-900 transition-colors"
            >
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 text-emerald-400">
                <p.icon size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-4">{p.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
