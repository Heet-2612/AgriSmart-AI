import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Droplets,
  Thermometer,
  Wind,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';

import { getWeatherIntelligence, ApiError } from '../../api/client';
import {
  WeatherIntelligenceResponse,
  WeatherIntelligenceRequest,
  AgronomicAlert,
  ForecastDay,
} from '../../types';

interface WeatherIntelligenceCardProps {
  initialLocation?: string;
  initialCrop?: string;
  initialSoilMoisture?: number;
  initialSoilType?: string;
  initialDisease?: string;
  onNavigateSustainability?: () => void;
  className?: string;
}

export const WeatherIntelligenceCard: React.FC<WeatherIntelligenceCardProps> = ({
  initialLocation = 'Pune',
  initialCrop,
  initialSoilMoisture,
  initialSoilType = 'black',
  initialDisease,
  onNavigateSustainability,
  className = '',
}) => {
  const [location, setLocation] = useState(initialLocation);
  const [crop, setCrop] = useState(initialCrop || '');
  const [soilMoisture, setSoilMoisture] = useState<number | undefined>(initialSoilMoisture);
  const [soilType, setSoilType] = useState(initialSoilType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<WeatherIntelligenceResponse | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchIntelligence = async () => {
    if (!location.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const payload: WeatherIntelligenceRequest = {
        location: location.trim(),
        crop: crop.trim() || undefined,
        soil_moisture_percent: soilMoisture !== undefined && !isNaN(soilMoisture) ? soilMoisture : undefined,
        soil_type: soilType || undefined,
        diagnosed_disease: initialDisease || undefined,
        forecast_days: 7,
      };

      const res = await getWeatherIntelligence(payload);
      setIntelligence(res);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load weather intelligence. Please check connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, [initialDisease]);

  const getSeverityStyles = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          badge: 'bg-red-600 text-white',
          text: 'text-red-900',
          desc: 'text-red-700',
          icon: AlertCircle,
          iconColor: 'text-red-600',
        };
      case 'high':
        return {
          bg: 'bg-amber-50 border-amber-200',
          badge: 'bg-amber-600 text-white',
          text: 'text-amber-900',
          desc: 'text-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
        };
      case 'medium':
        return {
          bg: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-600 text-white',
          text: 'text-blue-900',
          desc: 'text-blue-800',
          icon: Info,
          iconColor: 'text-blue-600',
        };
      default:
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          badge: 'bg-emerald-600 text-white',
          text: 'text-emerald-900',
          desc: 'text-emerald-800',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
        };
    }
  };

  return (
    <section
      aria-labelledby="weather-intelligence-heading"
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <CloudSun className="h-6 w-6" />
          </div>
          <div>
            <h2 id="weather-intelligence-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Weather & Farm Intelligence
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Live Action Engine
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Combines real-time meteorology with root-zone soil & crop state
            </p>
          </div>
        </div>

        {/* Quick Location Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchIntelligence();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City / District (e.g. Pune)"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-44"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Update</span>
          </button>
        </form>
      </div>

      {/* Error View */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Unable to load weather intelligence</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !intelligence && (
        <div className="mt-4 space-y-4 animate-pulse">
          <div className="h-24 rounded-xl bg-slate-100" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="h-16 rounded-xl bg-slate-100" />
            <div className="h-16 rounded-xl bg-slate-100" />
            <div className="h-16 rounded-xl bg-slate-100" />
            <div className="h-16 rounded-xl bg-slate-100" />
          </div>
        </div>
      )}

      {/* Main Intelligence View */}
      {intelligence && (
        <div className="mt-5 space-y-5">
          {/* Primary Action Banner */}
          {(() => {
            const styles = getSeverityStyles(intelligence.primary_action.severity);
            const IconComponent = styles.icon;
            return (
              <div className={`rounded-xl border p-4 sm:p-5 ${styles.bg}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-lg p-2 ${styles.badge}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${styles.badge}`}>
                          {intelligence.primary_action.badge_label}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {intelligence.location.name}
                          {intelligence.location.state ? `, ${intelligence.location.state}` : ''}
                        </span>
                      </div>
                      <h3 className={`mt-1 text-sm sm:text-base font-bold ${styles.text}`}>
                        {intelligence.primary_action.headline}
                      </h3>
                      <p className={`mt-1 text-xs leading-relaxed ${styles.desc}`}>
                        {intelligence.primary_action.detail}
                      </p>
                    </div>
                  </div>

                  {onNavigateSustainability && (
                    <button
                      type="button"
                      onClick={onNavigateSustainability}
                      className="self-start sm:self-center shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer bg-white/80 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors"
                    >
                      <span>Simulate Soil & Irrigation</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Current Live Atmospheric Conditions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <Thermometer className="h-3.5 w-3.5 text-amber-500" />
                <span>Temperature</span>
              </div>
              <p className="mt-1 text-base font-bold text-slate-800">
                {intelligence.current.temperature.toFixed(1)}°C
              </p>
              <p className="text-[11px] text-slate-500">{intelligence.current.condition}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <Droplets className="h-3.5 w-3.5 text-blue-500" />
                <span>Humidity</span>
              </div>
              <p className="mt-1 text-base font-bold text-slate-800">
                {intelligence.current.humidity.toFixed(0)}%
              </p>
              <p className="text-[11px] text-slate-500">
                {intelligence.current.humidity >= 80 ? 'High fungal risk' : 'Normal range'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <CloudSun className="h-3.5 w-3.5 text-indigo-500" />
                <span>Rainfall (Today)</span>
              </div>
              <p className="mt-1 text-base font-bold text-slate-800">
                {(intelligence.forecast_daily[0]?.precipitation_sum || 0).toFixed(1)} mm
              </p>
              <p className="text-[11px] text-slate-500">
                {intelligence.forecast_daily[0]?.precipitation_probability || 0}% chance
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <Wind className="h-3.5 w-3.5 text-teal-500" />
                <span>Wind Speed</span>
              </div>
              <p className="mt-1 text-base font-bold text-slate-800">
                {intelligence.current.wind_speed.toFixed(1)} km/h
              </p>
              <p className="text-[11px] text-slate-500">
                {intelligence.current.wind_speed >= 20 ? 'Spray drift warning' : 'Suitable for spraying'}
              </p>
            </div>
          </div>

          {/* Active Prioritized Alerts */}
          {intelligence.alerts && intelligence.alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Active Agronomic Alerts ({intelligence.alerts.length})
              </h4>
              <div className="space-y-2">
                {intelligence.alerts.map((alert: AgronomicAlert, idx: number) => {
                  const s = getSeverityStyles(alert.severity);
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200/80 bg-white p-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${s.badge}`}>
                          P{alert.priority}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{alert.title}</span>
                            <span className="text-[11px] font-medium text-slate-500 capitalize">
                              {alert.category.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 mt-0.5">{alert.message}</p>
                          <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed">
                            {alert.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7-Day Forecast Horizon Strip */}
          {intelligence.forecast_daily && intelligence.forecast_daily.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  7-Day Agricultural Forecast Horizon
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Daily Outlook</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {intelligence.forecast_daily.map((day: ForecastDay, i: number) => (
                  <div
                    key={i}
                    className={`rounded-lg p-2.5 text-center border ${
                      i === 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200/60'
                    }`}
                  >
                    <p className="text-[11px] font-bold text-slate-700">
                      {i === 0 ? 'Today' : day.date.slice(5)}
                    </p>
                    <p className="text-xs font-extrabold text-slate-900 mt-1">
                      {day.temp_max.toFixed(0)}° / {day.temp_min.toFixed(0)}°
                    </p>
                    <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                      {day.precipitation_sum.toFixed(1)} mm
                    </p>
                    <p className="text-[10px] text-slate-500 truncate" title={day.condition}>
                      {day.condition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Farm Conditions Fine-Tuning Drawer */}
          <div className="pt-1 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{showAdvanced ? 'Hide Farm Telemetry Inputs' : 'Fine-Tune Soil & Crop Context'}</span>
            </button>

            {/* Named Data Source Attribution (Mandatory) */}
            <p className="text-[11px] text-slate-400 font-medium text-right">
              Data Source: <span className="text-slate-600 font-semibold">{intelligence.data_source}</span>
            </p>
          </div>

          {showAdvanced && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <h5 className="text-xs font-bold text-slate-800">Custom Farm Telemetry Overrides</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Soil Moisture (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={soilMoisture !== undefined ? soilMoisture : ''}
                    onChange={(e) =>
                      setSoilMoisture(e.target.value === '' ? undefined : parseFloat(e.target.value))
                    }
                    placeholder="e.g. 32"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Soil Profile
                  </label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="loam">Loam Reference Profile</option>
                    <option value="black">Black Cotton / Vertisol</option>
                    <option value="clay">Clay / Heavy Soil</option>
                    <option value="sandy">Sandy / Coarse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Crop Species
                  </label>
                  <input
                    type="text"
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    placeholder="e.g. Potato, Wheat"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={fetchIntelligence}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  Apply & Recalculate Actions
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
