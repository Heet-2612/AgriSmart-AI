import { Sprout, FlaskConical, ArrowRight, Check } from 'lucide-react';
import { Button } from '../Button';

interface BonusFeaturesSectionProps {
  onSelectCropRecommendation?: () => void;
  onSelectSustainabilityScore?: () => void;
}

export function BonusFeaturesSection({
  onSelectCropRecommendation,
  onSelectSustainabilityScore,
}: BonusFeaturesSectionProps) {
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

        {/* Exactly Two Bonus Feature Cards in Balanced 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch max-w-4xl mx-auto">

          {/* ── Card 1 — Crop Recommendation (Green Theme) ── */}
          <div
            className="group relative flex flex-col justify-between rounded-[28px] border border-[#D4ECDC] bg-[#F4FAF6] p-6 sm:p-7 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300"
            role="region"
            aria-label="Crop Recommendation feature"
          >
            <div>
              {/* Top Row: Icon Pill */}
              <div className="mb-4 flex items-center justify-between">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100/90 text-emerald-700 shadow-2xs"
                  aria-hidden="true"
                >
                  <Sprout size={22} strokeWidth={2.2} />
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

          {/* ── Card 2 — Sustainability Score (Green Agriculture Theme) ── */}
          <div
            className="group relative flex flex-col justify-between rounded-[28px] border border-[#D4ECDC] bg-[#F4FAF6] p-6 sm:p-7 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300"
            role="region"
            aria-label="Sustainability Score feature"
          >
            <div>
              {/* Top Row: Icon Pill */}
              <div className="mb-4 flex items-center justify-between">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100/90 text-emerald-700 shadow-2xs"
                  aria-hidden="true"
                >
                  <FlaskConical size={22} strokeWidth={2.2} />
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
                Sustainability Score
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                Calculate a sustainability score using crop, soil, weather, irrigation, and simulated sensor inputs.
              </p>

              {/* Visual Mockup: 4-Dimension Framework Panel (Green theme) */}
              <div className="relative mb-6 overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-100/50 via-white to-emerald-50/40 p-3 shadow-2xs">
                {/* Agro-Climatic Header Visual */}
                <div className="relative h-20 w-full rounded-xl overflow-hidden bg-gradient-to-tr from-emerald-800 via-teal-700 to-emerald-600 flex items-end p-2.5">
                  <div className="absolute inset-0 bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:10px_10px] opacity-25" />
                  <div className="relative z-10 flex items-center gap-1.5 text-white drop-shadow-xs">
                    <FlaskConical size={14} className="text-emerald-200" />
                    <span className="text-[10px] font-bold tracking-wider uppercase">100-Point Accounting</span>
                  </div>
                </div>

                <div className="mt-2 rounded-xl border border-emerald-100 bg-white/95 p-3 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>Four Transparent Dimensions</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Explainable</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-700 font-medium list-none p-0 m-0">
                    <li className="flex items-center justify-between text-slate-800">
                      <span>• Water Conservation & Irrigation</span>
                      <span className="font-mono text-emerald-700 text-[10px] font-bold">40 pts</span>
                    </li>
                    <li className="flex items-center justify-between text-slate-800">
                      <span>• Microclimate & Weather Alignment</span>
                      <span className="font-mono text-emerald-700 text-[10px] font-bold">30 pts</span>
                    </li>
                    <li className="flex items-center justify-between text-slate-800">
                      <span>• Soil Moisture & Root-Zone Balance</span>
                      <span className="font-mono text-emerald-700 text-[10px] font-bold">15 pts</span>
                    </li>
                    <li className="flex items-center justify-between text-slate-800">
                      <span>• Crop Rotation & Soil Compatibility</span>
                      <span className="font-mono text-emerald-700 text-[10px] font-bold">15 pts</span>
                    </li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 italic">
                    Decision-support prototype, not a certification.
                  </div>
                </div>
              </div>
            </div>

            {/* Action CTA Pill Button */}
            <div className="pt-2 mt-auto">
              <Button
                type="button"
                variant="primary"
                onClick={onSelectSustainabilityScore}
                className="w-full sm:w-auto rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold shadow-xs gap-2 transition-all active:scale-[0.98]"
                aria-label="Open Sustainability Score — Calculate Score"
              >
                <span>Open Sustainability Score</span>
                <span className="sr-only"> — Calculate Score</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
