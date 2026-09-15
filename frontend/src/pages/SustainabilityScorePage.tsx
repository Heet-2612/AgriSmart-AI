import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import {
  Leaf,
  ArrowLeft,
  Sprout,
  Droplets,
  Thermometer,
  Sparkles,
  AlertCircle,
  Loader2,
  BarChart3,
  RotateCcw,
  Gauge,
  Cpu,
  Info,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../components/Button';
import { calculateSustainabilityScore, ApiError } from '../api/client';
import {
  SustainabilityScoreRequest,
  SustainabilityScoreResponse,
  SensorTelemetry,
} from '../types';

export const SOIL_PROFILES_OPTIONS = [
  { value: 'loam', label: 'Loam / Medium Loamy (Balanced reference)' },
  { value: 'clay', label: 'Clay / Heavy Soil (High water retention)' },
  { value: 'black', label: 'Black Cotton / Vertisol (High moisture swelling)' },
  { value: 'sandy', label: 'Sandy / Coarse (Fast draining)' },
] as const;

export const SIMULATED_IOT_PRESETS = [
  {
    id: 'optimal_loam',
    name: 'Optimal Field Capacity',
    desc: 'Healthy root-zone moisture (32%) and balanced soil temperature (24°C)',
    moisture: 32.0,
    temp: 24.0,
  },
  {
    id: 'dry_deficit',
    name: 'Root-Zone Moisture Deficit',
    desc: 'Moisture below wilting threshold (18%), legitimate irrigation requirement',
    moisture: 18.0,
    temp: 28.5,
  },
  {
    id: 'saturated_heavy',
    name: 'Over-Saturated Soil (Waterlogged)',
    desc: 'Excess root-zone water (48%), hypoxia and fungal risk',
    moisture: 48.0,
    temp: 21.5,
  },
  {
    id: 'heat_stress',
    name: 'Heat Stress Scenario',
    desc: 'Elevated soil temperature (36°C) and moderate moisture (25%)',
    moisture: 25.0,
    temp: 36.0,
  },
] as const;

export interface SustainabilityFormData {
  crop: string;
  farm_area_hectares: string;
  soil_type: string;
  previous_crop: string;
  action: 'delay' | 'irrigate_now';
  temperature_celsius: string;
  humidity_percent: string;
  rain_probability_percent: string;
  expected_rainfall_mm: string;
  soil_moisture_percent: string;
  selected_preset: string;
}

export type SustainabilityFormErrors = Partial<Record<keyof SustainabilityFormData, string>>;

interface SustainabilityScorePageProps {
  onBack: () => void;
  onNavigateCropRecommendation?: () => void;
  onSubmit?: (data: SustainabilityFormData) => void;
}

const INITIAL_FORM_DATA: SustainabilityFormData = {
  crop: 'Wheat',
  farm_area_hectares: '1.0',
  soil_type: 'loam',
  previous_crop: 'Chickpea',
  action: 'delay',
  temperature_celsius: '26.0',
  humidity_percent: '65.0',
  rain_probability_percent: '45.0',
  expected_rainfall_mm: '12.0',
  soil_moisture_percent: '32.0',
  selected_preset: 'optimal_loam',
};

export function SustainabilityScorePage({
  onBack,
  onNavigateCropRecommendation,
  onSubmit,
}: SustainabilityScorePageProps) {
  const [formData, setFormData] = useState<SustainabilityFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<SustainabilityFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SustainabilityScoreResponse | null>(null);

  const cropRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof SustainabilityFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const found = SIMULATED_IOT_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        selected_preset: presetId,
        soil_moisture_percent: String(found.moisture),
      }));
    }
  };

  const validate = (): SustainabilityFormErrors => {
    const errs: SustainabilityFormErrors = {};

    // 1. Target Crop
    if (!formData.crop.trim()) {
      errs.crop = 'Target crop name is required.';
    }

    // 2. Farm Area (gt 0.0, le 10000.0)
    if (!formData.farm_area_hectares.trim()) {
      errs.farm_area_hectares = 'Farm plot size is required.';
    } else {
      const area = Number(formData.farm_area_hectares);
      if (Number.isNaN(area)) {
        errs.farm_area_hectares = 'Plot size must be a valid number.';
      } else if (area <= 0 || area > 10000) {
        errs.farm_area_hectares = 'Plot size must be greater than 0 and up to 10,000 hectares.';
      }
    }

    // 3. Ambient Temperature (-10 to 60)
    if (!formData.temperature_celsius.trim()) {
      errs.temperature_celsius = 'Temperature is required.';
    } else {
      const temp = Number(formData.temperature_celsius);
      if (Number.isNaN(temp)) {
        errs.temperature_celsius = 'Temperature must be a valid number.';
      } else if (temp < -10 || temp > 60) {
        errs.temperature_celsius = 'Temperature must be between -10°C and 60°C.';
      }
    }

    // 4. Humidity (0 to 100)
    if (!formData.humidity_percent.trim()) {
      errs.humidity_percent = 'Humidity is required.';
    } else {
      const hum = Number(formData.humidity_percent);
      if (Number.isNaN(hum)) {
        errs.humidity_percent = 'Humidity must be a valid number.';
      } else if (hum < 0 || hum > 100) {
        errs.humidity_percent = 'Humidity must be between 0% and 100%.';
      }
    }

    // 5. Rain Probability (0 to 100)
    if (formData.rain_probability_percent.trim()) {
      const rp = Number(formData.rain_probability_percent);
      if (Number.isNaN(rp)) {
        errs.rain_probability_percent = 'Rain probability must be a valid number.';
      } else if (rp < 0 || rp > 100) {
        errs.rain_probability_percent = 'Rain probability must be between 0% and 100%.';
      }
    }

    // 6. Expected Rainfall (0 to 1000)
    if (formData.expected_rainfall_mm.trim()) {
      const rf = Number(formData.expected_rainfall_mm);
      if (Number.isNaN(rf)) {
        errs.expected_rainfall_mm = 'Expected rainfall must be a valid number.';
      } else if (rf < 0 || rf > 1000) {
        errs.expected_rainfall_mm = 'Expected rainfall must be between 0 mm and 1000 mm.';
      }
    }

    // 7. Soil Moisture (0 to 100)
    if (formData.soil_moisture_percent.trim()) {
      const sm = Number(formData.soil_moisture_percent);
      if (Number.isNaN(sm)) {
        errs.soil_moisture_percent = 'Soil moisture must be a valid number.';
      } else if (sm < 0 || sm > 100) {
        errs.soil_moisture_percent = 'Soil moisture must be between 0% and 100%.';
      }
    }

    return errs;
  };

  const executeScoreCalculation = async () => {
    setErrors({});
    setGeneralError(null);
    setApiError(null);
    setIsSubmitting(true);

    const preset = SIMULATED_IOT_PRESETS.find((p) => p.id === formData.selected_preset);
    const telemetryOverride: SensorTelemetry | null = preset
      ? {
          soil_moisture_percent: Number(formData.soil_moisture_percent) || preset.moisture,
          soil_temperature_celsius: preset.temp,
          irrigation_flow_rate_lpm: 30.0,
          irrigation_duration_minutes: 60,
          water_tank_level_percent: 85.0,
          soil_ph: 6.8,
          soil_ec_ds_m: 1.2,
          is_simulated: true,
        }
      : null;

    const payload: SustainabilityScoreRequest = {
      crop: formData.crop.trim(),
      farm_area_hectares: Number(formData.farm_area_hectares) || 0.1,
      soil_type: formData.soil_type ? formData.soil_type.trim() : null,
      previous_crop: formData.previous_crop.trim() ? formData.previous_crop.trim() : null,
      action: formData.action,
      temperature_celsius: Number(formData.temperature_celsius),
      humidity_percent: Number(formData.humidity_percent),
      rain_probability_percent: Number(formData.rain_probability_percent) || 0.0,
      expected_rainfall_mm: Number(formData.expected_rainfall_mm) || 0.0,
      telemetry: telemetryOverride,
      soil_moisture_percent: formData.soil_moisture_percent.trim()
        ? Number(formData.soil_moisture_percent)
        : null,
    };

    try {
      if (onSubmit) {
        onSubmit(formData);
      }
      const data = await calculateSustainabilityScore(payload);
      setResult(data);
      setTimeout(() => {
        resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      let message = 'Failed to calculate sustainability score. Please try again.';
      if (err instanceof ApiError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const valErrors = validate();
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors);
      setGeneralError('Please review and correct the highlighted fields before submitting.');
      return;
    }

    await executeScoreCalculation();
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setGeneralError(null);
    setApiError(null);
    setResult(null);
    cropRef.current?.focus();
  };

  return (
    <main
      id="sustainability-score"
      aria-label="Farm Sustainability Score"
      className="flex-1 relative bg-mesh-agri overflow-hidden py-8 sm:py-12"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8" ref={formTopRef}>
        {/* Top Back Action & Farm Insights Sub-Nav */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold rounded-xl gap-2 w-fit"
            aria-label="Back to Plant Diagnosis"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Back to Plant Diagnosis</span>
          </Button>

          {/* Farm Insights Sub-Tabs */}
          <div
            className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200/80 shadow-2xs w-fit"
            role="tablist"
            aria-label="Farm Insights Navigation"
          >
            <button
              type="button"
              role="tab"
              aria-selected={false}
              onClick={onNavigateCropRecommendation}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors cursor-pointer"
            >
              <Sprout size={14} className="text-emerald-600" />
              <span>Crop Recommendation</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={true}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 shadow-2xs"
            >
              <Leaf size={14} className="text-emerald-600" />
              <span>Sustainability Score</span>
            </button>
          </div>
        </div>

        {/* Hero Banner */}
        <header className="mb-8 rounded-3xl border border-emerald-100 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-bold text-emerald-800 mb-3 shadow-2xs">
                <Gauge size={14} className="text-emerald-600" aria-hidden="true" />
                <span>Farm Insights Suite</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Farm Sustainability & Water Score
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                Evaluate your irrigation timing, water conservation, weather alignment, and soil health with transparent, explainable 100-point accounting.
              </p>
            </div>
          </div>

          {/* Practical Disclaimer Notice */}
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 flex items-start gap-2.5 text-slate-600 text-xs">
            <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Farmer Advisory:</strong> This score provides transparent decision-support for farm water stewardship. It is not an official governmental certification.
            </p>
          </div>
        </header>

        {/* Input Form Section */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs mb-10">
          <form onSubmit={handleSubmit} noValidate aria-label="Sustainability Score Input Form">
            {/* Top Error Alert if General Validation Fails */}
            {generalError && (
              <div
                role="alert"
                className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-900 flex items-start gap-2.5"
              >
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Section 1: Crop & Field Info */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Sprout size={18} className="text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">1. Crop & Plot Parameters</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Crop Name */}
                <div>
                  <label htmlFor="sustain-crop" className="block text-xs font-bold text-slate-700 mb-1">
                    Target Crop <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={cropRef}
                    id="sustain-crop"
                    name="crop"
                    type="text"
                    required
                    value={formData.crop}
                    onChange={handleInputChange}
                    placeholder="e.g. Wheat, Rice, Maize, Cotton"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                      errors.crop
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                        : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                    }`}
                  />
                  {errors.crop && (
                    <p className="mt-1 text-xs text-rose-600">{errors.crop}</p>
                  )}
                </div>

                {/* Farm Area in Hectares */}
                <div>
                  <label htmlFor="sustain-area" className="block text-xs font-bold text-slate-700 mb-1">
                    Plot Size (Hectares) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="sustain-area"
                    name="farm_area_hectares"
                    type="number"
                    step="0.1"
                    min="0.01"
                    max="10000"
                    required
                    value={formData.farm_area_hectares}
                    onChange={handleInputChange}
                    placeholder="e.g. 1.0"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                      errors.farm_area_hectares
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                        : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                    }`}
                  />
                  {errors.farm_area_hectares && (
                    <p className="mt-1 text-xs text-rose-600">{errors.farm_area_hectares}</p>
                  )}
                </div>

                {/* Soil Profile Classification */}
                <div>
                  <label htmlFor="sustain-soil" className="block text-xs font-bold text-slate-700 mb-1">
                    Soil Classification
                  </label>
                  <select
                    id="sustain-soil"
                    name="soil_type"
                    value={formData.soil_type}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {SOIL_PROFILES_OPTIONS.map((sp) => (
                      <option key={sp.value} value={sp.value}>
                        {sp.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Previous Crop */}
                <div>
                  <label htmlFor="sustain-prev-crop" className="block text-xs font-bold text-slate-700 mb-1">
                    Previously Harvested Crop
                  </label>
                  <input
                    id="sustain-prev-crop"
                    name="previous_crop"
                    type="text"
                    value={formData.previous_crop}
                    onChange={handleInputChange}
                    placeholder="e.g. Chickpea (legume rotation boost)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Weather & Microclimate */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Thermometer size={18} className="text-amber-600" />
                <h2 className="text-base font-bold text-slate-900">2. Climatological & Weather Parameters</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Temperature */}
                <div>
                  <label htmlFor="sustain-temp" className="block text-xs font-bold text-slate-700 mb-1">
                    Ambient Temp (°C) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="sustain-temp"
                    name="temperature_celsius"
                    type="number"
                    step="0.5"
                    min="-10"
                    max="60"
                    required
                    value={formData.temperature_celsius}
                    onChange={handleInputChange}
                    placeholder="e.g. 26.0"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                      errors.temperature_celsius
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                        : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                    }`}
                  />
                  {errors.temperature_celsius && (
                    <p className="mt-1 text-xs text-rose-600">{errors.temperature_celsius}</p>
                  )}
                </div>

                {/* Relative Humidity */}
                <div>
                  <label htmlFor="sustain-hum" className="block text-xs font-bold text-slate-700 mb-1">
                    Humidity (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="sustain-hum"
                    name="humidity_percent"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    required
                    value={formData.humidity_percent}
                    onChange={handleInputChange}
                    placeholder="e.g. 65"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                      errors.humidity_percent
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                        : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                    }`}
                  />
                  {errors.humidity_percent && (
                    <p className="mt-1 text-xs text-rose-600">{errors.humidity_percent}</p>
                  )}
                </div>

                {/* Rain Probability */}
                <div>
                  <label htmlFor="sustain-rain-prob" className="block text-xs font-bold text-slate-700 mb-1">
                    Rain Probability (%)
                  </label>
                  <input
                    id="sustain-rain-prob"
                    name="rain_probability_percent"
                    type="number"
                    step="5"
                    min="0"
                    max="100"
                    value={formData.rain_probability_percent}
                    onChange={handleInputChange}
                    placeholder="e.g. 45"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {errors.rain_probability_percent && (
                    <p className="mt-1 text-xs text-rose-600">{errors.rain_probability_percent}</p>
                  )}
                </div>

                {/* Expected Rainfall */}
                <div>
                  <label htmlFor="sustain-rain-mm" className="block text-xs font-bold text-slate-700 mb-1">
                    Expected Rain (mm)
                  </label>
                  <input
                    id="sustain-rain-mm"
                    name="expected_rainfall_mm"
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    value={formData.expected_rainfall_mm}
                    onChange={handleInputChange}
                    placeholder="e.g. 12"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {errors.expected_rainfall_mm && (
                    <p className="mt-1 text-xs text-rose-600">{errors.expected_rainfall_mm}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Irrigation Decision & Simulated IoT Telemetry */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Droplets size={18} className="text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">3. Irrigation Decision & Field Telemetry</h2>
              </div>

              {/* Action Choice: Delay vs Irrigate Now */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Planned Irrigation Decision
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Planned irrigation decision">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      formData.action === 'delay'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="action"
                      value="delay"
                      checked={formData.action === 'delay'}
                      onChange={() => setFormData((prev) => ({ ...prev, action: 'delay' }))}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Delay Irrigation</span>
                      <span className="text-xs text-slate-500 leading-relaxed block mt-0.5">
                        Hold watering to capture natural precipitation and conserve ground moisture.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      formData.action === 'irrigate_now'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="action"
                      value="irrigate_now"
                      checked={formData.action === 'irrigate_now'}
                      onChange={() => setFormData((prev) => ({ ...prev, action: 'irrigate_now' }))}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Irrigate Immediately</span>
                      <span className="text-xs text-slate-500 leading-relaxed block mt-0.5">
                        Apply scheduled irrigation cycle via drip or sprinkler lines.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Simulated IoT Field Sensor Preset */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={16} className="text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      Simulated IoT Sensor Layer (Hackathon Prototyping)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    Deterministic Telemetry
                  </span>
                </div>
                <p className="text-xs text-emerald-900/80 leading-relaxed mb-3">
                  Select a root-zone moisture sensor preset or input capacitive moisture percentage directly:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {SIMULATED_IOT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetSelect(p.id)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        formData.selected_preset === p.id
                          ? 'border-emerald-600 bg-white shadow-xs font-bold text-emerald-950'
                          : 'border-emerald-200/60 bg-white/70 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-[11px] text-emerald-700 font-mono font-bold">{p.moisture}% VWC</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-snug">{p.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="sustain-moisture" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                    Direct Soil Moisture (%):
                  </label>
                  <input
                    id="sustain-moisture"
                    name="soil_moisture_percent"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={formData.soil_moisture_percent}
                    onChange={handleInputChange}
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 font-mono"
                  />
                  {errors.soil_moisture_percent && (
                    <span className="text-xs text-rose-600">{errors.soil_moisture_percent}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Submission / Controls Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl gap-2 w-full sm:w-auto"
                disabled={isSubmitting}
              >
                <RotateCcw size={14} />
                <span>Reset Form</span>
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs font-bold rounded-xl gap-2 shadow-xs w-full sm:w-auto"
                aria-label="Calculate Sustainability Score"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Calculating Score...</span>
                  </>
                ) : (
                  <>
                    <span>Calculate Sustainability Score</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* API Error Box with Retry */}
        {apiError && (
          <div
            role="alert"
            className="mb-10 rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-rose-900 mb-1">
                  Unable to Calculate Sustainability Score
                </h3>
                <p className="text-xs text-rose-700 leading-relaxed mb-4">
                  {apiError}
                </p>
                <Button
                  type="button"
                  variant="danger"
                  onClick={executeScoreCalculation}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold rounded-xl gap-2"
                >
                  <RotateCcw size={14} />
                  <span>Retry Calculation</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Result UI Section */}
        {result && (
          <div
            ref={resultRef}
            role="region"
            aria-label="Sustainability Score Results"
            className="rounded-3xl border border-emerald-100 bg-white p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-300"
          >
            {/* Top Score Banner */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/10 border border-emerald-200/80 p-6 flex flex-col sm:flex-row items-center gap-6 justify-between">
              <div className="flex items-center gap-5">
                {/* Score Number Badge */}
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-1 shadow-md">
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-[22px] bg-white text-center">
                    <span className="text-3xl font-black text-slate-900 leading-none">
                      {result.total_score}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">/ 100</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                        result.score_label === 'Excellent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : result.score_label === 'Good'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {result.score_label}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Deterministic Score</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    Sustainability & Conservation Index
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
                    {result.summary}
                  </p>
                </div>
              </div>

              {/* Status Indicator Pill */}
              <div className="text-center sm:text-right">
                <div className="text-xs text-slate-400 font-medium">Evaluation Decision</div>
                <div className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  {formData.action === 'delay' ? 'Delay Irrigation' : 'Irrigate Now'}
                </div>
              </div>
            </div>

            {/* Recommendation Card */}
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-5 flex items-start gap-3.5">
              <Sparkles size={22} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide mb-1">
                  Agro-Climatic Recommendation
                </h4>
                <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed font-medium">
                  {result.recommendation}
                </p>
              </div>
            </div>

            {/* 4-Dimension Breakdown Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 size={16} className="text-emerald-600" />
                  <span>Four-Dimension Transparent Accounting</span>
                </h4>
                <span className="text-xs text-slate-500 font-medium">100 Max Points Total</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(result.breakdown).map(([key, item]) => {
                  const pct = Math.min(100, Math.max(0, item.percentage));
                  const isOptimal = item.status.toLowerCase().includes('optimal') || item.status.toLowerCase().includes('good') || item.status.toLowerCase().includes('positive');
                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 flex flex-col justify-between"
                      role="region"
                      aria-label={item.dimension}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h5 className="text-xs font-bold text-slate-800 leading-snug">
                            {item.dimension}
                          </h5>
                          <span
                            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                              isOptimal
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                          <span>
                            Points: <strong className="text-slate-800">{item.points}</strong> / {item.max_points}
                          </span>
                          <span className="font-mono font-bold">{pct}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden mb-3">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct >= 80
                                ? 'bg-emerald-500'
                                : pct >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2 mt-auto">
                        {item.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Water Impact & What-If Comparison Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Water Volume Impact Card */}
              <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Droplets size={18} className="text-emerald-700" />
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      Water Volume Impact
                    </h4>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      result.water_impact.impact_type === 'saved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : result.water_impact.impact_type === 'unnecessary_use'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {result.water_impact.impact_type === 'saved'
                      ? 'Water Conserved'
                      : result.water_impact.impact_type === 'unnecessary_use'
                      ? 'Excess / Unnecessary Use'
                      : 'Neutral Impact'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black text-emerald-950">
                    {result.water_impact.litres.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">Litres</span>
                </div>

                <p className="text-xs font-semibold text-slate-800 mb-1">
                  {result.water_impact.label}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed font-mono">
                  {result.water_impact.formula_basis}
                </p>
              </div>

              {/* What-If / Action Comparison Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={18} className="text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    What-If Decision Comparison
                  </h4>
                </div>

                <div className="space-y-3">
                  {result.comparison &&
                    Object.entries(result.comparison).map(([actKey, opt]) => {
                      const isChosen = actKey === formData.action;
                      return (
                        <div
                          key={actKey}
                          className={`p-3 rounded-xl border transition-all ${
                            isChosen
                              ? 'border-emerald-500 bg-white shadow-xs ring-1 ring-emerald-500/20'
                              : 'border-slate-200 bg-white/60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {opt.action === 'delay' ? 'Delay Irrigation' : 'Irrigate Now'}
                              </span>
                              {isChosen && (
                                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                  Evaluated Action
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">{opt.score}/100</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  opt.score_label === 'Excellent'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : opt.score_label === 'Good'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {opt.score_label}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Water impact: {opt.water_impact_litres.toLocaleString()} L ({opt.water_impact_type})
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Simulated IoT Sensor Telemetry Used Notice */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={16} className="text-slate-600" />
                <h5 className="text-xs font-bold text-slate-800">
                  Simulated IoT Telemetry Reference Layer
                </h5>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                {result.simulated_telemetry_notice}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-slate-400 block text-[10px]">Root-Zone Moisture</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {result.telemetry_used.soil_moisture_percent}% VWC
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-slate-400 block text-[10px]">Soil Temperature</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {result.telemetry_used.soil_temperature_celsius}°C
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-slate-400 block text-[10px]">Irrigation Flow</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {result.telemetry_used.irrigation_flow_rate_lpm ?? 30.0} LPM
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-slate-400 block text-[10px]">Water Storage Tank</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {result.telemetry_used.water_tank_level_percent ?? 85}%
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  formTopRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
                  cropRef.current?.focus();
                }}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl gap-2 w-full sm:w-auto"
              >
                <span>Edit Inputs / Recalculate</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl gap-2 w-full sm:w-auto"
              >
                <RotateCcw size={14} />
                <span>Calculate Another Crop</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
