import { Card } from "@/components/ui/card";
import { Loader2, Thermometer, Droplets, Wind, Gauge, Eye } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { fetchCurrentWeather, getWeatherIconUrl, type WeatherData } from "@/services/weatherService";
import { useLocationContext } from "@/components/AppLayout";

// City to coordinates mapping
const cityCoordinates: Record<string, { lat: number; lon: number }> = {
  'Ahmedabad': { lat: 23.0225, lon: 72.5714 },
  'Mumbai': { lat: 19.0760, lon: 72.8777 },
  'Delhi': { lat: 28.6139, lon: 77.2090 },
  'Bangalore': { lat: 12.9716, lon: 77.5946 },
  'Chennai': { lat: 13.0827, lon: 80.2707 },
  'Kolkata': { lat: 22.5726, lon: 88.3639 },
  'Hyderabad': { lat: 17.3850, lon: 78.4867 },
  'Pune': { lat: 18.5204, lon: 73.8567 },
  'Jaipur': { lat: 26.9124, lon: 75.7873 },
  'Surat': { lat: 21.1702, lon: 72.8311 },
};

export const WeatherCard = () => {
  const { t, language } = useLanguage();
  const { location } = useLocationContext();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async () => {
      if (!location) {
        console.log('No location available');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get coordinates for the selected city
        const coords = cityCoordinates[location.city] || { lat: 23.0225, lon: 72.5714 };

        console.log('Fetching weather for:', {
          city: location.city,
          state: location.state,
          coords
        });

        const data = await fetchCurrentWeather(coords.lat, coords.lon);
        console.log('Weather data received:', data);

        if (isMounted) {
          if (!data || !data.main || !data.weather) {
            throw new Error('Invalid weather data received from API');
          }
          setWeatherData(data);
        }
      } catch (err) {
        console.error('Error fetching weather:', err);
        if (isMounted) {
          setError(t('weatherFetchError') || 'Failed to fetch weather data. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      isMounted = false;
    };
  }, [location, t]);

  if (!location) {
    return (
      <Card className="p-4 bg-white/10 backdrop-blur-sm border-0">
        <div className="text-center py-4 text-muted-foreground">
          {t('selectLocationToSeeWeather') || 'Select a location to see weather'}
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur-sm border-0 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t('loadingWeather') || 'Loading weather data...'}
          </p>
        </div>
      </Card>
    );
  }

  if (error || !weatherData) {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur-sm border-0">
        <div className="text-center py-4">
          <p className="text-destructive mb-2">
            {error || 'Failed to load weather data'}
          </p>
          <p className="text-sm text-muted-foreground">
            Please check your internet connection and try again.
          </p>
        </div>
      </Card>
    );
  }

  const { main, weather, wind, visibility, sys } = weatherData;
  const weatherCondition = weather[0]?.main.toLowerCase() || 'clear';
  const temperature = Math.round(main.temp);
  const feelsLike = Math.round(main.feels_like);
  const minTemp = Math.round(main.temp_min);
  const maxTemp = Math.round(main.temp_max);
  const humidity = main.humidity;
  const windSpeed = Math.round(wind.speed * 3.6); // Convert m/s to km/h
  const windDirection = wind.deg;
  const pressure = main.pressure;
  const visibilityKm = (visibility / 1000).toFixed(1);

  // Format time from timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata' // Ensure consistent timezone for India
    });
  };

  // Get wind direction
  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(degrees / 22.5) % 16];
  };

  return (
    <Card className="p-6 bg-white/10 backdrop-blur-sm border-0">
      <div className="flex flex-col gap-4">
        {/* Location and Date */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">{t('location')}</h3>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'gu' ? 'gu-IN' : 'en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {t('sunrise')}: {formatTime(sys.sunrise)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('sunset')}: {formatTime(sys.sunset)}
            </p>
          </div>
        </div>

        {/* Current Weather */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={getWeatherIconUrl(weather[0].icon)}
                alt={weather[0].description}
                className="h-20 w-20"
                onError={(e) => {
                  // Fallback to a default icon if the image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = `https://openweathermap.org/img/wn/01d@2x.png`;
                }}
              />
            </div>
            <div>
              <div className="text-4xl font-bold">{temperature}°C</div>
              <div className="text-lg capitalize">{weather[0].description}</div>
              <div className="text-sm text-muted-foreground">
                {t('feelsLike')} {feelsLike}°C
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm">
              {t('high')}: {maxTemp}°C
            </div>
            <div className="text-sm">
              {t('low')}: {minTemp}°C
            </div>
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-400" />
            <div>
              <div className="text-sm text-muted-foreground">{t('humidity')}</div>
              <div className="font-medium">{humidity}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-blue-300" />
            <div>
              <div className="text-sm text-muted-foreground">{t('wind')}</div>
              <div className="font-medium">
                {windSpeed} km/h {getWindDirection(windDirection)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-purple-400" />
            <div>
              <div className="text-sm text-muted-foreground">{t('pressure')}</div>
              <div className="font-medium">{pressure} hPa</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-sm text-muted-foreground">{t('visibility')}</div>
              <div className="font-medium">{visibilityKm} km</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};