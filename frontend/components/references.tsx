import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
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

// Function to wrap reference numbers with hover cards
export function wrapReferencesWithHoverCards(
  text: string,
  references: Reference[],
) {
  // First, find all reference numbers in the text
  const refRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
  let lastIndex = 0;
  const parts = [];
  let match;

  while ((match = refRegex.exec(text)) !== null) {
    // Add text before the reference
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Get the reference numbers
    const refNumbers = match[1].split(',').map((num) => parseInt(num.trim()));
    const validRefs = refNumbers.filter(
      (num) => num > 0 && num <= references.length,
    );

    if (validRefs.length > 0) {
      // Add the hover card wrapped reference
      const hoverCard = (
        <HoverCard key={match.index}>
          <HoverCardTrigger asChild>
            <span>
              {'['}
              <span className="text-blue-400 hover:text-blue-300 cursor-pointer">
                {match[1]}
              </span>
              {']'}
            </span>
          </HoverCardTrigger>
          <HoverCardContent
            className="w-80 bg-zinc-900 border border-zinc-800 shadow-lg"
            sideOffset={5}
            align="start"
          >
            <div className="space-y-3">
              {validRefs.map((refNum, idx) => {
                const reference = references[refNum - 1];
                return (
                  <div
                    key={idx}
                    className={idx > 0 ? 'pt-2 border-t border-zinc-800' : ''}
                  >
                    <h4 className="text-sm font-semibold text-white">
                      {reference.title}
                    </h4>
                    <p className="text-sm text-gray-400">{reference.authors}</p>
                    <p className="text-xs text-gray-500">
                      {reference.journal} ({reference.year})
                    </p>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${reference.pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      View on PubMed
                    </a>
                  </div>
                );
              })}
            </div>
          </HoverCardContent>
        </HoverCard>
      );
      parts.push(hoverCard);
    } else {
      // If no valid references found, just add the number as is
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
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
