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
  Activity,
  ChevronRight,
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

  const rawConfidence =
    typeof result.confidence === 'number' && Number.isFinite(result.confidence)
      ? result.confidence
      : 0;

  const isHealthy =
    result.predicted_class?.toLowerCase().includes('healthy') ||
    displayName.toLowerCase().includes('healthy');

  const isLowConfidence = rawConfidence > 0 && rawConfidence < 0.6;

  const probabilitiesList =
    result.probabilities && typeof result.probabilities === 'object'
      ? Object.entries(result.probabilities).sort(([, a], [, b]) => b - a)
      : [];

  return (
    <div
      role="region"
      aria-label="Diagnosis result summary"
      className="w-full space-y-6 text-left"
    >
      {/* ── Fallback Warning Banner (Rendered when fallback_used is true) ── */}
      {result.fallback_used && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-4 text-sm text-amber-900 shadow-xs"
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
          className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50/95 p-4 text-sm text-rose-900 shadow-xs"
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
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-4 text-sm text-amber-900 shadow-xs"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="flex-1">
            <strong className="font-semibold text-amber-950">
              Low Diagnostic Confidence ({confidencePercent})
            </strong>
            <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
              The AI classifier detected potential ambiguity in this leaf sample. Consider capturing a sharper, well-lit photograph in daylight closer to the affected leaf surface to improve diagnostic accuracy.
            </p>
          </div>
        </div>
      )}

      {/* ── Full-Screen / Dashboard 2-Column Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT COLUMN (7 cols on lg): Primary Diagnosis & Medical Overview ── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Card: Condition Name, Visual Preview & Core Metrics */}
          <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 sm:p-8 shadow-sm">
            
            {/* Top Tag Badges Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {isHealthy ? (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 size={13} aria-hidden="true" className="text-emerald-700" />
                  Health Status: Healthy Plant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                  <Stethoscope size={13} aria-hidden="true" className="text-rose-700" />
                  Health Status: Pathology Detected
                </span>
              )}

              <span
                className="inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-[#E8F5EE] text-[#1E4D35] border border-emerald-200/80"
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                Diagnosis Output
              </span>

              {cropType && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-[#FAF7EE] px-3.5 py-1 text-xs font-semibold text-slate-700">
                  <Leaf size={12} aria-hidden="true" className="text-emerald-700" />
                  Crop: {cropType}
                </span>
              )}

              {result.leaf_detected !== undefined && (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${
                  result.leaf_detected ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  <Activity size={12} />
                  Leaf: {result.leaf_detected ? 'Verified Present' : 'Not Confirmed'}
                </span>
              )}
            </div>

            {/* Condition Headline & Technical Class */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#163824] leading-tight">
                {displayName}
              </h2>
              {result.display_name &&
                result.predicted_class &&
                result.display_name !== result.predicted_class && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Tag size={13} aria-hidden="true" />
                    Technical class: {result.predicted_class}
                  </p>
                )}
            </div>

            {/* Photo Preview & Key Metrics Combined Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              
              {/* Image Preview */}
              {imagePreviewUrl && (
                <div className="sm:col-span-5">
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#FAF7EE] p-2 shadow-2xs">
                    <img
                      src={imagePreviewUrl}
                      alt="Diagnosed crop leaf sample"
                      className="h-44 sm:h-48 w-full rounded-xl object-contain bg-slate-900/5"
                    />
                    {fileName && (
                      <p
                        className="mt-1.5 truncate text-center text-xs font-medium text-slate-500 px-1"
                        title={fileName}
                      >
                        {fileName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Metric Badges Grid */}
              <div className={`${imagePreviewUrl ? 'sm:col-span-7' : 'sm:col-span-12'} grid grid-cols-2 gap-3`}>
                <div className="rounded-2xl border border-emerald-100 bg-[#F4FAF6] p-3.5">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Confidence Score
                  </span>
                  <span className="text-xl font-extrabold text-emerald-800">
                    {confidencePercent}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#FAF7EE] p-3.5">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Confidence Tier
                  </span>
                  <span
                    className={`text-sm font-bold block mt-0.5 ${
                      rawConfidence >= 0.85
                        ? 'text-emerald-700'
                        : rawConfidence >= 0.6
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {rawConfidence >= 0.85
                      ? 'High Confidence'
                      : rawConfidence >= 0.6
                      ? 'Moderate'
                      : 'Low Confidence'}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#FAF7EE] p-3.5">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Model Version
                  </span>
                  <span className="text-sm font-bold text-slate-800 block mt-0.5">
                    {result.model_version || 'v0.1.0'}
                  </span>
                </div>

                {result.pipeline ? (
                  <div className="rounded-2xl border border-slate-200 bg-[#FAF7EE] p-3.5">
                    <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Pipeline
                    </span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5 truncate">
                      {result.pipeline}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-[#FAF7EE] p-3.5">
                    <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Intelligence Engine
                    </span>
                    <span className="text-sm font-bold text-emerald-800 block mt-0.5">
                      SigLIP Dual-Tier
                    </span>
                  </div>
                )}

                {typeof result.roi_count === 'number' && (
                  <div className="col-span-2 rounded-2xl border border-slate-200 bg-[#FAF7EE] p-3.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Regions Analyzed
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {result.roi_count}
                    </span>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* ── Precaution & Agronomic Guidance Card ── */}
          {result.precaution && result.precaution.trim().length > 0 && (
            <div className="rounded-3xl border border-emerald-200/90 bg-[#F2FAF5] p-6 sm:p-7 shadow-xs">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-[#1E4D35]"
                  aria-hidden="true"
                >
                  <ShieldCheck size={24} strokeWidth={2.2} />
                </div>

                <div className="flex-1">
                  <h3 className="text-base font-bold text-[#163824]">
                    Recommended Precautions & Action Guidance
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#1F452C] font-normal">
                    {result.precaution}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Action Buttons Bar ── */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={onReset}
              className="w-full sm:w-auto py-3.5 px-7 text-sm font-bold rounded-full bg-[#234E37] hover:bg-[#1A3C2A] text-white shadow-xs transition-all active:scale-[0.98]"
              aria-label="Upload another image"
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span>Upload Another Image</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsChatOpen(true)}
              className="w-full sm:w-auto py-3.5 px-7 text-sm font-bold rounded-full border border-[#2D5A3D]/40 bg-white text-[#1E4D35] hover:bg-[#F0F7F2] flex items-center justify-center gap-2 shadow-2xs"
              aria-label="Ask Agro AI"
            >
              <Bot size={17} className="text-emerald-700" />
              <span>Ask Agro AI</span>
            </Button>
          </div>

        </div>

        {/* ── RIGHT COLUMN (5 cols on lg): AI Agronomist Interactive Chat & Probabilities ── */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Agronomist Interactive Callout Card */}
          <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-[#1E4D35] to-[#2E6B48] p-6 sm:p-7 text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                  <Bot size={22} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">AI Agronomist Assistant</h3>
                  <p className="text-[11px] text-emerald-200">Grounded Agricultural Intelligence</p>
                </div>
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Have questions about this {displayName} diagnosis? Consult our agronomist for organic remedies, dosage calculators, or spray timelines.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-[#163824] hover:bg-emerald-50 px-5 py-3 font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
                aria-label="Ask AI Assistant about this diagnosis"
              >
                <Sparkles size={16} className="text-emerald-700" />
                <span>Open Agronomist Chat</span>
                <ChevronRight size={16} className="text-emerald-700" />
              </button>
            </div>
          </div>

          {/* Probabilities Breakdown Section */}
          {probabilitiesList.length > 0 && (
            <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-emerald-700" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Confidence Distribution
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Top Classes</span>
              </div>

              <div className="space-y-3.5">
                {probabilitiesList.map(([className, prob]) => {
                  const percent =
                    typeof prob === 'number' && Number.isFinite(prob) ? prob * 100 : 0;
                  return (
                    <div key={className} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span className="truncate pr-2">{className}</span>
                        <span className="font-bold text-emerald-900">{percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, percent))}%`,
                            backgroundColor: percent > 50 ? '#234E37' : '#D97706',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

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
