import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '../Button';

interface ModelUnavailableProps {
  fileName?: string;
  imagePreviewUrl?: string | null;
  onReset: () => void;
}

export function ModelUnavailable({ fileName, imagePreviewUrl, onReset }: ModelUnavailableProps) {
  return (
    <div
      role="alert"
      aria-label="Prediction model unavailable notice"
      className="space-y-6 text-left"
    >
      {/* Visual Header */}
      <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-5 sm:p-6 shadow-xs">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
          aria-hidden="true"
        >
          <AlertTriangle size={24} strokeWidth={2.2} />
        </div>

        <div>
          <span
            className="inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: '#FDE68A', color: '#92400E' }}
          >
            Service Notice
          </span>
          <h2 className="mt-1 text-lg font-bold text-[#0F172A]">
            Prediction Model Unavailable
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            Your crop image was received successfully, but the automated AI diagnostic
            service is currently offline. No diagnosis could be generated at this time.
          </p>
        </div>
      </div>

      {/* Selected Image Reference */}
      {imagePreviewUrl && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Uploaded Leaf Photo
          </p>
          <div className="flex items-center gap-4">
            <img
              src={imagePreviewUrl}
              alt="Uploaded leaf reference"
              className="h-16 w-16 rounded-xl border border-slate-200 object-cover bg-slate-900/5"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {fileName || 'Leaf image'}
              </p>
              <p className="text-xs text-slate-500">
                Ready for diagnosis once backend API integration is online.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action CTA */}
      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          onClick={onReset}
          className="w-full sm:w-auto py-3 px-6 text-sm font-semibold rounded-xl bg-[#059669] hover:bg-[#047857]"
          aria-label="Try another image"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Try Another Image</span>
        </Button>
      </div>
    </div>
  );
}
