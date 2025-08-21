import { useState, useEffect } from 'react'
import { X, Clock, FileText, Download, Search } from 'lucide-react'
import { Transcript, TranscriptSegment } from '../types'
import { apiClient } from '../lib/api'

interface TranscriptViewerProps {
  videoBasename: string
  onClose: () => void
  onTimestampClick: (segment: TranscriptSegment) => void
}

export function TranscriptViewer({ videoBasename, onClose, onTimestampClick }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>([])

  useEffect(() => {
    const fetchTranscript = async () => {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading transcript...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-600">Error</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!transcript) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">{transcript.video_basename}</h2>
              <p className="text-sm text-gray-600">{transcript.segments.length} segments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadTranscript}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              title="Download transcript"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search within transcript..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              {filteredSegments.length} of {transcript.segments.length} segments shown
            </p>
          )}
        </div>

        {/* Transcript Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredSegments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No segments found matching "{searchTerm}"
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSegments.map((segment, index) => (
                <div
                  key={index}
                  className="group border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onTimestampClick(segment)}
                >
                  <div className="flex items-start gap-3">
                    <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-mono flex-shrink-0">
                      <Clock className="h-4 w-4" />
                      {segment.timecode}
                    </button>
                    <div className="flex-1">
                      <p className="text-gray-800 leading-relaxed">
                        {searchTerm ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: segment.text.replace(
                                new RegExp(`(${searchTerm})`, 'gi'),
                                '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                              )
                            }}
                          />
                        ) : (
                          segment.text
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            Click on any timestamp to jump to that moment in the video
          </p>
        </div>
      </div>
    </div>
  )
}