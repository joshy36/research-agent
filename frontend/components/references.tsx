import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

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

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check both window width and user agent for better mobile detection
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );
      const isMobileWidth = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isMobileWidth);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Shared reference content component
function ReferenceContent({
  references,
  refNumbers,
}: {
  references: Reference[];
  refNumbers: number[];
}) {
  return (
    <div className="space-y-4">
      {refNumbers.map((refNum, idx) => {
        const reference = references[refNum - 1];
        return (
          <div
            key={idx}
            className={idx > 0 ? 'pt-4 border-t border-zinc-800' : ''}
          >
            <div className="flex items-start gap-2 mb-2">
              <div className="mt-1">
                <FileText className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-200 text-sm">
                  [{refNum}] {reference.title}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1 pl-6">
              <Users className="w-3 h-3 text-zinc-500 flex-shrink-0" />
              <span className="truncate">{reference.authors}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 pl-6">
              <BookOpen className="w-3 h-3 text-zinc-500" />
              {reference.journal} •{' '}
              <Calendar className="w-3 h-3 text-zinc-500" />
              {reference.year}
            </div>
            <div className="pl-6">
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${reference.pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on PubMed
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Function to wrap reference numbers with hover cards or drawer
export function wrapReferencesWithHoverCards(
  text: string,
  references: Reference[],
) {
  const isMobile = useIsMobile();

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
      if (isMobile) {
        // Use Drawer for mobile
        const drawer = (
          <Drawer key={match.index}>
            <DrawerTrigger asChild>
              <button className="inline-flex items-center bg-transparent border-none p-0 cursor-pointer">
                {'['}
                <span className="text-blue-400 hover:text-blue-300 select-none">
                  {match[1]}
                </span>
                {']'}
              </button>
            </DrawerTrigger>
            <DrawerContent className="h-[80vh] bg-zinc-900 border-t border-zinc-800">
              <div className="p-4">
                <DrawerTitle className="text-lg font-semibold text-white mb-4">
                  References
                </DrawerTitle>
                <ReferenceContent
                  references={references}
                  refNumbers={validRefs}
                />
              </div>
            </DrawerContent>
          </Drawer>
        );
        parts.push(drawer);
      } else {
        // Use HoverCard for desktop
        const hoverCard = (
          <HoverCard key={match.index}>
            <HoverCardTrigger asChild>
              <span className="inline-flex items-center">
                {'['}
                <span className="text-blue-400 hover:text-blue-300 cursor-pointer select-none">
                  {match[1]}
                </span>
                {']'}
              </span>
            </HoverCardTrigger>
            <HoverCardContent
              className="w-96 bg-zinc-900 border border-zinc-800 shadow-lg"
              sideOffset={5}
              align="start"
              forceMount
            >
              <ReferenceContent
                references={references}
                refNumbers={validRefs}
              />
            </HoverCardContent>
          </HoverCard>
        );
        parts.push(hoverCard);
      }
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
