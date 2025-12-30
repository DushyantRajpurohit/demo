import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { jobId, websiteIds } = await req.json()
    
    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch URLs for the selected website IDs
    const { data: websites } = await supabase
      .from('websites')
      .select('id, url')
      .in('id', websiteIds)

    if (!websites) throw new Error("No websites found")

    // 2. Loop through and "fake scrape" (or use a fetch/parser)
    for (const site of websites) {
      try {
        console.log(`Scraping ${site.url}...`)
        
        // --- REAL SCRAPING LOGIC GOES HERE ---
        // For now, we simulate a fetch
        const response = await fetch(site.url)
        const html = await response.text()
        const titleMatch = html.match(/<title>(.*?)<\/title>/)
        const title = titleMatch ? titleMatch[1] : "No Title Found"
        // -------------------------------------

        // 3. Update the result row with success
        await supabase
          .from('scrape_results')
          .update({
            status: 'success',
            title: title,
            content: `Successfully scraped ${site.url}`,
            description: "Scraped via Edge Function"
          })
          .match({ job_id: jobId, website_id: site.id })

      } catch (error) {
        // Handle failure for specific site
        await supabase
          .from('scrape_results')
          .update({ status: 'failed', error_message: str(error) })
          .match({ job_id: jobId, website_id: site.id })
      }
    }

    // 4. Mark Job as Complete
    await supabase
      .from('scrape_jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', jobId)

    return new Response(JSON.stringify({ message: "Scraping complete" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})