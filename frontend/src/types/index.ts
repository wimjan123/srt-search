export interface FileInfo {
  basename: string
  ext: string
  rel_path: string
  has_srt: boolean
  segment_count: number
}

export interface SearchResult {
  video_basename: string
  rel_path: string
  ext: string
  start_ms: number
  end_ms: number
  timecode: string
  snippet_html: string
}

export interface SearchResponse {
  total: number
  items: SearchResult[]
}

export interface SearchParams {
  q: string
  file?: string
  offset?: number
  limit?: number
  fuzzy?: number
}