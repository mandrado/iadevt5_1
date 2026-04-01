import { useState, useEffect } from 'react'

interface WeatherData {
  temperature: number
  apparentTemperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  isDay: boolean
}

interface WeatherResponse {
  city: string
  country: string
  region?: string
  latitude: number
  longitude: number
  weather: WeatherData
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
}

const weatherCodeIcons: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌧️',
  53: '🌧️',
  55: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '🌨️',
  80: '🌦️',
  81: '🌦️',
  82: '🌦️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
}

export function WeatherPanel() {
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoMessage, setGeoMessage] = useState<string | null>(null)

  const fetchWeather = async (searchCity: string) => {
    if (!searchCity.trim()) return

    setLoading(true)
    setError(null)
    setGeoMessage(null)

    try {
      const response = await fetch(
        `http://localhost:3000/api/weather?city=${encodeURIComponent(searchCity)}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao buscar clima')
      }

      const data: WeatherResponse = await response.json()
      setWeather(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    setGeoMessage(null)

    try {
      const response = await fetch(
        `http://localhost:3000/api/weather?lat=${lat}&lon=${lon}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao buscar clima')
      }

      const data: WeatherResponse = await response.json()
      setWeather(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  const handleGeolocation = (showDeniedFeedback = true) => {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocalização não suportada pelo navegador. Busque pelo nome da cidade.')
      return
    }

    setGeoMessage(null)
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false)
        fetchWeatherByCoords(position.coords.latitude, position.coords.longitude)
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          if (showDeniedFeedback) {
            setGeoMessage('Permissão de localização negada. Digite uma cidade ou habilite a localização no navegador.')
          }
          return
        }

        if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Localização indisponível no momento.')
          return
        }

        if (err.code === err.TIMEOUT) {
          setError('Tempo esgotado ao tentar obter sua localização.')
          return
        }

        setError('Não foi possível obter sua localização.')
      }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchWeather(city)
  }

  useEffect(() => {
    handleGeolocation(true)
  }, [])

  const getWeatherIcon = (code: number, isDay: boolean) => {
    if (code === 0 && !isDay) return '🌙'
    return weatherCodeIcons[code] || '🌡️'
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-secondary/30 rounded-2xl backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
        Painel de Clima
      </h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Digite uma cidade..."
          className="flex-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading || !city.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </form>

      <button
        onClick={() => handleGeolocation(true)}
        disabled={geoLoading}
        className="w-full mb-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors text-sm"
      >
        {geoLoading ? 'Obtendo localização...' : '📍 Usar minha localização'}
      </button>

      {error && (
        <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {geoMessage && (
        <div className="p-3 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-700 text-sm">
          {geoMessage}
        </div>
      )}

      {weather && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              {weather.region ? `${weather.region}, ` : ''}{weather.country}
            </p>
            <h3 className="text-xl font-semibold text-foreground">{weather.city}</h3>
          </div>

          <div className="flex items-center justify-center gap-4">
            <span className="text-6xl">
              {getWeatherIcon(weather.weather.weatherCode, weather.weather.isDay)}
            </span>
            <div>
              <p className="text-5xl font-bold text-foreground">
                {Math.round(weather.weather.temperature)}°C
              </p>
              <p className="text-muted-foreground text-sm">
                {weatherCodeDescriptions[weather.weather.weatherCode] || 'Condição desconhecida'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Sensação</p>
              <p className="text-foreground font-medium">
                {Math.round(weather.weather.apparentTemperature)}°C
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Umidade</p>
              <p className="text-foreground font-medium">{weather.weather.humidity}%</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Vento</p>
              <p className="text-foreground font-medium">
                {Math.round(weather.weather.windSpeed)} km/h
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
