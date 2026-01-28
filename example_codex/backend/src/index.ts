import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

type GeocodingResult = {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone?: string;
};

type WeatherResponse = {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  current_units: Record<string, string>;
  timezone: string;
};

const OPEN_METEO_GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const buildWeatherUrl = (latitude: number, longitude: number) => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current:
      'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
    timezone: 'auto',
  });
  return `${OPEN_METEO_WEATHER_URL}?${params.toString()}`;
};

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/weather', async (req: Request, res: Response) => {
  try {
    const { city, latitude, longitude } = req.query;
    let location: GeocodingResult | null = null;
    let lat = Number(latitude);
    let lon = Number(longitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      location = {
        name: typeof city === 'string' && city.trim() ? city.trim() : 'Localização atual',
        latitude: lat,
        longitude: lon,
        country: 'N/A',
      };
    } else if (typeof city === 'string' && city.trim()) {
      const params = new URLSearchParams({
        name: city.trim(),
        count: '1',
        language: 'pt',
        format: 'json',
      });
      const geoUrl = `${OPEN_METEO_GEO_URL}?${params.toString()}`;
      const geoData = await fetchJson<{ results?: GeocodingResult[] }>(geoUrl);
      location = geoData.results?.[0] ?? null;
    } else {
      return res.status(400).json({ error: 'Informe uma cidade ou coordenadas.' });
    }

    if (!location) {
      return res.status(404).json({ error: 'Cidade não encontrada.' });
    }

    lat = location.latitude;
    lon = location.longitude;
    const weatherUrl = buildWeatherUrl(lat, lon);
    const weatherData = await fetchJson<WeatherResponse>(weatherUrl);

    res.json({
      location: {
        name: location.name,
        admin1: location.admin1,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone ?? weatherData.timezone,
      },
      current: weatherData.current,
      units: weatherData.current_units,
    });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'Erro ao consultar o Open-Meteo.' });
  }
});

app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
