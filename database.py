import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'nagpur_tourism.db')

def get_db_connection():
    """Returns a SQLite database connection with row factory configured."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db_schema():
    """Creates database tables and automatically seeds destinations if table is empty."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Destinations Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS destinations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            location TEXT NOT NULL,
            estimated_budget INTEGER NOT NULL,
            budget_tier TEXT NOT NULL,
            ideal_duration_hours REAL NOT NULL,
            duration_category TEXT NOT NULL,
            best_for TEXT NOT NULL,
            tags TEXT NOT NULL,
            rating REAL DEFAULT 4.5,
            family_friendly REAL DEFAULT 0.8,
            nature_score REAL DEFAULT 0.5,
            adventure_score REAL DEFAULT 0.5,
            historical_score REAL DEFAULT 0.5,
            spiritual_score REAL DEFAULT 0.5,
            photography_score REAL DEFAULT 0.5,
            food_score REAL DEFAULT 0.5,
            entertainment_score REAL DEFAULT 0.5,
            primary_experience TEXT DEFAULT 'exploring',
            preferred_groups TEXT DEFAULT 'friends,family',
            distance_from_nagpur_center REAL DEFAULT 5.0,
            best_time_to_visit TEXT DEFAULT 'All Year',
            opening_hours TEXT DEFAULT 'Open 24 Hours',
            interesting_facts TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            latitude REAL DEFAULT 21.1458,
            longitude REAL DEFAULT 79.0882,
            is_hidden_gem INTEGER DEFAULT 0,
            nearby_food_name TEXT DEFAULT 'Haldiram Food Hub',
            nearby_food_id TEXT DEFAULT 'food-haldiram-shankar'
        )
    ''')

    # Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Preferences Query Log Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            budget TEXT NOT NULL,
            duration TEXT NOT NULL,
            interests TEXT NOT NULL,
            experience TEXT NOT NULL,
            group_type TEXT NOT NULL,
            distance_pref TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Recommendation History Log Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            preference_id INTEGER,
            destination_id INTEGER,
            match_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (preference_id) REFERENCES preferences(id),
            FOREIGN KEY (destination_id) REFERENCES destinations(id)
        )
    ''')

    conn.commit()
    
    # Auto-check if table is empty
    count = cursor.execute("SELECT COUNT(*) FROM destinations").fetchone()[0]
    conn.close()

    if count == 0:
        print("Destinations table is empty. Auto-seeding database...")
        try:
            from init_db import seed_database
            seed_database()
        except Exception as e:
            print("Auto-seed error:", e)
    else:
        print(f"Database ready with {count} destinations!")

if __name__ == "__main__":
    init_db_schema()
