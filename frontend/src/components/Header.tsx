import { useState } from 'react';
import { Leaf, Menu, X } from 'lucide-react';

interface HeaderProps {
  activeView?: 'home' | 'crop-recommendation';
  onNavigateHome?: () => void;
}

export function Header({ activeView = 'home', onNavigateHome }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (hash?: string) => {
    if (activeView !== 'home' && onNavigateHome) {
      onNavigateHome();
      if (hash) {
        setTimeout(() => {
          const el = document.querySelector(hash);
          el?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    }
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-sm shadow-xs"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-18 items-center justify-between gap-4">

          {/* Wordmark & Brand Logo */}
          <a
            href="#diagnose"
            aria-label="AgriSmart AI — home"
            onClick={(e) => {
              if (activeView !== 'home' && onNavigateHome) {
                e.preventDefault();
                onNavigateHome();
              }
            }}
            className="flex items-center gap-2.5 no-underline hover:no-underline focus-visible:rounded-lg"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform hover:scale-105"
              style={{ backgroundColor: '#10B981' }}
              aria-hidden="true"
            >
              <Leaf size={20} strokeWidth={2.4} color="#FFFFFF" />
            </span>
            <span className="text-xl font-bold tracking-tight text-[#0F172A]">
              AgriSmart <span style={{ color: '#10B981' }}>AI</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-2">
            <a
              href="#diagnose"
              onClick={(e) => {
                if (activeView !== 'home' && onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome();
                }
              }}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeView === 'home' ? '#ECFDF5' : 'transparent',
                color: activeView === 'home' ? '#059669' : '#475569',
                textDecoration: 'none',
              }}
            >
              Home
            </a>
            <a
              href="#how-it-works"
              onClick={() => handleLinkClick('#how-it-works')}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 hover:bg-slate-50"
              style={{ textDecoration: 'none' }}
            >
              How It Works
            </a>
            <a
              href="#supported-crops"
              onClick={() => handleLinkClick('#supported-crops')}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 hover:bg-slate-50"
              style={{ textDecoration: 'none' }}
            >
              Supported Crops
            </a>
            <a
              href="#model-info"
              onClick={() => handleLinkClick('#model-info')}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 hover:bg-slate-50"
              style={{ textDecoration: 'none' }}
            >
              Model Info
            </a>
          </nav>

          {/* Right Action / Leaf Badge */}
          <div className="hidden md:flex items-center">
            <a
              href="#diagnose"
              aria-label="Diagnose Leaf"
              onClick={(e) => {
                if (activeView !== 'home' && onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome();
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:opacity-90 hover:scale-105 shadow-xs"
              style={{ backgroundColor: '#059669', color: '#FFFFFF' }}
            >
              <Leaf size={18} strokeWidth={2.2} />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-slate-100 py-3 space-y-1"
          >
            <a
              href="#diagnose"
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (activeView !== 'home' && onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome();
                }
              }}
              className="block rounded-lg px-3 py-2 text-base font-medium text-emerald-700 bg-emerald-50"
            >
              Home
            </a>
            <a
              href="#how-it-works"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLinkClick('#how-it-works');
              }}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              How It Works
            </a>
            <a
              href="#supported-crops"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLinkClick('#supported-crops');
              }}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Supported Crops
            </a>
            <a
              href="#model-info"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLinkClick('#model-info');
              }}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Model Info
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
