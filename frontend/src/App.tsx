import { useState, useEffect } from 'react';
import { supabase, Website, ScrapeResult, ScrapeJob } from './lib/supabase';
import WebsiteSelector from './components/WebsiteSelector';
import ProgressTracker from './components/ProgressTracker';
import ResultsDisplay from './components/ResultsDisplay';
import HistoryView from './components/HistoryView';
import { Play, RotateCw } from 'lucide-react';

function App() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([]);
  const [currentJob, setCurrentJob] = useState<ScrapeJob | null>(null);
  const [currentResults, setCurrentResults] = useState<ScrapeResult[]>([]);
  const [isScrapingInProgress, setIsScrapingInProgress] = useState(false);
  const [view, setView] = useState<'scraper' | 'history'>('scraper');
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    loadWebsites();
  }, []);

  useEffect(() => {
    if (currentJob?.id) {
      const interval = setInterval(() => {
        checkJobProgress(currentJob.id);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [currentJob?.id]);

  const loadWebsites = async () => {
    const { data } = await supabase
      .from('websites')
      .select('*')
      .order('name');

    if (data) {
      setWebsites(data);
    }
  };

  const toggleWebsite = (websiteId: string) => {
    setSelectedWebsites(prev =>
      prev.includes(websiteId)
        ? prev.filter(id => id !== websiteId)
        : [...prev, websiteId]
    );
  };

  const startScraping = async () => {
    if (selectedWebsites.length === 0) {
      alert('Please select at least one website to scrape');
      return;
    }

    setIsScrapingInProgress(true);
    setCurrentResults([]);

    try {
      const { data: job, error: jobError } = await supabase
        .from('scrape_jobs')
        .insert({
          status: 'pending',
          user_id: null
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Failed to create scrape job');
      }

      setCurrentJob(job);

      const initialResults = selectedWebsites.map(websiteId => ({
        job_id: job.id,
        website_id: websiteId,
        status: 'pending',
        title: '',
        description: '',
        content: ''
      }));

      const { data: results } = await supabase
        .from('scrape_results')
        .insert(initialResults)
        .select();

      if (results) {
        setCurrentResults(results);
      }

      await supabase
        .from('scrape_jobs')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', job.id);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-websites`;

      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          websiteIds: selectedWebsites
        })
      }).catch(error => {
        console.error('Error calling scrape function:', error);
      });

    } catch (error) {
      console.error('Error starting scrape:', error);
      setIsScrapingInProgress(false);
      alert('Failed to start scraping. Please try again.');
    }
  };

  const checkJobProgress = async (jobId: string) => {
    const { data: job } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (job) {
      setCurrentJob(job);

      const { data: results } = await supabase
        .from('scrape_results')
        .select('*')
        .eq('job_id', jobId);

      if (results) {
        setCurrentResults(results);

        if (job.status === 'completed' || job.status === 'failed') {
          setIsScrapingInProgress(false);
          setHistoryRefresh(prev => prev + 1);
        }
      }
    }
  };

  const resetScraping = () => {
    setCurrentJob(null);
    setCurrentResults([]);
    setSelectedWebsites([]);
    setIsScrapingInProgress(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Web Scraper Dashboard
          </h1>
          <p className="text-gray-600">
            Select websites, monitor progress, and view results
          </p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={() => setView('scraper')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-medium transition-colors ${
              view === 'scraper'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Scraper
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-medium transition-colors ${
              view === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            History
          </button>
        </div>

        {view === 'scraper' ? (
          <div className="space-y-6">
            <WebsiteSelector
              websites={websites}
              selectedWebsites={selectedWebsites}
              onToggleWebsite={toggleWebsite}
              disabled={isScrapingInProgress}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={startScraping}
                disabled={isScrapingInProgress || selectedWebsites.length === 0}
                className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isScrapingInProgress || selectedWebsites.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Play className="w-5 h-5" />
                Start Scraping
              </button>

              {currentJob && !isScrapingInProgress && (
                <button
                  onClick={resetScraping}
                  className="flex-1 sm:flex-none px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-5 h-5" />
                  New Scraping
                </button>
              )}
            </div>

            {currentJob && (
              <>
                <ProgressTracker
                  results={currentResults}
                  websites={websites}
                  jobStatus={currentJob.status}
                />

                {currentJob.status === 'completed' && (
                  <ResultsDisplay
                    results={currentResults}
                    websites={websites}
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <HistoryView websites={websites} refreshTrigger={historyRefresh} />
        )}
      </div>
    </div>
  );
}

export default App;
