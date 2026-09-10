import { useState, useEffect } from 'react';
import { getCropRecommendation } from '../services/chatService';
import { fetchCurrentWeather } from '../services/weatherService';
import { indianStates, State } from '../data/indianStatesAndCities';
console.log('Environment:', import.meta.env);
const SOIL_TYPES = ['Sandy Loam', 'Clay', 'Loamy', 'Alluvial', 'Black', 'Red'];

export const CropAdvice = () => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [soilType, setSoilType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    recommendations: Array<{
      crop: string;
      advice: string;
      conditions?: any;
    }>;
    weather?: {
      temp: number;
      humidity: number;
      condition: string;
    };
  } | null>(null);
  const [error, setError] = useState('');
  // Removed debug state as it's no longer needed

  // Update available cities when state changes
  useEffect(() => {
    if (selectedState) {
      const state = indianStates.find(s => s.name === selectedState);
      setAvailableCities(state?.cities || []);
      setSelectedCity(''); // Reset city when state changes
    } else {
      setAvailableCities([]);
      setSelectedCity('');
    }
  }, [selectedState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset previous errors and results
    setError('');
    setResult(null);

    try {
      // Validate all fields
      if (!selectedState) throw new Error('Please select a state');
      if (!selectedCity) throw new Error('Please select a city');
      if (!soilType) throw new Error('Please select a soil type');

      setIsLoading(true);

      // 1. First get coordinates for the city
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(selectedCity)},${encodeURIComponent(selectedState)},IN&limit=1&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}`;

      const geoResponse = await fetch(geoUrl);

      if (!geoResponse.ok) {
        const errorText = await geoResponse.text();
        throw new Error(`Failed to get location data (${geoResponse.status})`);
      }

      const locationData = await geoResponse.json();

      if (!locationData || locationData.length === 0) {
        throw new Error('No location data found for the specified city and state.');
      }

      const { lat, lon } = locationData[0];

      // 2. Get weather data
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}`;
      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        const errorText = await weatherResponse.text();
        throw new Error(`Failed to get weather data (${weatherResponse.status})`);
      }

      const weatherData = await weatherResponse.json();

      // 3. Get crop recommendation

      try {
        const recommendation = await getCropRecommendation(selectedCity, soilType);
        console.log('Recommendation response:', recommendation); // Debug log

        if (recommendation?.error) {
          throw new Error(`Crop recommendation error: ${recommendation.error}`);
        }

        // 4. If everything is successful, set the result
        // Check if we have a direct recommendation or an array of recommendations
        const recommendations = Array.isArray(recommendation) 
          ? recommendation 
          : recommendation?.recommendations || [];

        if (recommendations.length > 0) {
          setResult({
            recommendations: recommendations.map((rec: any) => ({
              crop: rec.crop || 'No specific recommendation',
              advice: rec.advice || 'Please consult with a local agricultural expert for more specific advice.',
              conditions: rec.conditions || {
                weather: rec.weather?.condition,
                temperature: rec.weather?.temperature,
                soil: rec.soil || soilType
              }
            })),
            weather: {
              temp: weatherData.main.temp,
              humidity: weatherData.main.humidity,
              condition: weatherData.weather[0]?.main || 'Unknown'
            }
          });
        } else {
          // Fallback if no recommendations are found
          setResult({
            recommendations: [{
              crop: 'No specific recommendation',
              advice: 'No specific crop recommendations found for the given location and conditions. Please consult with a local agricultural expert.'
            }],
            weather: {
              temp: weatherData.main.temp,
              humidity: weatherData.main.humidity,
              condition: weatherData.weather[0]?.main || 'Unknown'
            }
          });
        }

        // Success - no debug info needed
      } catch (recommendationError) {
        const errorMessage = recommendationError instanceof Error
          ? recommendationError.message
          : 'Unknown error in crop recommendation';
        throw recommendationError;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Error: ${errorMessage}`);
      console.error('Error in handleSubmit:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Crop Advice</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* State Selection */}
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            Select State <span className="text-red-500">*</span>
          </label>
          <select
            id="state"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="">-- Select State --</option>
            {indianStates.map((state) => (
              <option key={state.name} value={state.name}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        {/* City Selection */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            Select City <span className="text-red-500">*</span>
          </label>
          <select
            id="city"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
            disabled={!selectedState}
            required
          >
            <option value="">-- Select City --</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Soil Type Selection */}
        <div>
          <label htmlFor="soilType" className="block text-sm font-medium text-gray-700 mb-1">
            Select Soil Type <span className="text-red-500">*</span>
          </label>
          <select
            id="soilType"
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="">-- Select Soil Type --</option>
            {SOIL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 text-red-700 bg-red-100 rounded-md">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Getting Advice...' : 'Get Crop Advice'}
        </button>
      </form>

      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-green-800 mb-4">Recommended Crops:</h3>
          
          <div className="space-y-4">
            {result.recommendations.map((rec, index) => (
              <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-medium text-green-800">
                  {index + 1}. {rec.crop}
                </h4>
                <p className="mt-2 text-green-700">{rec.advice}</p>
                {rec.conditions && (
                  <div className="mt-2 text-sm text-green-600">
                    <p><span className="font-medium">Conditions:</span> {rec.conditions.weather} at {rec.conditions.temperature}</p>
                    <p><span className="font-medium">Soil:</span> {rec.conditions.soil}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {result.weather && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="font-medium text-blue-800">Current Weather:</h4>
              <p className="text-blue-700">
                {result.weather.condition}, {Math.round(result.weather.temp - 273.15)}°C
              </p>
              <p className="text-blue-700">Humidity: {result.weather.humidity}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
