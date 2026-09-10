// Debug: Check if environment variables are loading
console.log('Environment Variables:', {
  VITE_OPENWEATHER_API_KEY: import.meta.env.VITE_OPENWEATHER_API_KEY ? '***' + String(import.meta.env.VITE_OPENWEATHER_API_KEY).slice(-4) : 'Not found',
  NODE_ENV: import.meta.env.MODE,
  BASE_URL: 'https://api.openweathermap.org/data/2.5'
});

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Default coordinates for Ahmedabad
const DEFAULT_LAT = 23.0225;
const DEFAULT_LON = 72.5714;

// Cache for API responses
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

// Common function to make API requests with caching
const fetchWithCache = async (url: string, cacheKey: string) => {
  const now = Date.now();

  // Return cached data if it exists and is not expired
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_DURATION)) {
    console.log('Returning cached data for:', cacheKey);
    return cache[cacheKey].data;
  }

  try {
    console.log('Fetching from API:', url.replace(API_KEY, '***'));
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();

    // Cache the response
    cache[cacheKey] = {
      data,
      timestamp: now
    };

    return data;
  } catch (error) {
    console.error('API request failed:', error);

    // If there's a cached version, return it even if it's expired
    if (cache[cacheKey]) {
      console.log('API request failed, returning stale cache for:', cacheKey);
      return cache[cacheKey].data;
    }

    throw error;
  }
};

export interface WeatherData {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    temp_min: number;
    temp_max: number;
    sea_level?: number;
    grnd_level?: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  visibility?: number;
  pop?: number;
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  snow?: {
    '1h'?: number;
    '3h'?: number;
  };
  clouds?: {
    all: number;
  };
  dt_txt?: string;
  sys?: {
    pod?: string;
    country?: string;
    sunrise?: number;
    sunset?: number;
  };
  timezone?: number;
  name?: string;
}

export const fetchCurrentWeather = async (lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<WeatherData> => {
  if (!API_KEY) {
    throw new Error('OpenWeatherMap API key is not configured');
  }

  const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const cacheKey = `weather_${lat}_${lon}`;

  return fetchWithCache(url, cacheKey);
};

export const fetchWeatherForecast = async (lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON) => {
  if (!API_KEY) {
    throw new Error('OpenWeatherMap API key is not configured');
  }

  // Using the One Call API 3.0 for better forecast data
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${API_KEY}&units=metric`;
  const cacheKey = `forecast_${lat}_${lon}`;

  const data = await fetchWithCache(url, cacheKey);

  // Transform the data to match the expected format
  return {
    list: data.daily.map((day: any) => ({
      dt: day.dt,
      main: {
        temp: day.temp.day,
        feels_like: day.feels_like.day,
        temp_min: day.temp.min,
        temp_max: day.temp.max,
        pressure: day.pressure,
        humidity: day.humidity,
        sea_level: day.pressure,
        grnd_level: day.pressure
      },
      weather: day.weather,
      wind: {
        speed: day.wind_speed,
        deg: day.wind_deg,
        gust: day.wind_gust
      },
      pop: day.pop,
      rain: day.rain ? { '1h': day.rain } : undefined,
      snow: day.snow ? { '1h': day.snow } : undefined,
      clouds: { all: day.clouds },
      sunrise: day.sunrise,
      sunset: day.sunset,
      sys: {
        country: data.timezone,
        sunrise: day.sunrise,
        sunset: day.sunset
      },
      timezone: data.timezone_offset,
      name: data.timezone ? data.timezone.split('/')[1]?.replace('_', ' ') : 'Unknown Location'
    }))
  };
};

export const getWeatherIconUrl = (iconCode: string, size: 'small' | 'medium' | 'large' = 'medium'): string => {
  if (!iconCode) {
    console.warn('No icon code provided, using default icon');
    return 'https://openweathermap.org/img/wn/01d@2x.png';
  }

  const sizes = {
    small: '',
    medium: '@2x',
    large: '@4x'
  };

  return `https://openweathermap.org/img/wn/${iconCode}${sizes[size]}.png`;
};

// Test function to verify API connectivity
export const testWeatherAPI = async (lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON) => {
  try {
    console.log('Testing weather API...');

    if (!API_KEY) {
      throw new Error('API key is not set in environment variables');
    }

    const [current, forecast] = await Promise.all([
      fetchCurrentWeather(lat, lon),
      fetchWeatherForecast(lat, lon)
    ]);

    return {
      success: true,
      message: `API is working! Current weather: ${current.weather[0]?.description}, ${Math.round(current.main.temp)}°C`,
      current,
      forecast
    };
  } catch (error) {
    console.error('Weather API test failed:', error);
    return {
      success: false,
      message: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
