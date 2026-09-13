import { Sprout, FlaskConical, TrendingUp, ArrowRight, Check, Droplets, CloudFog, Sparkles } from 'lucide-react';
import { Button } from '../Button';

interface BonusFeaturesSectionProps {
  onSelectCropRecommendation?: () => void;
}

export function BonusFeaturesSection({ onSelectCropRecommendation }: BonusFeaturesSectionProps) {
  return (
    <section
      id="bonus-features"
      className="py-12 sm:py-16"
      aria-label="Bonus Features"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="mb-10 text-center sm:text-left">
          {/* Green Pill Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 text-xs font-semibold text-emerald-800 mb-3 shadow-2xs">
            <Sprout size={14} className="text-emerald-600" aria-hidden="true" />
            <span>AI Agricultural Suite</span>
          </div>

          {/* Main Editorial Heading */}
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F172A] leading-tight"
            aria-label="Farm Insights — Bonus Features"
          >
            Farm <span className="font-serif italic font-normal text-emerald-700">Insights</span>
          </h2>

          {/* Subtitle */}
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            Data-driven insights to help you make smarter decisions, grow healthier crops and build a more sustainable tomorrow.
          </p>
        </div>

        {/* Exactly Three Bonus Feature Cards in 1 row on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 items-stretch">

          {/* ── Card 1 — Active: Crop Recommendation (Green Theme) ── */}
          <div
            className="group relative flex flex-col justify-between rounded-[28px] border border-[#D4ECDC] bg-[#F4FAF6] p-6 sm:p-7 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300"
            role="region"
            aria-label="Crop Recommendation feature"
          >
            <div>
              {/* Top Row: Icon Pill & Ready to Use Badge */}
              <div className="mb-4 flex items-center justify-between">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100/90 text-emerald-700 shadow-2xs"
                  aria-hidden="true"
                >
                  <Sprout size={22} strokeWidth={2.2} />
                </span>
                <span className="rounded-full bg-emerald-100/70 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  Ready to Use
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
                Crop Recommendation
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                Get crop suggestions based on your location, soil, and environmental conditions.
              </p>

              {/* Visual Mockup: Seedling Banner & Floating Recommendation Panel */}
              <div className="relative mb-6 overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-100/50 via-white to-emerald-50/40 p-3 shadow-2xs">
                {/* Agro-Climatic Header Visual */}
                <div className="relative h-20 w-full rounded-xl overflow-hidden bg-gradient-to-tr from-emerald-800 via-emerald-600 to-teal-500 flex items-end p-2.5">
                  <div className="absolute inset-0 bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:10px_10px] opacity-25" />
                  <div className="relative z-10 flex items-center gap-1.5 text-white drop-shadow-xs">
                    <Sprout size={14} className="text-emerald-300" />
                    <span className="text-[10px] font-bold tracking-wider uppercase">Regional Suitability</span>
                  </div>
                </div>

                {/* Floating Best For Your Soil Panel */}
                <div className="mt-2 rounded-xl border border-emerald-100 bg-white/95 p-3 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>Best for your soil</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">High Match</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-700 font-medium list-none p-0 m-0">
                    <li className="flex items-center gap-1.5 text-emerald-800">
                      <Check size={12} className="text-emerald-600 stroke-[2.5]" />
                      <span>Maize</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-800">
                      <Check size={12} className="text-emerald-600 stroke-[2.5]" />
                      <span>Soybean</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-800">
                      <Check size={12} className="text-emerald-600 stroke-[2.5]" />
                      <span>Green Gram</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action CTA Pill Button */}
            <div className="pt-2 mt-auto">
              <Button
                type="button"
                variant="primary"
                onClick={onSelectCropRecommendation}
                className="w-full sm:w-auto rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold shadow-xs gap-2 transition-all active:scale-[0.98]"
                aria-label="Try Crop Recommendation — Get Recommendations"
              >
                <span>Get Recommendations</span>
                <span className="sr-only"> — Try Crop Recommendation</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* ── Card 2 — Coming Soon: Soil Health & Nutrients (Blue Theme) ── */}
          <div
            className="relative flex flex-col justify-between rounded-[28px] border border-[#D6E8F5] bg-[#F2F8FC] p-6 sm:p-7 shadow-xs"
            role="region"
            aria-label="Soil Health & Nutrients feature"
          >
            <div>
              {/* Top Row: Icon Pill & Coming Soon Badge */}
              <div className="mb-4 flex items-center justify-between">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100/90 text-blue-600 shadow-2xs"
                  aria-hidden="true"
                >
                  <FlaskConical size={22} strokeWidth={2.2} />
                </span>
                <span className="rounded-full bg-white/90 border border-blue-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 shadow-2xs">
                  Coming Soon
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
                Soil Health & Nutrients
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                Analyze soil chemistry, mineral saturation, and customized fertilization plans.
              </p>

              {/* Visual Mockup: Circular Sustainability Score Meter & Nutrient Checklist */}
              <div className="relative mb-6 rounded-2xl border border-blue-100 bg-white/95 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between gap-3 mb-3">
                  {/* Circular Score Gauge */}
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-blue-500 p-0.5 shadow-2xs">
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center">
                      <span className="text-sm font-black text-slate-800 leading-none">78</span>
                      <span className="text-[8px] font-semibold text-slate-400">/ 100</span>
                    </div>
                  </div>
                  <div className="text-left flex-1">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded mb-0.5">
                      Sustainability Score
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium leading-tight">
                      Environmental & soil balance index
                    </p>
                  </div>
                </div>

                {/* Score Breakdown List */}
                <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sprout size={12} className="text-emerald-600" />
                      <span>Soil Health</span>
                    </span>
                    <span className="font-bold text-slate-700">Optimal</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Droplets size={12} className="text-blue-500" />
                      <span>Water Usage</span>
                    </span>
                    <span className="font-bold text-slate-700">Efficient</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CloudFog size={12} className="text-slate-400" />
                      <span>Carbon Footprint</span>
                    </span>
                    <span className="font-bold text-slate-700">Low Impact</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Non-Interactive Indicator Pill */}
            <div className="pt-2 mt-auto">
              <div
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-100/60 px-5 py-2 text-xs font-bold text-blue-700/80 select-none cursor-not-allowed"
                aria-hidden="true"
              >
                <span>Feature In Development</span>
              </div>
            </div>
          </div>

          {/* ── Card 3 — Coming Soon: Yield & Harvest Forecast (Purple Theme) ── */}
          <div
            className="relative flex flex-col justify-between rounded-[28px] border border-[#ECE1FB] bg-[#F9F5FD] p-6 sm:p-7 shadow-xs"
            role="region"
            aria-label="Yield & Harvest Forecast feature"
          >
            <div>
              {/* Top Row: Icon Pill & Coming Soon Badge */}
              <div className="mb-4 flex items-center justify-between">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100/90 text-purple-600 shadow-2xs"
                  aria-hidden="true"
                >
                  <Sparkles size={22} strokeWidth={2.2} />
                </span>
                <span className="rounded-full bg-white/90 border border-purple-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 shadow-2xs">
                  Coming Soon
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
                Yield & Harvest Forecast
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                Project seasonal crop harvest timelines and estimated production metrics.
              </p>

              {/* Visual Mockup: AI Advisory & Forecast Interaction Panel */}
              <div className="relative mb-6 rounded-2xl border border-purple-100 bg-white/95 p-3.5 shadow-2xs space-y-2.5">
                {/* Farmer Query Bubble */}
                <div className="flex items-start gap-2 text-left">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px]">
                    <Sprout size={11} />
                  </div>
                  <div className="rounded-xl rounded-tl-none bg-slate-50 border border-slate-100 px-2.5 py-1.5 text-[11px] text-slate-700 leading-snug">
                    How can I improve my tomato crop yield this season?
                  </div>
                </div>

                {/* GenAI Advice Bubble */}
                <div className="flex items-start gap-2 text-left">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[10px]">
                    <Sparkles size={11} />
                  </div>
                  <div className="rounded-xl rounded-tl-none bg-purple-50/70 border border-purple-100 px-2.5 py-1.5 text-[11px] text-purple-900 leading-snug">
                    Here are recommendations tailored to your soil & climate...
                  </div>
                </div>

                {/* Forecast Metric Badge */}
                <div className="flex items-center justify-between pt-1 border-t border-purple-50 text-[10px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1 text-purple-600 font-bold">
                    <TrendingUp size={11} /> +18% Yield Potential
                  </span>
                  <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Forecast</span>
                </div>
              </div>
            </div>

            {/* Non-Interactive Indicator Pill */}
            <div className="pt-2 mt-auto">
              <div
                className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/80 bg-purple-100/60 px-5 py-2 text-xs font-bold text-purple-700/80 select-none cursor-not-allowed"
                aria-hidden="true"
              >
                <span>Feature In Development</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
