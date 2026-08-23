"""
itinerary_generator.py
----------------------
TripMitra AI - Dynamic N-Day Realistic Itinerary Engine.
Generates realistic, duration-calculated travel timetables with transit buffers,
Nagpur best food spots, and local hidden gems for any user-entered number of days (1 to 10 days).
"""

# Iconic Nagpur Local Food Spots
NAGPUR_BEST_FOODS = [
    {
        "name": "Keshav Tarri Poha & Ramji Shamji Breakfast Hub",
        "meal": "Breakfast",
        "description": "Start your morning with Nagpur's famous fiery Tarri Poha (steamed rice flakes topped with spicy chickpea gravy), roasted samosas, and piping hot Jalebi.",
        "tip": "Ask for extra 'Tarri' chickpea gravy and fresh cut onions for the authentic local experience.",
        "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "name": "Authentic Shankar Nagar Saoji Curry Feast",
        "meal": "Lunch",
        "description": "Indulge in Nagpur's legendary Saoji cuisine featuring aromatic spicy Mutton/Chicken Saoji, Patodi Rassa, Jowar Bhakri, and fresh buttermilk.",
        "tip": "Follow up lunch with fresh Nagpur Orange Juice or Santra Kulfi to balance the Saoji spices.",
        "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "name": "Haldiram's Origin Sweets & Nagpur Orange Barfi Tasting",
        "meal": "Snacks",
        "description": "Visit the flagship Haldiram's sweet house originating in Nagpur to taste fresh Santra (Orange) Barfi, Kaju Katli, and regional snacks.",
        "tip": "Pack gift boxes of Orange Barfi for family & friends before leaving.",
        "image_url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "name": "Futala Lake Matka Kulfi & Sunset Food Street",
        "meal": "Dinner / Night",
        "description": "Enjoy evening street food beside Futala Lake promenade, featuring Matka Kulfi, Pav Bhaji, Bhel Puri, and lakeside tea.",
        "tip": "Prime sunset view between 06:15 PM and 07:15 PM.",
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80"
    }
]

# Quiet Local Hidden Gems around Nagpur
NAGPUR_HIDDEN_GEMS = [
    {
        "name": "Sonegaon Lake & Heritage Stepwell",
        "category": "Hidden Gem",
        "description": "Tranquil local lake and 18th-century Maratha stone stepwell (Baoli) hidden away near airport road.",
        "duration_hours": 1.5,
        "tip": "Peaceful sunset spot without tourist crowds. Great for heritage stepwell photography.",
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "name": "Civil Lines Heritage Banyan Canopy Walk",
        "category": "Hidden Gem",
        "description": "Quiet shaded walking corridor under century-old Banyan tree canopies in historic Civil Lines.",
        "duration_hours": 1.5,
        "tip": "Best visited early morning or late afternoon for quiet nature walks.",
        "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80"
    }
]

def calculate_transit_time_text(distance_km):
    """Calculates realistic driving transit time based on distance from city center."""
    dist = float(distance_km or 5.0)
    if dist <= 3.0:
        return "10 mins drive (Central City)"
    elif dist <= 8.0:
        return "18 mins drive via Wardha / Amravati Road"
    elif dist <= 20.0:
        return "30 mins drive via Ring Road / Highway"
    elif dist <= 50.0:
        return "50 mins drive via NH-44 Expressway"
    else:
        return "1 hr 20 mins drive via Jabalpur Highway"

