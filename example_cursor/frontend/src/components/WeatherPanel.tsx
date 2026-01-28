import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Search, MapPin, Thermometer, Droplets, Wind, Loader2 } from 'lucide-react'

interface WeatherData {
  city: string
  latitude: number
  longitude: number
  temperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  weatherDescription: string
  timezone: string
  time: string
}

export function WeatherPanel() {
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestedCity, setSuggestedCity] = useState<string | null>(null)

  // Tentar obter localização do usuário ao carregar
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            // Buscar cidade usando geocoding reverso
            const response = await fetch(
              `http://localhost:3000/api/weather?latitude=${latitude}&longitude=${longitude}`
            )
            if (response.ok) {
              const data = await response.json()
              setSuggestedCity(data.city)
            }
          } catch (err) {
            console.error('Erro ao obter localização:', err)
          }
        },
        (err) => {
          console.log('Usuário negou permissão de localização:', err)
        }
      )
    }
  }, [])

  const handleSearch = async () => {
    if (!city.trim()) {
      setError('Por favor, digite o nome de uma cidade')
      return
    }

    setLoading(true)
    setError(null)
    setWeather(null)

    try {
      const response = await fetch(
        `http://localhost:3000/api/weather?city=${encodeURIComponent(city.trim())}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao buscar dados do clima')
      }

      const data = await response.json()
      setWeather(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar dados do clima')
    } finally {
      setLoading(false)
    }
  }

  const handleUseSuggestedCity = async () => {
    if (suggestedCity) {
      setCity(suggestedCity)
      setLoading(true)
      setError(null)
      setWeather(null)

      try {
        const response = await fetch(
          `http://localhost:3000/api/weather?city=${encodeURIComponent(suggestedCity)}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao buscar dados do clima')
        }

        const data = await response.json()
        setWeather(data)
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar dados do clima')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-card-foreground flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          Painel de Clima
        </h2>

        {/* Sugestão de localização */}
        {suggestedCity && !weather && (
          <div className="mb-4 p-3 bg-secondary/50 rounded-md flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Detectamos sua localização: <strong>{suggestedCity}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseSuggestedCity}
            >
              Usar esta cidade
            </Button>
          </div>
        )}

        {/* Input de busca */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite o nome da cidade..."
            className="flex-1 h-10 px-4 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar
              </>
            )}
          </Button>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Dados do clima */}
        {weather && (
          <div className="mt-6 space-y-4">
            <div className="text-center pb-4 border-b border-border">
              <h3 className="text-3xl font-bold text-card-foreground mb-2">
                {weather.city}
              </h3>
              <p className="text-muted-foreground text-sm">
                {new Date(weather.time).toLocaleString('pt-BR', {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Temperatura */}
              <div className="bg-secondary/50 rounded-lg p-4 flex flex-col items-center">
                <Thermometer className="w-8 h-8 text-primary mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Temperatura</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {weather.temperature.toFixed(1)}°C
                </p>
              </div>

              {/* Umidade */}
              <div className="bg-secondary/50 rounded-lg p-4 flex flex-col items-center">
                <Droplets className="w-8 h-8 text-primary mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Umidade</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {weather.humidity}%
                </p>
              </div>

              {/* Vento */}
              <div className="bg-secondary/50 rounded-lg p-4 flex flex-col items-center">
                <Wind className="w-8 h-8 text-primary mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Vento</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {weather.windSpeed.toFixed(1)} km/h
                </p>
              </div>
            </div>

            {/* Condição do tempo */}
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-card-foreground">
                {weather.weatherDescription}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
