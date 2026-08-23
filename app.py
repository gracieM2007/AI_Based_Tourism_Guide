import os
import sqlite3
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from database import get_db_connection, init_db_schema
from recommendation_engine import get_recommendations
from itinerary_generator import generate_personalized_itinerary

app = Flask(__name__)
app.secret_key = 'tripmitra_ai_nagpur_prototype_secret_key'

# Ensure database tables are created on startup
with app.app_context():
    init_db_schema()

@app.route('/')
def home():
    """Renders the TripMitra AI Landing Page."""
    conn = get_db_connection()
    featured = conn.execute("SELECT * FROM destinations ORDER BY rating DESC LIMIT 6").fetchall()
    conn.close()
    return render_template('index.html', featured_destinations=[dict(f) for f in featured])

@app.route('/plan')
def plan_page():
    """Renders the Multi-Step Trip Planner Page."""
    return render_template('plan.html')

@app.route('/results')
def results_page():
    """Renders Personalised Recommendations & Smart Itinerary."""
    return render_template('results.html')

@app.route('/explore')
def explore_page():
    """Renders the Explore Nagpur Destinations Page."""
    conn = get_db_connection()
    all_dest = conn.execute("SELECT * FROM destinations ORDER BY rating DESC").fetchall()
    conn.close()
    return render_template('explore.html', destinations=[dict(d) for d in all_dest])

@app.route('/food')
def food_page():
    """Renders the Dedicated Nagpur Food, Saoji Restaurants & Sweets Page."""
    return render_template('food.html')

@app.route('/coming-soon')
def coming_soon_page():
    """Renders the Dedicated Future Product Roadmap Page."""
    return render_template('coming_soon.html')

@app.route('/api/destinations', methods=['GET'])
def get_all_destinations():
    """API Endpoint: Returns all available Nagpur destinations in SQLite database."""
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM destinations ORDER BY rating DESC").fetchall()
    conn.close()
    destinations = [dict(row) for row in rows]
    return jsonify({
        "status": "success",
        "total": len(destinations),
        "destinations": destinations
    })

@app.route('/api/destination/<int:dest_id>', methods=['GET'])
def get_destination_by_id(dest_id):
    """API Endpoint: Fetches single destination details by ID."""
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM destinations WHERE id = ?", (dest_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"status": "error", "message": "Destination not found"}), 404
    return jsonify({"status": "success", "destination": dict(row)})

@app.route('/api/recommend', methods=['POST'])
def recommend_api():
    """API Endpoint: Processes user preferences, executes content-based recommendation logic, logs query, and returns top picks."""
    try:
        data = request.get_json() or {}
        
        budget = data.get("budget", "under_500")
        budget_amount = data.get("budget_amount")
        max_distance = data.get("max_distance")
        duration = data.get("duration", "1_day")
        num_days = int(data.get("num_days", 2))
        interests = data.get("interests", ["Nature", "Photography"])
        experience = data.get("experience", "exploring")
        group_type = data.get("group_type", "friends")
        distance_pref = data.get("distance_pref", "any")

        user_prefs = {
            "budget": budget,
            "budget_amount": budget_amount,
            "max_distance": max_distance,
            "duration": duration,
            "num_days": num_days,
            "interests": interests,
            "experience": experience,
            "group_type": group_type,
            "distance_pref": distance_pref
        }

        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM destinations").fetchall()
        all_destinations = [dict(row) for row in rows]

        if not all_destinations:
            conn.close()
            return jsonify({"status": "error", "message": "No destinations found in database. Run init_db.py first."}), 500

        top_recommendations = get_recommendations(all_destinations, user_prefs, top_n=5)

        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO preferences (budget, duration, interests, experience, group_type, distance_pref)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (budget, f"{num_days}_days", ",".join(interests), experience, group_type, distance_pref))
        preference_id = cursor.lastrowid

        for item in top_recommendations:
            cursor.execute('''
                INSERT INTO recommendation_history (preference_id, destination_id, match_score)
                VALUES (?, ?, ?)
            ''', (preference_id, item["id"], item["match_score"]))
        
        conn.commit()
        conn.close()

        itinerary = generate_personalized_itinerary(top_recommendations, num_days=num_days, user_prefs=user_prefs)

        avg_score = round(sum(d["match_percentage"] for d in top_recommendations) / len(top_recommendations), 1) if top_recommendations else 0
        top_score = top_recommendations[0]["match_percentage"] if top_recommendations else 0

        session['last_recommendation'] = {
            "recommendations": top_recommendations,
            "itinerary": itinerary,
            "user_prefs": user_prefs,
            "stats": {
                "analyzed_count": len(all_destinations),
                "top_score": top_score,
                "avg_score": avg_score
            }
        }

        return jsonify({
            "status": "success",
            "recommendations": top_recommendations,
            "itinerary": itinerary,
            "user_prefs": user_prefs,
            "stats": {
                "analyzed_count": len(all_destinations),
                "top_score": top_score,
                "avg_score": avg_score
            }
        })

    except Exception as e:
        print(f"Error processing recommendations: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    print("Starting TripMitra AI Flask Server on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
