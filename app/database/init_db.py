import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.database.database import engine, Base
# Import all models to ensure they are registered with Base metadata
import app.models

def init_db():
    print("Menciptakan tabel di database...")
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("Tabel berhasil diciptakan.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    init_db()
