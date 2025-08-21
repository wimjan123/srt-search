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
    <div className="space-y-4">
      <div className="relative">
        <select
          value={selectedFile}
          onChange={(e) => onFileChange(e.target.value)}
          disabled={isLoading}
          className="w-full appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All files ({indexedFiles.length})</option>
          {indexedFiles.map((file) => (
            <option key={file.basename} value={file.basename}>
              {file.basename} ({file.segment_count} segments)
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {unindexedFiles.length > 0 && (
        <div className="bg-gray-50 rounded-md p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileX className="h-4 w-4" />
            Unindexed Videos ({unindexedFiles.length})
          </h4>
          <div className="space-y-1">
            {unindexedFiles.slice(0, 5).map((file) => (
              <div key={file.basename} className="text-xs text-gray-600 flex items-center gap-1">
                <FileVideo className="h-3 w-3" />
                {file.basename}{file.ext}
              </div>
            ))}
            {unindexedFiles.length > 5 && (
              <div className="text-xs text-gray-500">
                ...and {unindexedFiles.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}