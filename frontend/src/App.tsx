import { Leaf } from 'lucide-react';
import { Header } from './components/Header';
import { DiagnosePage } from './pages/DiagnosePage';
import { SustainabilityScore } from './pages/SustainabilityScore';

function Footer() {
  return (
    <footer
      className="border-t border-slate-200/80 bg-white py-8"
      role="contentinfo"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">

          {/* Logo & Tagline */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3.5">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: '#10B981' }}
                aria-hidden="true"
              >
                <Leaf size={16} strokeWidth={2.4} color="#FFFFFF" />
              </span>
              <span className="text-sm font-bold text-[#0F172A]">
                AgriSmart <span style={{ color: '#10B981' }}>AI</span>
              </span>
            </div>
            <span className="hidden sm:inline-block h-3.5 w-px bg-slate-300" aria-hidden="true" />
            <span className="text-xs text-slate-500 font-medium">
              Intelligent Agriculture for a Sustainable Future
            </span>
          </div>

          {/* Hackathon metadata */}
          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} AgriSmart AI
          </div>

        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div id="app-shell" className="flex min-h-screen flex-col bg-white">
      <Header />
      <DiagnosePage />
      <section
        id="sustainability"
        className="py-12 sm:py-16 bg-slate-50/60 border-t border-slate-200/80"
        aria-label="Sustainability score calculation"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SustainabilityScore />
        </div>
      </section>
      <Footer />
    </div>
  );
}
