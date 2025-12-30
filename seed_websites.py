import json
import os
from urllib.parse import urlparse
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Error: Supabase keys not found in .env file")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_domain_name(url):
    """Extracts a readable name from the URL (e.g., 'techcrunch.com' -> 'Techcrunch')"""
    try:
        domain = urlparse(url).netloc
        if domain.startswith("www."):
            domain = domain[4:]
        # Capitalize the first letter
        name = domain.split('.')[0].capitalize()
        return name
    except:
        return "Unknown Site"

def seed_database():
    print("--- 🚀 Seeding Websites to Supabase ---")
    
    try:
        # Load your existing JSON list
        with open('sites.json', 'r') as f:
            sites = json.load(f)
            
        count = 0
        for url in sites:
            # 1. Check if it exists to avoid duplicates
            existing = supabase.table('websites').select('id').eq('url', url).execute()
            if existing.data:
                print(f"   [Skip] Already exists: {url}")
                continue
                
            # 2. Generate a name
            name = get_domain_name(url)
            
            # 3. Insert
            data = {"name": name, "url": url}
            supabase.table('websites').insert(data).execute()
            print(f"   [Added] {name} ({url})")
            count += 1
            
        print(f"\n✅ Success! Added {count} new websites.")
        
    except FileNotFoundError:
        print("❌ Error: sites.json file not found.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    seed_database()