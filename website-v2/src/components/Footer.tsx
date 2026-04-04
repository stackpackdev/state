import { Github, Package } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 bg-zinc-950 border-t border-zinc-900">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500" />
            <span className="font-bold text-lg tracking-tight text-zinc-200">
              state-agent
            </span>
          </div>

          <div className="text-zinc-500 text-sm">
            Built for agents. Used by humans.
          </div>

          <div className="flex items-center gap-6 text-zinc-400">
            <a
              href="#"
              className="hover:text-emerald-400 transition-colors flex items-center gap-2 text-sm"
            >
              <Github size={18} /> GitHub
            </a>
            <a
              href="#"
              className="hover:text-emerald-400 transition-colors flex items-center gap-2 text-sm"
            >
              <Package size={18} /> npm
            </a>
            <span className="text-sm">License: MIT</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
