"""
recommendation_engine.py
-------------------------
TripMitra AI Recommendation Engine using Content-Based Filtering & Weighted Feature Matching.

Mathematical Scoring Formula:
Final Score = (Interest Match * 0.35)
            + (Budget Match * 0.20)
            + (Duration Match * 0.15)
            + (Experience Match * 0.10)
            + (Group Compatibility * 0.10)
            + (Rating Score * 0.10)
            * Distance Penalty Multiplier
"""

import numpy as np

# Feature vector attribute mapping for expanded 12+ interest categories
INTEREST_FEATURE_MAP = {
    "Nature": "nature_score",
    "Wildlife": "nature_score",
    "Adventure": "adventure_score",
    "History": "historical_score",
    "Heritage": "historical_score",
    "Spiritual": "spiritual_score",
    "Photography": "photography_score",
    "Family": "family_friendly",
    "Food": "food_score",
    "Entertainment": "entertainment_score",
    "Science": "entertainment_score",
    "Parks": "nature_score",
    "Architecture": "historical_score",
    "Shopping": "food_score"
}

BUDGET_CAPS = {
    "under_500": 500,
    "500_1000": 1000,
    "1000_2000": 2000,
    "above_2000": 5000
}

DURATION_HOURS = {
    "half_day": 4.0,
    "1_day": 10.0,
    "2_days": 24.0,
    "3_days": 48.0
}

def calculate_destination_score(dest, user_prefs):
    """Computes weighted multi-factor match score for a single destination dict."""
    # 1. Interest Match (0.35)
    user_interests = user_prefs.get("interests", [])
    if user_interests:
        interest_scores = []
        for interest in user_interests:
            feat_name = INTEREST_FEATURE_MAP.get(interest)
            if feat_name and feat_name in dest:
                interest_scores.append(float(dest[feat_name]))
        interest_match = np.mean(interest_scores) if interest_scores else 0.5
    else:
        interest_match = 0.6

    # 2. Budget Match (0.20) - Handles both numeric budget_amount and budget tier string
    user_budget_max = user_prefs.get("budget_amount")
    if user_budget_max is not None:
        user_budget_max = float(user_budget_max)
    else:
        budget_choice = user_prefs.get("budget", "under_500")
        user_budget_max = float(BUDGET_CAPS.get(budget_choice, 500))

    dest_budget = float(dest.get("estimated_budget", 0))

    if dest_budget <= user_budget_max:
        budget_match = 1.0
    else:
        excess_ratio = (dest_budget - user_budget_max) / user_budget_max
        budget_match = max(0.1, 1.0 - excess_ratio)

    # 3. Duration Match (0.15)
    duration_choice = user_prefs.get("duration", "1_day")
    available_hours = DURATION_HOURS.get(duration_choice, 10.0)
    dest_hours = float(dest.get("ideal_duration_hours", 2.0))

    if dest_hours <= available_hours:
        duration_match = 1.0
    else:
        duration_match = max(0.3, available_hours / dest_hours)

    # 4. Experience Match (0.10)
    user_exp = user_prefs.get("experience", "exploring").lower()
    dest_exp = str(dest.get("primary_experience", "")).lower()
    
    if user_exp == dest_exp:
        experience_match = 1.0
    elif user_exp in dest_exp or dest_exp in user_exp:
        experience_match = 0.8
    else:
        experience_match = 0.5

    # 5. Group Compatibility (0.10)
    user_group = user_prefs.get("group_type", "friends").lower()
    preferred_groups = [g.strip().lower() for g in str(dest.get("preferred_groups", "")).split(",")]
    
    if user_group in preferred_groups:
        group_match = 1.0
    else:
        group_match = 0.4

    # 6. Rating Score (0.10)
    dest_rating = float(dest.get("rating", 4.0))
    rating_score = dest_rating / 5.0

    # Weighted Sum Calculation
    raw_score = (
        (interest_match * 0.35) +
        (budget_match * 0.20) +
        (duration_match * 0.15) +
        (experience_match * 0.10) +
        (group_match * 0.10) +
        (rating_score * 0.10)
    )

    # Distance Radius Penalty / Multiplier - Handles numeric max_distance & string distance_pref
    dist_km = float(dest.get("distance_from_nagpur_center", 5.0))
    max_dist = user_prefs.get("max_distance")
    
    distance_multiplier = 1.0

    if max_dist is not None:
        max_dist = float(max_dist)
        if dist_km > max_dist:
            excess = dist_km - max_dist
            distance_multiplier = max(0.4, 1.0 - (excess / max_dist))
    else:
        dist_pref = user_prefs.get("distance_pref", "any").lower()
        if dist_pref == "city" and dist_km > 18.0:
            distance_multiplier = 0.65
        elif dist_pref == "nearby" and dist_km < 12.0:
            distance_multiplier = 0.85

    final_score = raw_score * distance_multiplier
    percentage = round(min(99.0, max(15.0, final_score * 100.0)), 1)

    rationale = generate_ai_rationale(dest, user_prefs, interest_match, budget_match, percentage)

    return {
        "score": final_score,
        "match_percentage": percentage,
        "interest_match_score": round(interest_match * 100, 1),
        "budget_match_score": round(budget_match * 100, 1),
        "rationale": rationale
    }

def generate_ai_rationale(dest, user_prefs, interest_match, budget_match, percentage):
    """Generates clean rationale sentence explaining recommendation without emojis."""
    reasons = []
    
    user_interests = user_prefs.get("interests", [])
    matched_interests = []
    for interest in user_interests:
        feat = INTEREST_FEATURE_MAP.get(interest)
        if feat and float(dest.get(feat, 0)) >= 0.7:
            matched_interests.append(interest.lower())
            
    if matched_interests:
        reasons.append(f"strongly matches your interest in {', '.join(matched_interests[:3])}")
    elif interest_match >= 0.7:
        reasons.append(f"aligns with your primary travel preference ({dest['category'].lower()})")

    dest_budget = dest.get("estimated_budget", 0)
    if budget_match >= 0.9:
        reasons.append(f"fits comfortably within your estimated budget (Rs. {dest_budget})")
    
    group_type = user_prefs.get("group_type", "traveler").lower()
    reasons.append(f"is well suited for {group_type} visits")

    dist = dest.get("distance_from_nagpur_center", 0)
    if dist <= 12:
        reasons.append(f"is located just {dist} km from Nagpur center")

    reason_str = ", ".join(reasons)
    return f"Recommended because your preferences {reason_str}."

def get_recommendations(destinations_list, user_prefs, top_n=5):
    """Ranks destinations by match score descending and returns top N picks."""
    scored_destinations = []
    
    for dest_dict in destinations_list:
        dest = dict(dest_dict)
        score_info = calculate_destination_score(dest, user_prefs)
        
        dest["match_score"] = score_info["score"]
        dest["match_percentage"] = score_info["match_percentage"]
        dest["rationale"] = score_info["rationale"]
        dest["interest_match_score"] = score_info["interest_match_score"]
        dest["budget_match_score"] = score_info["budget_match_score"]
        
        scored_destinations.append(dest)

    scored_destinations.sort(key=lambda x: x["match_score"], reverse=True)
    return scored_destinations[:top_n]
