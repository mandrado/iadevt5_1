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

app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const { city, latitude, longitude } = req.query;

    let lat: number;
    let lon: number;
    let cityName: string;

    // Se coordenadas foram fornecidas diretamente, usar elas
    if (latitude && longitude) {
      lat = parseFloat(latitude as string);
      lon = parseFloat(longitude as string);
      cityName = city as string || 'Localização atual';
    } else if (city) {
      // Buscar coordenadas pelo nome da cidade usando Geocoding API
      const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city as string)}&count=1&language=pt&format=json`;
      const geocodingResponse = await fetch(geocodingUrl);
      
      if (!geocodingResponse.ok) {
        throw new Error('Erro ao buscar localização');
      }

      const geocodingData = await geocodingResponse.json();
      
      if (!geocodingData.results || geocodingData.results.length === 0) {
        return res.status(404).json({ 
          error: 'Cidade não encontrada',
          message: `Não foi possível encontrar a cidade "${city}"`
        });
      }

      const location = geocodingData.results[0];
      lat = location.latitude;
      lon = location.longitude;
      cityName = location.name;
    } else {
      return res.status(400).json({ 
        error: 'Parâmetros inválidos',
        message: 'É necessário fornecer "city" ou "latitude" e "longitude"'
      });
    }

    // Buscar dados do clima usando Weather API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=America/Sao_Paulo`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      throw new Error('Erro ao buscar dados do clima');
    }

    const weatherData = await weatherResponse.json();

    // Mapear códigos de clima para descrições em português
    const weatherCodes: { [key: number]: string } = {
      0: 'Céu limpo',
      1: 'Principalmente limpo',
      2: 'Parcialmente nublado',
      3: 'Nublado',
      45: 'Nevoeiro',
      48: 'Nevoeiro com geada',
      51: 'Garoa leve',
      53: 'Garoa moderada',
      55: 'Garoa densa',
      56: 'Garoa gelada leve',
      57: 'Garoa gelada densa',
      61: 'Chuva leve',
      63: 'Chuva moderada',
      65: 'Chuva forte',
      66: 'Chuva gelada leve',
      67: 'Chuva gelada forte',
      71: 'Neve leve',
      73: 'Neve moderada',
      75: 'Neve forte',
      77: 'Grãos de neve',
      80: 'Pancadas de chuva leve',
      81: 'Pancadas de chuva moderada',
      82: 'Pancadas de chuva forte',
      85: 'Pancadas de neve leve',
      86: 'Pancadas de neve forte',
      95: 'Trovoada',
      96: 'Trovoada com granizo leve',
      99: 'Trovoada com granizo forte'
    };

    const weatherCode = weatherData.current.weather_code;
    const weatherDescription = weatherCodes[weatherCode] || 'Desconhecido';

    res.json({
      city: cityName,
      latitude: lat,
      longitude: lon,
      temperature: weatherData.current.temperature_2m,
      humidity: weatherData.current.relative_humidity_2m,
      windSpeed: weatherData.current.wind_speed_10m,
      weatherCode: weatherCode,
      weatherDescription: weatherDescription,
      timezone: weatherData.timezone,
      time: weatherData.current.time
    });
  } catch (error: any) {
    console.error('Erro ao buscar clima:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados do clima',
      message: error.message 
    });
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