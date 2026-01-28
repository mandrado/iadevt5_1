import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

interface GeoCodingResponse {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    admin1?: string;
  }>;
}

interface WeatherResponse {
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    is_day: number;
    time: string;
  };
  latitude: number;
  longitude: number;
}

app.get('/weather', async (req: Request, res: Response): Promise<any> => {
  try {
    const { city, lat, lon } = req.query;

    if (!city && (!lat || !lon)) {
      return res.status(400).json({ error: 'City or coordinates (lat, lon) are required' });
    }

    let latitude: number;
    let longitude: number;
    let locationName: string = 'Unknown Location';

    if (city) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city as string)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error('Failed to fetch location data');
      
      const geoData = await geoRes.json() as GeoCodingResponse;
      
      if (!geoData.results || geoData.results.length === 0) {
        return res.status(404).json({ error: 'City not found' });
      }

      const result = geoData.results[0];
      latitude = result.latitude;
      longitude = result.longitude;
      locationName = result.name;
      if (result.admin1) locationName += `, ${result.admin1}`;
      if (result.country) locationName += `, ${result.country}`;
    } else {
      latitude = parseFloat(lat as string);
      longitude = parseFloat(lon as string);
      
      try {
        const revGeoUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;
        const revGeoRes = await fetch(revGeoUrl);
        if (revGeoRes.ok) {
           const revGeoData = await revGeoRes.json() as GeoCodingResponse;
           if (revGeoData.results && revGeoData.results.length > 0) {
             const result = revGeoData.results[0];
             locationName = result.name;
             if (result.admin1) locationName += `, ${result.admin1}`;
             if (result.country) locationName += `, ${result.country}`;
           } else {
             locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
           }
        } else {
           locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        }
      } catch (e) {
        console.error('Reverse geocoding failed', e);
        locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
      }
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error('Failed to fetch weather data');

    const weatherData = await weatherRes.json() as WeatherResponse;

    res.json({
      location: locationName,
      temperature: weatherData.current_weather.temperature,
      windspeed: weatherData.current_weather.windspeed,
      conditionCode: weatherData.current_weather.weathercode,
      isDay: weatherData.current_weather.is_day === 1,
      latitude,
      longitude
    });

  } catch (error: any) {
    console.error('Weather API Error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data', details: error.message });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: any) => {
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