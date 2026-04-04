import { motion, useInView } from "motion/react";
import { useRef, useEffect, useState } from "react";

const stats = [
  { label: "Total lines of code", before: 5288, after: 1926, change: "-63%" },
  {
    label: "Tokens for AI to understand",
    before: 46000,
    after: 15600,
    change: "-66%",
  },
  { label: "Prop drilling instances", before: 37, after: 1, change: "-97%" },
  { label: "App.tsx (root component)", before: 551, after: 97, change: "-82%" },
];

function Counter({
  from,
  to,
  duration = 2,
  inView,
}: {
  from: number;
  to: number;
  duration?: number;
  inView: boolean;
}) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (!inView) return;
    let startTime: number;
    let animationFrame: number;

    const update = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(from + (to - from) * easeProgress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(update);
      }
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [from, to, duration, inView]);

  return <span>{count.toLocaleString()}</span>;
}

export function Proof() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      className="py-32 bg-zinc-950 relative border-t border-zinc-900"
      ref={ref}
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            We refactored a real conference app.
            <br />
            <span className="text-zinc-500">Here's what happened.</span>
          </h2>
          <p className="text-xl text-zinc-400">
            AINDCon conference app — 4 stores replace 1 monolithic component.
            Same UI, same features, fraction of the code.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 font-mono text-sm">
                <th className="py-4 px-6 font-normal">Metric</th>
                <th className="py-4 px-6 font-normal text-right">Before</th>
                <th className="py-4 px-6 font-normal text-right">After</th>
                <th className="py-4 px-6 font-normal text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.15 }}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors group"
                >
                  <td className="py-6 px-6 font-medium text-lg">
                    {stat.label}
                  </td>
                  <td className="py-6 px-6 text-right text-zinc-500 font-mono text-lg">
                    {stat.before.toLocaleString()}
                  </td>
                  <td className="py-6 px-6 text-right text-zinc-200 font-mono text-lg">
                    <Counter
                      from={stat.before}
                      to={stat.after}
                      inView={isInView}
                    />
                  </td>
                  <td className="py-6 px-6 text-right font-mono text-lg font-bold text-emerald-400">
                    {stat.change}
                  </td>
                </motion.tr>
              ))}
              <motion.tr
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: stats.length * 0.15 }}
                className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
              >
                <td className="py-6 px-6 font-medium text-lg">
                  Tests (zero React dependency)
                </td>
                <td className="py-6 px-6 text-right text-zinc-500 font-mono text-lg">
                  0
                </td>
                <td className="py-6 px-6 text-right text-zinc-200 font-mono text-lg">
                  <Counter from={0} to={34} inView={isInView} />
                </td>
                <td className="py-6 px-6 text-right font-mono text-lg text-emerald-400">
                  store logic fully testable
                </td>
              </motion.tr>
              <motion.tr
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: (stats.length + 1) * 0.15 }}
                className="hover:bg-zinc-900/50 transition-colors"
              >
                <td className="py-6 px-6 font-medium text-lg">
                  Total passing tests
                </td>
                <td className="py-6 px-6 text-right text-zinc-500 font-mono text-lg">
                  —
                </td>
                <td className="py-6 px-6 text-right text-zinc-200 font-mono text-lg">
                  <Counter from={0} to={459} inView={isInView} />
                </td>
                <td className="py-6 px-6 text-right font-mono text-lg text-emerald-400">
                  full coverage
                </td>
              </motion.tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
