import { useEffect, useState } from 'react'
import { Button } from './components/ui/button'

type ApiStatus = 'checking' | 'online' | 'offline'
type WeatherResponse = {
  location: {
    name?: string
    country?: string
    latitude: number
    longitude: number
    timezone?: string
  }
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    is_day: number
    precipitation: number
    weather_code?: number
    weather_description?: string
    wind_speed_10m: number
    wind_direction_10m: number
  }
}

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('http://localhost:3000/health')
        if (response.ok) {
          setApiStatus('online')
        } else {
          setApiStatus('offline')
        }
      } catch {
        setApiStatus('offline')
      }
    }

    checkApiStatus()
    const interval = setInterval(checkApiStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Try geolocation once to suggest local city
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const url = new URL('http://localhost:3000/weather')
        url.searchParams.set('lat', String(coords.latitude))
        url.searchParams.set('lon', String(coords.longitude))
        const resp = await fetch(url)
        if (resp.ok) {
          const data: WeatherResponse = await resp.json()
          setCity(data.location.name || '')
          setWeather(data)
        }
      } catch {}
    }, () => {}, { enableHighAccuracy: true, timeout: 5000 })
  }, [])

  const searchCityWeather = async () => {
    if (!city.trim()) return
    setLoading(true)
    setError(null)
    setWeather(null)
    try {
      const url = new URL('http://localhost:3000/weather')
      url.searchParams.set('city', city.trim())
      const resp = await fetch(url)
      if (!resp.ok) {
        const msg = await resp.text()
        throw new Error(msg || 'Falha ao obter clima')
      }
      const data: WeatherResponse = await resp.json()
      setWeather(data)
    } catch (e: any) {
      setError(e?.message || 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'online':
        return 'bg-green-500'
      case 'offline':
        return 'bg-red-500'
      case 'checking':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative p-4">
      <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-8">
        Painel de Clima
      </h1>

      <div className="w-full max-w-2xl bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="flex-1 px-3 py-2 rounded-md border bg-background text-foreground"
            placeholder="Digite a cidade (ex: São Paulo)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Button onClick={searchCityWeather} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar clima'}
          </Button>
          <Button variant="secondary" onClick={async () => {
            if (!('geolocation' in navigator)) return
            setLoading(true)
            setError(null)
            try {
              await new Promise<void>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(async ({ coords }) => {
                  try {
                    const url = new URL('http://localhost:3000/weather')
                    url.searchParams.set('lat', String(coords.latitude))
                    url.searchParams.set('lon', String(coords.longitude))
                    const resp = await fetch(url)
                    if (!resp.ok) throw new Error('Falha ao obter clima pela localização')
                    const data: WeatherResponse = await resp.json()
                    setCity(data.location.name || '')
                    setWeather(data)
                    resolve()
                  } catch (e) {
                    reject(e)
                  }
                }, (err) => reject(err), { enableHighAccuracy: true, timeout: 5000 })
              })
            } catch (e: any) {
              setError(e?.message || 'Não foi possível obter a localização')
            } finally {
              setLoading(false)
            }
          }}>
            Usar minha localização
          </Button>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600">{error}</div>
        )}

        {weather && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/40">
              <div className="text-lg font-semibold">Localização</div>
              <div className="text-sm text-muted-foreground">
                {(weather.location.name || 'Cidade desconhecida') + (weather.location.country ? `, ${weather.location.country}` : '')}
              </div>
              <div className="mt-2 text-sm">Lat: {weather.location.latitude.toFixed(4)} | Lon: {weather.location.longitude.toFixed(4)}</div>
              <div className="text-sm">Timezone: {weather.location.timezone || 'auto'}</div>
              <div className="text-sm">Hora: {new Date(weather.current.time).toLocaleString()}</div>
            </div>

            <div className="p-4 rounded-lg bg-muted/40">
              <div className="text-lg font-semibold">Condições atuais</div>
              <div className="mt-2 text-4xl font-bold">
                {Math.round(weather.current.temperature_2m)}°C
              </div>
              <div className="text-sm text-muted-foreground">
                {weather.current.weather_description || '—'}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>Vento: {Math.round(weather.current.wind_speed_10m)} km/h</div>
                <div>Direção: {weather.current.wind_direction_10m}°</div>
                <div>Humidade: {weather.current.relative_humidity_2m}%</div>
                <div>Sensação: {Math.round(weather.current.apparent_temperature)}°C</div>
                <div>Precipitação: {weather.current.precipitation} mm</div>
                <div>Dia?: {weather.current.is_day ? 'Sim' : 'Não'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full backdrop-blur-sm">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
        <span className="text-sm text-muted-foreground font-medium">API Status</span>
      </div>
    </div>
  )
}

export default App
