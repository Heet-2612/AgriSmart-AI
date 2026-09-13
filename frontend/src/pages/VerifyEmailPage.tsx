import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { verifyEmail } from '../api/client';

export interface VerifyEmailPageProps {
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export function VerifyEmailPage({ onNavigateLogin, onNavigateHome }: VerifyEmailPageProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    // Extract token from URL search params
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in the URL.');
      return;
    }

    let isMounted = true;

    async function doVerify() {
      try {
        const res = await verifyEmail(token as string);
        if (isMounted) {
          setStatus('success');
          setMessage(res.message || 'Your email has been successfully verified.');
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus('error');
          const msg = err instanceof Error ? err.message : 'Failed to verify email.';
          setMessage(msg);
        }
      }
    }

    doVerify();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-50">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="animate-spin text-emerald-600 mb-4" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Verifying Email</h1>
            <p className="text-sm text-slate-500">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Email Verified</h1>
            <p className="text-sm text-slate-500 mb-6">{message}</p>
            <button
              onClick={onNavigateLogin}
              className="w-full py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continue to Login</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <XCircle size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Verification Failed</h1>
            <p className="text-sm text-slate-500 mb-6">{message}</p>
            <button
              onClick={onNavigateLogin}
              className="w-full mb-3 py-2.5 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer"
            >
              Go to Login
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full py-2.5 text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Return Home
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
