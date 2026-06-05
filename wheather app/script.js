/* ── WeatherFlow App ── */

const API = {
  geo: city => `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
  weather: (lat, lon) =>
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,` +
    `weather_code,surface_pressure,wind_speed_10m,visibility,uv_index` +
    `&daily=sunrise,sunset&timezone=auto&forecast_days=1`
};

/* WMO weather codes → icon + label */
const WMO = {
  0: { icon: 'fa-sun', label: 'Clear Sky' },
  1: { icon: 'fa-sun', label: 'Mainly Clear' },
  2: { icon: 'fa-cloud-sun', label: 'Partly Cloudy' },
  3: { icon: 'fa-cloud', label: 'Overcast' },
  45: { icon: 'fa-smog', label: 'Foggy' },
  48: { icon: 'fa-smog', label: 'Icy Fog' },
  51: { icon: 'fa-cloud-drizzle', label: 'Light Drizzle' },
  53: { icon: 'fa-cloud-drizzle', label: 'Drizzle' },
  55: { icon: 'fa-cloud-drizzle', label: 'Heavy Drizzle' },
  61: { icon: 'fa-cloud-rain', label: 'Slight Rain' },
  63: { icon: 'fa-cloud-rain', label: 'Moderate Rain' },
  65: { icon: 'fa-cloud-showers-heavy', label: 'Heavy Rain' },
  71: { icon: 'fa-snowflake', label: 'Slight Snow' },
  73: { icon: 'fa-snowflake', label: 'Moderate Snow' },
  75: { icon: 'fa-snowflake', label: 'Heavy Snow' },
  77: { icon: 'fa-snowflake', label: 'Snow Grains' },
  80: { icon: 'fa-cloud-showers-water', label: 'Rain Showers' },
  81: { icon: 'fa-cloud-showers-heavy', label: 'Heavy Showers' },
  82: { icon: 'fa-cloud-showers-heavy', label: 'Violent Showers' },
  85: { icon: 'fa-snowflake', label: 'Snow Showers' },
  86: { icon: 'fa-snowflake', label: 'Heavy Snow Showers' },
  95: { icon: 'fa-bolt', label: 'Thunderstorm' },
  96: { icon: 'fa-cloud-bolt', label: 'Thunderstorm w/ Hail' },
  99: { icon: 'fa-cloud-bolt', label: 'Thunderstorm w/ Hail' },
};

/* State */
let state = {
  tempC: null,
  feelsC: null,
  useCelsius: true,
};

/* DOM refs */
const $ = id => document.getElementById(id);
const cityInput  = $('cityInput');
const searchBtn  = $('searchBtn');
const cityName   = $('cityName');
const dateTime   = $('dateTime');
const weatherIcon= $('weatherIcon');
const tempValue  = $('tempValue');
const condition  = $('condition');
const humidity   = $('humidity');
const wind       = $('wind');
const visibility = $('visibility');
const pressure   = $('pressure');
const feelsLike  = $('feelsLike');
const uvIndex    = $('uvIndex');
const precip     = $('precip');
const sunrise    = $('sunrise');
const sunset     = $('sunset');
const sunProgress= $('sunProgress');
const sunDot     = $('sunDot');
const statusCard = $('statusCard');
const statusIcon = $('statusIcon');
const statusMsg  = $('statusMsg');
const btnC       = $('btnC');
const btnF       = $('btnF');

/* ── Helpers ── */
function fmt(date, opts) {
  return new Intl.DateTimeFormat('en-US', opts).format(date);
}

function to12h(iso) {
  const d = new Date(iso);
  return fmt(d, { hour: 'numeric', minute: '2-digit', hour12: true });
}

function sunPercent(sunriseISO, sunsetISO) {
  const now  = Date.now();
  const rise = new Date(sunriseISO).getTime();
  const set  = new Date(sunsetISO).getTime();
  if (now < rise) return 0;
  if (now > set)  return 100;
  return Math.round(((now - rise) / (set - rise)) * 100);
}

function resolveWMO(code) {
  return WMO[code] || { icon: 'fa-cloud', label: 'Unknown' };
}

function showStatus(msg, isError = false) {
  statusCard.classList.remove('hidden');
  statusIcon.className = isError
    ? 'fa-solid fa-triangle-exclamation status-icon'
    : 'fa-solid fa-spinner fa-spin status-icon';
  statusIcon.style.color = isError ? '#f4a261' : 'var(--accent)';
  statusMsg.textContent = msg;
}

function hideStatus() { statusCard.classList.add('hidden'); }

