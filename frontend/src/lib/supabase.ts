import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase keys are missing! Check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

export interface Website {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

export interface ScrapeJob {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
}

export interface ScrapeResult {
  id: string;
  job_id: string;
  website_id: string;
  // ADDED 'in_progress' HERE
  status: 'pending' | 'in_progress' | 'success' | 'failed'; 
  title?: string;
  description?: string;
  content?: string;
  image_url?: string;
  error_message?: string;
  created_at: string;
}