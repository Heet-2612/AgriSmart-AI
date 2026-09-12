import { useState, useId, FormEvent, ChangeEvent } from 'react';
import {
  calculateSustainabilityScore,
  validateSustainabilityInputs,
  DEFAULT_DEMO_INPUTS,
  DEMO_DISCLAIMER_BADGE,
  CROP_CONTEXT_NOTE,
  WATER_IMPACT_HEURISTIC_NOTE,
  IrrigationAction,
  SustainabilityInputs,
  SustainabilityValidationErrors,
} from '../lib/sustainability';

interface FormState {
  crop: string;
  farmAreaHectares: string;
  soilMoisturePercent: string;
  rainProbabilityPercent: string;
  expectedRainfallMm: string;
  temperatureCelsius: string;
  humidityPercent: string;
  action: IrrigationAction;
}

function inputsToFormState(inputs: SustainabilityInputs): FormState {
  return {
    crop: inputs.crop,
    farmAreaHectares: String(inputs.farmAreaHectares),
    soilMoisturePercent: String(inputs.soilMoisturePercent),
    rainProbabilityPercent: String(inputs.rainProbabilityPercent),
    expectedRainfallMm: String(inputs.expectedRainfallMm),
    temperatureCelsius: String(inputs.temperatureCelsius),
    humidityPercent: String(inputs.humidityPercent),
    action: inputs.action,
  };
}

function formStateToInputs(form: FormState): Partial<SustainabilityInputs> {
  return {
    crop: form.crop,
    farmAreaHectares: form.farmAreaHectares.trim() === '' ? NaN : Number(form.farmAreaHectares),
    soilMoisturePercent: form.soilMoisturePercent.trim() === '' ? NaN : Number(form.soilMoisturePercent),
    rainProbabilityPercent: form.rainProbabilityPercent.trim() === '' ? NaN : Number(form.rainProbabilityPercent),
    expectedRainfallMm: form.expectedRainfallMm.trim() === '' ? NaN : Number(form.expectedRainfallMm),
    temperatureCelsius: form.temperatureCelsius.trim() === '' ? NaN : Number(form.temperatureCelsius),
    humidityPercent: form.humidityPercent.trim() === '' ? NaN : Number(form.humidityPercent),
    action: form.action,
  };
}

