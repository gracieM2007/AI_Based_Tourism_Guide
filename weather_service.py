"""
weather_service.py
-------------------
TripMitra AI - Live Nagpur Weather Intelligence & Tourism Advisory Service.
Fetches real-time weather, temperature, sunset time, and air metrics from Open-Meteo REST API
(100% free, zero API key required). Includes smart tourist advisory and offline fallback.
"""

import json
import time
import urllib.request
from urllib.error import URLError

# Nagpur City Coordinates
NAGPUR_LAT = 21.1458
NAGPUR_LON = 79.0882

# Simple in-memory cache (valid for 15 minutes)
_weather_cache = {
    "data": None,
    "timestamp": 0
}
CACHE_DURATION_SECONDS = 900  # 15 minutes

# WMO Weather Interpretation Codes (WW)
WMO_WEATHER_MAP = {
    0: ("Clear Sky", "fa-sun", "clear"),
    1: ("Mainly Clear", "fa-cloud-sun", "fair"),
    2: ("Partly Cloudy", "fa-cloud-sun", "fair"),
    3: ("Overcast", "fa-cloud", "cloudy"),
    45: ("Foggy", "fa-smog", "fog"),
    48: ("Depositing Rime Fog", "fa-smog", "fog"),
    51: ("Light Drizzle", "fa-cloud-rain", "rain"),
    53: ("Moderate Drizzle", "fa-cloud-rain", "rain"),
    55: ("Dense Drizzle", "fa-cloud-showers-heavy", "rain"),
    61: ("Slight Rain", "fa-cloud-rain", "rain"),
    63: ("Moderate Rain", "fa-cloud-showers-heavy", "rain"),
    65: ("Heavy Rain", "fa-cloud-showers-water", "rain"),
    71: ("Slight Snowfall", "fa-snowflake", "snow"),
    80: ("Slight Rain Showers", "fa-cloud-rain", "rain"),
    81: ("Moderate Showers", "fa-cloud-showers-heavy", "rain"),
    82: ("Violent Showers", "fa-bolt", "rain"),
    95: ("Thunderstorm", "fa-bolt", "storm"),
    96: ("Thunderstorm with Hail", "fa-cloud-bolt", "storm")
}

def generate_tourist_advisory(temp_c, condition_type, rain_mm, sunset_time):
    """Generates intelligent travel packing & timing recommendations based on live conditions."""
    tips = []
    
    # Temperature based advisory
    if temp_c >= 38:
        advisory_type = "heat_warning"
        advisory_title = "Peak Summer Heat Advisory"
        tips.append("Hydration essential. Temperatures exceed 38°C in Nagpur.")
        tips.append("Visit air-conditioned indoor spots (Raman Science Centre, Narrow Gauge Museum) from 12:00 PM to 03:30 PM.")
        tips.append("Reserve outdoor water bodies (Futala Lake, Ambazari) strictly for post-sunset hours.")
    elif temp_c >= 32:
        advisory_type = "warm_day"
        advisory_title = "Warm & Sunny Nagpur Weather"
        tips.append("Wear breathable cotton clothing, sunglasses, and carry sun protection.")
        tips.append("Ideal for morning temple tours (Deekshabhoomi, Dragon Palace) before 11:30 AM.")
        tips.append(f"Sunset expected around {sunset_time} — prime time for Futala Lake promenade.")
    elif temp_c >= 22:
        advisory_type = "pleasant"
        advisory_title = "Pleasant Touring Weather"
        tips.append("Comfortable climate for full-day city exploration and heritage trails.")
        tips.append("Perfect conditions for Pench Tiger Safari, Ramtek Fort excursions, and botanical walks.")
        tips.append(f"Catch golden hour around {sunset_time} at Ambazari Lake or Seminary Hills.")
    else:
        advisory_type = "cool_evening"
        advisory_title = "Brisk & Cool Climate"
        tips.append("Carry a light jacket or cardigan for breezy morning and evening lake walks.")
        tips.append("Great time for hot Tarri Poha breakfast and roadside Saoji dining.")

    # Rain / Condition specific addition
    if condition_type in ("rain", "storm") or rain_mm > 0.5:
        tips.append("Possibility of rain showers. Keep an umbrella handy and prefer paved heritage spots.")

    return {
        "type": advisory_type,
        "title": advisory_title,
        "tips": tips,
        "recommended_sunset_window": f"{sunset_time} (Golden Hour at Futala Lake)"
    }

