import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { SearchBar } from './components/SearchBar'
import { FileFilter } from './components/FileFilter'
import { Results } from './components/Results'
import { Player } from './components/Player'
import { apiClient } from './lib/api'
import { FileInfo, SearchResult } from './types'
import { RefreshCw, AlertCircle } from 'lucide-react'

function App() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // State
  const [files, setFiles] = useState<FileInfo[]>([])
  const [query, setQuery] = useState('')
  // The last submitted query; searches run against this, not while typing
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState('')
  const [fuzzy, setFuzzy] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>()
  const [currentResult, setCurrentResult] = useState<SearchResult>()
  const [playerFile, setPlayerFile] = useState('')

  // Loading states
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [isReindexing, setIsReindexing] = useState(false)

  // Error states
  const [error, setError] = useState<string | null>(null)

  const pageSize = 25

  // Load files on mount and handle URL parameters
  useEffect(() => {
    loadFiles()
    
    // Handle return from transcript page
    const videoParam = searchParams.get('video')
    const timeParam = searchParams.get('time')
    
    if (videoParam) {
      setPlayerFile(videoParam)
      if (timeParam) {
        const startMs = parseInt(timeParam)
        setCurrentResult({
          video_basename: videoParam,
          rel_path: '',
          ext: '',
          start_ms: startMs,
          end_ms: startMs + 5000, // Add 5 second duration
          timecode: new Date(startMs).toISOString().substr(11, 8),
          snippet_html: 'Jumped from transcript'
        })
      }
      // Clear the URL parameters
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  // Run search when a query has been submitted and search inputs change
  useEffect(() => {
    if (submittedQuery.trim()) {
      search()
    }
  }, [submittedQuery, selectedFile, currentPage, fuzzy])

  // Clear results when the input is cleared
  useEffect(() => {
    if (!query.trim()) {
      setSubmittedQuery('')
      setResults([])
      setTotal(0)
      setSelectedResultIndex(undefined)
    }
  }, [query])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!results.length) return

      if (e.key === 'j') {
        e.preventDefault()
        setSelectedResultIndex(prev => 
          prev === undefined ? 0 : Math.min(results.length - 1, prev + 1)
        )
      } else if (e.key === 'k') {
        e.preventDefault()
        setSelectedResultIndex(prev => 
          prev === undefined ? results.length - 1 : Math.max(0, prev - 1)
        )
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setQuery('')
        setSelectedResultIndex(undefined)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [results])

  const loadFiles = async () => {
    try {
      setIsLoadingFiles(true)
      setError(null)
      const filesData = await apiClient.getFiles()
      setFiles(filesData)
    } catch (err) {
      console.error('Failed to load files:', err)
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const search = async () => {
    if (!submittedQuery.trim()) return

    try {
      setIsLoadingResults(true)
      setError(null)
      const response = await apiClient.search({
        q: submittedQuery,
        file: selectedFile,
        offset: currentPage * pageSize,
        limit: pageSize,
        fuzzy: fuzzy ? 1 : 0
      })
      setResults(response.items)
      setTotal(response.total)
      setSelectedResultIndex(undefined)
    } catch (err) {
      console.error('Search failed:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
      setTotal(0)
    } finally {
      setIsLoadingResults(false)
    }
  }

  const handleReindex = async () => {
    try {
      setIsReindexing(true)
      setError(null)
      await apiClient.reindex()
      // Reload files after reindexing
      setTimeout(loadFiles, 2000) // Give some time for indexing to complete
    } catch (err) {
      console.error('Reindex failed:', err)
      setError(err instanceof Error ? err.message : 'Reindex failed')
    } finally {
      setIsReindexing(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    setCurrentResult(result)
    setPlayerFile(result.video_basename)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedResultIndex(undefined)
  }

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    setCurrentPage(0)
  }, [])

  const handleFileChange = useCallback((file: string) => {
    setSelectedFile(file)
    setCurrentPage(0)
  }, [])

  // Note: Transcript handling is now done via routing to /transcript/:videoBasename

  // Trigger a new search based on the current input value
  const triggerSearch = () => {
    setSubmittedQuery(query)
    setCurrentPage(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">SRT Search</h1>
          </div>
          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="group flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <RefreshCw className={`h-4 w-4 transition-transform duration-200 ${isReindexing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            {isReindexing ? 'Reindexing...' : 'Reindex'}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 my-6">
          <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-6 lg:p-8">
        {/* Mobile: Search and Filter */}
        <div className="lg:hidden space-y-6">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            fuzzy={fuzzy}
            onFuzzyChange={setFuzzy}
            onSearch={triggerSearch}
            isLoading={isLoadingResults}
          />

          <FileFilter
            files={files}
            selectedFile={selectedFile}
            onFileChange={handleFileChange}
            isLoading={isLoadingFiles}
          />

          {query && (
            <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-lg">
              <div className="text-sm font-medium text-gray-700">Total: <span className="text-blue-600">{total.toLocaleString()}</span> results</div>
              {results.length > 0 && (
                <div className="text-sm text-gray-600 mt-1">
                  Showing <span className="font-medium">{currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, total)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Left Column - Search */}
        <div className="hidden lg:block lg:w-1/4 xl:w-1/5 space-y-8">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            fuzzy={fuzzy}
            onFuzzyChange={setFuzzy}
            onSearch={triggerSearch}
            isLoading={isLoadingResults}
          />

          <FileFilter
            files={files}
            selectedFile={selectedFile}
            onFileChange={handleFileChange}
            isLoading={isLoadingFiles}
          />

          {query && (
            <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-lg">
              <div className="text-sm font-medium text-gray-700">Total: <span className="text-blue-600">{total.toLocaleString()}</span> results</div>
              {results.length > 0 && (
                <div className="text-sm text-gray-600 mt-1">
                  Showing <span className="font-medium">{currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, total)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 lg:w-1/2 xl:w-3/5 min-h-0">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 h-full flex flex-col overflow-hidden">
            <Results
              results={results}
              total={total}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onResultClick={handleResultClick}
              onTranscriptClick={() => {}} // Handled by Results component directly
              selectedResultIndex={selectedResultIndex}
              isLoading={isLoadingResults}
            />
          </div>
        </div>

        {/* Right Column - Player (Desktop) / Bottom (Mobile) */}
        <div className="lg:w-1/4 xl:w-1/5">
          <div className="lg:sticky lg:top-8">
            <Player
              files={files}
              selectedFile={playerFile}
              onFileChange={setPlayerFile}
              currentResult={currentResult}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-8 pb-8">
        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border border-blue-200/30 rounded-2xl p-6 shadow-lg">
          <h3 className="text-base font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Search Tips
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-blue-400 rounded-full"></div>
              Use quotes for exact phrases: <code className="bg-blue-100 px-2 py-0.5 rounded text-xs font-mono">"hello world"</code>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-blue-400 rounded-full"></div>
              Use * for prefix matching: <code className="bg-blue-100 px-2 py-0.5 rounded text-xs font-mono">democra*</code>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-blue-400 rounded-full"></div>
              Use OR for boolean search: <code className="bg-blue-100 px-2 py-0.5 rounded text-xs font-mono">cat OR dog</code>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-blue-400 rounded-full"></div>
              Enable fuzzy search for approximate matches
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-blue-400 rounded-full"></div>
              Use <kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono border border-blue-200">j</kbd>/<kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono border border-blue-200">k</kbd> or <kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono border border-blue-200">↑↓</kbd> to navigate, <kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono border border-blue-200">Enter</kbd> to play
            </li>
          </ul>
        </div>
      </div>

    </div>
  )
}

export default App
