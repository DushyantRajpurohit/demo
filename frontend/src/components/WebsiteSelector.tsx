import { Website } from '../lib/supabase';
import { Globe, CheckCircle2 } from 'lucide-react';

interface WebsiteSelectorProps {
  websites: Website[];
  selectedWebsites: string[];
  onToggleWebsite: (websiteId: string) => void;
  disabled?: boolean;
}

export default function WebsiteSelector({
  websites,
  selectedWebsites,
  onToggleWebsite,
  disabled = false
}: WebsiteSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Select Websites to Scrape</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
        {websites.map((website) => {
          const isSelected = selectedWebsites.includes(website.id);
          return (
            <button
              key={website.id}
              onClick={() => onToggleWebsite(website.id)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5
                  ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
                `}>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">{website.name}</h3>
                  <p className="text-sm text-gray-600 mb-1 truncate">{website.url}</p>
                  {website.description && (
                    <p className="text-xs text-gray-500">{website.description}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
