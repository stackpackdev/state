/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hero } from "./components/Hero";
import { Problem } from "./components/Problem";
import { Primitives } from "./components/Primitives";
import { Proof } from "./components/Proof";
import { HowItWorks } from "./components/HowItWorks";
import { AIAdvantage } from "./components/AIAdvantage";
import { Features } from "./components/Features";
import { Comparison } from "./components/Comparison";
import { GetStarted } from "./components/GetStarted";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30">
      <Hero />
      <Problem />
      <Primitives />
      <Proof />
      <HowItWorks />
      <AIAdvantage />
      <Features />
      <Comparison />
      <GetStarted />
      <Footer />
    </div>
  );
}
