import { motion } from "motion/react";
import { Terminal, BookOpen, Wrench, FileCode2 } from "lucide-react";

export function GetStarted() {
  return (
    <section className="py-32 bg-zinc-900/20 relative border-t border-zinc-900">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-12">
              5 minutes to your first store.
            </h2>

            <div className="bg-[#0d1117] border border-zinc-800 rounded-2xl p-6 max-w-2xl mx-auto mb-16 flex items-center justify-between group cursor-pointer hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center gap-4 text-zinc-300 font-mono text-lg">
                <Terminal className="text-zinc-600" />
                <span>npm install state-agent</span>
              </div>
              <div className="px-3 py-1 rounded bg-zinc-800 text-xs text-zinc-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                Copy
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 text-left">
              <a
                href="#"
                className="block p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-200">
                  Quick start
                </h3>
                <p className="text-zinc-500 text-sm">
                  See how AI agents use the framework to build features fast.
                </p>
              </a>

              <a
                href="#"
                className="block p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                  <Wrench size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-200">
                  Refactor guide
                </h3>
                <p className="text-zinc-500 text-sm">
                  Migrate from useState, Redux, or Zustand in minutes.
                </p>
              </a>

              <a
                href="#"
                className="block p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                  <FileCode2 size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-200">
                  Full reference
                </h3>
                <p className="text-zinc-500 text-sm">
                  Deep dive into all primitives, schemas, and advanced patterns.
                </p>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
