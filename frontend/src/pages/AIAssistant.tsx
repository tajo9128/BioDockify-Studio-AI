import { useState } from 'react'
import { Card, Button } from '@/components/ui'
import { sendChat, getChatStatus } from '@/api/chat'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ provider: string; available: boolean } | null>(null)

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await sendChat(userMessage.content)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response || response.error || 'AI returned no response. Check your LLM settings.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setStatus({ provider: response.provider || 'unknown', available: response.available !== false })
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to connect to AI assistant. Check Settings.'
      setError(msg)
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${msg}`,
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleStatus = async () => {
    try {
      const s = await getChatStatus()
      setStatus({ provider: s.provider, available: s.ollama_available })
    } catch (err) {
      console.error('Status check failed:', err)
    }
  }

  const clearMessages = () => setMessages([])

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Assistant</h1>
          <p className="text-text-secondary mt-1">
            Powered by {status?.provider || 'Ollama'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleStatus}>
            Check Status
          </Button>
          <Button variant="outline" size="sm" onClick={clearMessages}>
            Clear
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Status indicator */}
      {status && (
        <div className="mb-4 p-3 bg-surface-secondary rounded-lg flex items-center gap-2">
          <span className={status.available ? 'text-green-500' : 'text-gray-400'}>
            {status.available ? '●' : '○'}
          </span>
          <span className="text-sm text-text-secondary">
            {status.provider === 'ollama' ? 'Ollama connected' : 'Offline mode'}
          </span>
        </div>
      )}

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden" padding="none">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary">
              <p className="text-4xl mb-2">🤖</p>
              <p>Ask me about molecular docking, Vina scoring, GNINA, or drug discovery!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-surface-secondary text-text-primary'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-white/60' : 'text-text-tertiary'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-secondary rounded-xl px-4 py-3">
                <p className="text-sm text-text-tertiary animate-pulse">Thinking...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border-light">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about molecular docking..."
              className="flex-1 px-4 py-2 bg-surface-secondary border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              Send
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
