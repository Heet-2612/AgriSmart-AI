import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SustainabilityScore } from './SustainabilityScore';

describe('Deterministic SustainabilityScore UI Component', () => {
  it('renders default farm condition inputs and initial score of 82', () => {
    render(<SustainabilityScore />);

    // Default inputs
    expect(screen.getByLabelText(/Target Crop Name/i)).toHaveValue('Tomato');
    expect(screen.getByLabelText(/Farm Area/i)).toHaveValue(0.1);
    expect(screen.getByLabelText(/Soil Moisture/i)).toHaveValue(31);
    expect(screen.getByLabelText(/Rain Probability/i)).toHaveValue(65);
    expect(screen.getByLabelText(/Expected Rainfall/i)).toHaveValue(8);
    expect(screen.getByLabelText(/Temperature/i)).toHaveValue(29);
    expect(screen.getByLabelText(/Humidity/i)).toHaveValue(72);

    // Initial score and badges
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getAllByText('Excellent').length).toBeGreaterThan(0);
    expect(screen.getByText(/💧 \+180 Litres Saved/i)).toBeInTheDocument();
  });

  it('preserves previous evaluated result when draft inputs are edited without clicking Calculate', () => {
    render(<SustainabilityScore />);

    const moistureInput = screen.getByLabelText(/Soil Moisture/i);
    const rainProbInput = screen.getByLabelText(/Rain Probability/i);

    // Initial evaluated score is 82
    expect(screen.getByText('82')).toBeInTheDocument();

    // Edit draft fields
    fireEvent.change(moistureInput, { target: { value: '10' } });
    fireEvent.change(rainProbInput, { target: { value: '0' } });

    // Evaluated score remains unchanged at 82
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText(/💧 31%/i)).toBeInTheDocument(); // Context bar still shows 31%
  });

  it('keeps previous evaluated result when Calculate is clicked with invalid inputs', () => {
    render(<SustainabilityScore />);

    const areaInput = screen.getByLabelText(/Farm Area/i);
    const moistureInput = screen.getByLabelText(/Soil Moisture/i);
    const rainfallInput = screen.getByLabelText(/Expected Rainfall/i);
    const calculateBtn = screen.getByRole('button', { name: /Calculate Sustainability Score/i });

    // Set invalid inputs
    fireEvent.change(areaInput, { target: { value: '0' } });
    fireEvent.change(moistureInput, { target: { value: '150' } });
    fireEvent.change(rainfallInput, { target: { value: '-5' } });

    fireEvent.click(calculateBtn);

    // Displays validation error messages
    expect(screen.getByText(/Farm area must be greater than 0 hectares/i)).toBeInTheDocument();
    expect(screen.getByText(/Soil moisture must be between 0% and 100%/i)).toBeInTheDocument();
    expect(screen.getByText(/Expected rainfall cannot be negative/i)).toBeInTheDocument();

    // Evaluated score is preserved at 82
    expect(screen.getByText('82')).toBeInTheDocument();
  });

  it('updates score, water impact, and breakdown when valid custom conditions are submitted', () => {
    render(<SustainabilityScore />);

    const cropInput = screen.getByLabelText(/Target Crop Name/i);
    const areaInput = screen.getByLabelText(/Farm Area/i);
    const moistureInput = screen.getByLabelText(/Soil Moisture/i);
    const rainProbInput = screen.getByLabelText(/Rain Probability/i);
    const rainfallInput = screen.getByLabelText(/Expected Rainfall/i);
    const calculateBtn = screen.getByRole('button', { name: /Calculate Sustainability Score/i });

    // Enter dry conditions without rain on 0.5 ha Wheat plot
    fireEvent.change(cropInput, { target: { value: 'Wheat' } });
    fireEvent.change(areaInput, { target: { value: '0.5' } });
    fireEvent.change(moistureInput, { target: { value: '15' } });
    fireEvent.change(rainProbInput, { target: { value: '10' } });
    fireEvent.change(rainfallInput, { target: { value: '0' } });

    fireEvent.click(calculateBtn);

    // Active scenario context bar reflects updated values
    expect(screen.getByText(/🌱 Wheat/i)).toBeInTheDocument();
    expect(screen.getByText(/📐 0.5 Ha/i)).toBeInTheDocument();

    // Water impact scaled to 0.5 ha = 900 Litres
    expect(screen.getByText(/💧 \+900 Litres Saved/i)).toBeInTheDocument();

    // Recommendation updated for dry conditions
    expect(screen.getByText(/Irrigate now\. Soil moisture is low and no significant rain is forecasted\./i)).toBeInTheDocument();
  });

  it('resets form and score when Reset Demo Values is clicked', () => {
    render(<SustainabilityScore />);

    const cropInput = screen.getByLabelText(/Target Crop Name/i);
    const resetBtn = screen.getByRole('button', { name: /Reset Demo Values/i });

    fireEvent.change(cropInput, { target: { value: 'Corn' } });
    expect(cropInput).toHaveValue('Corn');

    fireEvent.click(resetBtn);

    expect(screen.getByLabelText(/Target Crop Name/i)).toHaveValue('Tomato');
    expect(screen.getByText('82')).toBeInTheDocument();
  });
});