export function SustainabilityScore() {
  // Evaluated conditions currently reflected in the score cards
  const [evaluatedInputs, setEvaluatedInputs] = useState<SustainabilityInputs>(DEFAULT_DEMO_INPUTS);

  // Form draft state that user edits
  const [formState, setFormState] = useState<FormState>(() => inputsToFormState(DEFAULT_DEMO_INPUTS));
  const [errors, setErrors] = useState<SustainabilityValidationErrors>({});
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [calculationSuccessMessage, setCalculationSuccessMessage] = useState<string | null>(null);

  // Derive score result strictly via library calculation function
  const result = calculateSustainabilityScore(evaluatedInputs);

  const isDelay = evaluatedInputs.action === 'delay';

  const handleFieldChange = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error as user types
    if (errors[field as keyof SustainabilityValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFormActionChange = (action: IrrigationAction) => {
    setFormState((prev) => ({ ...prev, action }));
  };

  const handleCalculate = (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const parsed = formStateToInputs(formState);
    const validationErrors = validateSustainabilityInputs(parsed);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setCalculationSuccessMessage(null);
      return;
    }

    setErrors({});
    const validInputs: SustainabilityInputs = {
      crop: (parsed.crop || 'Tomato').trim(),
      farmAreaHectares: parsed.farmAreaHectares!,
      soilMoisturePercent: parsed.soilMoisturePercent!,
      rainProbabilityPercent: parsed.rainProbabilityPercent!,
      expectedRainfallMm: parsed.expectedRainfallMm!,
      temperatureCelsius: parsed.temperatureCelsius!,
      humidityPercent: parsed.humidityPercent!,
      action: formState.action,
    };

    setEvaluatedInputs(validInputs);
    setCalculationSuccessMessage('Score updated with current farm conditions!');
    setTimeout(() => setCalculationSuccessMessage(null), 3000);
  };

  const handleResetDemo = () => {
    setFormState(inputsToFormState(DEFAULT_DEMO_INPUTS));
    setErrors({});
    setEvaluatedInputs(DEFAULT_DEMO_INPUTS);
    setCalculationSuccessMessage('Reset to default demo values.');
    setTimeout(() => setCalculationSuccessMessage(null), 3000);
  };

  // Instant action switch from the comparison cards or quick evaluator
  const handleDirectActionSwitch = (action: IrrigationAction) => {
    setFormState((prev) => ({ ...prev, action }));
    setEvaluatedInputs((prev) => ({ ...prev, action }));
  };

  // Circular progress calculations for SVG gauge
  const radius = 64;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (result.totalScore / result.maxPossibleScore) * circumference;

  // Score badge theme colors
  const getBadgeStyle = (label: string) => {
    switch (label) {
      case 'Excellent':
        return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'Good':
        return { bg: '#fef9c3', text: '#854d0e', border: '#fef08a' };
      default:
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    }
  };

  const currentBadge = getBadgeStyle(result.scoreLabel);
  const scoreGradientId = useId();

  return (
    <div style={{ width: '100%', maxWidth: '840px', margin: '0 auto', color: '#1f2937' }}>
      {/* Disclaimer Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          borderRadius: '9999px',
          padding: '6px 16px',
          fontSize: '12.5px',
          fontWeight: 600,
          margin: '0 auto 20px',
          width: 'fit-content',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        <span>🌱</span>
        <span>{DEMO_DISCLAIMER_BADGE}</span>
      </div>

      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#14532d', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          Deterministic Sustainability Score
        </h2>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '14.5px' }}>
          Rule-based irrigation intelligence & agricultural water conservation analysis
        </p>
      </div>

      {/* Farm Conditions Input Form Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1.5px solid #d1fae5',
          borderRadius: '16px',
          padding: '22px',
          marginBottom: '26px',
          boxShadow: '0 4px 12px rgba(22, 101, 52, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#166534', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌾</span>
              <span>Farm & Microclimate Conditions</span>
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Enter your field parameters to calculate real-time deterministic score and water conservation impact.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDemo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🔄</span>
            <span>Reset Demo Values</span>
          </button>
        </div>

        {calculationSuccessMessage && (
          <div
            style={{
              padding: '10px 14px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              color: '#065f46',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>✅</span>
            <span>{calculationSuccessMessage}</span>
          </div>
        )}

        <form onSubmit={handleCalculate}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '18px',
            }}
          >
            {/* Field: Crop Name */}
            <div>
              <label
                htmlFor="crop-input"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}
              >
                Target Crop Name
              </label>
              <input
                id="crop-input"
                type="text"
                value={formState.crop}
                onChange={handleFieldChange('crop')}
                placeholder="e.g. Tomato"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.crop ? '1.5px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: errors.crop ? '#fef2f2' : '#ffffff',
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                Recorded for farm context — does not alter rule-based score.
              </div>
              {errors.crop && <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '2px' }}>{errors.crop}</div>}
            </div>

            {/* Field: Farm Area (ha) */}
            <div>
              <label
                htmlFor="area-input"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}
              >
                Farm Area (Hectares)
              </label>
              <input
                id="area-input"
                type="number"
                step="any"
                min="0.001"
                value={formState.farmAreaHectares}
                onChange={handleFieldChange('farmAreaHectares')}
                placeholder="0.1"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.farmAreaHectares ? '1.5px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: errors.farmAreaHectares ? '#fef2f2' : '#ffffff',
                }}
              />
              {errors.farmAreaHectares && (
                <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '3px' }}>{errors.farmAreaHectares}</div>
              )}
            </div>

            {/* Field: Soil Moisture (%) */}
            <div>
              <label
                htmlFor="moisture-input"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}
              >
                Soil Moisture (0–100%)
              </label>
              <input
                id="moisture-input"
                type="number"
                step="any"
                min="0"
                max="100"
                value={formState.soilMoisturePercent}
                onChange={handleFieldChange('soilMoisturePercent')}
                placeholder="31"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.soilMoisturePercent ? '1.5px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: errors.soilMoisturePercent ? '#fef2f2' : '#ffffff',
                }}
              />
              {errors.soilMoisturePercent && (
                <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '3px' }}>{errors.soilMoisturePercent}</div>
              )}
            </div>

            {/* Field: Rain Probability (%) */}
            <div>
              <label
                htmlFor="rain-prob-input"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}
              >
                Rain Probability (0–100%)
              </label>
              <input
                id="rain-prob-input"
                type="number"
                step="any"
                min="0"
                max="100"
                value={formState.rainProbabilityPercent}
                onChange={handleFieldChange('rainProbabilityPercent')}
                placeholder="65"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.rainProbabilityPercent ? '1.5px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: errors.rainProbabilityPercent ? '#fef2f2' : '#ffffff',
                }}
              />
              {errors.rainProbabilityPercent && (
                <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '3px' }}>{errors.rainProbabilityPercent}</div>
              )}
            </div>

            {/* Field: Expected Rainfall (mm) */}
            <div>
              <label
                htmlFor="rainfall-input"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}
              >
                Expected Rainfall (mm)
              </label>
              <input
                id="rainfall-input"
                type="number"
                step="any"
                min="0"
                value={formState.expectedRainfallMm}
                onChange={handleFieldChange('expectedRainfallMm')}
                placeholder="8"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.expectedRainfallMm ? '1.5px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: errors.expectedRainfallMm ? '#fef2f2' : '#ffffff',
                }}
              />
              {errors.expectedRainfallMm && (
                <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '3px' }}>{errors.expectedRainfallMm}</div>
              )}
            </div>

            {/* Field: Temperature (°C) */}
            <div>
              <label
                htmlFor="temp-input"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}
              >
                Temperature (°C)
              </label>
              <input
                id="temp-input"
                type="number"
                step="any"
                value={formState.temperatureCelsius}
                onChange={handleFieldChange('temperatureCelsius')}
                placeholder="29"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.temperatureCelsius ? '1.5px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: errors.temperatureCelsius ? '#fef2f2' : '#ffffff',
                }}
              />
              {errors.temperatureCelsius && (
                <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '3px' }}>{errors.temperatureCelsius}</div>
              )}
            </div>

            {/* Field: Humidity (%) */}
            <div>
              <label
                htmlFor="humidity-input"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}
              >
                Humidity (0–100%)
              </label>
              <input
                id="humidity-input"
                type="number"
                step="any"
                min="0"
                max="100"
                value={formState.humidityPercent}
                onChange={handleFieldChange('humidityPercent')}
                placeholder="72"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.humidityPercent ? '1.5px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: errors.humidityPercent ? '#fef2f2' : '#ffffff',
                }}
              />
              {errors.humidityPercent && (
                <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '3px' }}>{errors.humidityPercent}</div>
              )}
            </div>

            {/* Field: Irrigation Action Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                Irrigation Action
              </label>
              <div style={{ display: 'flex', gap: '8px', height: '40px' }}>
                <button
                  type="button"
                  onClick={() => handleFormActionChange('delay')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: formState.action === 'delay' ? '2px solid #16a34a' : '1px solid #d1d5db',
                    background: formState.action === 'delay' ? '#f0fdf4' : '#ffffff',
                    color: formState.action === 'delay' ? '#15803d' : '#4b5563',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Delay irrigation
                </button>
                <button
                  type="button"
                  onClick={() => handleFormActionChange('irrigate_now')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: formState.action === 'irrigate_now' ? '2px solid #dc2626' : '1px solid #d1d5db',
                    background: formState.action === 'irrigate_now' ? '#fef2f2' : '#ffffff',
                    color: formState.action === 'irrigate_now' ? '#b91c1c' : '#4b5563',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Irrigate now
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              handleCalculate(e);
            }}
            style={{
              width: '100%',
              padding: '13px 20px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚡</span>
            <span>Calculate Sustainability Score</span>
          </button>
        </form>
      </div>

      {/* Current Farm Scenario Context Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Crop</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>🌱 {evaluatedInputs.crop}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Farm Area</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>📐 {evaluatedInputs.farmAreaHectares} Ha</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Soil Moisture</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>💧 {evaluatedInputs.soilMoisturePercent}%</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Rain Forecast</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>🌧️ {evaluatedInputs.rainProbabilityPercent}% ({evaluatedInputs.expectedRainfallMm} mm)</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Temperature / Hum</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>🌡️ {evaluatedInputs.temperatureCelsius}°C / {evaluatedInputs.humidityPercent}%</div>
        </div>
      </div>

      {/* Today's Recommendation Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
          border: '1.5px solid #86efac',
          borderRadius: '16px',
          padding: '18px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 6px rgba(22, 101, 52, 0.06)',
        }}
      >
        <div
          style={{
            background: '#16a34a',
            color: '#ffffff',
            borderRadius: '12px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            flexShrink: 0,
          }}
        >
          💡
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
            Today’s Recommendation
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d', lineHeight: 1.4 }}>
            {result.recommendation}
          </div>
        </div>
      </div>

      {/* Main Score & Water Impact Hero Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Score Card with Circular Gauge */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ position: 'relative', width: `${radius * 2}px`, height: `${radius * 2}px`, marginBottom: '14px' }}>
            <svg width={radius * 2} height={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                stroke="#e5e7eb"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke={`url(#${scoreGradientId})`}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.6s ease' }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <defs>
                <linearGradient id={scoreGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={result.totalScore >= 80 ? '#22c55e' : result.totalScore >= 60 ? '#eab308' : '#ef4444'} />
                  <stop offset="100%" stopColor={result.totalScore >= 80 ? '#15803d' : result.totalScore >= 60 ? '#ca8a04' : '#b91c1c'} />
                </linearGradient>
              </defs>
            </svg>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                {result.totalScore}
              </span>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>/ 100</span>
            </div>
          </div>

          <div
            style={{
              background: currentBadge.bg,
              color: currentBadge.text,
              border: `1px solid ${currentBadge.border}`,
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '6px',
            }}
          >
            {result.scoreLabel}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Current Max Achievable: {result.maxCurrentScore} / 100
          </div>
        </div>

        {/* Water Impact Card */}
        <div
          style={{
            background: isDelay ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
            border: `1px solid ${isDelay ? '#86efac' : '#fca5a5'}`,
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: isDelay ? '#15803d' : '#991b1b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Estimated Water Impact
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: isDelay ? '#14532d' : '#7f1d1d', marginBottom: '6px' }}>
              {isDelay ? `💧 +${result.waterImpact.litres} Litres Saved` : `⚠️ ${result.waterImpact.litres} Litres Unnecessary Use`}
            </div>
            <p style={{ fontSize: '13.5px', color: isDelay ? '#166534' : '#991b1b', margin: '0 0 12px 0', lineHeight: 1.45 }}>
              {isDelay
                ? `Delaying irrigation leverages forecasted ${evaluatedInputs.expectedRainfallMm} mm rain, conserving critical water reserves for your ${evaluatedInputs.farmAreaHectares}-hectare plot.`
                : `Irrigating immediately before ${evaluatedInputs.expectedRainfallMm} mm forecasted rainfall causes saturation, surface runoff, and avoidable water expense.`}
            </p>
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px' }}>
            *{result.waterImpact.disclaimer}
          </div>
        </div>
      </div>

      {/* Component Breakdown Cards (3 Cards) */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#166534', margin: '0 0 14px 0' }}>
          Score Component Breakdown
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* Card 1: Water Efficiency */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>🚰 Water Efficiency</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                {result.waterEfficiency.points} <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>/ {result.waterEfficiency.maxPoints} pts</span>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '9999px', overflow: 'hidden', marginBottom: '10px' }}>
              <div
                style={{
                  background: '#16a34a',
                  width: `${(result.waterEfficiency.points / result.waterEfficiency.maxPoints) * 100}%`,
                  height: '100%',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }}>
              {result.waterEfficiency.reason}
            </div>
          </div>

          {/* Card 2: Weather-Smart Actions */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>⛅ Weather-Smart Actions</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                {result.weatherSmart.points} <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>/ {result.weatherSmart.maxPoints} pts</span>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '9999px', overflow: 'hidden', marginBottom: '10px' }}>
              <div
                style={{
                  background: '#16a34a',
                  width: `${(result.weatherSmart.points / result.weatherSmart.maxPoints) * 100}%`,
                  height: '100%',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '11.5px', color: '#4b5563', lineHeight: 1.4 }}>
              {result.weatherSmart.reasons.map((r, i) => (
                <div key={i} style={{ marginBottom: '2px' }}>• {r}</div>
              ))}
            </div>
          </div>

          {/* Card 3: Soil and Crop Care */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>🌱 Soil & Crop Care</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                {result.soilCropCare.points} <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>/ {result.soilCropCare.maxTotalPoints} pts</span>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '9999px', overflow: 'hidden', marginBottom: '10px' }}>
              <div
                style={{
                  background: '#16a34a',
                  width: `${(result.soilCropCare.points / result.soilCropCare.maxTotalPoints) * 100}%`,
                  height: '100%',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.4, marginBottom: '6px' }}>
              {result.soilCropCare.reason}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#6b7280',
                background: '#f8fafc',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px dashed #cbd5e1',
              }}
            >
              🔒 {result.soilCropCare.futureNote}
            </div>
          </div>
        </div>
      </div>

      {/* "What if I irrigate now?" Comparison Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '28px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔄</span>
          <span>Visual “What if I irrigate now?” Comparison</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {/* Scenario A: Follow Recommendation */}
          <div
            onClick={() => handleDirectActionSwitch('delay')}
            style={{
              border: isDelay ? '2px solid #16a34a' : '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              background: isDelay ? '#f0fdf4' : '#fafafa',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            {isDelay && (
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#16a34a',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                }}
              >
                Selected
              </span>
            )}
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
              Option A: Delay Irrigation
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '10px' }}>
              Delay irrigation for 24h
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#15803d' }}>
                {result.comparison.delay.score}/100
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                ({result.comparison.delay.label})
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>
              💧 {result.comparison.delay.waterSavedLitres} L saved
            </div>
          </div>

          {/* Scenario B: Irrigate Now */}
          <div
            onClick={() => handleDirectActionSwitch('irrigate_now')}
            style={{
              border: !isDelay ? '2px solid #dc2626' : '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              background: !isDelay ? '#fef2f2' : '#fafafa',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            {!isDelay && (
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#dc2626',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                }}
              >
                Selected
              </span>
            )}
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
              Option B: Irrigate Now
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '10px' }}>
              Irrigate immediately
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#b91c1c' }}>
                {result.comparison.irrigateNow.score}/100
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c' }}>
                ({result.comparison.irrigateNow.label})
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>
              ⚠️ {result.comparison.irrigateNow.unnecessaryWaterLitres} L unnecessary use
            </div>
          </div>
        </div>
      </div>

      {/* Expandable "How We Calculate This" Section */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => setIsHowItWorksOpen(!isHowItWorksOpen)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14.5px',
            fontWeight: 700,
            color: '#1e293b',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📖</span>
            <span>How we calculate this (Transparent Rule Specifications)</span>
          </span>
          <span style={{ fontSize: '18px', color: '#64748b' }}>{isHowItWorksOpen ? '▲' : '▼'}</span>
        </button>

        {isHowItWorksOpen && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 12px 0' }}>
              The <strong>Deterministic Sustainability Score</strong> uses transparent, deterministic agricultural rules based on microclimate forecasts and soil physics:
            </p>

            <div style={{ marginBottom: '12px' }}>
              <strong>1. Water Efficiency (Maximum 50 points):</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                <li>Delay irrigation when rain probability ≥ 60% AND expected rainfall ≥ 5 mm: <strong>40 points</strong>.</li>
                <li>Irrigate now under the same condition: <strong>10 points</strong>.</li>
                <li>Otherwise (standard baseline conditions): <strong>30 points</strong>.</li>
              </ul>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong>2. Weather-Smart Actions (Maximum 30 points):</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                <li>Rain probability ≥ 60%: <strong>15 points</strong>.</li>
                <li>Temperature 18°C to 34°C: <strong>10 points</strong>.</li>
                <li>Humidity ≤ 80%: <strong>5 points</strong>.</li>
              </ul>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong>3. Soil and Crop Care (Maximum 20 points):</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                <li>Soil moisture 25% to 40%: <strong>12 points</strong>.</li>
                <li>The remaining <strong>8 points</strong> are explicitly reserved for future disease-scan integration and are not counted.</li>
                <li><em>{CROP_CONTEXT_NOTE}</em></li>
              </ul>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong>4. Water Impact Estimation:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                <li>
                  Demo estimate formula: 180 L × (farm area in hectares / 0.1 ha).
                </li>
                <li>
                  <em>{WATER_IMPACT_HEURISTIC_NOTE}</em>
                </li>
                <li>Delaying irrigation: Calculates estimated litres saved by utilizing forecasted rainfall.</li>
                <li>Irrigating now: Calculates estimated litres of unnecessary water application risking runoff and saturation.</li>
              </ul>
            </div>

            <div>
              <strong>Score Interpretation:</strong>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  80–100: Excellent
                </span>
                <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  60–79: Good
                </span>
                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  0–59: Needs Improvement
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
