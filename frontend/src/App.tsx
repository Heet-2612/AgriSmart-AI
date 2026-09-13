import { useState, Component, ReactNode, ErrorInfo } from 'react';
import { Leaf } from 'lucide-react';
import { Header } from './components/Header';
import { DiagnosePage } from './pages/DiagnosePage';
import { CropRecommendationPage } from './pages/CropRecommendationPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';

export type AppView = 'home' | 'crop-recommendation' | 'login' | 'signup';

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

        </div>
      </div>
    </footer>
  );
}

function AppShell() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [previousView, setPreviousView] = useState<'home' | 'crop-recommendation'>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const navigateTo = (view: AppView) => {
    if (activeView === 'home' || activeView === 'crop-recommendation') {
      setPreviousView(activeView);
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => navigateTo('home');
  const handleOpenCropRecommendation = () => navigateTo('crop-recommendation');
  const handleNavigateLogin = () => navigateTo('login');
  const handleNavigateSignup = () => navigateTo('signup');

  const handleReturnToPrevious = () => {
    setActiveView(previousView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="app-shell" className="flex min-h-screen flex-col bg-white">
      <Header
        activeView={activeView}
        onNavigateHome={handleNavigateHome}
        onNavigateCropRecommendation={handleOpenCropRecommendation}
        onNavigateLogin={handleNavigateLogin}
        onNavigateSignup={handleNavigateSignup}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />
      <ErrorBoundary fallbackView={handleNavigateHome}>
        {activeView === 'home' && (
          <DiagnosePage onOpenCropRecommendation={handleOpenCropRecommendation} />
        )}
        {activeView === 'crop-recommendation' && (
          <CropRecommendationPage onBack={handleNavigateHome} />
        )}
        {activeView === 'login' && (
          <LoginPage
            onBack={handleReturnToPrevious}
            onNavigateSignup={handleNavigateSignup}
            onSuccess={handleReturnToPrevious}
          />
        )}
        {activeView === 'signup' && (
          <SignupPage
            onBack={handleReturnToPrevious}
            onNavigateLogin={handleNavigateLogin}
            onSuccess={handleReturnToPrevious}
          />
        )}
      </ErrorBoundary>
      <Footer />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

