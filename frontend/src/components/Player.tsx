import { useRef, useEffect, useState } from 'react'
import { FileInfo, SearchResult } from '../types'
import { apiClient } from '../lib/api'
import { formatTime, msToSeconds } from '../lib/utils'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Copy, 
  Download, 
  ChevronDown, 
  Volume2,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react'

interface PlayerProps {
  files: FileInfo[]
  selectedFile?: string
  onFileChange: (file: string) => void
  currentResult?: SearchResult
}

export function Player({ files, selectedFile, onFileChange, currentResult }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const subtitleTrackRef = useRef<TextTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  const currentFileInfo = files.find(f => f.basename === selectedFile)
  const mediaUrl = currentFileInfo ? apiClient.getMediaUrl(currentFileInfo.rel_path) : null

  // Update video source when file changes
  useEffect(() => {
    if (videoRef.current && mediaUrl) {
      videoRef.current.load()
      setError(null)
    }
  }, [mediaUrl])

  // Load and attach subtitles as a TextTrack using transcript data
  useEffect(() => {
    let canceled = false

    const attachSubtitles = async () => {
      // Disable and drop any existing track
      if (subtitleTrackRef.current) {
        try {
          const prev = subtitleTrackRef.current
          prev.mode = 'disabled'
          // Remove all existing cues for cleanliness
          if (prev.cues) {
            // Clone list to array as it's live
            Array.from(prev.cues).forEach(c => {
              try { prev.removeCue(c) } catch {}
            })
          }
        } catch {}
        subtitleTrackRef.current = null
      }

      if (!videoRef.current || !selectedFile) return

      try {
        const transcript = await apiClient.getTranscript(selectedFile)
        if (canceled) return
        if (!transcript?.segments?.length) return

        const track = videoRef.current.addTextTrack('subtitles', 'Subtitles', 'en')
        track.mode = 'showing'

        for (const seg of transcript.segments) {
          const start = seg.start_ms / 1000
          const end = seg.end_ms / 1000
          const text = seg.text
          try {
            const cue = new VTTCue(start, end, text)
            track.addCue(cue)
          } catch {
            // Safari/older browsers fallback
            const CueClass: any = (window as any).VTTCue || (window as any).TextTrackCue
            if (CueClass) {
              try {
                const cue = new CueClass(start, end, text)
                track.addCue(cue)
              } catch {}
            }
          }
        }

        subtitleTrackRef.current = track
      } catch (e) {
        // If no transcript (404) or error, just skip; keep player working
        // console.warn('No transcript available or failed to load:', e)
      }
    }

    attachSubtitles()
    return () => { canceled = true }
  }, [selectedFile])

  // Jump to timestamp when result changes
  useEffect(() => {
    if (videoRef.current && currentResult) {
      const targetTime = msToSeconds(currentResult.start_ms)
      videoRef.current.currentTime = targetTime
      setCurrentTime(targetTime)
    }
  }, [currentResult])

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(e => {
          console.error('Play failed:', e)
          setError('Playback failed. This video format may not be supported.')
        })
      }
    }
  }

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds))
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate)
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
    }
  }

  const handleError = () => {
    setError('This video format may not be supported in your browser.')
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const copyTimecode = () => {
    const timecode = formatTime(currentTime)
    navigator.clipboard.writeText(timecode)
  }

  const downloadVideo = () => {
    if (mediaUrl) {
      const link = document.createElement('a')
      link.href = mediaUrl
      link.download = (currentFileInfo?.basename || 'video') + (currentFileInfo?.ext || '')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const indexedFiles = files.filter(f => f.has_srt)

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${isFullscreen ? 'fixed inset-4 z-50' : 'w-full'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Video Player</h3>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
        
        {/* File Selection */}
        <div className="relative">
          <select
            value={selectedFile || ''}
            onChange={(e) => onFileChange(e.target.value)}
            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a video...</option>
            {indexedFiles.map((file) => (
              <option key={file.basename} value={file.basename}>
                {file.basename}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Video Player */}
      <div className="relative bg-black rounded-b-lg overflow-hidden">
        {mediaUrl ? (
          <div className={`relative ${isFullscreen ? 'h-[calc(100vh-12rem)]' : 'h-64 lg:h-72'}`}>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={handleError}
              preload="metadata"
              playsInline
            >
              <source src={mediaUrl} />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : selectedFile ? (
          <div className={`w-full ${isFullscreen ? 'h-[calc(100vh-12rem)]' : 'h-64 lg:h-72'} flex flex-col items-center justify-center text-white bg-gray-900`}>
            <AlertCircle className="h-12 w-12 mb-4 text-gray-400" />
            <div className="text-center px-4">
              <p className="mb-2 text-lg">Video not available</p>
              <p className="text-sm text-gray-400 mb-4">
                {error || 'Unable to load this video file'}
              </p>
              <button
                onClick={downloadVideo}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download File
              </button>
            </div>
          </div>
        ) : (
          <div className={`w-full ${isFullscreen ? 'h-[calc(100vh-12rem)]' : 'h-64 lg:h-72'} flex items-center justify-center text-gray-400 bg-gray-900`}>
            <div className="text-center">
              <Play className="h-16 w-16 mx-auto mb-4 text-gray-500" />
              <p className="text-lg">Select a video to play</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {selectedFile && (
        <div className="p-4 space-y-4 bg-gray-50">
          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleSkip(-10)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
              title="Back 10 seconds"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              onClick={handlePlay}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
              title="Forward 10 seconds"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Time Display */}
          <div className="text-center">
            <div className="text-lg font-mono text-gray-900">
              {formatTime(currentTime)}
              {duration > 0 && (
                <span className="text-gray-500"> / {formatTime(duration)}</span>
              )}
            </div>
          </div>

          {/* Controls Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-gray-600 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none slider"
              />
              <span className="text-xs text-gray-600 w-8 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>

            {/* Playback Speed */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 flex-shrink-0">Speed:</span>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={copyTimecode}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Copy className="h-4 w-4" />
              Copy Time
            </button>
            
            <button
              onClick={downloadVideo}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>

          {/* Current File Info */}
          {currentFileInfo && (
            <div className="text-xs text-gray-500 text-center bg-white p-2 rounded border">
              {currentFileInfo.basename}{currentFileInfo.ext}
              {currentFileInfo.segment_count > 0 && (
                <span className="text-blue-600"> • {currentFileInfo.segment_count} subtitles</span>
              )}
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 text-center bg-red-50 border border-red-200 p-2 rounded">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
