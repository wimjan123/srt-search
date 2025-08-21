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
  AlertCircle 
} from 'lucide-react'

interface PlayerProps {
  files: FileInfo[]
  selectedFile?: string
  onFileChange: (file: string) => void
  currentResult?: SearchResult
}

export function Player({ files, selectedFile, onFileChange, currentResult }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [canPlay, setCanPlay] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentFileInfo = files.find(f => f.basename === selectedFile)
  const mediaUrl = currentFileInfo ? apiClient.getMediaUrl(currentFileInfo.rel_path) : null

  // Update video source when file changes
  useEffect(() => {
    if (videoRef.current && mediaUrl) {
      videoRef.current.load()
      setError(null)
      setCanPlay(true)
    }
  }, [mediaUrl])

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

  const handleError = () => {
    setCanPlay(false)
    setError('This video format is not supported in your browser.')
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
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg">
      {/* File Selection */}
      <div className="p-4 border-b">
        <div className="relative">
          <select
            value={selectedFile || ''}
            onChange={(e) => onFileChange(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      <div className="relative bg-black">
        {mediaUrl && canPlay ? (
          <video
            ref={videoRef}
            className="w-full h-64 object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={handleError}
            preload="metadata"
          >
            <source src={mediaUrl} />
            Your browser does not support the video tag.
          </video>
        ) : selectedFile ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-white bg-gray-900">
            <AlertCircle className="h-12 w-12 mb-4 text-gray-400" />
            <div className="text-center px-4">
              <p className="mb-2">Not playable in browser</p>
              <p className="text-sm text-gray-400 mb-4">
                {currentFileInfo?.ext === '.avi' 
                  ? 'AVI files may not be supported'
                  : 'This video format is not supported'}
              </p>
              <button
                onClick={downloadVideo}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-gray-400 bg-gray-900">
            Select a video to play
          </div>
        )}
      </div>

      {/* Controls */}
      {selectedFile && (
        <div className="p-4 space-y-4">
          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleSkip(-5)}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Back 5 seconds"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            {canPlay && (
              <button
                onClick={handlePlay}
                className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </button>
            )}

            <button
              onClick={() => handleSkip(5)}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Forward 5 seconds"
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

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-gray-600" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1"
            />
            <span className="text-xs text-gray-600 w-8">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={copyTimecode}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              <Copy className="h-4 w-4" />
              Copy Time
            </button>
            
            <button
              onClick={downloadVideo}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>

          {/* Current File Info */}
          {currentFileInfo && (
            <div className="text-xs text-gray-500 text-center">
              {currentFileInfo.basename}{currentFileInfo.ext}
              {currentFileInfo.segment_count > 0 && (
                <span> • {currentFileInfo.segment_count} subtitles</span>
              )}
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}