import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiagnosisResult } from '../components/diagnosis/DiagnosisResult';
import { getRotationCropForDiagnosis } from '../pages/DiagnosePage';
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

describe('Diagnosis to Crop Rotation Semantic Handoff (getRotationCropForDiagnosis)', () => {
  it('maps diagnosed potato diseases to previous_crop = potato', () => {
    expect(getRotationCropForDiagnosis('Potato Early Blight')).toBe('potato');
    expect(getRotationCropForDiagnosis('Potato Late Blight')).toBe('potato');
    expect(getRotationCropForDiagnosis('Potato Healthy')).toBe('potato');
    expect(getRotationCropForDiagnosis('Potato___Early_blight')).toBe('potato');
  });

  it('maps diagnosed corn/maize diseases to previous_crop = maize', () => {
    expect(getRotationCropForDiagnosis('Corn Gray Leaf Spot')).toBe('maize');
    expect(getRotationCropForDiagnosis('Corn Healthy')).toBe('maize');
    expect(getRotationCropForDiagnosis('Corn_(maize)___healthy')).toBe('maize');
  });

  it('maps diagnosed tomato diseases to previous_crop = tomato', () => {
    expect(getRotationCropForDiagnosis('Tomato Yellow Leaf Curl Virus')).toBe('tomato');
    expect(getRotationCropForDiagnosis('Tomato Healthy')).toBe('tomato');
    expect(getRotationCropForDiagnosis('Tomato___healthy')).toBe('tomato');
  });

  it('maps diagnosed apple diseases to previous_crop = apple', () => {
    expect(getRotationCropForDiagnosis('Apple Scab')).toBe('apple');
    expect(getRotationCropForDiagnosis('Apple Cedar Rust')).toBe('apple');
    expect(getRotationCropForDiagnosis('Apple Healthy')).toBe('apple');
  });

  it('falls back to normalized userCrop when disease class is unavailable', () => {
    expect(getRotationCropForDiagnosis('', 'Potato')).toBe('potato');
    expect(getRotationCropForDiagnosis(undefined, 'Corn (Maize)')).toBe('maize');
    expect(getRotationCropForDiagnosis(undefined, 'Tomato')).toBe('tomato');
    expect(getRotationCropForDiagnosis(undefined, 'Apple')).toBe('apple');
    expect(getRotationCropForDiagnosis(undefined, 'Rice')).toBe('rice');
    expect(getRotationCropForDiagnosis(undefined, 'Wheat')).toBe('wheat');
  });

  it('falls back to wheat when neither disease class nor userCrop is available', () => {
    expect(getRotationCropForDiagnosis(undefined, undefined)).toBe('wheat');
    expect(getRotationCropForDiagnosis('', '')).toBe('wheat');
  });

  it('renders Plan Crop Rotation button and triggers callback when provided', () => {
    const onReset = vi.fn();
    const onPlanRotation = vi.fn();
    render(
      <DiagnosisResult
        result={{
          predicted_class: 'Potato Early Blight',
          display_name: 'Potato - Early Blight',
          confidence: 0.95,
          model_version: 'E11-SigLIP-HYBRID10-PRODUCTION',
        }}
        onReset={onReset}
        onPlanRotation={onPlanRotation}
      />
    );

    const planBtn = screen.getByRole('button', { name: /plan crop rotation for this field/i });
    expect(planBtn).toBeInTheDocument();
    fireEvent.click(planBtn);
    expect(onPlanRotation).toHaveBeenCalledTimes(1);
  });
});

describe('Diagnosis Safety Hardening (Inconclusive / Uncertainty Gate UI)', () => {
  it('renders amber inconclusive advisory and badge when is_conclusive is false', () => {
    const onReset = vi.fn();
    render(
      <DiagnosisResult
        result={{
          predicted_class: 'Potato Early Blight',
          display_name: 'Potato - Early Blight',
          confidence: 0.42,
          model_version: 'E11-SigLIP-HYBRID10-PRODUCTION',
          is_conclusive: false,
          status: 'inconclusive',
        }}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Inconclusive Diagnosis')).toBeInTheDocument();
    expect(screen.getByText(/Inconclusive \/ Unrecognized Crop Leaf/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to confidently identify a supported crop leaf/i)).toBeInTheDocument();
  });

  it('hides Plan Crop Rotation button when is_conclusive is false', () => {
    const onReset = vi.fn();
    const onPlanRotation = vi.fn();
    render(
      <DiagnosisResult
        result={{
          predicted_class: 'Potato Early Blight',
          display_name: 'Potato - Early Blight',
          confidence: 0.42,
          model_version: 'E11-SigLIP-HYBRID10-PRODUCTION',
          is_conclusive: false,
          status: 'inconclusive',
        }}
        onReset={onReset}
        onPlanRotation={onPlanRotation}
      />
    );

    const planBtn = screen.queryByRole('button', { name: /plan crop rotation for this field/i });
    expect(planBtn).not.toBeInTheDocument();
  });

  it('renders Plan Crop Rotation button and green badge when is_conclusive is true', () => {
    const onReset = vi.fn();
    const onPlanRotation = vi.fn();
    render(
      <DiagnosisResult
        result={{
          predicted_class: 'Potato Early Blight',
          display_name: 'Potato - Early Blight',
          confidence: 0.95,
          model_version: 'E11-SigLIP-HYBRID10-PRODUCTION',
          is_conclusive: true,
          status: 'confident',
        }}
        onReset={onReset}
        onPlanRotation={onPlanRotation}
      />
    );

    expect(screen.getByText('Diagnosis Output')).toBeInTheDocument();
    expect(screen.queryByText(/Inconclusive \/ Unrecognized Crop Leaf/i)).not.toBeInTheDocument();
    const planBtn = screen.getByRole('button', { name: /plan crop rotation for this field/i });
    expect(planBtn).toBeInTheDocument();
  });
});
