import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

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
  const inputRef = useRef<HTMLInputElement>(null)

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
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-colors group-focus-within:text-blue-500" />
          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search subtitles..."
            className="w-full pl-12 pr-4 py-4 bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/90 text-base transition-all duration-200 shadow-lg placeholder-gray-400"
            disabled={isLoading}
            autoComplete="off"
            spellCheck="false"
          />
          {localQuery && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 pointer-events-none"></div>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !localQuery.trim()}
          className="group px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-base font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span>Search</span>
            </>
          )}
        </button>
      </form>
      
      <div className="bg-white/50 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onFuzzyChange(!fuzzy)}
            className="group flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <div className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${fuzzy ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gray-200'}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${fuzzy ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </div>
            <span className="group-hover:text-blue-600 transition-colors">Fuzzy Search</span>
          </button>
          <div className="text-xs text-gray-500 bg-gray-100/50 px-3 py-1 rounded-full">
            Smart fallback mode
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          When enabled, searches for approximate matches if exact search finds nothing
        </p>
      </div>
    </div>
  )
}