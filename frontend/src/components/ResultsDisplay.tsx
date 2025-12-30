import { ScrapeResult, Website } from '../lib/supabase';
import { FileText, ExternalLink, AlertCircle, ImageIcon, Calendar, Clock } from 'lucide-react';

interface ResultsDisplayProps {
  results: ScrapeResult[];
  websites: Website[];
}

export default function ResultsDisplay({ results, websites }: ResultsDisplayProps) {
  // --- THE FIX IS HERE ---
  // We filter for success AND make sure it is not a "System Message"
  const successfulResults = results.filter(r => 
    r.status === 'success' && 
    !r.title?.startsWith('Scanned ') && 
    !r.title?.includes('Scan Complete')
  );

  if (successfulResults.length === 0) return null;

  // --- Helpers ---
  const getDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWebsiteName = (id: string) => websites.find(w => w.id === id)?.name || '';

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mt-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-800">Scraping Results</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300">
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">#</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-20">Image</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px]">Headline & Source</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Link</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[300px]">Article Snippet</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Extracted At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {successfulResults.map((result, index) => {
              // Get the specific article URL (stored in description)
              const articleUrl = result.description; 
              
              return (
                <tr key={result.id} className="hover:bg-blue-50 transition-colors">
                  
                  {/* 1. Simple Index Number */}
                  <td className="px-4 py-3 text-gray-500 font-medium">
                    {index + 1}
                  </td>

                  {/* 2. Image Thumbnail (Clean, no text path) */}
                  <td className="px-4 py-3">
                    {result.image_url ? (
                      <a href={result.image_url} target="_blank" rel="noopener noreferrer" className="block w-16 h-12 bg-gray-100 rounded border border-gray-200 overflow-hidden hover:opacity-80">
                        <img 
                          src={result.image_url} 
                          alt="Article" 
                          className="w-full h-full object-cover"
                          onError={(e) => {e.currentTarget.style.display = 'none'}}
                        />
                      </a>
                    ) : (
                      <div className="w-16 h-12 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </td>

                  {/* 3. Headline & Source Website */}
                  <td className="px-4 py-3 text-gray-900">
                    <div className="font-semibold line-clamp-2" title={result.title || ''}>
                      {result.title || 'Untitled Article'}
                    </div>
                    <div className="text-xs text-blue-600 mt-1 font-medium">
                      {getWebsiteName(result.website_id)}
                    </div>
                  </td>

                  {/* 4. Direct Article Link */}
                  <td className="px-4 py-3">
                    {articleUrl ? (
                      <a 
                        href={articleUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-700 text-xs font-medium hover:bg-gray-50 hover:text-blue-600 transition-colors"
                      >
                        Read <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs italic">No Link</span>
                    )}
                  </td>

                  {/* 5. Article Text (Snippet) */}
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <div className="line-clamp-3 leading-relaxed max-w-prose text-justify">
                      {result.content || <span className="italic text-gray-400">No text content found...</span>}
                    </div>
                  </td>

                  {/* 6. Date & Time Combined */}
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3 h-3" /> {getDate(result.created_at)}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-75">
                      <Clock className="w-3 h-3" /> {getTime(result.created_at)}
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {results.some(r => r.status === 'failed') && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            Some items failed to scrape. Check the progress bar for details.
          </div>
        </div>
      )}
    </div>
  );
}