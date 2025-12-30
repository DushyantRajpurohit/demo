import time
import os
import requests
import uuid
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv
from newspaper import Article, Config

# 1. Load Environment Variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Error: Supabase keys missing in .env file")

# 2. Connect to Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 3. Configuration
config = Config()
config.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
config.request_timeout = 10

def upload_image_to_supabase(image_url):
    """
    Downloads image from the web and uploads it to Supabase Storage.
    Returns the public URL of the uploaded image.
    """
    if not image_url:
        return None

    try:
        # A. Download image to memory
        print(f"        ⬇️  Fetching image: {image_url[:30]}...")
        headers = {'User-Agent': config.browser_user_agent}
        response = requests.get(image_url, headers=headers, stream=True, timeout=10)
        
        if response.status_code == 200:
            image_data = response.content
            
            # Generate unique path: "uuid.jpg"
            filename = f"{uuid.uuid4()}.jpg"
            file_path = f"scraped/{filename}"
            
            # B. Upload to Supabase Bucket 'article-images'
            supabase.storage.from_("article-images").upload(
                file=image_data,
                path=file_path,
                file_options={"content-type": "image/jpeg"}
            )
            
            # C. Get the Public URL
            public_url = supabase.storage.from_("article-images").get_public_url(file_path)
            
            print(f"        ☁️  Uploaded to Cloud: {filename}")
            return public_url
            
    except Exception as e:
        print(f"        ⚠️ Upload Failed: {e}")
        return None # Fallback: We will just use the original link if upload fails

def get_links_from_category_page(url):
    print(f"      [DEBUG] Visiting: {url}", flush=True)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/'
    }
    
    try:
        print("      [DEBUG] Requesting page...", flush=True)
        response = requests.get(url, headers=headers, timeout=15)
        print(f"      [DEBUG] Status Code: {response.status_code} | Size: {len(response.text)} chars", flush=True)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        found_links = []

        # Strategy 1: Look for headlines (h1-h5)
        tags = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5'])
        print(f"      [DEBUG] Found {len(tags)} headline tags.", flush=True)
        
        for tag in tags:
            link = None
            
            # Case A: The link is INSIDE the header (<h3><a href="...">...</a></h3>)
            a_tag = tag.find('a')
            if a_tag and 'href' in a_tag.attrs:
                link = a_tag['href']
            
            # Case B: The link WRAPS the header (<a href="..."><h3>...</h3></a>)
            elif tag.parent.name == 'a' and 'href' in tag.parent.attrs:
                link = tag.parent['href']
            
            # Case C: The header IS the link (<a class="h3" href="...">...</a>) - Rare but possible
            elif tag.name == 'a' and 'href' in tag.attrs:
                link = tag['href']

            if link:
                found_links.append(link)

        # Strategy 2: Fallback (Scan all links if headlines failed or found nothing)
        if len(found_links) == 0:
            print("      [DEBUG] Headlines yielded no links. Trying fallback scan...", flush=True)
            for link_tag in soup.find_all('a'):
                href = link_tag.get('href')
                text = link_tag.get_text().strip()
                
                # If text is long enough, assume it's an article title
                if href and text and len(text) > 25:
                    if "contact" in href or "about" in href or "login" in href:
                        continue
                    found_links.append(href)

        # Clean duplicates
        clean_links = []
        for link in found_links:
            if not link: continue
            
            # Fix relative paths
            if link.startswith('/'):
                from urllib.parse import urljoin
                link = urljoin(url, link)
            
            # Ensure it belongs to the domain
            if url in link or link.startswith('/') or "http" in link:
                clean_links.append(link)

        # Remove duplicates
        unique_links = list(dict.fromkeys(clean_links))
        
        print(f"      [RESULT] Found {len(unique_links)} links.", flush=True)
        return unique_links

    except Exception as e:
        print(f"      [ERROR] Failed: {e}", flush=True)
        return []
        
def scrape_article(url, website_id, job_id):
    print(f"      ↳ Processing: {url}")
    
    try:
        article = Article(url, config=config)
        article.download()
        article.parse()
        
        # --- TITLE FIX ---
        clean_title = article.title.strip()
        generic_titles = ["FlightGlobal", "Air transport", "News", "Home", "Business Aviation"]
        if clean_title in generic_titles or len(clean_title) < 5:
            soup = BeautifulSoup(article.html, 'html.parser')
            h1 = soup.find('h1')
            if h1: clean_title = h1.get_text().strip()

        if not article.text or len(article.text) < 100:
            print("        [Skip] Content too short.")
            return False 

        # --- CLOUD IMAGE UPLOAD ---
        # 1. Upload to Supabase
        cloud_image_url = upload_image_to_supabase(article.top_image)
        
        # 2. Use Cloud URL if successful, otherwise fallback to original source
        final_image_url = cloud_image_url if cloud_image_url else article.top_image

        row = {
            "job_id": job_id,
            "website_id": website_id,
            "status": "success",
            "title": clean_title,
            "content": article.text,
            "description": url,
            "image_url": final_image_url, 
            "created_at": "now()"
        }
        
        supabase.table('scrape_results').insert(row).execute()
        print(f"        ✅ Saved: {clean_title[:40]}...")
        return True 

    except Exception as e:
        print(f"        ❌ Error: {e}")
        return False

def is_duplicate(url):
    response = supabase.table('scrape_results').select('id').eq('description', url).execute()
    return len(response.data) > 0

def process_job(job_id):
    print(f"\n⚡ Processing Job ID: {job_id}")
    
    response = supabase.table('scrape_results') \
        .select('id, website_id, websites(url, name)') \
        .eq('job_id', job_id) \
        .eq('status', 'pending') \
        .execute()
    
    tasks = response.data
    if not tasks: return

    for task in tasks:
        site_url = task['websites']['url']
        site_name = task['websites']['name']
        original_row_id = task['id']

        print(f"   🔎 Scanning {site_name}...")
        supabase.table('scrape_results').update({"status": "in_progress"}).eq('id', original_row_id).execute()

        try:
            # 1. Get Links (Using improved robust function)
            article_links = get_links_from_category_page(site_url)
            
            count_new = 0
            
            # 2. Process top 10 links
            for link in article_links[:10]:
                if link.strip('/') == site_url.strip('/'): continue
                if is_duplicate(link):
                    print(f"      [Duplicate] {link}")
                    continue
                
                if scrape_article(link, task['website_id'], job_id):
                    count_new += 1

            if count_new == 0: summary = "No new articles found"
            else: summary = f"Added {count_new} new articles"

            supabase.table('scrape_results').update({
                "status": "success",
                "title": f"Scanned {site_name}",
                "content": summary,
                "description": site_url 
            }).eq('id', original_row_id).execute()

        except Exception as e:
            print(f"   ❌ Critical Error: {e}")
            supabase.table('scrape_results').update({
                "status": "failed",
                "error_message": str(e)
            }).eq('id', original_row_id).execute()

    supabase.table('scrape_jobs').update({
        "status": "completed",
        "completed_at": "now()"
    }).eq('id', job_id).execute()
    print(f"✅ Job Finished.\n")

def start_worker():
    print("--- 📡 Worker Started ---")
    while True:
        try:
            response = supabase.table('scrape_jobs').select('id').eq('status', 'in_progress').is_('completed_at', 'null').execute()
            for job in response.data:
                process_job(job['id'])
            time.sleep(2)
        except Exception as e:
            print(f"Worker Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    start_worker()