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

  // Search when query, file, or page changes
  useEffect(() => {
    if (query.trim()) {
      search()
    } else {
      setResults([])
      setTotal(0)
      setSelectedResultIndex(undefined)
    }
  }, [query, selectedFile, currentPage, fuzzy])

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
    if (!query.trim()) return

    try {
      setIsLoadingResults(true)
      setError(null)
      const response = await apiClient.search({
        q: query,
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">SRT Search</h1>
          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isReindexing ? 'animate-spin' : ''}`} />
            {isReindexing ? 'Reindexing...' : 'Reindex'}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 my-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-4 lg:p-6">
        {/* Mobile: Search and Filter */}
        <div className="lg:hidden space-y-4">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            fuzzy={fuzzy}
            onFuzzyChange={setFuzzy}
            onSearch={search}
            isLoading={isLoadingResults}
          />

          <FileFilter
            files={files}
            selectedFile={selectedFile}
            onFileChange={handleFileChange}
            isLoading={isLoadingFiles}
          />

          {query && (
            <div className="text-sm text-gray-600 bg-white p-3 rounded-lg">
              <div>Total: {total.toLocaleString()} results</div>
              {results.length > 0 && (
                <div>
                  Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, total)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Left Column - Search */}
        <div className="hidden lg:block lg:w-1/4 xl:w-1/5 space-y-6">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            fuzzy={fuzzy}
            onFuzzyChange={setFuzzy}
            onSearch={search}
            isLoading={isLoadingResults}
          />

          <FileFilter
            files={files}
            selectedFile={selectedFile}
            onFileChange={handleFileChange}
            isLoading={isLoadingFiles}
          />

          {query && (
            <div className="text-sm text-gray-600">
              <div>Total: {total.toLocaleString()} results</div>
              {results.length > 0 && (
                <div>
                  Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, total)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 lg:w-1/2 xl:w-3/5 min-h-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
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
          <div className="lg:sticky lg:top-6">
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
      <div className="px-6 pb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Search Tips</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Use quotes for exact phrases: "hello world"</li>
            <li>• Use * for prefix matching: democra*</li>
            <li>• Use OR for boolean search: cat OR dog</li>
            <li>• Enable fuzzy search for approximate matches</li>
            <li>• Use j/k or ↑↓ to navigate results, Enter to play</li>
          </ul>
        </div>
      </div>

    </div>
  )
}

export default App