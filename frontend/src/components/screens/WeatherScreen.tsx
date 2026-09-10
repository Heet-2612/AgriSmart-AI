import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  Loader2,
  MapPin,
  RefreshCw,
  Droplets,
  Wind,
  Gauge,
  Eye,
  Calendar,
  Thermometer,
  CloudRain as RainIcon,
  Sunrise,
  Sunset
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { fetchCurrentWeather, fetchWeatherForecast, getWeatherIconUrl } from "@/services/weatherService";
import { useLocation } from "react-router-dom";

interface WeatherData {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    temp_min: number;
    temp_max: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  pop?: number;
  sunrise?: number;
  sunset?: number;
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const WeatherScreen = () => {
  const { t } = useLanguage();
  const { state } = useLocation();
  const location = state?.location || { city: 'Ahmedabad', state: 'Gujarat' };

  const [weatherData, setWeatherData] = useState<{
    current: WeatherData | null;
    forecast: WeatherData[];
  }>({ current: null, forecast: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{message: string; details?: string} | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Function to fetch weather data
  const fetchWeather = async () => {
    if (!location) {
      setError({ message: 'Location not set' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Default to Ahmedabad coordinates
      const lat = 23.0225;
      const lon = 72.5714;

      console.log('Fetching weather data...');
      const [current, forecastData] = await Promise.all([
        fetchCurrentWeather(lat, lon).catch(err => {
          console.error('Error in fetchCurrentWeather:', err);
          throw new Error(`Failed to fetch current weather: ${err.message}`);
        }),
        fetchWeatherForecast(lat, lon).catch(err => {
          console.error('Error in fetchWeatherForecast:', err);
          throw new Error(`Failed to fetch forecast: ${err.message}`);
        })
      ]);

      console.log('Weather data received:', { current, forecast: forecastData.list });

      setWeatherData({
        current: current,
        forecast: forecastData.list
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error in fetchWeather:', err);
      setError({
        message: 'Failed to load weather data',
        details: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch weather data when component mounts
  useEffect(() => {
    fetchWeather();
  }, [location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading weather data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive text-lg font-medium mb-2">{error.message}</p>
        {error.details && (
          <p className="text-muted-foreground text-sm mb-4">
            {error.details}
          </p>
        )}
        <Button onClick={fetchWeather} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <div className="mt-4 p-4 bg-muted/50 rounded-md text-left">
          <h4 className="font-medium mb-2">Troubleshooting:</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Check your internet connection</li>
            <li>Verify your OpenWeatherMap API key is set in the .env file</li>
            <li>Make sure the API key has access to the One Call API</li>
          </ul>
        </div>
      </div>
    );
  }

  const { current, forecast } = weatherData;

  return (
    <div className="space-y-6">
      {/* Location and Last Updated */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          <h2 className="text-2xl font-bold">
            {location.city}, {location.state}
          </h2>
        </div>
        {lastUpdated && (
          <div className="text-sm text-muted-foreground mt-2 md:mt-0">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Current Weather */}
      {current && (
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center">
              <div className="text-5xl font-bold mb-2">
                {Math.round(current.main.temp)}°C
              </div>
              <div className="text-lg capitalize">
                {current.weather[0]?.description}
              </div>
              <div className="flex items-center mt-2">
                <Thermometer className="h-4 w-4 mr-1" />
                <span>Feels like {Math.round(current.main.feels_like)}°C</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              {current.weather[0]?.icon && (
                <img
                  src={getWeatherIconUrl(current.weather[0].icon)}
                  alt={current.weather[0].description}
                  className="h-24 w-24"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <Droplets className="h-5 w-5 mb-1" />
                <span className="text-sm">Humidity</span>
                <span className="font-medium">{current.main.humidity}%</span>
              </div>
              <div className="flex flex-col items-center">
                <Wind className="h-5 w-5 mb-1" />
                <span className="text-sm">Wind</span>
                <span className="font-medium">{current.wind.speed} m/s</span>
              </div>
              <div className="flex flex-col items-center">
                <Gauge className="h-5 w-5 mb-1" />
                <span className="text-sm">Pressure</span>
                <span className="font-medium">{current.main.pressure} hPa</span>
              </div>
              {current.pop !== undefined && (
                <div className="flex flex-col items-center">
                  <RainIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">Precipitation</span>
                  <span className="font-medium">{Math.round(current.pop * 100)}%</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 7-Day Forecast */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          7-Day Forecast
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
          {forecast.map((day, index) => (
            <Card key={day.dt} className="p-4 flex flex-col items-center">
              <div className="font-medium text-center">
                {index === 0 ? 'Today' : formatDate(day.dt).split(',')[0]}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {formatDate(day.dt).split(',').slice(1).join(',').trim()}
              </div>

              {day.weather[0]?.icon && (
                <img
                  src={getWeatherIconUrl(day.weather[0].icon)}
                  alt={day.weather[0].description}
                  className="h-16 w-16 my-2"
                />
              )}

              <div className="flex space-x-2 mt-2">
                <span className="font-medium">{Math.round(day.main.temp_max)}°</span>
                <span className="text-muted-foreground">{Math.round(day.main.temp_min)}°</span>
              </div>

              <div className="text-sm text-muted-foreground text-center mt-2">
                {day.weather[0]?.description}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-xs w-full">
                <div className="flex items-center">
                  <Droplets className="h-3 w-3 mr-1" />
                  <span>{day.main.humidity}%</span>
                </div>
                <div className="flex items-center">
                  <Wind className="h-3 w-3 mr-1" />
                  <span>{day.wind.speed} m/s</span>
                </div>
                {day.pop !== undefined && (
                  <div className="flex items-center col-span-2 justify-center">
                    <RainIcon className="h-3 w-3 mr-1" />
                    <span>{Math.round(day.pop * 100)}% chance of rain</span>
                  </div>
                )}
              </div>

              {day.sunrise && day.sunset && (
                <div className="flex justify-between w-full mt-3 text-xs">
                  <div className="flex flex-col items-center">
                    <Sunrise className="h-4 w-4 text-amber-500" />
                    <span>{formatTime(day.sunrise)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Sunset className="h-4 w-4 text-amber-700" />
                    <span>{formatTime(day.sunset)}</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button onClick={fetchWeather} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
};