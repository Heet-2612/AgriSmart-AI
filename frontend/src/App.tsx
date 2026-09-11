import { useState, ChangeEvent, FormEvent } from 'react';
import { predictDisease } from './api/client';
import { PredictionResponse } from './types';
import { SustainabilityScore } from './pages/SustainabilityScore';

type ActiveTab = 'sustainability' | 'diagnosis';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('sustainability');

  // Disease Diagnosis form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResult(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await predictDisease(selectedFile);
      setResult(response);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during prediction.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '24px 16px 48px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Main Header */}
        <header style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '28px' }}>🌾</span>
            <h1 style={{ fontSize: '28px', color: '#166534', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
              AgriSmart AI
            </h1>
          </div>
          <p style={{ color: '#4b5563', margin: 0, fontSize: '14.5px' }}>
            Smart India Hackathon 2026 — Intelligent Farm Decision & Diagnostics Platform
          </p>
        </header>

        {/* Navigation Tabs */}
        <nav
          aria-label="Main Navigation"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '28px',
            background: '#e5e7eb',
            padding: '4px',
            borderRadius: '12px',
            maxWidth: '440px',
            margin: '0 auto 28px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('sustainability')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'sustainability' ? '#ffffff' : 'transparent',
              color: activeTab === 'sustainability' ? '#166534' : '#6b7280',
              boxShadow: activeTab === 'sustainability' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            🌿 Sustainability
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnosis')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'diagnosis' ? '#ffffff' : 'transparent',
              color: activeTab === 'diagnosis' ? '#166534' : '#6b7280',
              boxShadow: activeTab === 'diagnosis' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            🍃 Disease Diagnosis
          </button>
        </nav>

        {/* Tab Content */}
        <main>
          {activeTab === 'sustainability' && <SustainabilityScore />}

          {activeTab === 'diagnosis' && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <h2 style={{ fontSize: '20px', color: '#166534', margin: '0 0 16px 0', fontWeight: 700 }}>
                Leaf Disease Diagnosis
              </h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                    Upload Crop Leaf Image:
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/bmp"
                    onChange={handleFileChange}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {previewUrl && (
                  <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Selected Image Preview:</p>
                    <img
                      src={previewUrl}
                      alt="Selected leaf preview"
                      style={{ maxHeight: '220px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedFile || loading}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    backgroundColor: loading || !selectedFile ? '#9ca3af' : '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loading || !selectedFile ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {loading ? 'Analyzing leaf...' : 'Predict Disease'}
                </button>
              </form>

              {loading && (
                <div style={{ marginTop: '20px', padding: '12px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', textAlign: 'center', fontWeight: 600 }}>
                  Processing leaf image with deep learning model...
                </div>
              )}

              {error && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px' }}>
                  <strong>Diagnosis Status:</strong>
                  <p style={{ margin: '6px 0 0 0', fontSize: '14px' }}>{error}</p>
                </div>
              )}

              {result && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#166534', fontSize: '16px' }}>Diagnostic Result</h3>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Predicted Class:</strong> {result.predicted_class}</p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Confidence:</strong> {(result.confidence * 100).toFixed(2)}%</p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Model Version:</strong> {result.model_version}</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
