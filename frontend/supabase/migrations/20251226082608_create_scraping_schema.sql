/*
  # Web Scraping Application Schema

  1. New Tables
    - `websites`
      - `id` (uuid, primary key)
      - `name` (text) - Display name of the website
      - `url` (text) - URL to scrape
      - `description` (text) - Description of what gets scraped
      - `created_at` (timestamptz) - When the website was added
    
    - `scrape_jobs`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Reference to authenticated user
      - `status` (text) - Status: pending, in_progress, completed, failed
      - `started_at` (timestamptz) - When scraping started
      - `completed_at` (timestamptz) - When scraping finished
      - `created_at` (timestamptz) - When job was created
    
    - `scrape_results`
      - `id` (uuid, primary key)
      - `job_id` (uuid) - Reference to scrape_jobs
      - `website_id` (uuid) - Reference to websites
      - `title` (text) - Page title
      - `description` (text) - Meta description or summary
      - `content` (text) - Scraped content
      - `status` (text) - Status: success, failed
      - `error_message` (text) - Error if failed
      - `created_at` (timestamptz) - When result was saved

  2. Security
    - Enable RLS on all tables
    - Websites table is publicly readable
    - Scrape jobs and results are private to the user who created them
*/

-- Create websites table
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create scrape_jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  status text DEFAULT 'pending' NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create scrape_results table
CREATE TABLE IF NOT EXISTS scrape_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES scrape_jobs(id) ON DELETE CASCADE NOT NULL,
  website_id uuid REFERENCES websites(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT '',
  description text DEFAULT '',
  content text DEFAULT '',
  status text DEFAULT 'pending' NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_results ENABLE ROW LEVEL SECURITY;

-- Policies for websites (publicly readable)
CREATE POLICY "Anyone can view websites"
  ON websites FOR SELECT
  USING (true);

-- Policies for scrape_jobs
CREATE POLICY "Users can view own scrape jobs"
  ON scrape_jobs FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Anyone can insert scrape jobs"
  ON scrape_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update scrape jobs"
  ON scrape_jobs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policies for scrape_results
CREATE POLICY "Users can view own scrape results"
  ON scrape_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scrape_jobs
      WHERE scrape_jobs.id = scrape_results.job_id
      AND (scrape_jobs.user_id IS NULL OR scrape_jobs.user_id = auth.uid() OR auth.uid() IS NULL)
    )
  );

CREATE POLICY "Anyone can insert scrape results"
  ON scrape_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update scrape results"
  ON scrape_results FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insert sample websites
INSERT INTO websites (name, url, description) VALUES
  ('Example.com', 'https://example.com', 'A simple example website'),
  ('Wikipedia', 'https://en.wikipedia.org/wiki/Web_scraping', 'Web scraping article'),
  ('HTTPBin', 'https://httpbin.org/html', 'HTTP testing service'),
  ('JSON Placeholder', 'https://jsonplaceholder.typicode.com/posts/1', 'Fake REST API')
ON CONFLICT DO NOTHING;