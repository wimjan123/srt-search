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
    <div className={`bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 overflow-hidden ${isFullscreen ? 'fixed inset-6 z-50' : 'w-full'}`}>
      {/* Header */}
      <div className="p-6 border-b border-white/20 bg-gradient-to-r from-white/30 to-blue-50/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent flex items-center gap-2">
            <div className="h-6 w-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5v1a1.5 1.5 0 01-1.5 1.5H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Video Player
          </h3>
          <button
            onClick={toggleFullscreen}
            className="group p-3 text-gray-500 hover:text-gray-900 bg-white/50 hover:bg-white/80 rounded-xl border border-white/30 hover:border-gray-200/50 transition-all duration-200 shadow-sm hover:shadow-md"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? 
              <Minimize2 className="h-4 w-4 transition-transform group-hover:scale-110" /> : 
              <Maximize2 className="h-4 w-4 transition-transform group-hover:scale-110" />
            }
          </button>
        </div>
        
        {/* File Selection */}
        <div className="relative group">
          <select
            value={selectedFile || ''}
            onChange={(e) => onFileChange(e.target.value)}
            className="w-full appearance-none bg-white/50 border border-white/30 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/90 transition-all duration-200 shadow-sm"
          >
            <option value="">Select a video...</option>
            {indexedFiles.map((file) => (
              <option key={file.basename} value={file.basename}>
                {file.basename}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative bg-gradient-to-br from-gray-900 to-black overflow-hidden">
        {mediaUrl ? (
          <div className={`relative ${isFullscreen ? 'h-[calc(100vh-16rem)]' : 'h-64 lg:h-80'}`}>
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
          <div className={`w-full ${isFullscreen ? 'h-[calc(100vh-16rem)]' : 'h-64 lg:h-80'} flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-800 to-gray-900`}>
            <div className="relative">
              <AlertCircle className="h-16 w-16 mb-6 text-amber-400 mx-auto" />
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl"></div>
            </div>
            <div className="text-center px-6">
              <p className="mb-2 text-xl font-semibold">Video not available</p>
              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                {error || 'Unable to load this video file'}
              </p>
              <button
                onClick={downloadVideo}
                className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mx-auto"
              >
                <Download className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span className="font-medium">Download File</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`w-full ${isFullscreen ? 'h-[calc(100vh-16rem)]' : 'h-64 lg:h-80'} flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900`}>
            <div className="text-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 mx-auto bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center">
                  <Play className="h-10 w-10 text-gray-300 ml-1" />
                </div>
                <div className="absolute inset-0 bg-gray-500/20 rounded-2xl blur-xl"></div>
              </div>
              <p className="text-xl font-semibold text-gray-300">Select a video to play</p>
              <p className="text-sm text-gray-500 mt-2">Choose from your indexed videos above</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {selectedFile && (
        <div className="p-6 space-y-6 bg-gradient-to-r from-white/30 to-blue-50/30 backdrop-blur-sm">
          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => handleSkip(-10)}
              className="group p-3 text-gray-600 hover:text-gray-900 bg-white/50 hover:bg-white/80 rounded-xl border border-white/30 hover:border-gray-200/50 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Back 10 seconds"
            >
              <SkipBack className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>

            <button
              onClick={handlePlay}
              className="group p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isPlaying ? (
                <Pause className="h-7 w-7 transition-transform group-hover:scale-110" />
              ) : (
                <Play className="h-7 w-7 ml-0.5 transition-transform group-hover:scale-110" />
              )}
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="group p-3 text-gray-600 hover:text-gray-900 bg-white/50 hover:bg-white/80 rounded-xl border border-white/30 hover:border-gray-200/50 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Forward 10 seconds"
            >
              <SkipForward className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>
          </div>

          {/* Time Display */}
          <div className="text-center">
            <div className="bg-white/50 backdrop-blur-sm border border-white/30 rounded-2xl px-6 py-3 inline-block shadow-lg">
              <div className="text-xl font-mono font-semibold text-gray-900">
                {formatTime(currentTime)}
                {duration > 0 && (
                  <span className="text-gray-500 font-normal"> / {formatTime(duration)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Volume Control */}
            <div className="bg-white/50 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none slider accent-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 w-12 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            {/* Playback Speed */}
            <div className="bg-white/50 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 flex-shrink-0">Speed:</span>
                <select
                  value={playbackRate}
                  onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                  className="flex-1 text-sm bg-white/70 border border-white/30 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={copyTimecode}
              className="group flex-1 flex items-center justify-center gap-3 py-3 px-4 text-sm font-medium bg-white/50 border border-white/30 rounded-xl hover:bg-white/80 hover:border-gray-200/50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Copy className="h-4 w-4 transition-transform group-hover:scale-110" />
              Copy Time
            </button>
            
            <button
              onClick={downloadVideo}
              className="group flex-1 flex items-center justify-center gap-3 py-3 px-4 text-sm font-medium bg-white/50 border border-white/30 rounded-xl hover:bg-white/80 hover:border-gray-200/50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4 transition-transform group-hover:scale-110" />
              Download
            </button>
          </div>

          {/* Current File Info */}
          {currentFileInfo && (
            <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 backdrop-blur-sm border border-blue-200/30 rounded-2xl p-4 shadow-lg">
              <div className="text-sm text-gray-700 text-center font-medium">
                {currentFileInfo.basename}{currentFileInfo.ext}
                {currentFileInfo.segment_count > 0 && (
                  <div className="text-blue-600 text-xs mt-1 flex items-center justify-center gap-1">
                    <div className="h-1.5 w-1.5 bg-blue-400 rounded-full"></div>
                    {currentFileInfo.segment_count} subtitle segments available
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50/70 backdrop-blur-sm border border-red-200/50 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 justify-center">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <div className="text-sm text-red-700 font-medium text-center">
                  {error}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
