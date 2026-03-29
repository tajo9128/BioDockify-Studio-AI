import { apiClient } from '@/lib/apiClient'

export interface LLMSettings {
  provider: string
  model: string
  api_key: string
  base_url: string
  temperature: number
  max_tokens: number
}

export async function getLLMSettings(): Promise<LLMSettings> {
  const { data } = await apiClient.get<LLMSettings>('/llm/settings')
  return data
}

export async function updateLLMSettings(settings: Partial<LLMSettings>): Promise<{ status: string }> {
  const { data } = await apiClient.put('/llm/settings', settings)
  return data
}

export async function testLLMConnection(): Promise<{ status: string; response?: string; error?: string }> {
  const { data } = await apiClient.post('/llm/test')
  return data
}
