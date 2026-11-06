// Laika prognoze ar Open-Meteo API (bez API atslēgas)
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

// WMO laika kodi → apraksts latviski un ikona
const CODES = {
  0: ["Skaidrs", "☀️", "🌙"],
  1: ["Pārsvarā skaidrs", "🌤️", "🌙"],
  2: ["Daļēji mākoņains", "⛅", "☁️"],
  3: ["Apmācies", "☁️", "☁️"],
  45: ["Migla", "🌫️", "🌫️"],
  48: ["Sarma un migla", "🌫️", "🌫️"],
  51: ["Viegla smidzināšana", "🌦️", "🌧️"],
  53: ["Smidzina", "🌦️", "🌧️"],
  55: ["Stipra smidzināšana", "🌧️", "🌧️"],
  56: ["Salstoša smidzināšana", "🌧️", "🌧️"],
  57: ["Salstoša smidzināšana", "🌧️", "🌧️"],
  61: ["Neliels lietus", "🌦️", "🌧️"],
  63: ["Lietus", "🌧️", "🌧️"],
  65: ["Stiprs lietus", "🌧️", "🌧️"],
  66: ["Salstošs lietus", "🌧️", "🌧️"],
  67: ["Salstošs lietus", "🌧️", "🌧️"],
  71: ["Neliels sniegs", "🌨️", "🌨️"],
  73: ["Sniegs", "🌨️", "🌨️"],
  75: ["Stiprs sniegs", "❄️", "❄️"],
  77: ["Sniega graudi", "🌨️", "🌨️"],
  80: ["Lietusgāzes", "🌦️", "🌧️"],
  81: ["Lietusgāzes", "🌧️", "🌧️"],
  82: ["Stipras lietusgāzes", "⛈️", "⛈️"],
  85: ["Sniegputenis", "🌨️", "🌨️"],
  86: ["Stiprs sniegputenis", "❄️", "❄️"],
  95: ["Pērkona negaiss", "⛈️", "⛈️"],
  96: ["Negaiss ar krusu", "⛈️", "⛈️"],
  99: ["Negaiss ar krusu", "⛈️", "⛈️"],
};

const DAYS = ["Svētdiena", "Pirmdiena", "Otrdiena", "Trešdiena", "Ceturtdiena", "Piektdiena", "Sestdiena"];

const $ = (id) => document.getElementById(id);

function describe(code, isDay = 1) {
  const c = CODES[code] || ["Nezināms", "🌡️", "🌡️"];
  return { text: c[0], icon: isDay ? c[1] : c[2] };
}

const round = (n) => Math.round(n);
const timeOf = (iso) => iso.slice(11, 16);

function showMessage(text) {
  $("message").textContent = text;
  $("message").hidden = !text;
}

async function loadWeather(city, lat, lon) {
  showMessage("");
  $("app").classList.add("loading");
  $("place").textContent = city;

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    timezone: "Europe/Riga",
    wind_speed_unit: "ms",
    forecast_days: 7,
  });

  try {
    const res = await fetch(`${FORECAST_URL}?${params}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    render(data);
    try { localStorage.setItem("laiks-city", JSON.stringify({ city, lat, lon })); } catch {}
  } catch (err) {
    showMessage("Neizdevās ielādēt laika prognozi. Pārbaudi interneta savienojumu un mēģini vēlreiz.");
  } finally {
    $("app").classList.remove("loading");
  }
}

function render(data) {
  const now = data.current;
  const d = describe(now.weather_code, now.is_day);

  $("updated").textContent = `Atjaunots ${timeOf(now.time)}`;
  $("nowIcon").textContent = d.icon;
  $("nowTemp").textContent = `${round(now.temperature_2m)}°`;
  $("nowDesc").textContent = d.text;
  $("feels").textContent = `${round(now.apparent_temperature)}°`;
  $("wind").textContent = `${round(now.wind_speed_10m)} m/s`;
  $("humidity").textContent = `${now.relative_humidity_2m}%`;
  $("sun").textContent = `${timeOf(data.daily.sunrise[0])} / ${timeOf(data.daily.sunset[0])}`;

  // Nākamās 24 stundas, sākot no tagadējās stundas
  const h = data.hourly;
  const start = Math.max(0, h.time.findIndex((t) => t >= now.time.slice(0, 13)));
  $("hours").innerHTML = h.time.slice(start, start + 24).map((t, k) => {
    const i = start + k;
    const hd = describe(h.weather_code[i], h.is_day[i]);
    const rain = h.precipitation_probability[i];
    return `<div class="hour">
      <span class="h">${k === 0 ? "Tagad" : timeOf(t)}</span>
      <span class="i" title="${hd.text}">${hd.icon}</span>
      <span class="t">${round(h.temperature_2m[i])}°</span>
      <span class="p">${rain >= 20 ? rain + "%" : ""}</span>
    </div>`;
  }).join("");

  // 7 dienas ar temperatūras joslu
  const dl = data.daily;
  const lo = Math.min(...dl.temperature_2m_min);
  const hi = Math.max(...dl.temperature_2m_max);
  const span = hi - lo || 1;

  $("days").innerHTML = dl.time.map((t, i) => {
    const dd = describe(dl.weather_code[i]);
    const name = i === 0 ? "Šodien" : DAYS[new Date(t + "T12:00").getDay()];
    const left = ((dl.temperature_2m_min[i] - lo) / span) * 100;
    const width = ((dl.temperature_2m_max[i] - dl.temperature_2m_min[i]) / span) * 100;
    const rain = dl.precipitation_probability_max[i];
    return `<li class="day">
      <span class="name">${name}${rain >= 30 ? `<span class="rain">💧 ${rain}%</span>` : ""}</span>
      <span class="i" title="${dd.text}">${dd.icon}</span>
      <span class="min">${round(dl.temperature_2m_min[i])}°</span>
      <span class="bar"><span style="left:${left}%;width:${Math.max(width, 4)}%"></span></span>
      <span class="max">${round(dl.temperature_2m_max[i])}°</span>
    </li>`;
  }).join("");
}

function setActive(city) {
  document.querySelectorAll(".quick button").forEach((b) => {
    b.classList.toggle("active", b.dataset.city === city);
  });
}

function choose(city, lat, lon) {
  setActive(city);
  loadWeather(city, lat, lon);
}

document.querySelectorAll(".quick button").forEach((b) => {
  b.addEventListener("click", () => choose(b.dataset.city, b.dataset.lat, b.dataset.lon));
});

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("city").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`${GEO_URL}?${new URLSearchParams({ name: q, count: 1, language: "lv", countryCode: "LV" })}`);
    const data = await res.json();
    const place = data.results && data.results[0];
    if (!place) {
      showMessage(`Pilsēta "${q}" Latvijā netika atrasta.`);
      return;
    }
    $("city").value = "";
    choose(place.name, place.latitude, place.longitude);
  } catch {
    showMessage("Meklēšana neizdevās. Mēģini vēlreiz.");
  }
});

// Sākumā rāda pēdējo izvēlēto pilsētu vai Cēsis
let saved = null;
try { saved = JSON.parse(localStorage.getItem("laiks-city")); } catch {}
if (saved && saved.city) choose(saved.city, saved.lat, saved.lon);
else choose("Cēsis", 57.3119, 25.2706);
