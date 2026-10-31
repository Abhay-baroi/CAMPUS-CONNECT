import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

logger = logging.getLogger("campusconnect.supabase")

# Load environment variables: check backend/.env first, then fallback to current directory
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_env = os.path.join(backend_dir, ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)
load_dotenv()

raw_url: str = os.getenv("SUPABASE_URL", "https://mtoxqsxnntfistbdoiyd.supabase.co").strip().strip('"').strip("'")
raw_key: str = os.getenv("SUPABASE_KEY", "").strip().strip('"').strip("'")

# Defensive auto-swap if developer placed key in SUPABASE_URL and url in SUPABASE_KEY
if (not raw_url.startswith("http") and raw_key.startswith("http")) or (raw_url.startswith("sb_") and "supabase.co" in raw_key):
    logger.warning("Detected swapped SUPABASE_URL and SUPABASE_KEY in environment. Automatically correcting.")
    raw_url, raw_key = raw_key, raw_url

SUPABASE_URL: str = raw_url or "https://mtoxqsxnntfistbdoiyd.supabase.co"
SUPABASE_KEY: str = raw_key

if not SUPABASE_KEY:
    logger.warning("[WARNING] MISSING SUPABASE_KEY in environment or .env file.")


# Initialize the Supabase Client
try:
    supabase: Client = create_client(
        SUPABASE_URL if SUPABASE_URL.startswith("http") else "https://mtoxqsxnntfistbdoiyd.supabase.co",
        SUPABASE_KEY or "dummy-key-placeholder"
    )
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    supabase = None