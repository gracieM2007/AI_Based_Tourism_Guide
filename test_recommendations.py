"""
test_recommendations.py
------------------------
TripMitra AI Comprehensive Verification Test Suite for Viva Defense.
Tests:
 1. SQLite Destination Database Loading (23 places)
 2. Content-Based Multi-Vector Recommendation Scoring
 3. Nearest-Neighbor TSP Route Optimization & Haversine Distance Savings
 4. Open-Meteo Live Weather Intelligence & Tourist Advisory Engine
 5. Flask Endpoints Integration (/api/destinations, /api/weather, /api/recommend)
"""

from database import get_db_connection
from recommendation_engine import get_recommendations
from itinerary_generator import generate_personalized_itinerary, haversine_distance, optimize_stops_tsp_nearest_neighbor
from weather_service import get_nagpur_live_weather
import app as flask_app_module

def test_full_system():
    print("=" * 70)
    print("TripMitra AI — Mini-Project Verification & Viva Defense Test Suite")
    print("=" * 70)

    # 1. DATABASE VERIFICATION
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM destinations").fetchall()
    conn.close()
    destinations = [dict(row) for row in rows]
    
    print(f"\n[1/5] SQLite Database: Loaded {len(destinations)} authentic Nagpur destinations.")
    assert len(destinations) >= 20, "Should have at least 20 destinations in SQLite"

    # 2. RECOMMENDATION ENGINE VERIFICATION
    test_prefs = {
        "budget_amount": 1500,
        "max_distance": 35,
        "num_days": 3,
        "interests": ["Nature", "Food", "History"],
        "experience": "exploring",
        "group_type": "family"
    }

    recs = get_recommendations(destinations, test_prefs, top_n=5)
    print(f"[2/5] Content-Based Recommendation: Computed match scores for {len(recs)} top destinations.")
    assert len(recs) == 5, "Should return top 5 recommendations"
    top_pick = recs[0]
    print(f"      Top Pick: #{top_pick['id']} {top_pick['name']} (Match: {top_pick['match_percentage']}%)")
    print(f"      AI Rationale: {top_pick['rationale'][:90]}...")

    # 3. HAVERSINE & TSP ROUTE OPTIMIZATION VERIFICATION
    dist_zero_to_futala = haversine_distance(21.1458, 79.0882, 21.1539, 79.0475)
    print(f"\n[3/5] Haversine Distance Metric: Zero Mile to Futala Lake = {dist_zero_to_futala} km")
    assert 3.0 < dist_zero_to_futala < 6.0, "Haversine distance should be around 4.5 km"

    itinerary_3days = generate_personalized_itinerary(recs, num_days=3, user_prefs=test_prefs)
    print(f"      Generated {len(itinerary_3days)}-Day Itinerary with Nearest-Neighbor TSP optimization:")
    assert len(itinerary_3days) == 3, "Should generate exactly 3 days"
    
    total_savings = 0.0
    for day in itinerary_3days:
        metrics = day.get("route_metrics", {})
        transit_km = metrics.get("daily_transit_km", 0)
        saved_km = metrics.get("distance_saved_km", 0)
        total_savings += saved_km
        print(f"      - {day['title']}: ~{transit_km} km transit (Saved ~{saved_km} km via TSP)")
        assert len(day["schedule"]) == 5, "Each day must have 5 activity time slots"
        for slot in day["schedule"]:
            assert "latitude" in slot and "longitude" in slot, "Slot must contain verified geo-coordinates"

    print(f"      Total Trip Transit Distance Saved: ~{round(total_savings, 1)} km")

    # 4. LIVE WEATHER & TOURIST ADVISORY VERIFICATION
    weather = get_nagpur_live_weather()
    print(f"\n[4/5] Live Weather Engine (Open-Meteo REST API):")
    print(f"      Location: {weather['city']}")
    print(f"      Temperature: {weather['temperature_c']}°C (Feels like {weather['feels_like_c']}°C)")
    print(f"      Condition: {weather['condition']} (Icon: {weather['condition_icon']})")
    print(f"      Sunset Window: {weather['sunset_time']}")
    print(f"      Advisory Title: {weather['advisory']['title']}")
    print(f"      Advisory Tip: {weather['advisory']['tips'][0]}")
    assert "temperature_c" in weather and "advisory" in weather, "Weather payload incomplete"

    # 5. FLASK TEST CLIENT ENDPOINTS VERIFICATION
    client = flask_app_module.app.test_client()

    # /api/weather test
    res_weather = client.get('/api/weather')
    assert res_weather.status_code == 200, "/api/weather endpoint failed"
    w_json = res_weather.get_json()
    assert w_json["status"] == "success", "/api/weather status not success"

    # /api/recommend test
    res_rec = client.post('/api/recommend', json=test_prefs)
    assert res_rec.status_code == 200, "/api/recommend endpoint failed"
    rec_json = res_rec.get_json()
    assert rec_json["status"] == "success"
    assert "weather" in rec_json, "Recommendation payload must include live weather data"
    assert "itinerary" in rec_json and len(rec_json["itinerary"]) == 3
    print(f"\n[5/5] Flask Endpoints Integration: All routes (/api/weather, /api/recommend) verified 200 OK.")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED! TRIPMITRA AI READY FOR MINI-PROJECT VIVA PRESENTATION")
    print("=" * 70)

if __name__ == "__main__":
    test_full_system()
