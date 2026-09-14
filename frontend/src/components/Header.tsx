import { useState } from 'react';
import { Leaf, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeView?: 'home' | 'crop-recommendation' | 'sustainability' | 'login' | 'signup';
  onNavigateHome?: () => void;
  onNavigateCropRecommendation?: () => void;
  onNavigateSustainability?: () => void;
  onNavigateLogin?: () => void;
  onNavigateSignup?: () => void;
  onOpenAuth?: () => void;
}

export function Header({
  activeView = 'home',
  onNavigateHome,
  onNavigateCropRecommendation,
  onNavigateSustainability: _onNavigateSustainability,
  onNavigateLogin,
  onNavigateSignup,
  onOpenAuth,
}: HeaderProps = {}) {
  const { status, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (e?: React.MouseEvent, hash?: string) => {
    if (e) {
      e.preventDefault();
    }
    if (activeView !== 'home' && onNavigateHome) {
      onNavigateHome();
      if (hash) {
        setTimeout(() => {
          const el = document.querySelector(hash);
          el?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else if (hash) {
      const el = document.querySelector(hash);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLoginClick = () => {
    if (onNavigateLogin) {
      onNavigateLogin();
    } else if (onOpenAuth) {
      onOpenAuth();
    }
  };

  const handleSignupClick = () => {
    if (onNavigateSignup) {
      onNavigateSignup();
    } else if (onOpenAuth) {
      onOpenAuth();
    }
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 border-b border-[#D4ECDC] bg-[#E8F8F0]/95 backdrop-blur-md shadow-2xs"
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
              <Leaf size={20} strokeWidth={2.4} color="#FFFFFF" className="animate-leaf-sway" />
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
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors no-underline ${
                activeView === 'home'
                  ? 'bg-[#D7F3E3] text-[#047857]'
                  : 'text-[#475569] hover:bg-[#D7F3E3] hover:text-[#047857]'
              }`}
            >
              Home
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onNavigateCropRecommendation?.();
              }}
              aria-label="Farm Insight — Crop Recommendation"
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                activeView === 'crop-recommendation' || activeView === 'sustainability'
                  ? 'bg-[#D7F3E3] text-[#047857]'
                  : 'text-[#475569] hover:bg-[#D7F3E3] hover:text-[#047857]'
              }`}
            >
              Farm Insight
            </button>
            <a
              href="#model-info"
              onClick={(e) => handleLinkClick(e, '#model-info')}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-[#475569] transition-colors hover:bg-[#D7F3E3] hover:text-[#047857] no-underline"
            >
              Model Info
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleLinkClick(e, '#how-it-works')}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-[#475569] transition-colors hover:bg-[#D7F3E3] hover:text-[#047857] no-underline"
            >
              How It Works
            </a>
          </nav>

          {/* Top-Right Side: Sign Up (primary), Login (secondary) */}
          <div className="hidden md:flex items-center gap-3">

            {status === 'authenticated' && user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {user.name || user.email || 'Account'}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors"
                  aria-label="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Action: Login */}
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="rounded-full border border-emerald-600 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-700 transition-colors cursor-pointer"
                  aria-label="Login"
                >
                  Login
                </button>

                {/* Primary / Default Action: Sign Up */}
                <button
                  type="button"
                  onClick={handleSignupClick}
                  className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  aria-label="Sign Up"
                >
                  Sign Up
                </button>
              </div>
            )}

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
              className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors ${
                activeView === 'home' ? 'text-[#059669] bg-[#ECFDF5]' : 'text-slate-700 hover:bg-[#ECFDF5] hover:text-[#059669]'
              }`}
            >
              Home
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateCropRecommendation?.();
              }}
              aria-label="Farm Insight — Crop Recommendation"
              className={`block w-full text-left rounded-lg px-3 py-2 text-base font-medium cursor-pointer transition-colors ${
                activeView === 'crop-recommendation' || activeView === 'sustainability' ? 'text-[#059669] bg-[#ECFDF5]' : 'text-slate-700 hover:bg-[#ECFDF5] hover:text-[#059669]'
              }`}
            >
              Farm Insight
            </button>
            <a
              href="#model-info"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleLinkClick(e, '#model-info');
              }}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-[#D7F3E3] hover:text-[#047857] transition-colors"
            >
              Model Info
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleLinkClick(e, '#how-it-works');
              }}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-[#ECFDF5] hover:text-[#059669] transition-colors"
            >
              How It Works
            </a>

            {/* Mobile Auth Entry Point */}
            <div className="pt-2 border-t border-slate-100 mt-2">
              {status === 'authenticated' && user ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">
                    {user.name || user.email || 'Account'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    aria-label="Sign Out"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-3 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignupClick();
                    }}
                    className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                    aria-label="Sign Up"
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLoginClick();
                    }}
                    className="flex w-full items-center justify-center rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    aria-label="Login"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