/* ── Render temperature with current unit ── */
function renderTemp() {
  if (state.tempC === null) return;
  if (state.useCelsius) {
    tempValue.textContent = Math.round(state.tempC);
    feelsLike.textContent = `${Math.round(state.feelsC)}°C`;
  } else {
    tempValue.textContent = Math.round(state.tempC * 9/5 + 32);
    feelsLike.textContent = `${Math.round(state.feelsC * 9/5 + 32)}°F`;
  }
}

/* ── Unit toggle ── */
btnC.addEventListener('click', () => {
  state.useCelsius = true;
  btnC.classList.add('active');
  btnF.classList.remove('active');
  renderTemp();
});
btnF.addEventListener('click', () => {
  state.useCelsius = false;
  btnF.classList.add('active');
  btnC.classList.remove('active');
  renderTemp();
});

/* ── Main fetch ── */
async function fetchWeather(city) {
  showStatus(`Finding ${city}…`);

  try {
    // 1. Geocode
    const geoRes = await fetch(API.geo(city), {
      headers: { 'Accept-Language': 'en' }
    });
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error(`City "${city}" not found.`);

    const { lat, lon, display_name } = geoData[0];
    // Short city name: first two parts
    const short = display_name.split(',').slice(0,2).join(',').trim();

    // 2. Weather
    const wxRes  = await fetch(API.weather(lat, lon));
    const wxData = await wxRes.json();
    const cur    = wxData.current;
    const daily  = wxData.daily;

    hideStatus();
    populate(short, cur, daily, wxData.timezone);

  } catch (err) {
    showStatus(err.message || 'Something went wrong.', true);
  }
}

/* ── Populate UI ── */
function populate(city, cur, daily, tz) {
  /* City & time */
  cityName.textContent = city;
  const now = new Date();
  dateTime.textContent = fmt(now, {
    weekday:'long', month:'short', day:'numeric',
    hour:'numeric', minute:'2-digit', timeZone: tz
  });

  /* Icon */
  const wmo = resolveWMO(cur.weather_code);
  weatherIcon.className = `fa-solid ${wmo.icon} weather-icon`;
  condition.textContent = wmo.label;

  /* Temperature */
  state.tempC  = cur.temperature_2m;
  state.feelsC = cur.apparent_temperature;
  renderTemp();

  /* Stats */
  humidity.textContent   = `${cur.relative_humidity_2m}%`;
  wind.textContent       = `${Math.round(cur.wind_speed_10m)} km/h`;
  visibility.textContent = cur.visibility !== undefined
    ? `${(cur.visibility / 1000).toFixed(1)} km` : '--';
  pressure.textContent   = `${Math.round(cur.surface_pressure)} hPa`;

  /* Mini cards */
  uvIndex.textContent = cur.uv_index ?? '--';
  precip.textContent  = `${cur.precipitation} mm`;

  /* Sunrise / Sunset */
  const srISO = daily.sunrise[0];
  const ssISO = daily.sunset[0];
  sunrise.textContent = to12h(srISO);
  sunset.textContent  = to12h(ssISO);

  const pct = sunPercent(srISO, ssISO);
  sunProgress.style.width = `${pct}%`;
  sunDot.style.left = `calc(${pct}% - 6px)`;

  /* Background tint based on condition */
  applyTheme(cur.weather_code);
}

/* ── Subtle theme tint per condition ── */
function applyTheme(code) {
  const root = document.documentElement;
  if ([0,1].includes(code)) {
    root.style.setProperty('--blob-1', '#1a56d6');
    root.style.setProperty('--blob-2', '#f9c74f55');
  } else if ([2,3].includes(code)) {
    root.style.setProperty('--blob-1', '#3a4a6a');
    root.style.setProperty('--blob-2', '#4a5070');
  } else if (code >= 95) {
    root.style.setProperty('--blob-1', '#2a1a4a');
    root.style.setProperty('--blob-2', '#6a2aaa');
  } else if (code >= 71) {
    root.style.setProperty('--blob-1', '#2a4a6a');
    root.style.setProperty('--blob-2', '#aad4f5');
  } else {
    root.style.setProperty('--blob-1', '#1a4fd6');
    root.style.setProperty('--blob-2', '#6c2de5');
  }
}

/* ── Events ── */
searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (city) fetchWeather(city);
});

cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
  }
});

/* ── Auto-detect location on load ── */
window.addEventListener('load', () => {
  if (navigator.geolocation) {
    showStatus('Detecting your location…');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const d = await r.json();
          const city = d.address?.city || d.address?.town || d.address?.village || 'Your Location';
          cityInput.value = city;
          fetchWeather(city);
        } catch { fetchWeather('London'); }
      },
      () => fetchWeather('London') // fallback
    );
  } else {
    fetchWeather('London');
  }
});