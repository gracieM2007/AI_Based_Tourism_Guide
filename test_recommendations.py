from database import get_db_connection
from recommendation_engine import get_recommendations
from itinerary_generator import generate_personalized_itinerary

def test_dynamic_nday_itineraries():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM destinations").fetchall()
    conn.close()
    destinations = [dict(row) for row in rows]
    
    print(f"Total destinations loaded from SQLite: {len(destinations)}")
    assert len(destinations) >= 20, "Should have at least 20 destinations"

    # Test custom 4-Day Trip Input
    pref_4day = {
        "budget_amount": 1500,
        "max_distance": 45,
        "num_days": 4,
        "interests": ["Nature", "Food", "History"],
        "experience": "exploring",
        "group_type": "family"
    }

    recs = get_recommendations(destinations, pref_4day, top_n=5)
    itinerary_4days = generate_personalized_itinerary(recs, num_days=4, user_prefs=pref_4day)

    print(f"\nGenerated Itinerary Days Count: {len(itinerary_4days)}")
    assert len(itinerary_4days) == 4, "Should generate exactly 4 days of itinerary!"

    for day in itinerary_4days:
        print(f"\n{day['title']} ({len(day['schedule'])} Time Slots):")
        for slot in day['schedule']:
            print(f"  - [{slot['time']}] {slot['destination_name']} ({slot['period']}) -> {slot['tip'][:70]}...")

    print("\n[SUCCESS] TEST PASSED! Dynamic N-Day Realistic Itinerary Engine functioning cleanly.")

if __name__ == "__main__":
    test_dynamic_nday_itineraries()
