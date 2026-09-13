import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CropRecommendationPage } from '../pages/CropRecommendationPage';
import * as client from '../api/client';
import {
  INDIAN_STATES,
  getDistrictsForState,
  searchStates,
  searchDistricts,
  isValidDistrictForState,
} from '../data/indianLocations';

// Mock API clients
vi.mock('../api/client', () => ({
  recommendCrop: vi.fn(),
  getWeather: vi.fn(),
  getSeasonalClimate: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

describe('Standardized Indian Locations Dataset & Utilities', () => {
  it('loads alphabetically sorted list of Indian states', () => {
    expect(INDIAN_STATES.length).toBeGreaterThanOrEqual(20);
    expect(INDIAN_STATES).toContain('Gujarat');
    expect(INDIAN_STATES).toContain('Maharashtra');
    expect(INDIAN_STATES).toContain('Punjab');
    expect(INDIAN_STATES).toContain('Rajasthan');

    // Check alphabetical order
    const sortedCopy = [...INDIAN_STATES].sort((a, b) => a.localeCompare(b));
    expect(INDIAN_STATES).toEqual(sortedCopy);
  });

  it('filters states dynamically by query with case-insensitivity', () => {
    const gujResults = searchStates('guj');
    expect(gujResults).toContain('Gujarat');
    expect(gujResults[0]).toBe('Gujarat');

    const mahResults = searchStates('mah');
    expect(mahResults).toContain('Maharashtra');

    const emptyResults = searchStates('');
    expect(emptyResults.length).toBe(INDIAN_STATES.length);
  });

  it('filters districts based on selected state with alphabetical sorting', () => {
    const gujaratDistricts = getDistrictsForState('Gujarat');
    expect(gujaratDistricts.length).toBeGreaterThanOrEqual(15);
    expect(gujaratDistricts).toContain('Ahmedabad');
    expect(gujaratDistricts).toContain('Surat');
    expect(gujaratDistricts).toContain('Vadodara');
    expect(gujaratDistricts).toContain('Rajkot');

    // Check alphabetical order
    const sortedGujarat = [...gujaratDistricts].sort((a, b) => a.localeCompare(b));
    expect(gujaratDistricts).toEqual(sortedGujarat);

    const maharashtraDistricts = getDistrictsForState('Maharashtra');
    expect(maharashtraDistricts).toContain('Pune');
    expect(maharashtraDistricts).toContain('Nagpur');
    expect(maharashtraDistricts).not.toContain('Ahmedabad');
  });

  it('searches districts with case-insensitive prefix and substring matching', () => {
    const ahmResults = searchDistricts('Gujarat', 'ahm');
    expect(ahmResults).toContain('Ahmedabad');
    expect(ahmResults[0]).toBe('Ahmedabad');

    const vadResults = searchDistricts('Gujarat', 'vad');
    expect(vadResults).toContain('Vadodara');
  });

  it('validates state and district membership accurately', () => {
    expect(isValidDistrictForState('Gujarat', 'Ahmedabad')).toBe(true);
    expect(isValidDistrictForState('Gujarat', 'ahmedabad')).toBe(true); // case-insensitive
    expect(isValidDistrictForState('Gujarat', 'Pune')).toBe(false);
    expect(isValidDistrictForState('Maharashtra', 'Pune')).toBe(true);
    expect(isValidDistrictForState('Maharashtra', 'Ahmedabad')).toBe(false);
    expect(isValidDistrictForState('', 'Ahmedabad')).toBe(false);
  });
});

describe('Searchable Dropdown Location Input UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders State and District searchable dropdowns with District initially disabled', () => {
    render(<CropRecommendationPage onBack={vi.fn()} />);

    const stateInput = screen.getByLabelText(/state/i);
    const districtInput = screen.getByLabelText(/district/i);

    expect(stateInput).toBeInTheDocument();
    expect(stateInput).toBeEnabled();
    expect(stateInput).toHaveAttribute('placeholder', expect.stringMatching(/search state/i));

    expect(districtInput).toBeInTheDocument();
    expect(districtInput).toBeDisabled();
    expect(districtInput).toHaveAttribute('placeholder', expect.stringMatching(/select state first/i));
  });

  it('dynamically filters state options as farmer types', async () => {
    render(<CropRecommendationPage onBack={vi.fn()} />);

    const stateInput = screen.getByLabelText(/state/i);
    fireEvent.focus(stateInput);
    fireEvent.change(stateInput, { target: { value: 'mah' } });

    // Maharashtra option should appear in dropdown listbox
    const listbox = await screen.findByTestId('state-input-listbox');
    expect(listbox).toBeInTheDocument();
    expect(within(listbox).getByText('Maharashtra')).toBeInTheDocument();
    expect(within(listbox).queryByText('Gujarat')).not.toBeInTheDocument();
  });

  it('enables District dropdown after State is selected and shows state-specific districts', async () => {
    render(<CropRecommendationPage onBack={vi.fn()} />);

    const stateInput = screen.getByLabelText(/state/i);
    fireEvent.focus(stateInput);
    fireEvent.change(stateInput, { target: { value: 'guj' } });

    const listbox = await screen.findByTestId('state-input-listbox');
    const gujaratOption = within(listbox).getByText('Gujarat');
    fireEvent.click(gujaratOption);

    // State is selected and standardized
    expect((stateInput as HTMLInputElement).value).toBe('Gujarat');

    // District input is now enabled
    const districtInput = screen.getByLabelText(/district/i);
    expect(districtInput).toBeEnabled();

    // Open district dropdown
    fireEvent.focus(districtInput);
    const districtListbox = await screen.findByTestId('district-input-listbox');

    // Shows Gujarat districts
    expect(within(districtListbox).getByText('Ahmedabad')).toBeInTheDocument();
    expect(within(districtListbox).getByText('Surat')).toBeInTheDocument();
    expect(within(districtListbox).getByText('Vadodara')).toBeInTheDocument();
    expect(within(districtListbox).queryByText('Pune')).not.toBeInTheDocument();
  });

  it('dynamically filters districts when typing and standardizes on selection', async () => {
    render(<CropRecommendationPage onBack={vi.fn()} />);

    // Select State: Maharashtra
    const stateInput = screen.getByLabelText(/state/i);
    fireEvent.change(stateInput, { target: { value: 'Maharashtra' } });

    const districtInput = screen.getByLabelText(/district/i);
    expect(districtInput).toBeEnabled();

    // Type "pun" in district
    fireEvent.focus(districtInput);
    fireEvent.change(districtInput, { target: { value: 'pun' } });

    const districtListbox = await screen.findByTestId('district-input-listbox');
    expect(within(districtListbox).getByText('Pune')).toBeInTheDocument();
    expect(within(districtListbox).queryByText('Nagpur')).not.toBeInTheDocument();

    // Click Pune
    fireEvent.click(within(districtListbox).getByText('Pune'));
    expect((districtInput as HTMLInputElement).value).toBe('Pune');
  });

  it('clears invalid district when farmer changes to another state', async () => {
    render(<CropRecommendationPage onBack={vi.fn()} />);

    const stateInput = screen.getByLabelText(/state/i);
    const districtInput = screen.getByLabelText(/district/i);

    // Select Gujarat -> Ahmedabad
    fireEvent.change(stateInput, { target: { value: 'Gujarat' } });
    fireEvent.change(districtInput, { target: { value: 'Ahmedabad' } });
    expect((districtInput as HTMLInputElement).value).toBe('Ahmedabad');

    // Switch state to Punjab (Ahmedabad does not exist in Punjab)
    fireEvent.change(stateInput, { target: { value: 'Punjab' } });
    expect((districtInput as HTMLInputElement).value).toBe('');
  });

  it('validates invalid state-district combination before submission', async () => {
    render(<CropRecommendationPage onBack={vi.fn()} />);

    const stateInput = screen.getByLabelText(/state/i);
    const districtInput = screen.getByLabelText(/district/i);

    // Enter Gujarat state and manually enter non-Gujarat district
    fireEvent.change(stateInput, { target: { value: 'Gujarat' } });
    fireEvent.change(districtInput, { target: { value: 'Pune' } });

    fireEvent.change(screen.getByLabelText(/temperature/i), { target: { value: '28' } });
    fireEvent.change(screen.getByLabelText(/humidity/i), { target: { value: '65' } });
    fireEvent.change(screen.getByLabelText(/rainfall/i), { target: { value: '750' } });
    fireEvent.change(screen.getByLabelText(/soil type/i), { target: { value: 'black' } });
    fireEvent.change(screen.getByLabelText(/previous crop/i), { target: { value: 'cotton' } });

    fireEvent.click(screen.getByRole('button', { name: /recommend crop/i }));

    // Expect invalid district-state validation error
    expect(
      await screen.findByText(/selected district does not belong to gujarat/i)
    ).toBeInTheDocument();
    expect(client.recommendCrop).not.toHaveBeenCalled();
  });

  it('successfully auto-fetches weather and climate for selected state and district', async () => {
    const mockWeather = {
      location: { name: 'Ahmedabad', country: 'India', latitude: 23.02, longitude: 72.58, state: 'Gujarat', district: 'Ahmedabad' },
      current: { temperature: 31.5, humidity: 62.0, wind_speed: 12.0, weather_code: 80, condition: 'Rain showers' },
      daily: { temp_min: 25.0, temp_max: 33.0, precipitation_sum: 12.0, precipitation_probability: 80 },
      climate: { season: 'Kharif', region: 'West', temperature_mean: 31.0, humidity_mean: 72.0, rainfall_normal: 546.0, soil_type_default: 'alluvial' },
      advisories: ['Moderate rain expected today.'],
    };

    vi.mocked(client.getWeather).mockResolvedValueOnce(mockWeather);

    render(<CropRecommendationPage onBack={vi.fn()} />);

    const stateInput = screen.getByLabelText(/state/i);
    const districtInput = screen.getByLabelText(/district/i);

    fireEvent.change(stateInput, { target: { value: 'Gujarat' } });
    fireEvent.change(districtInput, { target: { value: 'Ahmedabad' } });

    const fetchBtn = screen.getByRole('button', { name: /auto-fetch weather and climate data for location/i });
    fireEvent.click(fetchBtn);

    await waitFor(() => {
      expect(client.getWeather).toHaveBeenCalledWith('Ahmedabad');
    });

    const weatherCard = await screen.findByRole('region', { name: /live weather intelligence/i });
    expect(weatherCard).toBeInTheDocument();
    expect(within(weatherCard).getByText(/Live Weather • Ahmedabad, India/i)).toBeInTheDocument();

    // Populates seasonal climate values
    expect((screen.getByLabelText(/temperature/i) as HTMLInputElement).value).toBe('31');
    expect((screen.getByLabelText(/humidity/i) as HTMLInputElement).value).toBe('72');
    expect((screen.getByLabelText(/rainfall/i) as HTMLInputElement).value).toBe('546');
  });
});
