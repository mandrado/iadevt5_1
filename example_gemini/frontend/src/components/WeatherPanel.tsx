import { useState } from 'react';
import { Search, MapPin, Wind, Thermometer, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface WeatherData {
  location: string;
  temperature: number;
  windspeed: number;
  conditionCode: number;
  isDay: boolean;
}

export function WeatherPanel() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (query: string, type: 'city' | 'coords' = 'city') => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:3000/weather?`;
      if (type === 'city') {
        url += `city=${encodeURIComponent(query)}`;
      } else {
        // query is expected to be "lat=...&lon=..."
        url += query;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch weather');
      }
      const data = await res.json();
      setWeather(data);
    } catch (err: any) {
      setError(err.message);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;
    fetchWeather(city);
  };

  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeather(`lat=${latitude}&lon=${longitude}`, 'coords');
      },
      (_err) => {
        setError('Unable to retrieve your location');
        setLoading(false);
      }
    );
  };

  const getWeatherIcon = (code: number) => {
    // Simplified WMO Weather interpretation codes
    // https://open-meteo.com/en/docs
    if (code === 0) return <span className="text-yellow-500">☀️</span>;
    if (code >= 1 && code <= 3) return <span className="text-gray-400">⛅</span>;
    if (code >= 45 && code <= 48) return <span className="text-gray-500">🌫️</span>;
    if (code >= 51 && code <= 67) return <span className="text-blue-400">🌧️</span>;
    if (code >= 71 && code <= 77) return <span className="text-white">❄️</span>;
    if (code >= 80 && code <= 82) return <span className="text-blue-500">🌦️</span>;
    if (code >= 95 && code <= 99) return <span className="text-purple-500">⛈️</span>;
    return <span className="text-gray-500">Unknown</span>;
  };
    
  const getConditionText = (code: number) => {
      switch(code) {
          case 0: return "Clear sky";
          case 1: return "Mainly clear";
          case 2: return "Partly cloudy";
          case 3: return "Overcast";
          case 45: return "Fog";
          case 48: return "Depositing rime fog";
          case 51: return "Light drizzle";
          case 53: return "Moderate drizzle";
          case 55: return "Dense drizzle";
          case 61: return "Slight rain";
          case 63: return "Moderate rain";
          case 65: return "Heavy rain";
          case 71: return "Slight snow fall";
          case 73: return "Moderate snow fall";
          case 75: return "Heavy snow fall";
          case 95: return "Thunderstorm";
          default: return "Weather condition";
      }
  }

  return (
    <div className="w-full max-w-md bg-card border text-card-foreground rounded-xl shadow-lg p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Weather Forecast</h2>
        <p className="text-muted-foreground text-sm">Enter a city or use your location.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search city..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      <div className="flex justify-center">
         <Button variant="outline" size="sm" onClick={handleLocationClick} disabled={loading} className="text-xs">
            <MapPin className="mr-2 h-3 w-3" />
            Use my location
         </Button>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-200 dark:border-red-900/20">
          {error}
        </div>
      )}

      {weather && (
        <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">{weather.location}</h3>
              <p className="text-muted-foreground capitalize">{getConditionText(weather.conditionCode)}</p>
            </div>
            <div className="text-4xl">
                {getWeatherIcon(weather.conditionCode)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <Thermometer className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Temperature</p>
                <p className="text-lg font-bold">{weather.temperature}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <Wind className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wind Speed</p>
                <p className="text-lg font-bold">{weather.windspeed} km/h</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
