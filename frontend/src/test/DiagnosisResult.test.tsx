import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiagnosisResult } from '../components/diagnosis/DiagnosisResult';
import { ModelUnavailable } from '../components/diagnosis/ModelUnavailable';
import { PredictionResponse } from '../types';

describe('DiagnosisResult Component', () => {
  const baseResult: PredictionResponse = {
    predicted_class: 'Apple___Apple_scab',
    display_name: 'Apple Scab Disease',
    confidence: 0.942,
    model_version: 'v0.1.0-scaffold',
    precaution: 'Apply appropriate fungicide during pink bud stage.\nPrune and dispose of infected leaves.',
    probabilities: {
      'Apple___Apple_scab': 0.942,
      'Apple___Black_rot': 0.038,
      'Apple___Cedar_apple_rust': 0.020,
    },
  };

  it('renders prediction data with display name, confidence percentage, and model version', () => {
    const onReset = vi.fn();
    render(
      <DiagnosisResult
        result={baseResult}
        imagePreviewUrl="blob:preview"
        fileName="leaf_sample.jpg"
        cropType="Apple"
        onReset={onReset}
      />
    );

    expect(screen.getByText('Apple Scab Disease')).toBeInTheDocument();
    expect(screen.getAllByText('94.2%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('v0.1.0-scaffold')).toBeInTheDocument();
    expect(screen.getByText(/crop: apple/i)).toBeInTheDocument();
    expect(screen.getByText(/technical class: apple___apple_scab/i)).toBeInTheDocument();
  });

  it('falls back to predicted_class when display_name is absent', () => {
    const onReset = vi.fn();
    const resultWithoutDisplayName: PredictionResponse = {
      predicted_class: 'Tomato___Early_blight',
      confidence: 0.885,
      model_version: 'v1.0.0',
    };

    render(
      <DiagnosisResult
        result={resultWithoutDisplayName}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Tomato___Early_blight')).toBeInTheDocument();
    expect(screen.getByText('88.5%')).toBeInTheDocument();
  });

  it('renders precaution guidance when provided and omits section when absent', () => {
    const onReset = vi.fn();
    const { rerender } = render(
      <DiagnosisResult
        result={baseResult}
        onReset={onReset}
      />
    );

    expect(screen.getByText(/recommended precautions & action guidance/i)).toBeInTheDocument();
    expect(screen.getByText(/apply appropriate fungicide/i)).toBeInTheDocument();

    const resultWithoutPrecaution: PredictionResponse = {
      predicted_class: 'Potato___Late_blight',
      confidence: 0.91,
      model_version: 'v1.0.0',
    };

    rerender(
      <DiagnosisResult
        result={resultWithoutPrecaution}
        onReset={onReset}
      />
    );

    expect(screen.queryByText(/recommended precautions & action guidance/i)).not.toBeInTheDocument();
  });

  it('renders probability distribution only when probabilities are provided', () => {
    const onReset = vi.fn();
    const { rerender } = render(
      <DiagnosisResult
        result={baseResult}
        onReset={onReset}
      />
    );

    expect(screen.getByText(/confidence distribution/i)).toBeInTheDocument();
    expect(screen.getByText('Apple___Black_rot')).toBeInTheDocument();
    expect(screen.getByText('3.8%')).toBeInTheDocument();

    const resultWithoutProbabilities: PredictionResponse = {
      predicted_class: 'Corn___Common_rust',
      confidence: 0.95,
      model_version: 'v1.0.0',
    };

    rerender(
      <DiagnosisResult
        result={resultWithoutProbabilities}
        onReset={onReset}
      />
    );

    expect(screen.queryByText(/confidence distribution/i)).not.toBeInTheDocument();
  });

  it('safely handles missing optional fields without rendering undefined, null, or NaN', () => {
    const onReset = vi.fn();
    const minimalResult: PredictionResponse = {
      predicted_class: 'Grape___Black_rot',
      confidence: 0.76,
      model_version: 'v1.0.0',
    };

    const { container } = render(
      <DiagnosisResult
        result={minimalResult}
        onReset={onReset}
      />
    );

    expect(container.textContent).not.toContain('undefined');
    expect(container.textContent).not.toContain('null');
    expect(container.textContent).not.toContain('NaN');
  });

  it('invokes onReset when Upload Another Image is clicked', () => {
    const onReset = vi.fn();
    render(
      <DiagnosisResult
        result={baseResult}
        onReset={onReset}
      />
    );

    const btn = screen.getByRole('button', { name: /upload another image/i });
    fireEvent.click(btn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe('ModelUnavailable Component', () => {
  it('renders model unavailable explanation and triggers onReset', () => {
    const onReset = vi.fn();
    render(
      <ModelUnavailable
        fileName="leaf_photo.jpg"
        imagePreviewUrl="blob:preview"
        onReset={onReset}
      />
    );

    expect(screen.getByText(/prediction model unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/diagnostic service is currently offline/i)).toBeInTheDocument();
    expect(screen.getByText('leaf_photo.jpg')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /try another image/i });
    fireEvent.click(btn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
