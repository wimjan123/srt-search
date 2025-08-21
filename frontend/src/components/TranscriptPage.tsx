import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { X, FileText, Download, Search, ArrowLeft, Play } from 'lucide-react'
import { Transcript, TranscriptSegment } from '../types'
import { apiClient } from '../lib/api'

export default function TranscriptPage() {
  const { videoBasename } = useParams<{ videoBasename: string }>()
  const navigate = useNavigate()
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>([])

  useEffect(() => {
    const fetchTranscript = async () => {
      if (!videoBasename) return
      
      try {
        setLoading(true)
        setError(null)
        const data = await apiClient.getTranscript(videoBasename)
        setTranscript(data)
        setFilteredSegments(data.segments)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transcript')
      } finally {
        setLoading(false)
      }
    }

    fetchTranscript()
  }, [videoBasename])

  useEffect(() => {
    if (!transcript) return

    if (!searchTerm.trim()) {
      setFilteredSegments(transcript.segments)
    } else {
      const filtered = transcript.segments.filter(segment =>
        segment.text.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSegments(filtered)
    }
  }, [searchTerm, transcript])

  const downloadTranscript = () => {
    if (!transcript) return

    const content = transcript.segments
      .map(segment => `${segment.timecode}\n${segment.text}\n`)
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${transcript.video_basename}_transcript.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleTimestampClick = (segment: TranscriptSegment) => {
    // Navigate back to main app with the video and timestamp
    navigate(`/?video=${videoBasename}&time=${segment.start_ms}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading transcript...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-lg">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Transcript</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Search
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!transcript) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back to Search</span>
              </button>
              
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{transcript.video_basename}</h1>
                  <p className="text-sm text-gray-600">{transcript.segments.length} segments</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={downloadTranscript}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Download transcript"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search within transcript..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              {filteredSegments.length} of {transcript.segments.length} segments shown
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredSegments.length === 0 ? (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No segments found</h3>
            <p className="text-gray-600">
              {searchTerm ? `No segments match "${searchTerm}"` : 'This transcript appears to be empty'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:gap-6">
            {filteredSegments.map((segment, index) => (
              <article
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => handleTimestampClick(segment)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-mono flex-shrink-0 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors group"
                    title="Jump to this moment in the video"
                  >
                    <Play className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                    {segment.timecode}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 leading-relaxed text-base">
                      {searchTerm ? (
                        <span
                          dangerouslySetInnerHTML={{
                            __html: segment.text.replace(
                              new RegExp(`(${searchTerm})`, 'gi'),
                              '<mark class="bg-yellow-200 px-1 rounded font-medium">$1</mark>'
                            )
                          }}
                        />
                      ) : (
                        segment.text
                      )}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-600">
            Click on any timestamp to jump to that moment in the video
          </p>
        </div>
      </footer>
    </div>
  )
}