import { useState, useEffect, useId, ChangeEvent, FormEvent } from 'react';
import {
  Leaf,
  Droplets,
  CloudRain,
  AlertCircle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  WeatherResponse,
  SustainabilityScoreResponse,
  IrrigationAction,
} from '../types';
import {
  IOT_PRESETS,
  DEFAULT_IOT_TELEMETRY,
  validateSustainabilityForm,
  calculateClientSustainabilityScore,
} from '../lib/sustainability';
import {
  getWeather,
  calculateSustainabilityScore,
  ApiError,
} from '../api/client';

export interface SustainabilityPageProps {
  onBack?: () => void;
  initialCrop?: string;
  initialPreviousCrop?: string;
  initialSoilType?: string;
  initialLocation?: string;
}

export function SustainabilityPage({
  onBack,
  initialCrop = 'Chickpea',
  initialPreviousCrop = 'Cotton',
  initialSoilType = 'Black',
  initialLocation = 'Nagpur',
}: SustainabilityPageProps) {
  const formId = useId();

  // Location & Weather State
  const [locationInput, setLocationInput] = useState<string>(initialLocation);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // IoT Sensor Telemetry State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('optimal_loam');
  const [telemetry, setTelemetry] = useState(DEFAULT_IOT_TELEMETRY);

  // Farm Form State
  const [formData, setFormData] = useState({
    crop: initialCrop,
    previous_crop: initialPreviousCrop,
    soil_type: initialSoilType,
    farm_area_hectares: '0.1',
    temperature_celsius: '26.0',
    humidity_percent: '65',
    rain_probability_percent: '75',
    expected_rainfall_mm: '12.0',
    soil_moisture_percent: '32.0',
    action: 'delay' as IrrigationAction,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isScoreLoading, setIsScoreLoading] = useState<boolean>(false);
  const [scoreResult, setScoreResult] = useState<SustainabilityScoreResponse | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Fetch initial live weather on mount for default location
  useEffect(() => {
    if (initialLocation) {
      handleFetchWeather(initialLocation);
    }
  }, [initialLocation]);

  // When IoT Preset changes, update telemetry and form moisture
  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = IOT_PRESETS.find((p) => p.preset_id === presetId);
    if (preset) {
      setTelemetry(preset.telemetry);
      setFormData((prev) => ({
        ...prev,
        soil_moisture_percent: String(preset.telemetry.soil_moisture_percent),
      }));
    }
  };

  const handleFetchWeather = async (locToQuery?: string) => {
    const loc = (locToQuery || locationInput).trim();
    if (!loc) {
      setWeatherError('Please enter a valid district or city.');
      return;
    }

    setIsWeatherLoading(true);
    setWeatherError(null);

    try {
      const data = await getWeather(loc);
      if (data && data.current && data.daily) {
        setWeatherData(data);
        // Auto-populate form with live weather
        setFormData((prev) => ({
          ...prev,
          temperature_celsius: data.current.temperature.toFixed(1),
          humidity_percent: String(data.current.humidity),
          expected_rainfall_mm: data.daily.precipitation_sum.toFixed(1),
          rain_probability_percent: String(data.daily.precipitation_probability),
        }));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setWeatherError(err.message);
      } else {
        setWeatherError('Could not fetch weather data. Please try again.');
      }
    } finally {
      setIsWeatherLoading(false);
    }
  };

  // Compute sustainability score
  const executeCalculation = async (dataToScore = formData) => {
    const errors = validateSustainabilityForm(dataToScore);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsScoreLoading(true);
    setGeneralError(null);

    const payload = {
      crop: dataToScore.crop,
      previous_crop: dataToScore.previous_crop || undefined,
      soil_type: dataToScore.soil_type || undefined,
      farm_area_hectares: Number(dataToScore.farm_area_hectares) || 0.1,
      temperature_celsius: Number(dataToScore.temperature_celsius),
      humidity_percent: Number(dataToScore.humidity_percent),
      rain_probability_percent: Number(dataToScore.rain_probability_percent),
      expected_rainfall_mm: Number(dataToScore.expected_rainfall_mm),
      action: dataToScore.action,
      telemetry: {
        ...telemetry,
        soil_moisture_percent: Number(dataToScore.soil_moisture_percent),
      },
      soil_moisture_percent: Number(dataToScore.soil_moisture_percent),
    };

    try {
      // Primary: backend service API
      const result = await calculateSustainabilityScore(payload);
      setScoreResult(result);
    } catch {
      // Resilient fallback: pure client-side calculation matching exact backend formula
      const clientResult = calculateClientSustainabilityScore(payload);
      setScoreResult(clientResult);
    } finally {
      setIsScoreLoading(false);
    }
  };

  // Run calculation on mount or initial inputs ready
  useEffect(() => {
    executeCalculation(formData);
  }, []);

  const handleInputChange = (field: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    const updated = { ...formData, [field]: val };
    setFormData(updated);

    if (field === 'soil_moisture_percent') {
      const num = Number(val);
      if (Number.isFinite(num)) {
        setTelemetry((prev) => ({ ...prev, soil_moisture_percent: num }));
      }
    }
  };

  const handleActionToggle = (action: IrrigationAction) => {
    const updated = { ...formData, action };
    setFormData(updated);
    executeCalculation(updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    executeCalculation(formData);
  };

  return (
    <main className="min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Top Header & Context */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Leaf size={18} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                SIH Explainable Intelligence
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Sustainability & Water-Impact Score
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Deterministic 100-point agronomic evaluation pairing live Open-Meteo weather intelligence with simulated IoT root-zone telemetry to optimize irrigation timing and conserve freshwater.
            </p>
          </div>

          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 cursor-pointer shrink-0"
            >
              ← Back to Main App
            </Button>
          )}
        </div>

        {/* Two-Column Grid: Left Controls / Right Score Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Form & Telemetry Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* 1. Live Weather Integration Box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
                  <CloudRain size={15} />
                  Live Weather Intelligence
                </span>
                <span className="text-2xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Open-Meteo API
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Enter District (e.g. Ludhiana, Pune)"
                  aria-label="District or city for weather query"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isWeatherLoading}
                  aria-label="Fetch Weather"
                  onClick={() => handleFetchWeather()}
                  className="rounded-xl px-4 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer shrink-0"
                >
                  {isWeatherLoading ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw size={14} className="animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Fetch Weather'
                  )}
                </Button>
              </div>

              {weatherError && (
                <p role="alert" className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={13} />
                  <span>{weatherError}</span>
                </p>
              )}

              {weatherData && (
                <div className="mt-3.5 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs text-slate-700 space-y-2">
                  <div className="flex justify-between items-center font-semibold text-slate-800">
                    <span>{weatherData.location.name}, {weatherData.location.country}</span>
                    <span className="text-sky-700 font-bold">{weatherData.current.condition}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-2xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Temperature</span>
                      <span className="font-semibold text-slate-800">{weatherData.current.temperature}°C</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Humidity</span>
                      <span className="font-semibold text-slate-800">{weatherData.current.humidity}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Rain Expected</span>
                      <span className="font-semibold text-slate-800">{weatherData.daily.precipitation_sum} mm</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Simulated IoT Sensor Telemetry Presets */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-700">
                  <Cpu size={15} />
                  Simulated IoT Telemetry Layer
                </span>
                <span className="text-2xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md">
                  Virtual Sensors
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Simulates root-zone capacitance sensors and smart flow meters for SIH demo verification:
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {IOT_PRESETS.map((p) => {
                  const isSel = selectedPresetId === p.preset_id;
                  return (
                    <button
                      key={p.preset_id}
                      type="button"
                      onClick={() => handlePresetSelect(p.preset_id)}
                      className={`text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                        isSel
                          ? 'border-violet-500 bg-violet-50/70 ring-1 ring-violet-500/20 font-semibold text-violet-900'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="block font-medium truncate">{p.name}</span>
                      <span className="block text-2xs text-slate-400 mt-0.5">
                        Moisture: {p.telemetry.soil_moisture_percent}% | {p.telemetry.irrigation_flow_rate_lpm} L/min
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5 text-2xs text-slate-600">
                <div className="flex justify-between">
                  <span>Soil Moisture Telemetry:</span>
                  <span className="font-bold text-slate-800">{telemetry.soil_moisture_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Soil Temperature Probe:</span>
                  <span className="font-bold text-slate-800">{telemetry.soil_temperature_celsius}°C</span>
                </div>
                <div className="flex justify-between">
                  <span>Irrigation Flow Meter:</span>
                  <span className="font-bold text-slate-800">{telemetry.irrigation_flow_rate_lpm} L/min</span>
                </div>
                <div className="flex justify-between">
                  <span>Nominal Cycle Duration:</span>
                  <span className="font-bold text-slate-800">{telemetry.irrigation_duration_minutes} minutes</span>
                </div>
              </div>
            </div>

            {/* 3. Farm & Practice Parameters */}
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Field Parameters & Irrigation Action
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${formId}-crop`} className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Crop
                  </label>
                  <input
                    id={`${formId}-crop`}
                    type="text"
                    value={formData.crop}
                    onChange={handleInputChange('crop')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {formErrors.crop && <p className="text-2xs text-red-600 mt-1">{formErrors.crop}</p>}
                </div>

                <div>
                  <label htmlFor={`${formId}-area`} className="block text-xs font-semibold text-slate-700 mb-1">
                    Plot Area (ha)
                  </label>
                  <input
                    id={`${formId}-area`}
                    type="number"
                    step="0.05"
                    min="0.01"
                    value={formData.farm_area_hectares}
                    onChange={handleInputChange('farm_area_hectares')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {formErrors.farm_area_hectares && <p className="text-2xs text-red-600 mt-1">{formErrors.farm_area_hectares}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${formId}-prev-crop`} className="block text-xs font-semibold text-slate-700 mb-1">
                    Preceding Crop
                  </label>
                  <input
                    id={`${formId}-prev-crop`}
                    type="text"
                    value={formData.previous_crop}
                    onChange={handleInputChange('previous_crop')}
                    placeholder="e.g. Cotton"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor={`${formId}-soil-moisture`} className="block text-xs font-semibold text-slate-700 mb-1">
                    Soil Moisture (%)
                  </label>
                  <input
                    id={`${formId}-soil-moisture`}
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={formData.soil_moisture_percent}
                    onChange={handleInputChange('soil_moisture_percent')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {formErrors.soil_moisture_percent && <p className="text-2xs text-red-600 mt-1">{formErrors.soil_moisture_percent}</p>}
                </div>
              </div>

              {/* Action Decision Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Proposed Irrigation Decision:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleActionToggle('delay')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      formData.action === 'delay'
                        ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-500/20'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Delay Irrigation (24h)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleActionToggle('irrigate_now')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      formData.action === 'irrigate_now'
                        ? 'bg-white text-rose-800 shadow-xs ring-1 ring-rose-500/20'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Irrigate Now
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isScoreLoading}
                className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                {isScoreLoading ? 'Recalculating...' : 'Evaluate Sustainability Score'}
              </Button>
            </form>

          </div>

          {/* Right Column: Score Results Dashboard (7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {generalError && (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{generalError}</span>
              </div>
            )}

            {scoreResult && (
              <>
                {/* Hero Card: Overall Score & Water Impact */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">

                    {/* Score Number Gauge */}
                    <div className="flex items-center gap-5">
                      <div className={`flex h-24 w-24 items-center justify-center rounded-2xl font-black text-4xl shadow-inner ${
                        scoreResult.total_score >= 80
                          ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-300'
                          : scoreResult.total_score >= 60
                          ? 'bg-amber-50 text-amber-700 border-2 border-amber-300'
                          : 'bg-rose-50 text-rose-700 border-2 border-rose-300'
                      }`}>
                        {scoreResult.total_score}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            scoreResult.score_label === 'Excellent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : scoreResult.score_label === 'Good'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            <CheckCircle2 size={13} />
                            {scoreResult.score_label}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">Scale: 0–100</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mt-1">
                          Sustainability Index
                        </h2>
                        <p className="text-xs text-slate-500">
                          {scoreResult.summary}
                        </p>
                      </div>
                    </div>

                    {/* Water Impact Badge */}
                    <div className="sm:border-l sm:border-slate-100 sm:pl-6 shrink-0">
                      <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Volumetric Water Metric
                      </span>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${
                        scoreResult.water_impact.impact_type === 'saved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : scoreResult.water_impact.impact_type === 'unnecessary_use'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        <Droplets size={16} />
                        <span>{scoreResult.water_impact.label}</span>
                      </div>
                      <p className="text-3xs text-slate-400 mt-1 max-w-[200px]">
                        {scoreResult.water_impact.formula_basis}
                      </p>
                    </div>

                  </div>

                  {/* Operational Recommendation Banner */}
                  <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs text-emerald-900 flex items-start gap-3">
                    <Sparkles size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-bold block text-emerald-950 mb-0.5">Operational Guidance</span>
                      <p>{scoreResult.recommendation}</p>
                    </div>
                  </div>
                </div>

                {/* What-If Action Comparison Banner */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                    "What-If" Practice Comparison (Delay vs. Irrigate Now)
                  </span>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border transition-all ${
                      formData.action === 'delay' ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500/20' : 'border-slate-200'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-800">If You Delay:</span>
                        <span className="font-black text-base text-emerald-700">
                          {scoreResult.comparison.delay.score}/100
                        </span>
                      </div>
                      <span className="text-2xs font-semibold text-emerald-700 block">
                        Impact: {scoreResult.comparison.delay.water_impact_litres.toLocaleString()} L ({scoreResult.comparison.delay.water_impact_type})
                      </span>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      formData.action === 'irrigate_now' ? 'border-rose-500 bg-rose-50/30 ring-1 ring-rose-500/20' : 'border-slate-200'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-800">If You Irrigate Now:</span>
                        <span className="font-black text-base text-rose-700">
                          {scoreResult.comparison.irrigate_now.score}/100
                        </span>
                      </div>
                      <span className="text-2xs font-semibold text-rose-700 block">
                        Impact: {scoreResult.comparison.irrigate_now.water_impact_litres.toLocaleString()} L ({scoreResult.comparison.irrigate_now.water_impact_type})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Dimensional Component Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(scoreResult.breakdown).map(([key, item]) => (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{item.dimension}</span>
                          <span className="text-3xs font-semibold uppercase text-slate-400">{item.status}</span>
                        </div>
                        <span className="font-black text-sm text-slate-800">
                          {item.points} / {item.max_points}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.percentage >= 80 ? 'bg-emerald-500' : item.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                        />
                      </div>

                      <p className="text-2xs text-slate-500 leading-relaxed">
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Farm Advisories if Live Weather Present */}
                {weatherData && weatherData.advisories && weatherData.advisories.length > 0 && (
                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1">
                      Rule-Based Field Meteorological Advisories
                    </span>
                    <ul className="list-disc list-inside text-xs text-amber-800 space-y-1">
                      {weatherData.advisories.map((adv, idx) => (
                        <li key={idx}>{adv}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

          </div>

        </div>

      </div>
    </main>
  );
}
