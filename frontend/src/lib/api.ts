import { FileInfo, SearchResponse, SearchParams } from '../types'

const API_BASE = window.location.origin

class ApiClient {
  async getFiles(): Promise<FileInfo[]> {
    const response = await fetch(`${API_BASE}/api/files`)
    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`)
    }
    return response.json()
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    const searchParams = new URLSearchParams()
    searchParams.append('q', params.q)
    
    if (params.file) {
      searchParams.append('file', params.file)
    }
    if (params.offset !== undefined) {
      searchParams.append('offset', params.offset.toString())
    }
    if (params.limit !== undefined) {
      searchParams.append('limit', params.limit.toString())
    }
    if (params.fuzzy !== undefined) {
      searchParams.append('fuzzy', params.fuzzy.toString())
    }

    const response = await fetch(`${API_BASE}/api/search?${searchParams}`)
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }
    return response.json()
  }

  async reindex(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE}/api/reindex`, {
      method: 'POST'
    })
    if (!response.ok) {
      throw new Error(`Reindex failed: ${response.statusText}`)
    }
    return response.json()
  }

  getMediaUrl(relPath: string): string {
    return `${API_BASE}/media/${relPath}`
  }
}

export const apiClient = new ApiClient()