def get_fallback_weather():
    """Returns reliable baseline Nagpur seasonal weather if live network request fails."""
    return {
        "source": "TripMitra AI Weather Engine (Nagpur Baseline Model)",
        "city": "Nagpur, Maharashtra",
        "latitude": NAGPUR_LAT,
        "longitude": NAGPUR_LON,
        "temperature_c": 30.5,
        "feels_like_c": 31.0,
        "humidity_percent": 48,
        "condition": "Mainly Clear",
        "condition_icon": "fa-cloud-sun",
        "condition_type": "fair",
        "wind_speed_kmh": 11.2,
        "max_temp_c": 34.0,
        "min_temp_c": 22.0,
        "sunset_time": "06:18 PM",
        "advisory": generate_tourist_advisory(30.5, "fair", 0.0, "06:18 PM")
    }

def get_nagpur_live_weather():
    """
    Fetches real-time weather from Open-Meteo API for Nagpur coordinates.
    Caches responses for 15 minutes to guarantee fast performance and zero latency.
    """
    now = time.time()
    if _weather_cache["data"] and (now - _weather_cache["timestamp"] < CACHE_DURATION_SECONDS):
        return _weather_cache["data"]

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={NAGPUR_LAT}&longitude={NAGPUR_LON}&"
        f"current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&"
        f"daily=weather_code,temperature_2m_max,temperature_2m_min,sunset&"
        f"timezone=Asia%2FKolkata"
    )

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "TripMitraAI-NagpurTourism/1.0 (CollegeMiniProjectDemo)"}
        )
        with urllib.request.urlopen(req, timeout=3.5) as response:
            if response.status == 200:
                payload = json.loads(response.read().decode('utf-8'))
                
                curr = payload.get("current", {})
                daily = payload.get("daily", {})

                temp_c = round(float(curr.get("temperature_2m", 30.0)), 1)
                feels_like = round(float(curr.get("apparent_temperature", temp_c)), 1)
                humidity = int(curr.get("relative_humidity_2m", 50))
                wind_speed = round(float(curr.get("wind_speed_10m", 10.0)), 1)
                rain_mm = float(curr.get("precipitation", 0.0))
                wmo_code = int(curr.get("weather_code", 1))

                # Parse condition info
                condition_label, icon, condition_type = WMO_WEATHER_MAP.get(
                    wmo_code, ("Clear / Fair", "fa-sun", "fair")
                )

                # Daily highs/lows and sunset
                max_temp = round(float(daily.get("temperature_2m_max", [temp_c + 3])[0]), 1)
                min_temp = round(float(daily.get("temperature_2m_min", [temp_c - 6])[0]), 1)
                
                # Format sunset time string (e.g. "2026-09-24T18:14" -> "06:14 PM")
                sunset_raw = daily.get("sunset", ["18:15"])[0]
                sunset_formatted = "06:15 PM"
                if "T" in sunset_raw:
                    time_part = sunset_raw.split("T")[1]
                    parts = time_part.split(":")
                    h, m = int(parts[0]), int(parts[1])
                    period = "PM" if h >= 12 else "AM"
                    h12 = h - 12 if h > 12 else (12 if h == 0 else h)
                    sunset_formatted = f"{h12:02d}:{m:02d} {period}"

                advisory = generate_tourist_advisory(temp_c, condition_type, rain_mm, sunset_formatted)

                weather_result = {
                    "source": "Open-Meteo Global REST API (Live)",
                    "city": "Nagpur, Maharashtra",
                    "latitude": NAGPUR_LAT,
                    "longitude": NAGPUR_LON,
                    "temperature_c": temp_c,
                    "feels_like_c": feels_like,
                    "humidity_percent": humidity,
                    "condition": condition_label,
                    "condition_icon": icon,
                    "condition_type": condition_type,
                    "wind_speed_kmh": wind_speed,
                    "max_temp_c": max_temp,
                    "min_temp_c": min_temp,
                    "sunset_time": sunset_formatted,
                    "advisory": advisory
                }

                _weather_cache["data"] = weather_result
                _weather_cache["timestamp"] = now
                return weather_result

    except (URLError, TimeoutError, Exception) as e:
        print(f"[WeatherService] Live API unavailable or offline, using fallback: {e}")

    # Return fallback if network fails
    fallback = get_fallback_weather()
    _weather_cache["data"] = fallback
    _weather_cache["timestamp"] = now
    return fallback
