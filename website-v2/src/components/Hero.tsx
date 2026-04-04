import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowRight, Github } from "lucide-react";

export function Hero() {
  const count = useMotionValue(551);
  const rounded = useTransform(count, Math.round);
  const [isClean, setIsClean] = useState(false);

  useEffect(() => {
    const controls = animate(count, 97, {
      duration: 2,
      delay: 1,
      ease: "circOut",
      onUpdate: (v) => {
        if (v < 300) setIsClean(true);
      },
    });
    return controls.stop;
  }, [count]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(16,185,129,0.15),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              State management that your <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                AI pair programmer
              </span>{" "}
              actually understands.
            </h1>
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              5 primitives. One schema. 63% less code. Built for the age of vibe
              coding.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-full flex items-center justify-center gap-2 transition-colors w-full sm:w-auto">
                Get Started <ArrowRight size={20} />
              </button>
              <button className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold rounded-full flex items-center justify-center gap-2 transition-colors w-full sm:w-auto">
                <Github size={20} /> View on GitHub
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="max-w-5xl mx-auto relative"
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full flex items-center gap-3 z-20 shadow-xl">
            <span className="text-sm text-zinc-400">App.tsx LOC:</span>
            <motion.span className="font-mono text-xl font-bold text-emerald-400">
              {rounded}
            </motion.span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 relative">
            <motion.div
              className="bg-[#0d1117] rounded-2xl border border-zinc-800/50 overflow-hidden relative"
              animate={{
                opacity: isClean ? 0.3 : 1,
                scale: isClean ? 0.95 : 1,
              }}
              transition={{ duration: 0.8 }}
            >
              <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-2 bg-[#161b22]">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                <span className="ml-2 text-xs font-mono text-zinc-500">
                  App.tsx (Before)
                </span>
              </div>
              <div className="p-6 overflow-hidden h-[400px]">
                <pre className="text-xs font-mono text-zinc-400 opacity-50">
                  <code>{`const [user, setUser] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [todos, setTodos] = useState([]);
const [filter, setFilter] = useState('all');
const [isModalOpen, setIsModalOpen] = useState(false);
const [isAnimating, setIsAnimating] = useState(false);

useEffect(() => {
  let mounted = true;
  setIsLoading(true);
  fetchData().then(data => {
    if(mounted) {
      setTodos(data);
      setIsLoading(false);
    }
  }).catch(e => {
    if(mounted) {
      setError(e);
      setIsLoading(false);
    }
  });
  return () => { mounted = false };
}, []);

// ... 500 more lines of prop drilling
<Header user={user} isLoading={isLoading} />
<Sidebar filter={filter} setFilter={setFilter} />
<TodoList 
  todos={todos} 
  filter={filter} 
  onUpdate={handleUpdate}
  onDelete={handleDelete}
/>
<Modal 
  isOpen={isModalOpen} 
  isAnimating={isAnimating}
  onClose={handleClose}
/>`}</code>
                </pre>
              </div>
            </motion.div>

            <motion.div
              className="bg-[#0d1117] rounded-2xl border border-emerald-500/30 overflow-hidden relative shadow-[0_0_30px_rgba(16,185,129,0.1)]"
              initial={{ opacity: 0, x: 20 }}
              animate={{
                opacity: isClean ? 1 : 0.5,
                x: 0,
                scale: isClean ? 1 : 0.95,
              }}
              transition={{ duration: 0.8 }}
            >
              <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-2 bg-[#161b22]">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <span className="ml-2 text-xs font-mono text-emerald-400">
                  App.tsx (state-agent)
                </span>
              </div>
              <div className="p-6 overflow-hidden h-[400px]">
                <pre className="text-xs font-mono text-zinc-300">
                  <code>{`import { useStore } from 'state-agent';
import { Presence } from 'state-agent/react';

export function App() {
  // AI knows exactly what this does
  const { value: todos } = useStore('todos');
  const { value: ui } = useStore('ui');

  return (
    <Layout>
      <Header />
      <Sidebar />
      <TodoList />
      
      {/* CSS-only animations, no useEffect hacks */}
      <Presence store="ui" gate="isModalOpen" timeout={300}>
        {({ phase, ref }) => (
          <Modal ref={ref} phase={phase} />
        )}
      </Presence>
    </Layout>
  );
}

// That's it. 97 lines.`}</code>
                </pre>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
