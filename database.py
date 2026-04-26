import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Please check the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the .env file")

# Create Supabase client (backend-only)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("✅ Supabase database connection initialized (using service_role key)")