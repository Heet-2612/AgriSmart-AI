import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Leaf,
  Tag,
  Sparkles,
  Bot,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { Button } from '../Button';
import { PredictionResponse } from '../../types';
import { DiagnosisChatAssistant } from '../chat/DiagnosisChatAssistant';

interface DiagnosisResultProps {
  result: PredictionResponse;
  imagePreviewUrl?: string | null;
  fileName?: string;
  cropType?: string;
  onReset: () => void;
}

export function DiagnosisResult({
  result,
  imagePreviewUrl,
  fileName,
  cropType,
  onReset,
}: DiagnosisResultProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const displayName = result.display_name?.trim() || result.predicted_class || 'Unknown Condition';
  const confidencePercent =
    typeof result.confidence === 'number' && Number.isFinite(result.confidence)
      ? `${(result.confidence * 100).toFixed(1)}%`
      : 'N/A';

  const rawConfidence = typeof result.confidence === 'number' && Number.isFinite(result.confidence)
    ? result.confidence
    : 0;

  const isHealthy =
    result.predicted_class?.toLowerCase().includes('healthy') ||
    displayName.toLowerCase().includes('healthy');

  const isLowConfidence = rawConfidence > 0 && rawConfidence < 0.60;

  const probabilitiesList =
    result.probabilities && typeof result.probabilities === 'object'
      ? Object.entries(result.probabilities).sort(([, a], [, b]) => b - a)
      : [];

  return (
    <div
      role="region"
      aria-label="Diagnosis result summary"
      className="space-y-6 text-left"
    >
      {/* ── Fallback Warning Banner (Rendered when fallback_used is true) ── */}
      {result.fallback_used && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-xs"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="flex-1">
            <strong className="font-semibold text-amber-950">Fallback Diagnostic Model Engaged</strong>
            <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
              The primary visual transformer pipeline was unavailable or returned ambiguous features. Results were computed using the secondary fallback model.
            </p>
          </div>
        </div>
      )}

      {/* ── Leaf Not Detected Warning Banner (Rendered when leaf_detected is false) ── */}
      {result.leaf_detected === false && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-xs"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
          <div className="flex-1">
            <strong className="font-semibold text-rose-950">No Leaf Detected in Image</strong>
            <p className="mt-0.5 text-xs text-rose-800 leading-relaxed">
              Our leaf detection pipeline could not verify a clear plant leaf region in this photo. The diagnosis below is based on general background features and may be inaccurate. Please upload a clear photo of a plant leaf.
            </p>
          </div>
        </div>
      )}

      {/* ── Low Confidence Alert Banner (Rendered when confidence < 60%) ── */}
      {isLowConfidence && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-xs"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="flex-1">
            <strong className="font-semibold text-amber-950">Low Diagnostic Confidence ({confidencePercent})</strong>
            <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
              The AI classifier detected potential ambiguity in this leaf sample. Consider capturing a sharper, well-lit photograph in daylight closer to the affected leaf surface to improve diagnostic accuracy.
            </p>
          </div>
        </div>
      )}

      {/* ── Main Diagnostic Overview Card ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">

          {/* Uploaded Leaf Preview (if available) */}
          {imagePreviewUrl && (
            <div className="relative shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1.5 md:w-44">
              <img
                src={imagePreviewUrl}
                alt="Diagnosed crop leaf sample"
                className="h-36 w-full rounded-lg object-contain md:h-36 bg-slate-900/5"
              />
              {fileName && (
                <p className="mt-1.5 truncate text-center text-xs font-medium text-slate-500" title={fileName}>
                  {fileName}
                </p>
              )}
            </div>
          )}

          {/* Primary Condition Details */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Health Status Badge */}
              {isHealthy ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-800"
                >
                  <CheckCircle2 size={13} aria-hidden="true" className="text-emerald-700" />
                  Health Status: Healthy Plant
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-rose-100 text-rose-800"
                >
                  <Stethoscope size={13} aria-hidden="true" className="text-rose-700" />
                  Health Status: Pathology Detected
                </span>
              )}

              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                Diagnosis Output
              </span>

              {cropType && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  <Leaf size={12} aria-hidden="true" className="text-emerald-600" />
                  Crop: {cropType}
                </span>
              )}
            </div>

            <div>
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: '#0F172A' }}
              >
                {displayName}
              </h2>
              {result.display_name && result.predicted_class && result.display_name !== result.predicted_class && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Tag size={12} aria-hidden="true" />
                  Technical class: {result.predicted_class}
                </p>
              )}
            </div>

            {/* Metrics Ribbon */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2">
                <span className="block text-xs font-medium text-slate-500">Confidence Score</span>
                <span className="text-base font-bold text-emerald-700">{confidencePercent}</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2">
                <span className="block text-xs font-medium text-slate-500">Confidence Tier</span>
                <span className={`text-base font-bold ${
                  rawConfidence >= 0.85 ? 'text-emerald-700' : rawConfidence >= 0.60 ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  {rawConfidence >= 0.85 ? 'High Confidence' : rawConfidence >= 0.60 ? 'Moderate' : 'Low Confidence'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2">
                <span className="block text-xs font-medium text-slate-500">Model Version</span>
                <span className="text-base font-semibold text-slate-700">
                  {result.model_version || 'v0.1.0'}
                </span>
              </div>

              {result.pipeline && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2">
                  <span className="block text-xs font-medium text-slate-500">Pipeline</span>
                  <span className="text-base font-semibold text-slate-700">
                    {result.pipeline}
                  </span>
                </div>
              )}

              {typeof result.roi_count === 'number' && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2">
                  <span className="block text-xs font-medium text-slate-500">Regions Analyzed</span>
                  <span className="text-base font-semibold text-slate-700">
                    {result.roi_count}
                  </span>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* ── Precaution & Guidance Section (Rendered only when precaution is present) ── */}
      {result.precaution && result.precaution.trim().length > 0 && (
        <div className="rounded-2xl border border-emerald-200/80 bg-[#ECFDF5]/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
              aria-hidden="true"
            >
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-950">
                Recommended Precautions & Action Guidance
              </h3>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-emerald-900">
                {result.precaution}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Agronomist Action Banner ── */}
      <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-600 to-teal-700 p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-200" />
            <h3 className="text-base font-bold">Have questions about this diagnosis?</h3>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed max-w-xl">
            Chat with our grounded AI Agronomist for verified treatment advice, chemical spray schedules, or organic remedies tailored for this crop diagnosis.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 px-5 py-2.5 font-bold text-sm shadow-xs flex items-center gap-2 shrink-0 cursor-pointer border-none"
          aria-label="Ask AI Assistant about this diagnosis"
        >
          <Bot size={18} className="text-emerald-700" />
          <span>Ask AI Assistant</span>
        </Button>
      </div>

      {/* ── Probabilities Breakdown (Rendered only when probabilities map is provided) ── */}
      {probabilitiesList.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-emerald-700" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900">
              Confidence Distribution
            </h3>
          </div>

          <div className="space-y-3">
            {probabilitiesList.map(([className, prob]) => {
              const percent = typeof prob === 'number' && Number.isFinite(prob) ? prob * 100 : 0;
              return (
                <div key={className} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{className}</span>
                    <span className="font-semibold text-slate-800">{percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, percent))}%`,
                        backgroundColor: percent > 50 ? '#10B981' : '#F59E0B',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="button"
          variant="primary"
          onClick={onReset}
          className="w-full sm:w-auto py-3 px-6 text-sm font-semibold rounded-xl bg-[#059669] hover:bg-[#047857]"
          aria-label="Upload another image"
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span>Upload Another Image</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsChatOpen(true)}
          className="w-full sm:w-auto py-3 px-6 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
          aria-label="Ask Agro AI"
        >
          <Bot size={16} className="text-emerald-600" />
          <span>Ask Agro AI</span>
        </Button>
      </div>

      {/* ── Diagnosis AI Chat Assistant Modal ── */}
      <DiagnosisChatAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        result={result}
        cropType={cropType}
      />
    </div>
  );
}
