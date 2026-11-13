const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WX_URL = "https://api.open-meteo.com/v1/forecast";

const $ = (id) => document.getElementById(id);
let unit = localStorage.getItem("weatherUnit") || "celsius";
let currentPlace = null;

const weatherInfo = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Thunderstorm with hail", "⛈️"],
};

function getWeather(code) {
  return weatherInfo[code] || ["Unknown", "🌡️"];
}
function getJSON(url) {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Network error (${response.status})`);
    return response.json();
  });
}
function setStatus(message) {
  $("status").textContent = message;
}
function showCards(show) {
  ["currentCard", "hourlyCard", "dailyCard"].forEach((id) =>
    $(id).classList.toggle("hidden", !show)
  );
}
function formatTime(value) {
  return value ? value.slice(11, 16) : "--";
}
function saveRecent(name) {
  let list = JSON.parse(localStorage.getItem("recentCities") || "[]");
  list = [
    name,
    ...list.filter((city) => city.toLowerCase() !== name.toLowerCase()),
  ].slice(0, 5);
  localStorage.setItem("recentCities", JSON.stringify(list));
  renderRecent();
}
function renderRecent() {
  const box = $("recentSearches");
  box.innerHTML = "";
  const list = JSON.parse(localStorage.getItem("recentCities") || "[]");
  list.forEach((city) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = city;
    button.addEventListener("click", () => searchCity(city));
    box.appendChild(button);
  });
}
function displayForecast(data, place) {
  const now = data.current;
  const today = data.daily;
  const [description, icon] = getWeather(now.weather_code);
  $("placeName").textContent = place;
  $("updatedAt").textContent = `Updated: ${formatTime(now.time)}`;
  $("weatherIcon").textContent = icon;
  $("temperature").textContent = `${Math.round(now.temperature_2m)}°`;
  $("condition").textContent = description;
  $("feelsLike").textContent = `${Math.round(now.apparent_temperature)}°`;
  $("humidity").textContent = `${now.relative_humidity_2m}%`;
  $("wind").textContent = `${now.wind_speed_10m} km/h`;
  $("pressure").textContent = `${Math.round(now.pressure_msl)} hPa`;
  $("uv").textContent = today.uv_index_max[0];
  $("sunrise").textContent = formatTime(today.sunrise[0]);
  $("sunset").textContent = formatTime(today.sunset[0]);

  const hourly = $("hourlyForecast");
  hourly.innerHTML = "";
  const start = data.hourly.time.findIndex((t) => t >= now.time);
  data.hourly.time.slice(start, start + 24).forEach((time, index) => {
    const i = start + index;
    const [desc, emoji] = getWeather(data.hourly.weather_code[i]);
    const item = document.createElement("div");
    item.className = "hour-item";
    item.innerHTML = `<span class="hour-time">${formatTime( time )}</span><span class="small-icon">${emoji}</span><strong>${Math.round( data.hourly.temperature_2m[i] )}°</strong>`;
    item.title = desc;
    hourly.appendChild(item);
  });

  const daily = $("dailyForecast");
  daily.innerHTML = "";
  today.time.forEach((date, i) => {
    const [desc, emoji] = getWeather(today.weather_code[i]);
    const row = document.createElement("div");
    row.className = "daily-row";
    const day = new Date(`${date}T12:00:00`).toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    row.innerHTML = `<span class="daily-day">${day}</span><span>${emoji}</span><span class="daily-desc">${desc}</span><strong>${Math.round( today.temperature_2m_max[i] )}° / ${Math.round(today.temperature_2m_min[i])}°</strong>`;
    daily.appendChild(row);
  });

  document.body.classList.toggle("night", now.is_day === 0);
  showCards(true);
}
async function loadWeather(place) {
  currentPlace = place;
  setStatus("Loading weather information...");
  const temperatureUnit = unit === "celsius" ? "celsius" : "fahrenheit";
  const url =
    `${WX_URL}?latitude=${place.lat}&longitude=${place.lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max` +
    `&temperature_unit=${temperatureUnit}&timezone=auto&forecast_days=7`;
  try {
    const data = await getJSON(url);
    displayForecast(data, place.name);
    setStatus("Weather information loaded successfully.");
  } catch (error) {
    showCards(false);
    setStatus(
      "Unable to load weather. Please check your internet connection and try again."
    );
    console.error(error);
  }
}
async function searchCity(name) {
  const city = name.trim();
  if (!city) {
    setStatus("Please enter a city name.");
    return;
  }
  setStatus("Searching city...");
  try {
    const data = await getJSON(
      `${GEO_URL}?name=${encodeURIComponent( city )}&count=1&language=en&format=json`
    );
    if (!data.results || data.results.length === 0) {
      showCards(false);
      setStatus("City not found. Please check the spelling and try again.");
      return;
    }
    const result = data.results[0];
    const placeName = [result.name, result.admin1, result.country]
      .filter(Boolean)
      .join(", ");
    const place = {
      name: placeName,
      lat: result.latitude,
      lon: result.longitude,
    };
    saveRecent(result.name);
    await loadWeather(place);
  } catch (error) {
    showCards(false);
    setStatus("Something went wrong. Please try again.");
    console.error(error);
  }
}
$("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  searchCity($("cityInput").value);
});
$("unitBtn").addEventListener("click", async () => {
  unit = unit === "celsius" ? "fahrenheit" : "celsius";
  localStorage.setItem("weatherUnit", unit);
  $("unitBtn").textContent = unit === "celsius" ? "°C" : "°F";
  if (currentPlace) await loadWeather(currentPlace);
});
$("locationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus(
      "Geolocation is not supported by this browser. Search for a city instead."
    );
    return;
  }
  setStatus("Getting your current location...");
  navigator.geolocation.getCurrentPosition(
    (position) =>
      loadWeather({
        name: "Your current location",
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }),
    () =>
      setStatus(
        "Location permission denied or unavailable. Please search for a city."
      )
  );
});

$("unitBtn").textContent = unit === "celsius" ? "°C" : "°F";
renderRecent();
searchCity("Chennai");
