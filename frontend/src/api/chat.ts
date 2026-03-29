import { apiClient } from '@/lib/apiClient'
import type { ChatRequest, ChatResponse, ChatStatus } from '@/lib/types'

export async function sendChat(message: string): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>('/brain/chat', { message } as ChatRequest)
  return data
}

export async function getChatStatus(): Promise<ChatStatus> {
  const { data } = await apiClient.get<ChatStatus>('/brain/chat/status')
  return data
}
