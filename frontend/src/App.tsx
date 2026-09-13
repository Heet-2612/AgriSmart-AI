import { useState, Component, ReactNode, ErrorInfo } from 'react';
import { Leaf } from 'lucide-react';
import { Header } from './components/Header';
import { DiagnosePage } from './pages/DiagnosePage';
import { CropRecommendationPage } from './pages/CropRecommendationPage';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackView?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AgriSmart AI UI Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex-1 flex items-center justify-center p-8 text-center bg-slate-50">
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Display Error Detected</h2>
            <p className="text-sm text-slate-600 mb-4">
              An unexpected display issue occurred while rendering. You can safely return to the home screen.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.fallbackView) {
                  this.props.fallbackView();
                } else {
                  window.location.reload();
                }
              }}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors"
            >
              Return to Home
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

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
  const [activeView, setActiveView] = useState<'home' | 'crop-recommendation'>('home');

  const handleNavigateHome = () => {
    setActiveView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCropRecommendation = () => {
    setActiveView('crop-recommendation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="app-shell" className="flex min-h-screen flex-col bg-white">
      <Header
        activeView={activeView}
        onNavigateHome={handleNavigateHome}
      />
      <ErrorBoundary fallbackView={handleNavigateHome}>
        {activeView === 'home' ? (
          <DiagnosePage onOpenCropRecommendation={handleOpenCropRecommendation} />
        ) : (
          <CropRecommendationPage onBack={handleNavigateHome} />
        )}
      </ErrorBoundary>
      <Footer />
    </div>
  );
}

