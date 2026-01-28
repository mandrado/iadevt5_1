import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface GeocodingApiResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    admin1?: string;
  }>;
}

interface WeatherApiResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: number;
  };
}

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
}

interface WeatherResponse {
  city: string;
  country: string;
  region?: string;
  latitude: number;
  longitude: number;
  weather: WeatherData;
}

const weatherCodeDescriptions: Record<number, string> = {
  0: 'Céu limpo',
  1: 'Principalmente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Nevoeiro',
  48: 'Nevoeiro com geada',
  51: 'Garoa leve',
  53: 'Garoa moderada',
  55: 'Garoa intensa',
  61: 'Chuva leve',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  71: 'Neve leve',
  73: 'Neve moderada',
  75: 'Neve forte',
  80: 'Pancadas de chuva leve',
  81: 'Pancadas de chuva moderada',
  82: 'Pancadas de chuva forte',
  95: 'Tempestade',
  96: 'Tempestade com granizo leve',
  99: 'Tempestade com granizo forte',
};

async function getCoordinates(city: string): Promise<GeocodingResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
  const response = await fetch(url);
  const data = (await response.json()) as GeocodingApiResponse;

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const result = data.results[0];
  return {
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    country: result.country,
    admin1: result.admin1,
  };
}

async function getWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day`;
  const response = await fetch(url);
  const data = (await response.json()) as WeatherApiResponse;

  return {
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day === 1,
  };
}

app.get('/api/weather', async (req: Request, res: Response) => {
  const { city, lat, lon } = req.query;

  try {
    let latitude: number;
    let longitude: number;
    let cityName: string;
    let country: string;
    let region: string | undefined;

    if (lat && lon) {
      latitude = parseFloat(lat as string);
      longitude = parseFloat(lon as string);
      cityName = 'Localização atual';
      country = '';
      region = undefined;
    } else if (city) {
      const coordinates = await getCoordinates(city as string);

      if (!coordinates) {
        res.status(404).json({ error: 'Cidade não encontrada' });
        return;
      }

      latitude = coordinates.latitude;
      longitude = coordinates.longitude;
      cityName = coordinates.name;
      country = coordinates.country;
      region = coordinates.admin1;
    } else {
      res.status(400).json({ error: 'Parâmetro city ou lat/lon é obrigatório' });
      return;
    }

    const weather = await getWeather(latitude, longitude);

    const response: WeatherResponse = {
      city: cityName,
      country,
      region,
      latitude,
      longitude,
      weather,
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao buscar clima:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do clima' });
  }
});

app.get('/api/weather/description/:code', (req: Request, res: Response) => {
  const code = parseInt(req.params.code);
  const description = weatherCodeDescriptions[code] || 'Condição desconhecida';
  res.json({ code, description });
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