import { FileInfo } from '../types'
import { ChevronDown, FileVideo, FileX } from 'lucide-react'

interface FileFilterProps {
  files: FileInfo[]
  selectedFile: string
  onFileChange: (file: string) => void
  isLoading?: boolean
}

export function FileFilter({ files, selectedFile, onFileChange, isLoading = false }: FileFilterProps) {
  const indexedFiles = files.filter(f => f.has_srt)
  const unindexedFiles = files.filter(f => !f.has_srt)

  return (
    <div className="space-y-6">
      <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100/50">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FileVideo className="h-4 w-4 text-blue-500" />
            Filter by Video
          </h3>
        </div>
        <div className="p-4">
          <div className="relative group">
            <select
              value={selectedFile}
              onChange={(e) => onFileChange(e.target.value)}
              disabled={isLoading}
              className="w-full appearance-none bg-white/50 border border-white/30 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/90 text-sm transition-all duration-200 shadow-sm"
            >
              <option value="">All files ({indexedFiles.length})</option>
              {indexedFiles.map((file) => (
                <option key={file.basename} value={file.basename}>
                  {file.basename} ({file.segment_count} segments)
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {unindexedFiles.length > 0 && (
        <div className="bg-amber-50/70 backdrop-blur-sm border border-amber-200/50 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-amber-100/50">
            <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <FileX className="h-4 w-4 text-amber-600" />
              Unindexed Videos ({unindexedFiles.length})
            </h4>
            <p className="text-xs text-amber-600 mt-1">Videos without searchable subtitles</p>
          </div>
          <div className="p-4">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {unindexedFiles.slice(0, 5).map((file) => (
                <div key={file.basename} className="text-xs text-amber-700 flex items-center gap-2 py-1">
                  <FileVideo className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  <span className="truncate">{file.basename}{file.ext}</span>
                </div>
              ))}
              {unindexedFiles.length > 5 && (
                <div className="text-xs text-amber-600 pt-2 border-t border-amber-200/50">
                  ...and {unindexedFiles.length - 5} more files
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}