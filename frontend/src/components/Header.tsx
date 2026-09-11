import { Leaf } from 'lucide-react';

export function Header() {
  return (
    <header
      role="banner"
      style={{ backgroundColor: '#0F172A' }}
      className="sticky top-0 z-50 border-b border-white/10"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Wordmark */}
          <a
            href="/"
            aria-label="AgriSmart AI — home"
            className="flex items-center gap-2 text-white no-underline hover:no-underline focus-visible:rounded"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#10B981' }}
              aria-hidden="true"
            >
              <Leaf size={18} strokeWidth={2.5} color="#fff" />
            </span>
            <span className="text-base font-bold tracking-tight text-white">
              AgriSmart <span style={{ color: '#10B981' }}>AI</span>
            </span>
          </a>

          {/* Nav */}
          <nav aria-label="Primary navigation">
            <a
              href="#diagnose"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white focus-visible:text-white"
              style={{ textDecoration: 'none' }}
            >
              Diagnose
            </a>
          </nav>

        </div>
      </div>
    </header>
  );
}
