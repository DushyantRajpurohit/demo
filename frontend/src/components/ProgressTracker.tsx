import { ScrapeResult, Website } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle, Clock, Globe } from 'lucide-react';

interface ProgressTrackerProps {
  results: ScrapeResult[];
  websites: Website[];
  jobStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export default function ProgressTracker({ results, websites, jobStatus }: ProgressTrackerProps) {
  
  // --- THE FIX: FILTER FOR "SYSTEM ROWS" ONLY ---
  // We only want to track the rows that represent a Website Scan,
  // not the rows that represent found articles.
  // System rows usually have titles like "Scan Complete" or are pending.
  const taskRows = results.filter(r => 
    r.status === 'pending' || 
    r.status === 'in_progress' || 
    r.title?.includes('Scan') || 
    r.title?.includes('Scanned')
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getWebsiteName = (websiteId: string) => {
    return websites.find(w => w.id === websiteId)?.name || 'Unknown Website';
  };

  const completedCount = taskRows.filter(r => r.status === 'success' || r.status === 'failed').length;
  const totalCount = taskRows.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (taskRows.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Scraping Progress</h2>
        {jobStatus === 'completed' && (
           <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
             DONE
           </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Processing Websites...</span>
          <span className="font-medium">{completedCount} / {totalCount}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
              jobStatus === 'completed' ? 'bg-green-500' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* List of Websites Being Scanned */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {taskRows.map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              task.status === 'in_progress' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-transparent'
            }`}
          >
            <div className="flex-shrink-0">
              {getStatusIcon(task.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-gray-400" />
                <span className="font-medium text-gray-900 text-sm">
                  {getWebsiteName(task.website_id)}
                </span>
              </div>
              
              {/* Dynamic Status Text */}
              <div className="text-xs mt-0.5">
                 {task.status === 'success' && (
                   <span className="text-green-600 font-medium">{task.content || 'Scan Complete'}</span>
                 )}
                 {task.status === 'failed' && (
                   <span className="text-red-600">{task.error_message || 'Connection failed'}</span>
                 )}
                 {task.status === 'in_progress' && (
                   <span className="text-blue-600 animate-pulse">Scanning for new articles...</span>
                 )}
                 {task.status === 'pending' && (
                   <span className="text-gray-400">Waiting in queue...</span>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}