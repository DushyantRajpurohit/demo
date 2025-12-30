import { useState, useEffect } from 'react';
import { supabase, ScrapeJob, ScrapeResult, Website } from '../lib/supabase';
import { History, ChevronDown, ChevronUp, Calendar, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface HistoryViewProps {
  websites: Website[];
  refreshTrigger: number;
}

interface JobWithResults extends ScrapeJob {
  results: ScrapeResult[];
}

export default function HistoryView({ websites, refreshTrigger }: HistoryViewProps) {
  const [jobs, setJobs] = useState<JobWithResults[]>([]);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadHistory(true);
  }, []);

  const loadHistory = async (showLoadingScreen = false) => {
    if (showLoadingScreen) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const { data: jobsData } = await supabase
        .from('scrape_jobs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (jobsData) {
        const jobsWithResults = await Promise.all(
          jobsData.map(async (job) => {
            const { data: results } = await supabase
              .from('scrape_results')
              .select('*')
              .eq('job_id', job.id);

            return {
              ...job,
              results: results || []
            };
          })
        );
        setJobs(jobsWithResults);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getWebsiteName = (websiteId: string) => {
    return websites.find(w => w.id === websiteId)?.name || 'Unknown';
  };

  const toggleExpand = (jobId: string) => {
    setExpandedJob(expandedJob === jobId ? null : jobId);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex justify-center items-center">
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-2" />
        <span className="text-gray-500">Loading history...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-800">Scraping History</h2>
        </div>
        
        <button 
          onClick={() => loadHistory(false)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center text-gray-500 py-8 border border-dashed border-gray-300 rounded-lg">
          No scraping history found. Start a new scrape!
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const isExpanded = expandedJob === job.id;

            // --------------------------------------------------------------------
            // 🛑 STRICT FILTER: Hides the "Summary" rows
            // --------------------------------------------------------------------
            const realResults = job.results.filter(r => 
              // Hide rows with titles like "Scanned FlightGlobal"
              !r.title?.startsWith('Scanned ') && 
              !r.title?.startsWith('Scan ') &&
              
              // Hide rows with content like "Added 5 articles"
              !r.content?.includes('Added ') &&
              !r.content?.includes('No new articles') &&
              !r.content?.includes('Scan complete')
            );
            // --------------------------------------------------------------------

            const successCount = realResults.filter(r => r.status === 'success').length;
            const failedCount = realResults.filter(r => r.status === 'failed').length;

            return (
              <div key={job.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleExpand(job.id)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(job.started_at).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span className="flex items-center gap-1 font-medium text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          {successCount} articles found
                        </span>
                        {failedCount > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-3 h-3" />
                            {failedCount} failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-2 border-t border-gray-200 bg-white">
                    {realResults.length === 0 ? (
                       <div className="text-sm text-gray-400 italic text-center py-2">
                         No new articles found in this run.
                       </div>
                    ) : (
                      realResults.map((result) => (
                        <div
                          key={result.id}
                          className="group p-3 bg-gray-50 border border-gray-100 rounded hover:border-blue-200 hover:bg-blue-50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 overflow-hidden">
                                {result.status === 'success' ? (
                                  <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                                )}
                                <div>
                                    <div className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-0.5">
                                      {getWebsiteName(result.website_id)}
                                    </div>
                                    <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                                      {result.title}
                                    </h4>
                                </div>
                            </div>
                            
                            {/* Link Button */}
                            {result.description && result.description.startsWith('http') && (
                                <a 
                                  href={result.description} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="Read Original Article"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                          </div>
                          
                          {/* Article Snippet */}
                          {result.content && (
                            <div className="text-xs text-gray-500 mt-2 pl-6 line-clamp-2">
                              {result.content}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}