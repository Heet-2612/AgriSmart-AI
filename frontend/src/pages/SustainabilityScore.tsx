import { useState, useId } from 'react';
import {
  calculateSustainabilityScore,
  DEFAULT_DEMO_INPUTS,
  DEMO_DISCLAIMER_BADGE,
  IrrigationAction,
  SustainabilityInputs,
} from '../lib/sustainability';

export function SustainabilityScore() {
  const [inputs, setInputs] = useState<SustainabilityInputs>(DEFAULT_DEMO_INPUTS);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);

  // Derive score result strictly via library calculation function
  const result = calculateSustainabilityScore(inputs);

  const handleActionChange = (action: IrrigationAction) => {
    setInputs((prev) => ({ ...prev, action }));
  };

  const isDelay = inputs.action === 'delay';

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
          Sustainability Impact Score
        </h2>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '14.5px' }}>
          Weather-aware irrigation intelligence & agricultural conservation analytics
        </p>
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
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Target Crop</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>🍅 {inputs.crop}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Farm Area</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>📐 {inputs.farmAreaHectares} Hectare</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Soil Moisture</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>💧 {inputs.soilMoisturePercent}%</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Rain Forecast</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>🌧️ {inputs.rainProbabilityPercent}% ({inputs.expectedRainfallMm} mm)</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Temperature / Hum</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>🌡️ {inputs.temperatureCelsius}°C / {inputs.humidityPercent}%</div>
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

      {/* Irrigation Action Selector */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
          Select Irrigation Decision to Evaluate:
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleActionChange('delay')}
            style={{
              flex: '1 1 240px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: isDelay ? '2px solid #16a34a' : '1px solid #d1d5db',
              background: isDelay ? '#f0fdf4' : '#ffffff',
              color: isDelay ? '#15803d' : '#4b5563',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <span>✅ Follow recommendation: Delay irrigation</span>
            {isDelay && <span style={{ fontSize: '11px', background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: '6px' }}>Active</span>}
          </button>

          <button
            type="button"
            onClick={() => handleActionChange('irrigate_now')}
            style={{
              flex: '1 1 240px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: !isDelay ? '2px solid #dc2626' : '1px solid #d1d5db',
              background: !isDelay ? '#fef2f2' : '#ffffff',
              color: !isDelay ? '#b91c1c' : '#4b5563',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚠️ Irrigate now</span>
            {!isDelay && <span style={{ fontSize: '11px', background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '6px' }}>Active</span>}
          </button>
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
            Current Demo Max: {result.maxCurrentScore} / 100
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
            <div style={{ fontSize: '28px', fontWeight: 800, color: isDelay ? '#14532d' : '#7f1d1d', marginBottom: '6px' }}>
              {isDelay ? '💧 +180 Litres Saved' : '⚠️ 180 Litres Unnecessary Use'}
            </div>
            <p style={{ fontSize: '13.5px', color: isDelay ? '#166534' : '#991b1b', margin: '0 0 12px 0', lineHeight: 1.45 }}>
              {isDelay
                ? 'Delaying irrigation leverages forecasted 8 mm rain, conserving critical groundwater reserves for your 0.1-hectare plot.'
                : 'Irrigating immediately before 8 mm forecasted rainfall causes saturation, surface runoff, and avoidable water expense.'}
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
            onClick={() => handleActionChange('delay')}
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
              Option A: Follow Recommendation
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
            onClick={() => handleActionChange('irrigate_now')}
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
              Irrigate immediately despite forecasted rain
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
              The <strong>Sustainability Impact Score</strong> uses transparent, deterministic agricultural rules based on microclimate forecasts and soil physics:
            </p>

            <div style={{ marginBottom: '12px' }}>
              <strong>1. Water Efficiency (Maximum 50 points):</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                <li>Delay irrigation when rain probability ≥ 60% AND expected rainfall ≥ 5 mm: <strong>40 points</strong>.</li>
                <li>Irrigate now under the same condition: <strong>10 points</strong>.</li>
                <li>Otherwise: <strong>30 points</strong>.</li>
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
