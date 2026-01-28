import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'

type ApiStatus = 'checking' | 'online' | 'offline'

type WeatherData = {
  location: {
    name: string
    admin1?: string
    country: string
    latitude: number
    longitude: number
    timezone: string
  }
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    weather_code: number
    wind_speed_10m: number
    relative_humidity_2m: number
  }
  units: Record<string, string>
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000'

const weatherCodeMap: Record<number, { label: string; icon: string }> = {
  0: { label: 'Céu limpo', icon: '☀️' },
  1: { label: 'Predomínio de sol', icon: '🌤️' },
  2: { label: 'Parcialmente nublado', icon: '⛅' },
  3: { label: 'Nublado', icon: '☁️' },
  45: { label: 'Névoa', icon: '🌫️' },
  48: { label: 'Névoa congelante', icon: '🌫️' },
  51: { label: 'Garoa leve', icon: '🌦️' },
  53: { label: 'Garoa moderada', icon: '🌦️' },
  55: { label: 'Garoa intensa', icon: '🌧️' },
  61: { label: 'Chuva leve', icon: '🌧️' },
  63: { label: 'Chuva moderada', icon: '🌧️' },
  65: { label: 'Chuva forte', icon: '🌧️' },
  71: { label: 'Neve leve', icon: '❄️' },
  73: { label: 'Neve moderada', icon: '❄️' },
  75: { label: 'Neve intensa', icon: '❄️' },
  80: { label: 'Pancadas de chuva', icon: '🌧️' },
  81: { label: 'Pancadas moderadas', icon: '🌧️' },
  82: { label: 'Pancadas fortes', icon: '⛈️' },
  95: { label: 'Tempestade', icon: '⛈️' },
  96: { label: 'Tempestade com granizo', icon: '⛈️' },
  99: { label: 'Tempestade severa', icon: '⛈️' },
}

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/health`)
        setApiStatus(response.ok ? 'online' : 'offline')
      } catch {
        setApiStatus('offline')
      }
    }

    checkApiStatus()
    const interval = setInterval(checkApiStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  const statusColor = useMemo(() => {
    switch (apiStatus) {
      case 'online':
        return 'bg-emerald-500'
      case 'offline':
        return 'bg-rose-500'
      case 'checking':
        return 'bg-amber-500'
      default:
        return 'bg-gray-500'
    }
  }, [apiStatus])

  const fetchWeather = async (params: { city?: string; latitude?: number; longitude?: number }) => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL(`${API_BASE}/weather`)
      if (params.city) url.searchParams.set('city', params.city)
      if (params.latitude !== undefined) url.searchParams.set('latitude', params.latitude.toString())
      if (params.longitude !== undefined) url.searchParams.set('longitude', params.longitude.toString())
      const response = await fetch(url)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Não foi possível buscar o clima.')
      }
      setWeather(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!city.trim()) {
      setError('Digite uma cidade para continuar.')
      return
    }
    fetchWeather({ city: city.trim() })
  }

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não está disponível no navegador.')
      return
    }
    setGeoLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }).finally(() => setGeoLoading(false))
      },
      (geoError) => {
        setGeoLoading(false)
        setError(geoError.message || 'Não foi possível obter sua localização.')
      },
      { timeout: 10000 }
    )
  }

  const weatherInfo = weatherCodeMap[weather?.current.weather_code ?? -1]
  const formattedTime = weather?.current.time
    ? new Date(weather.current.time).toLocaleString('pt-BR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8f1ff,_#f9f7f1_45%,_#ffffff_100%)] text-foreground flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      <div className="absolute -top-24 right-12 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"></div>
      <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"></div>

      <div className="w-full max-w-3xl space-y-10 relative">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Painel meteorológico</p>
          <h1 className="text-4xl md:text-5xl font-semibold">Clima em tempo real com Open-Meteo</h1>
          <p className="text-muted-foreground max-w-2xl">
            Pesquise uma cidade ou use sua localização atual para ver temperatura, sensação térmica,
            umidade e vento agora.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row gap-3 rounded-2xl bg-white/80 backdrop-blur-xl p-4 shadow-lg shadow-slate-200/60 border border-white/40"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Cidade</label>
            <input
              className="w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ex.: São Paulo, Lisboa, Recife"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end md:items-center">
            <Button type="submit" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar clima'}
            </Button>
            <Button type="button" variant="outline" disabled={geoLoading} onClick={handleGeolocation}>
              {geoLoading ? 'Localizando...' : 'Usar minha localização'}
            </Button>
          </div>
        </form>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        {weather && (
          <section className="rounded-3xl bg-white/90 border border-white/60 shadow-xl shadow-slate-200/60 p-6 md:p-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{weatherInfo?.icon ?? '🌡️'}</span>
                <div>
                  <p className="text-lg text-muted-foreground">Agora</p>
                  <h2 className="text-3xl font-semibold">{weatherInfo?.label ?? 'Condição atual'}</h2>
                </div>
              </div>

              <div className="text-5xl font-semibold">
                {Math.round(weather.current.temperature_2m)}{weather.units.temperature_2m}
              </div>

              <p className="text-muted-foreground">
                Sensação térmica de {Math.round(weather.current.apparent_temperature)}
                {weather.units.apparent_temperature}. {formattedTime ? `Atualizado em ${formattedTime}.` : ''}
              </p>

              <div className="text-sm text-muted-foreground">
                {weather.location.name}
                {weather.location.admin1 ? `, ${weather.location.admin1}` : ''} · {weather.location.country}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-sm text-muted-foreground">Umidade</p>
                <p className="text-2xl font-semibold">
                  {Math.round(weather.current.relative_humidity_2m)}
                  {weather.units.relative_humidity_2m}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-sm text-muted-foreground">Vento</p>
                <p className="text-2xl font-semibold">
                  {Math.round(weather.current.wind_speed_10m)}
                  {weather.units.wind_speed_10m}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-sm text-muted-foreground">Coordenadas</p>
                <p className="text-base font-semibold">
                  {weather.location.latitude.toFixed(2)}, {weather.location.longitude.toFixed(2)}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="absolute bottom-8 flex items-center gap-2 px-4 py-2 bg-white/70 border border-white/50 rounded-full backdrop-blur-sm">
        <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`}></div>
        <span className="text-sm text-muted-foreground font-medium">
          API {apiStatus === 'online' ? 'online' : apiStatus === 'offline' ? 'offline' : 'checando'}
        </span>
      </div>
    </div>
  )
}

export default App
