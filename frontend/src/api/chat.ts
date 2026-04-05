import { apiClient } from '@/lib/apiClient'
import type { ChatRequest, ChatResponse, ChatStatus, PlatformContext } from '@/lib/types'

export async function sendChat(message: string, conversationId?: string): Promise<ChatResponse> {
  const body: ChatRequest = { message }
  if (conversationId) body.conversation_id = conversationId
  const { data } = await apiClient.post<ChatResponse>('/brain/chat', body)
  return data
}

export async function getChatStatus(): Promise<ChatStatus> {
  const { data } = await apiClient.get<ChatStatus>('/brain/chat/status')
  return data
}

export async function getPlatformContext(): Promise<PlatformContext> {
  const { data } = await apiClient.get<PlatformContext>('/brain/ai/context')
  return data
}
