import { useState, ChangeEvent, FormEvent } from 'react';
import { predictDisease } from './api/client';
import { PredictionResponse } from './types';

export default function App() {
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
    <div style={{ maxWidth: '720px', margin: '40px auto', padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', color: '#166534', margin: '0 0 8px 0' }}>AgriSmart AI</h1>
        <p style={{ color: '#4b5563', margin: 0 }}>
          Smart India Hackathon 2026 — Crop Leaf Disease Diagnostic Interface
        </p>
      </header>

      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Upload Crop Leaf Image:
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              onChange={handleFileChange}
              style={{ display: 'block', width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
            />
          </div>

          {previewUrl && (
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Selected Image Preview:</p>
              <img
                src={previewUrl}
                alt="Selected leaf preview"
                style={{ maxHeight: '240px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || loading}
            style={{
              width: '100%',
              padding: '12px 20px',
              backgroundColor: loading ? '#9ca3af' : '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading || !selectedFile ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Analyzing...' : 'Predict Disease'}
          </button>
        </form>

        {loading && (
          <div style={{ marginTop: '20px', padding: '12px', background: '#f0fdf4', color: '#166534', borderRadius: '6px', textAlign: 'center' }}>
            Processing leaf image...
          </div>
        )}

        {error && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px' }}>
            <strong>Diagnosis Status:</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
          </div>
        )}

        {result && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#166534' }}>Diagnostic Result</h3>
            <p style={{ margin: '4px 0' }}><strong>Predicted Class:</strong> {result.predicted_class}</p>
            <p style={{ margin: '4px 0' }}><strong>Confidence:</strong> {(result.confidence * 100).toFixed(2)}%</p>
            <p style={{ margin: '4px 0' }}><strong>Model Version:</strong> {result.model_version}</p>
          </div>
        )}
      </div>
    </div>
  );
}
