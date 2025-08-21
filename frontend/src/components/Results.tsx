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
      className={`p-6 border-b border-white/20 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 cursor-pointer group ${
        isSelected ? 'bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border-blue-200/50 shadow-lg' : ''
      }`}
      onClick={() => onResultClick(result)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onResultClick(result)
            }}
            className="group/play p-3 text-blue-500 hover:text-white bg-blue-50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            title="Jump to timestamp"
          >
            <Play className="h-5 w-5 transition-transform group-hover/play:scale-110" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <span className="font-semibold text-gray-900 truncate text-lg group-hover:text-blue-800 transition-colors">
              {result.video_basename}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-blue-700 bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-1.5 rounded-full border border-blue-200/50 shadow-sm">
                {result.timecode}
              </span>
              <button
                onClick={handleTranscriptClick}
                className="group/transcript flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-700 bg-gray-100/50 hover:bg-blue-50 rounded-full border border-gray-200/50 hover:border-blue-200/50 transition-all duration-200 shadow-sm hover:shadow-md"
                title="View full transcript"
              >
                <FileText className="h-3 w-3 transition-transform group-hover/transcript:scale-110" />
                <span className="hidden sm:inline">Transcript</span>
              </button>
            </div>
          </div>
          <div
            className="text-sm text-gray-700 leading-relaxed bg-white/30 backdrop-blur-sm rounded-xl p-4 border border-white/30"
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
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse"></div>
          </div>
          <div className="text-gray-600 font-medium text-lg">Searching transcripts...</div>
          <div className="text-gray-500 text-sm mt-2">Finding the perfect matches</div>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.489.901-6.091 2.382M3 18a9 9 0 0118 0v1H3v-1z" />
            </svg>
          </div>
          <div className="text-gray-600 font-semibold text-xl mb-2">No results found</div>
          <div className="text-gray-500 text-sm leading-relaxed max-w-xs">
            Try a different search term, enable fuzzy search, or check if your videos have subtitles
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-6 bg-gradient-to-r from-white/50 to-blue-50/50 backdrop-blur-sm border-b border-white/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              {total.toLocaleString()} <span className="text-blue-600">results</span>
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">
              Page <span className="font-medium text-blue-600">{currentPage + 1}</span> of <span className="font-medium">{totalPages}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/50 px-3 py-1.5 rounded-full border border-white/30">
            <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-200">↑↓</kbd>
            <span>or</span>
            <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-200">j/k</kbd>
            <span>to navigate,</span>
            <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-200">Enter</kbd>
            <span>to play</span>
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
        <div className="flex-shrink-0 p-6 bg-gradient-to-r from-white/50 to-blue-50/50 backdrop-blur-sm border-t border-white/30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="group flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed bg-white/50 hover:bg-white/80 rounded-xl border border-white/30 hover:border-gray-200/50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                      pageNum === currentPage
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border border-blue-400/50 transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 bg-white/50 hover:bg-white/80 border border-white/30 hover:border-gray-200/50'
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
              className="group flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed bg-white/50 hover:bg-white/80 rounded-xl border border-white/30 hover:border-gray-200/50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}