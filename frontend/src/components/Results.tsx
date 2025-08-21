import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { SearchResult } from '../types'
import { Play, ChevronLeft, ChevronRight, FileText } from 'lucide-react'

interface ResultsProps {
  results: SearchResult[]
  total: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onResultClick: (result: SearchResult) => void
  onTranscriptClick: (videoBasename: string) => void
  selectedResultIndex?: number
  isLoading?: boolean
}

interface ResultItemProps {
  result: SearchResult
  isSelected: boolean
  onResultClick: (result: SearchResult) => void
}

function ResultItem({ result, isSelected, onResultClick }: ResultItemProps) {
  const navigate = useNavigate()

  const handleTranscriptClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/transcript/${result.video_basename}`)
  }

  return (
    <div
      className={`p-4 border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-100 border-blue-300' : ''
      }`}
      onClick={() => onResultClick(result)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onResultClick(result)
            }}
            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
            title="Jump to timestamp"
          >
            <Play className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <span className="font-medium text-gray-900 truncate">
              {result.video_basename}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
                {result.timecode}
              </span>
              <button
                onClick={handleTranscriptClick}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="View full transcript"
              >
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">Transcript</span>
              </button>
            </div>
          </div>
          <div
            className="text-sm text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: result.snippet_html }}
          />
        </div>
      </div>
    </div>
  )
}

export function Results({
  results,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onResultClick,
  onTranscriptClick: _onTranscriptClick,
  selectedResultIndex,
  isLoading = false
}: ResultsProps) {
  const resultListRef = useRef<HTMLDivElement>(null)
  const totalPages = Math.ceil(total / pageSize)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!results.length) return

      if (e.key === 'j' && selectedResultIndex !== undefined && selectedResultIndex < results.length - 1) {
        e.preventDefault()
      } else if (e.key === 'k' && selectedResultIndex !== undefined && selectedResultIndex > 0) {
        e.preventDefault()
      } else if (e.key === 'Enter' && selectedResultIndex !== undefined) {
        e.preventDefault()
        onResultClick(results[selectedResultIndex])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedResultIndex, onResultClick])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedResultIndex !== undefined && resultListRef.current) {
      const selectedElement = resultListRef.current.children[selectedResultIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selectedResultIndex])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-500">Searching...</div>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-gray-500 text-center">
          <div className="mb-2 text-lg">No results found</div>
          <div className="text-sm">Try a different search term or enable fuzzy search</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-gray-50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm text-gray-600">
            {total.toLocaleString()} results • Page {currentPage + 1} of {totalPages}
          </span>
          <div className="text-xs text-gray-500">
            Use ↑↓ or j/k to navigate, Enter to play
          </div>
        </div>
      </div>

      {/* Results List */}
      <div 
        ref={resultListRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {results.map((result, index) => (
          <ResultItem
            key={`${result.video_basename}-${result.start_ms}-${index}`}
            result={result}
            isSelected={selectedResultIndex === index}
            onResultClick={onResultClick}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      pageNum === currentPage
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg hover:bg-white transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}