def generate_personalized_itinerary(top_recommendations, num_days=2, user_prefs=None):
    """
    Generates a realistic, duration-based N-day itinerary matching exact user-entered days (1 to 10 days).
    Each day features 5 realistic time slots calculated using exact destination ideal_duration_hours,
    transit travel buffers, Nagpur best food spots, and local hidden gems.
    """
    try:
        days_count = max(1, min(10, int(num_days)))
    except (ValueError, TypeError):
        days_count = 2

    if not top_recommendations:
        return []

    itinerary = []
    rec_pool = list(top_recommendations)
    rec_len = len(rec_pool)

    for day_idx in range(days_count):
        day_num = day_idx + 1

        # Pick primary morning and afternoon destinations for this day
        morn_dest = rec_pool[day_idx % rec_len]
        aft_dest = rec_pool[(day_idx + 2) % rec_len] if rec_len > 1 else morn_dest
        eve_dest = rec_pool[(day_idx + 1) % rec_len] if rec_len > 2 else morn_dest

        # Pick food and hidden gem variations
        breakfast_spot = NAGPUR_BEST_FOODS[0]
        lunch_spot = NAGPUR_BEST_FOODS[1]
        snack_spot = NAGPUR_BEST_FOODS[2]
        dinner_spot = NAGPUR_BEST_FOODS[3]
        hidden_gem = NAGPUR_HIDDEN_GEMS[day_idx % len(NAGPUR_HIDDEN_GEMS)]

        morn_duration = float(morn_dest.get("ideal_duration_hours", 2.5))
        aft_duration = float(aft_dest.get("ideal_duration_hours", 2.0))

        morn_transit = calculate_transit_time_text(morn_dest.get("distance_from_nagpur_center", 5.0))
        aft_transit = calculate_transit_time_text(aft_dest.get("distance_from_nagpur_center", 5.0))

        day_schedule = [
            # 1. MORNING BREAKFAST (08:30 AM - 09:30 AM)
            {
                "time": "08:30 AM - 09:30 AM",
                "period": "Nagpur Best Breakfast",
                "destination_id": None,
                "destination_name": breakfast_spot["name"],
                "category": "Culinary & Local Food",
                "activity": breakfast_spot["description"],
                "tip": f"Transit: 10 mins from central hotel. {breakfast_spot['tip']}",
                "image_url": breakfast_spot["image_url"]
            },

            # 2. MORNING MAIN EXPLORATION (09:45 AM - 12:30 PM)
            {
                "time": f"09:45 AM - {12 if morn_duration >= 2.5 else 11}:30 AM",
                "period": "Morning Sightseeing",
                "destination_id": morn_dest.get("id"),
                "destination_name": morn_dest.get("name"),
                "category": morn_dest.get("category", "Tourism"),
                "activity": f"Visit {morn_dest.get('name')}. {morn_dest.get('description')}",
                "tip": f"Transit Buffer: {morn_transit}. Recommended time required: {morn_duration} hours. Opening hours: {morn_dest.get('opening_hours', 'Open daily')}.",
                "image_url": morn_dest.get("image_url")
            },

            # 3. ICONIC SAOJI LUNCH BREAK (01:00 PM - 02:30 PM)
            {
                "time": "01:00 PM - 02:30 PM",
                "period": "Authentic Saoji Lunch",
                "destination_id": None,
                "destination_name": lunch_spot["name"],
                "category": "Dining & Rest",
                "activity": lunch_spot["description"],
                "tip": lunch_spot["tip"],
                "image_url": lunch_spot["image_url"]
            },

            # 4. AFTERNOON HIDDEN GEM & EXCURSION (03:00 PM - 05:30 PM)
            {
                "time": "03:00 PM - 05:30 PM",
                "period": "Afternoon Tour & Hidden Gem",
                "destination_id": aft_dest.get("id") if (day_idx % 2 == 0) else None,
                "destination_name": aft_dest.get("name") if (day_idx % 2 == 0) else hidden_gem["name"],
                "category": aft_dest.get("category") if (day_idx % 2 == 0) else hidden_gem["category"],
                "activity": f"Excursion to {aft_dest.get('name') if (day_idx % 2 == 0) else hidden_gem['name']}. {aft_dest.get('best_for') if (day_idx % 2 == 0) else hidden_gem['description']}",
                "tip": f"Transit Buffer: {aft_transit}. Time required: {aft_duration if (day_idx % 2 == 0) else hidden_gem['duration_hours']} hours.",
                "image_url": aft_dest.get("image_url") if (day_idx % 2 == 0) else hidden_gem["image_url"]
            },

            # 5. EVENING SUNSET PROMENADE & STREET FOOD (06:00 PM - 08:30 PM)
            {
                "time": "06:00 PM - 08:30 PM",
                "period": "Evening Sunset & Dinner",
                "destination_id": eve_dest.get("id"),
                "destination_name": f"{eve_dest.get('name')} & {dinner_spot['name']}",
                "category": "Sunset & Food Walk",
                "activity": f"Evening sunset stroll at {eve_dest.get('name')} followed by local food street tasting (Pav Bhaji, Matka Kulfi, Orange sweets).",
                "tip": f"{dinner_spot['tip']} Distance: {eve_dest.get('distance_from_nagpur_center', 6.0)} km from central city.",
                "image_url": eve_dest.get("image_url")
            }
        ]

        day_title = f"Day {day_num}: {morn_dest.get('name')} & Nagpur Culinary Secrets"
        if day_num == 1:
            day_title = f"Day 1: Central Nagpur Icons, Saoji Lunch & Futala Sunset"
        elif day_num == 2:
            day_title = f"Day 2: Wilderness Safaris, Hidden Gems & Orange Sweets"
        elif day_num == 3:
            day_title = f"Day 3: Pilgrimage Circuit, Heritage Stepwells & Food Walk"

        itinerary.append({
            "day": day_num,
            "title": day_title,
            "schedule": day_schedule
        })

    return itinerary
