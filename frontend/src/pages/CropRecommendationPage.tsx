import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import {
  Sprout,
  ArrowLeft,
  MapPin,
  Thermometer,
  Droplets,
  CloudRain,
  Layers,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Loader2,
  CheckCircle2,
  BarChart3,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/Button';
import { recommendCrop, ApiError } from '../api/client';
import { CropRecommendationRequest, CropRecommendationResponse } from '../types';

/** Backend-supported soil types with farmer-friendly display labels */
export const SOIL_TYPES = [
  { value: 'alluvial', label: 'Alluvial Soil' },
  { value: 'black', label: 'Black Soil' },
  { value: 'red', label: 'Red Soil' },
  { value: 'laterite', label: 'Laterite Soil' },
  { value: 'clay', label: 'Clay Soil' },
  { value: 'sandy', label: 'Sandy Soil' },
  { value: 'loamy', label: 'Loamy Soil' },
  { value: 'peaty', label: 'Peaty Soil' },
  { value: 'saline', label: 'Saline Soil' },
  { value: 'arid', label: 'Arid / Desert Soil' },
  { value: 'unknown', label: 'Unknown / Other' },
] as const;

export interface CropRecommendationFormData {
  state: string;
  district: string;
  temperature: string;
  humidity: string;
  rainfall: string;
  soil_type: string;
  previous_crop: string;
}

export type FormErrors = Partial<Record<keyof CropRecommendationFormData, string>>;

interface CropRecommendationPageProps {
  onBack: () => void;
  onSubmit?: (data: CropRecommendationFormData) => void;
}

const INITIAL_FORM_DATA: CropRecommendationFormData = {
  state: '',
  district: '',
  temperature: '',
  humidity: '',
  rainfall: '',
  soil_type: '',
  previous_crop: '',
};

/** Helper to format confidence numbers safely (handles decimals 0-1, whole percentages 0-100, 0, 1, and invalid numbers) */
export function formatConfidence(conf: unknown): string {
  if (typeof conf !== 'number' || !Number.isFinite(conf)) {
    return 'N/A';
  }
  const percent = conf >= 0 && conf <= 1 ? conf * 100 : conf;
  return `${Math.min(100, Math.max(0, percent)).toFixed(1)}%`;
}

/** Helper to extract numeric percentage for progress bars (0-100) */
export function getConfidencePercent(conf: unknown): number {
  if (typeof conf !== 'number' || !Number.isFinite(conf)) {
    return 0;
  }
  const percent = conf >= 0 && conf <= 1 ? conf * 100 : conf;
  return Math.min(100, Math.max(0, percent));
}

export function CropRecommendationPage({ onBack, onSubmit }: CropRecommendationPageProps) {
  const [formData, setFormData] = useState<CropRecommendationFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [recommendationResult, setRecommendationResult] = useState<CropRecommendationResponse | null>(null);

  // Field element references for accessible focus placement on validation failure
  const stateRef = useRef<HTMLInputElement>(null);
  const districtRef = useRef<HTMLInputElement>(null);
  const temperatureRef = useRef<HTMLInputElement>(null);
  const humidityRef = useRef<HTMLInputElement>(null);
  const rainfallRef = useRef<HTMLInputElement>(null);
  const soilTypeRef = useRef<HTMLSelectElement>(null);
  const previousCropRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<keyof CropRecommendationFormData, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
    state: stateRef,
    district: districtRef,
    temperature: temperatureRef,
    humidity: humidityRef,
    rainfall: rainfallRef,
    soil_type: soilTypeRef,
    previous_crop: previousCropRef,
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear individual field error as user edits
    if (errors[name as keyof CropRecommendationFormData]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof CropRecommendationFormData];
        return next;
      });
    }
    if (generalError) {
      setGeneralError(null);
    }
    if (apiError) {
      setApiError(null);
    }
  };

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    // 1. State
    if (!formData.state.trim()) {
      newErrors.state = 'State is required.';
    }

    // 2. District
    if (!formData.district.trim()) {
      newErrors.district = 'District is required.';
    }

    // 3. Temperature (-10°C to 60°C)
    if (!formData.temperature.trim()) {
      newErrors.temperature = 'Temperature is required.';
    } else {
      const tempNum = Number(formData.temperature);
      if (Number.isNaN(tempNum)) {
        newErrors.temperature = 'Temperature must be a valid number.';
      } else if (tempNum < -10 || tempNum > 60) {
        newErrors.temperature = 'Temperature must be between -10°C and 60°C.';
      }
    }

    // 4. Humidity (0% to 100%)
    if (!formData.humidity.trim()) {
      newErrors.humidity = 'Humidity is required.';
    } else {
      const humNum = Number(formData.humidity);
      if (Number.isNaN(humNum)) {
        newErrors.humidity = 'Humidity must be a valid number.';
      } else if (humNum < 0 || humNum > 100) {
        newErrors.humidity = 'Humidity must be between 0% and 100%.';
      }
    }

    // 5. Rainfall (0 mm to 5000 mm)
    if (!formData.rainfall.trim()) {
      newErrors.rainfall = 'Rainfall is required.';
    } else {
      const rainNum = Number(formData.rainfall);
      if (Number.isNaN(rainNum)) {
        newErrors.rainfall = 'Rainfall must be a valid number.';
      } else if (rainNum < 0 || rainNum > 5000) {
        newErrors.rainfall = 'Rainfall must be between 0 mm and 5000 mm.';
      }
    }

    // 6. Soil Type
    if (!formData.soil_type) {
      newErrors.soil_type = 'Soil type is required.';
    }

    // 7. Previous Crop
    if (!formData.previous_crop.trim()) {
      newErrors.previous_crop = 'Previous crop is required.';
    }

    return newErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setGeneralError('Please correct the highlighted fields before submitting.');

      // Place focus on the first invalid field for keyboard & screen-reader accessibility
      const fieldOrder: (keyof CropRecommendationFormData)[] = [
        'state',
        'district',
        'temperature',
        'humidity',
        'rainfall',
        'soil_type',
        'previous_crop',
      ];
      const firstInvalidField = fieldOrder.find((field) => validationErrors[field]);
      if (firstInvalidField && fieldRefs[firstInvalidField]?.current) {
        fieldRefs[firstInvalidField].current?.focus();
      }
      return;
    }

    setErrors({});
    setGeneralError(null);
    setApiError(null);
    setIsSubmitting(true);

    // Build exact 7-field backend payload (numbers converted, trimmed)
    const payload: CropRecommendationRequest = {
      state: formData.state.trim(),
      district: formData.district.trim(),
      temperature: Number(formData.temperature),
      humidity: Number(formData.humidity),
      rainfall: Number(formData.rainfall),
      soil_type: formData.soil_type,
      previous_crop: formData.previous_crop.trim(),
    };

    if (onSubmit) {
      onSubmit(formData);
    }

    try {
      const response = await recommendCrop(payload);
      setRecommendationResult(response);
      setApiError(null);

      // Smoothly scroll to results display
      setTimeout(() => {
        const resultSection = document.getElementById('recommendation-result');
        resultSection?.scrollIntoView?.({ behavior: 'smooth' });
      }, 50);
    } catch (err: unknown) {
      setRecommendationResult(null);
      let message = 'Unable to generate recommendation due to an unexpected error. Please try again.';

      if (err instanceof ApiError) {
        if (err.status === 503) {
          message = 'The crop recommendation service is temporarily offline (503). Please try again in a few moments.';
        } else if (err.status === 400 || err.status === 422) {
          message = err.message || 'Invalid environmental parameters. Please verify the entered values.';
        } else if (err.status >= 500) {
          message = 'A server error occurred while processing recommendations. Please try again in a few moments.';
        } else {
          message = err.message || `Request failed with status: ${err.status}`;
        }
      } else if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
        message = 'Network error: Unable to connect to AgriSmart AI services. Please check your internet connection and try again.';
      } else if (err instanceof Error) {
        message = err.message;
      }
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      id="crop-recommendation"
      aria-label="Crop Recommendation"
      className="flex-1 relative bg-mesh-agri overflow-hidden py-10 sm:py-16"
    >
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">

        {/* Top Back Action */}
        <div className="mb-6 text-left">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold rounded-xl gap-2"
            aria-label="Back to Plant Diagnosis"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Back to Plant Diagnosis</span>
          </Button>
        </div>

        {/* Main Form Workbench Card */}
        <div
          className="w-full rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-[0_4px_25px_rgba(15,23,42,0.04)] text-left"
          role="region"
          aria-label="Crop Recommendation Form Workbench"
        >

          {/* Page Header */}
          <div className="border-b border-slate-100 pb-6 mb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 mb-2">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100/90 text-emerald-700 mx-auto sm:mx-0"
                aria-hidden="true"
              >
                <Sprout size={24} strokeWidth={2.2} />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Crop Recommendation
                </h1>
                <p className="mt-1 text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
                  Enter your field conditions to receive a crop recommendation based on your soil and environment.
                </p>
              </div>
            </div>
          </div>

          {/* Validation Alert Banner */}
          {generalError && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-left text-sm text-amber-900 shadow-xs"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div>
                <strong className="font-semibold text-amber-950">Incomplete Form Submission</strong>
                <p className="mt-0.5 text-amber-800">{generalError}</p>
              </div>
            </div>
          )}

          {/* API Error Alert Banner */}
          {apiError && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-left text-sm text-red-900 shadow-xs"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <div className="flex-1">
                <strong className="font-semibold text-red-950">Recommendation Request Issue</strong>
                <p className="mt-0.5 text-red-800">{apiError}</p>
              </div>
            </div>
          )}

          {/* Structured Recommendation Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-8">

            {/* ── Section 1: Location ── */}
            <fieldset className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 sm:p-6">
              <legend className="flex items-center gap-2 px-1 text-base font-bold text-slate-900">
                <MapPin size={18} className="text-emerald-600" aria-hidden="true" />
                <span>Section 1 — Location</span>
              </legend>
              <p className="text-xs text-slate-500 mb-5 px-1">
                Regional geography enables accurate local agro-climatic pattern analysis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

                {/* State Field */}
                <div>
                  <label
                    htmlFor="state-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    State <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={stateRef}
                      id="state-input"
                      name="state"
                      type="text"
                      required
                      disabled={isSubmitting}
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Gujarat"
                      aria-required="true"
                      aria-invalid={!!errors.state}
                      aria-describedby={errors.state ? 'state-error' : undefined}
                      className={`w-full rounded-xl border bg-white py-2.5 px-3.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                        errors.state
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.state && (
                    <p id="state-error" role="alert" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={13} aria-hidden="true" />
                      <span>{errors.state}</span>
                    </p>
                  )}
                </div>

                {/* District Field */}
                <div>
                  <label
                    htmlFor="district-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    District <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={districtRef}
                      id="district-input"
                      name="district"
                      type="text"
                      required
                      disabled={isSubmitting}
                      value={formData.district}
                      onChange={handleChange}
                      placeholder="e.g. Ahmedabad"
                      aria-required="true"
                      aria-invalid={!!errors.district}
                      aria-describedby={errors.district ? 'district-error' : undefined}
                      className={`w-full rounded-xl border bg-white py-2.5 px-3.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                        errors.district
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.district && (
                    <p id="district-error" role="alert" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={13} aria-hidden="true" />
                      <span>{errors.district}</span>
                    </p>
                  )}
                </div>

              </div>
            </fieldset>

            {/* ── Section 2: Environmental Conditions ── */}
            <fieldset className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 sm:p-6">
              <legend className="flex items-center gap-2 px-1 text-base font-bold text-slate-900">
                <CloudRain size={18} className="text-emerald-600" aria-hidden="true" />
                <span>Section 2 — Environmental Conditions</span>
              </legend>
              <p className="text-xs text-slate-500 mb-5 px-1">
                Field temperature, ambient relative humidity, and regional annual precipitation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">

                {/* Temperature Field */}
                <div>
                  <label
                    htmlFor="temperature-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Temperature <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Thermometer size={16} />
                    </div>
                    <input
                      ref={temperatureRef}
                      id="temperature-input"
                      name="temperature"
                      type="number"
                      step="0.1"
                      min="-10"
                      max="60"
                      required
                      disabled={isSubmitting}
                      value={formData.temperature}
                      onChange={handleChange}
                      placeholder="e.g. 28"
                      aria-required="true"
                      aria-invalid={!!errors.temperature}
                      aria-describedby={errors.temperature ? 'temperature-error' : undefined}
                      className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-10 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                        errors.temperature
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-slate-300'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs font-bold text-slate-500">°C</span>
                    </div>
                  </div>
                  {errors.temperature && (
                    <p id="temperature-error" role="alert" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={13} aria-hidden="true" />
                      <span>{errors.temperature}</span>
                    </p>
                  )}
                </div>

                {/* Humidity Field */}
                <div>
                  <label
                    htmlFor="humidity-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Humidity <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Droplets size={16} />
                    </div>
                    <input
                      ref={humidityRef}
                      id="humidity-input"
                      name="humidity"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      disabled={isSubmitting}
                      value={formData.humidity}
                      onChange={handleChange}
                      placeholder="e.g. 65"
                      aria-required="true"
                      aria-invalid={!!errors.humidity}
                      aria-describedby={errors.humidity ? 'humidity-error' : undefined}
                      className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-8 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                        errors.humidity
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-slate-300'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>
                  {errors.humidity && (
                    <p id="humidity-error" role="alert" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={13} aria-hidden="true" />
                      <span>{errors.humidity}</span>
                    </p>
                  )}
                </div>

                {/* Rainfall Field */}
                <div>
                  <label
                    htmlFor="rainfall-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Rainfall <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <CloudRain size={16} />
                    </div>
                    <input
                      ref={rainfallRef}
                      id="rainfall-input"
                      name="rainfall"
                      type="number"
                      step="0.1"
                      min="0"
                      max="5000"
                      required
                      disabled={isSubmitting}
                      value={formData.rainfall}
                      onChange={handleChange}
                      placeholder="e.g. 750"
                      aria-required="true"
                      aria-invalid={!!errors.rainfall}
                      aria-describedby={errors.rainfall ? 'rainfall-error' : undefined}
                      className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-12 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                        errors.rainfall
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-slate-300'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs font-bold text-slate-500">mm</span>
                    </div>
                  </div>
                  {errors.rainfall && (
                    <p id="rainfall-error" role="alert" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={13} aria-hidden="true" />
                      <span>{errors.rainfall}</span>
                    </p>
                  )}
                </div>

              </div>
            </fieldset>

            {/* ── Section 3: Farming Context ── */}
            <fieldset className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 sm:p-6">
              <legend className="flex items-center gap-2 px-1 text-base font-bold text-slate-900">
                <Layers size={18} className="text-emerald-600" aria-hidden="true" />
                <span>Section 3 — Farming Context</span>
              </legend>
              <p className="text-xs text-slate-500 mb-5 px-1">
                Soil characteristics and crop rotation history on your target plot.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

                {/* Soil Type Select */}
                <div>
                  <label
                    htmlFor="soil-type-select"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Soil Type <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <select
                      ref={soilTypeRef}
                      id="soil-type-select"
                      name="soil_type"
                      required
                      disabled={isSubmitting}
                      value={formData.soil_type}
                      onChange={handleChange}
                      aria-required="true"
                      aria-invalid={!!errors.soil_type}
                      aria-describedby={errors.soil_type ? 'soil_type-error' : undefined}
                      className={`w-full rounded-xl border bg-white py-2.5 px-3.5 text-sm text-slate-800 transition-colors focus:outline-none focus:ring-2 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed ${
                        errors.soil_type
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-slate-300'
                      }`}
                    >
                      <option value="">Select soil type</option>
                      {SOIL_TYPES.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.soil_type && (
                    <p id="soil_type-error" role="alert" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={13} aria-hidden="true" />
                      <span>{errors.soil_type}</span>
                    </p>
                  )}
                </div>

                {/* Previous Crop Field */}
                <div>
                  <label
                    htmlFor="previous-crop-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Previous Crop <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={previousCropRef}
                      id="previous-crop-input"
                      name="previous_crop"
                      type="text"
                      required
                      disabled={isSubmitting}
                      value={formData.previous_crop}
                      onChange={handleChange}
                      placeholder="e.g. Cotton"
                      aria-required="true"
                      aria-invalid={!!errors.previous_crop}
                      aria-describedby={`previous-crop-helper ${errors.previous_crop ? 'previous-crop-error' : ''}`.trim()}
                      className={`w-full rounded-xl border bg-white py-2.5 px-3.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                        errors.previous_crop
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-slate-300'
                      }`}
                    />
                  </div>
                  <p id="previous-crop-helper" className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
                    <HelpCircle size={12} className="shrink-0 text-slate-400" aria-hidden="true" />
                    <span>Enter the crop that was previously harvested from this soil plot.</span>
                  </p>
                  {errors.previous_crop && (
                    <p id="previous-crop-error" role="alert" className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={13} aria-hidden="true" />
                      <span>{errors.previous_crop}</span>
                    </p>
                  )}
                </div>

              </div>
            </fieldset>

            {/* ── Submit Area ── */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Your information is used to generate a recommendation from the crop model.
              </p>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto py-3 px-7 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Recommend Crop"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      <span>Analyzing Conditions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} aria-hidden="true" />
                      <span>Recommend Crop</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

          </form>

          {/* ── Recommendation Result Section ── */}
          {recommendationResult && (
            <div
              id="recommendation-result"
              role="region"
              aria-label="Crop recommendation result"
              aria-live="polite"
              className="mt-10 pt-8 border-t border-slate-200/80 space-y-6"
            >
              {/* Primary Output Hero Card */}
              <div className="rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-[#ECFDF5]/80 via-white to-white p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-800"
                      >
                        <CheckCircle2 size={13} aria-hidden="true" />
                        Recommended Crop Output
                      </span>

                      {recommendationResult.confidence_level && (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize border ${
                            recommendationResult.confidence_level.toLowerCase() === 'high'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          Confidence Level: {recommendationResult.confidence_level}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 break-words">
                      {recommendationResult.recommended_crop || 'Recommended Crop'}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
                      Recommended for field plot in <span className="font-semibold text-slate-800">{formData.district || 'District'}</span>, <span className="font-semibold text-slate-800">{formData.state || 'State'}</span> based on provided environmental and soil dynamics.
                    </p>
                  </div>

                  {/* Metrics Ribbon */}
                  <div className="flex flex-wrap md:flex-col items-start md:items-end gap-3 shrink-0">
                    <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-3 shadow-xs text-left md:text-right">
                      <span className="block text-xs font-medium text-slate-500">Confidence Score</span>
                      <span className="text-2xl font-black text-emerald-700">
                        {formatConfidence(recommendationResult.confidence)}
                      </span>
                    </div>

                    {recommendationResult.model_version && (
                      <span className="text-xs font-medium text-slate-400">
                        Model Version: {recommendationResult.model_version}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Agronomic Explanation Card */}
              {recommendationResult.explanation && recommendationResult.explanation.trim().length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
                      aria-hidden="true"
                    >
                      <FileText size={20} strokeWidth={2} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">
                        Agronomic Explanation
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">
                        {recommendationResult.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top-K Alternative Recommendations */}
              {recommendationResult.top_k_recommendations && recommendationResult.top_k_recommendations.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={18} className="text-emerald-700" aria-hidden="true" />
                      <h3 className="text-base font-bold text-slate-900">
                        Ranked Crop Alternatives
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Model Probability</span>
                  </div>

                  <div className="space-y-3.5">
                    {recommendationResult.top_k_recommendations.map((item, idx) => {
                      const score = item.probability ?? item.confidence;
                      const pctText = formatConfidence(score);
                      const pctWidth = getConfidencePercent(score);
                      return (
                        <div key={item.crop || idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600 font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-bold text-slate-800 truncate" title={item.crop}>
                                {item.crop}
                              </span>
                            </span>
                            <span className="text-xs font-bold text-slate-700 shrink-0 ml-2">{pctText}</span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pctWidth}%`,
                                backgroundColor: pctWidth > 50 ? '#10B981' : '#F59E0B',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other Recommendations List */}
              {(() => {
                const rawRecs = recommendationResult.recommendations;
                if (!Array.isArray(rawRecs) || rawRecs.length === 0) return null;

                const normalized = rawRecs
                  .map((rec) => {
                    if (typeof rec === 'string') {
                      const text = rec.trim();
                      return text.length > 0 ? { crop: text } : null;
                    }
                    if (rec && typeof rec === 'object' && typeof rec.crop === 'string') {
                      const text = rec.crop.trim();
                      return text.length > 0 ? { crop: text, tier: rec.confidence_tier } : null;
                    }
                    return null;
                  })
                  .filter((item): item is { crop: string; tier?: string } => Boolean(item));

                if (normalized.length === 0) return null;

                return (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      Other Suitable Crops
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {normalized.map((item, idx) => (
                        <span
                          key={`${item.crop}-${idx}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs break-words"
                        >
                          <Sprout size={13} className="text-emerald-600 shrink-0" aria-hidden="true" />
                          <span>{item.crop}</span>
                          {item.tier && (
                            <span className="text-[10px] text-slate-400 font-normal">({item.tier})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons: Adjust / Recalculate or Return */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const formEl = document.querySelector('form');
                    formEl?.scrollIntoView?.({ behavior: 'smooth' });
                    temperatureRef.current?.focus();
                  }}
                  className="w-full sm:w-auto py-2.5 px-5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-2"
                  aria-label="Adjust parameters and recalculate"
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  <span>Adjust Conditions & Re-calculate</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={onBack}
                  className="w-full sm:w-auto py-2.5 px-5 text-sm font-semibold rounded-xl gap-2"
                  aria-label="Return to Plant Diagnosis"
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  <span>Return to Plant Diagnosis</span>
                </Button>
              </div>

            </div>
          )}

        </div>

      </div>
    </main>
  );
}
