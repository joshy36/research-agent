import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Reference {
  authors: string;
  title: string;
  journal: string;
  year: string;
  pmid: string;
}

interface ReferencesProps {
  references: Reference[];
}

export function References({ references }: ReferencesProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center cursor-pointer gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        <div className="relative w-4 h-4">
          <ChevronRight
            className={`absolute w-4 h-4 transition-all duration-200 ${
              isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
            }`}
          />
          <ChevronDown
            className={`absolute w-4 h-4 transition-all duration-200 ${
              isOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
            }`}
          />
        </div>
        References
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-2 text-sm text-gray-400">
          {references.map((ref, index) => (
            <div key={index} className="pl-6">
              <p className="text-gray-300">{ref.authors}</p>
              <p>{ref.title}</p>
              <p className="text-xs">
                {ref.journal} ({ref.year}). PMID: {ref.pmid}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
