export interface WeatherData {
  tempF: number;
  cityState: string;
  humidity?: number;
  windMph?: number;
  condition: string;
  weatherCode?: number;
  conditionDesc: string;
  isGPSLocation?: boolean;
}

export function getWmoCondition(code: number): string {
  if (code === 0) return 'Clear / Sunny';
  if (code === 1 || code === 2 || code === 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rain / Drizzle';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Fair';
}

let cachedWeatherData: WeatherData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchAutoWeatherData(forceFresh = false): Promise<WeatherData> {
  const now = Date.now();
  if (!forceFresh && cachedWeatherData && now - lastFetchTime < CACHE_DURATION_MS) {
    return cachedWeatherData;
  }

  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const data = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, 'Current Location', true);
            cachedWeatherData = data;
            lastFetchTime = Date.now();
            resolve(data);
          } catch {
            const fallbackData = await fetchWeatherByIpFallback();
            cachedWeatherData = fallbackData;
            lastFetchTime = Date.now();
            resolve(fallbackData);
          }
        },
        async () => {
          const fallbackData = await fetchWeatherByIpFallback();
          cachedWeatherData = fallbackData;
          lastFetchTime = Date.now();
          resolve(fallbackData);
        },
        { timeout: 4000, enableHighAccuracy: false }
      );
    } else {
      fetchWeatherByIpFallback().then((data) => {
        cachedWeatherData = data;
        lastFetchTime = Date.now();
        resolve(data);
      });
    }
  });
}

export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  locationName?: string,
  isGPS = false
): Promise<WeatherData> {
  const wxRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`
  );
  if (!wxRes.ok) throw new Error('Weather API request failed');
  const wxData = await wxRes.json();

  const tempF = Math.round(wxData.current?.temperature_2m ?? 72);
  const humidity = wxData.current?.relative_humidity_2m;
  const windMph = Math.round(wxData.current?.wind_speed_10m ?? 0);
  const weatherCode = wxData.current?.weather_code ?? 0;
  const conditionDesc = getWmoCondition(weatherCode);

  const conditionStr = `${locationName || 'Current Location'} • ${tempF}°F, ${humidity !== undefined ? `${humidity}% humidity, ` : ''}${windMph !== undefined ? `${windMph} mph wind, ` : ''}${conditionDesc}`;

  return {
    tempF,
    cityState: locationName || 'Current Location',
    humidity,
    windMph,
    condition: conditionStr,
    weatherCode,
    conditionDesc,
    isGPSLocation: isGPS,
  };
}

export async function fetchWeatherByIpFallback(): Promise<WeatherData> {
  try {
    const geojsRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (geojsRes.ok) {
      const geojsData = await geojsRes.json();
      const lat = parseFloat(geojsData.latitude);
      const lon = parseFloat(geojsData.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        const cityState = geojsData.city && geojsData.region ? `${geojsData.city}, ${geojsData.region}` : geojsData.city || 'Local Pit';
        return await fetchWeatherByCoords(lat, lon, cityState, false);
      }
    }
  } catch {
    // try fallback
  }

  try {
    const ipRes = await fetch('https://ipapi.co/json/');
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData.latitude && ipData.longitude) {
        const cityState = ipData.city && ipData.region_code ? `${ipData.city}, ${ipData.region_code}` : ipData.city || 'Local Pit';
        return await fetchWeatherByCoords(ipData.latitude, ipData.longitude, cityState, false);
      }
    }
  } catch {
    // fallback
  }

  // Austin, TX fallback default coords
  return await fetchWeatherByCoords(30.2672, -97.7431, 'Austin, TX', false);
}
