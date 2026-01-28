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

// Weather endpoint: supports city or lat/lon
app.get('/weather', async (req: Request, res: Response) => {
  try {
    const city = (req.query.city as string) || '';
    const latParam = req.query.lat as string | undefined;
    const lonParam = req.query.lon as string | undefined;

    let latitude: number | undefined;
    let longitude: number | undefined;
    let locationInfo: { name?: string; country?: string; timezone?: string } = {};

    if (latParam && lonParam) {
      latitude = Number(latParam);
      longitude = Number(lonParam);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }
    } else if (city) {
      const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
      geoUrl.searchParams.set('name', city);
      geoUrl.searchParams.set('count', '1');
      geoUrl.searchParams.set('language', 'pt');
      geoUrl.searchParams.set('format', 'json');

      const geoResp = await fetch(geoUrl);
      if (!geoResp.ok) {
        return res.status(502).json({ error: 'Failed geocoding lookup' });
      }
      const geoData = await geoResp.json();
      const result = geoData?.results?.[0];
      if (!result) {
        return res.status(404).json({ error: 'City not found' });
      }
      latitude = result.latitude;
      longitude = result.longitude;
      locationInfo = { name: result.name, country: result.country, timezone: result.timezone };
    } else {
      return res.status(400).json({ error: 'Provide either city or lat/lon' });
    }

    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.searchParams.set('latitude', String(latitude));
    weatherUrl.searchParams.set('longitude', String(longitude));
    weatherUrl.searchParams.set('current', [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m'
    ].join(','));
    weatherUrl.searchParams.set('timezone', 'auto');

    const wxResp = await fetch(weatherUrl);
    if (!wxResp.ok) {
      return res.status(502).json({ error: 'Failed weather lookup' });
    }
    const wxData = await wxResp.json();

    const code = wxData?.current?.weather_code as number | undefined;
    const codeMap: Record<number, string> = {
      0: 'Céu limpo',
      1: 'Principalmente claro',
      2: 'Parcialmente nublado',
      3: 'Nublado',
      45: 'Nevoeiro',
      48: 'Nevoeiro com gelo',
      51: 'Chuvisco leve',
      53: 'Chuvisco moderado',
      55: 'Chuvisco denso',
      61: 'Chuva fraca',
      63: 'Chuva moderada',
      65: 'Chuva forte',
      71: 'Neve fraca',
      73: 'Neve moderada',
      75: 'Neve forte',
      80: 'Aguaceiros fracos',
      81: 'Aguaceiros moderados',
      82: 'Aguaceiros fortes',
      95: 'Trovoadas',
      96: 'Trovoadas com granizo leve',
      99: 'Trovoadas com granizo forte'
    };

    res.json({
      location: {
        name: locationInfo.name,
        country: locationInfo.country,
        latitude,
        longitude,
        timezone: wxData?.timezone || locationInfo.timezone
      },
      current: {
        time: wxData?.current?.time,
        temperature_2m: wxData?.current?.temperature_2m,
        apparent_temperature: wxData?.current?.apparent_temperature,
        relative_humidity_2m: wxData?.current?.relative_humidity_2m,
        is_day: wxData?.current?.is_day,
        precipitation: wxData?.current?.precipitation,
        weather_code: code,
        weather_description: code !== undefined ? (codeMap[code] || 'Desconhecido') : undefined,
        wind_speed_10m: wxData?.current?.wind_speed_10m,
        wind_direction_10m: wxData?.current?.wind_direction_10m
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Unexpected error', message: err?.message });
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