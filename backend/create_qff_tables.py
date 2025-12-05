"""
Create QFF travel tables in the database
"""
import sys
import os

src_path = os.path.join(os.path.dirname(__file__), 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from database import engine, Base
from models import TravelOutputTemplate, TravelAirline, TravelAirport

def create_tables():
    print("Creating QFF travel tables...")
    Base.metadata.create_all(bind=engine, tables=[
        TravelOutputTemplate.__table__,
        TravelAirline.__table__,
        TravelAirport.__table__
    ])
    print("Tables created successfully!")
    print("  - qff_travel_templates")
    print("  - qff_travel_airlines")
    print("  - qff_travel_airports")

if __name__ == "__main__":
    create_tables()
