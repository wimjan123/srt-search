import { useState, useEffect } from 'react'
import { Search, ToggleLeft, ToggleRight } from 'lucide-react'

interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  fuzzy: boolean
  onFuzzyChange: (fuzzy: boolean) => void
  onSearch: () => void
  isLoading?: boolean
}

export function SearchBar({ 
  query, 
  onQueryChange, 
  fuzzy, 
  onFuzzyChange, 
  onSearch,
  isLoading = false 
}: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState(query)

  useEffect(() => {
    setLocalQuery(query)
  }, [query])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== query) {
        onQueryChange(localQuery)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [localQuery, query, onQueryChange])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search subtitles... (use quotes for phrases, * for prefix, OR for boolean)"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !localQuery.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Search
        </button>
      </form>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onFuzzyChange(!fuzzy)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
        >
          {fuzzy ? (
            <ToggleRight className="h-5 w-5 text-blue-500" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-gray-400" />
          )}
          Fuzzy Search
        </button>
        <span className="text-xs text-gray-500">
          (fallback when exact search finds nothing)
        </span>
      </div>
    </div>
  )
}