import sys
import os

# Add backend directory to path so app.main, app.routes, and app.supabase_client can be imported
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(backend_path))

from app.main import app
