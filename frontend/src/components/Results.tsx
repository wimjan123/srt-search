import { useEffect, useRef } from 'react'
import { FixedSizeList as List } from 'react-window'
import { SearchResult } from '../types'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'

interface ResultsProps {
  results: SearchResult[]
  total: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onResultClick: (result: SearchResult) => void
  selectedResultIndex?: number
  isLoading?: boolean
}

interface ResultItemProps {
  index: number
  style: React.CSSProperties
  data: {
    results: SearchResult[]
    onResultClick: (result: SearchResult) => void
    selectedIndex?: number
  }
}

function ResultItem({ index, style, data }: ResultItemProps) {
  const result = data.results[index]
  const isSelected = data.selectedIndex === index

  return (
    <div style={style}>
      <div
        className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors ${
          isSelected ? 'bg-blue-100 border-blue-300' : ''
        }`}
        onClick={() => data.onResultClick(result)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <Play className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 truncate">
                {result.video_basename}
              </span>
              <span className="text-sm text-blue-600 font-mono">
                {result.timecode}
              </span>
            </div>
            <div
              className="text-sm text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: result.snippet_html }}
            />
          </div>
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
  selectedResultIndex,
  isLoading = false
}: ResultsProps) {
  const listRef = useRef<List>(null)
  const totalPages = Math.ceil(total / pageSize)

  const itemData = {
    results,
    onResultClick,
    selectedIndex: selectedResultIndex
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!results.length) return

      if (e.key === 'j' && selectedResultIndex !== undefined && selectedResultIndex < results.length - 1) {
        e.preventDefault()
        // Will be handled by parent component
      } else if (e.key === 'k' && selectedResultIndex !== undefined && selectedResultIndex > 0) {
        e.preventDefault()
        // Will be handled by parent component
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
    if (selectedResultIndex !== undefined && listRef.current) {
      listRef.current.scrollToItem(selectedResultIndex, 'smart')
    }
  }, [selectedResultIndex])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Searching...</div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <div className="mb-2">No results found</div>
          <div className="text-sm">Try a different search term or enable fuzzy search</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-shrink-0 p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {total} results • Page {currentPage + 1} of {totalPages}
          </span>
          <div className="text-xs text-gray-500">
            Use ↑↓ or j/k to navigate, Enter to play
          </div>
        </div>
      </div>

      <div className="flex-1">
        <List
          ref={listRef}
          height={400}
          width="100%"
          itemCount={results.length}
          itemSize={100}
          itemData={itemData}
        >
          {ResultItem}
        </List>
      </div>

      {totalPages > 1 && (
        <div className="flex-shrink-0 p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-2 py-1 text-sm rounded ${
                      pageNum === currentPage
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-900'
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
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}