import { useHealth, useGPU } from '@/hooks'
import { useEffect, useState } from 'react'

export function StatusBar() {
  const { data: health } = useHealth()
  const { data: gpu } = useGPU()
  const [llmProvider, setLlmProvider] = useState('')

  const isBackendConnected = health?.status === 'healthy'
  const hasGPU = gpu?.available && gpu.gpus.length > 0

  useEffect(() => {
    fetch('/llm/settings')
      .then((r) => r.json())
      .then((data) => {
        const p = data?.provider || ''
        setLlmProvider(p === 'openai' ? 'OpenAI' : p === 'deepseek' ? 'DeepSeek' : p === 'zhipu' ? 'Zhipu AI' : p === 'qwen' ? 'Qwen' : p === 'moonshot' ? 'Moonshot' : p === 'siliconflow' ? 'SiliconFlow' : p === 'groq' ? 'Groq' : p === 'ollama' ? 'Ollama' : p || 'Not configured')
      })
      .catch(() => setLlmProvider('Offline'))
  }, [])

  return (
    <footer className="h-8 bg-background-dark text-gray-400 flex items-center px-4 text-xs border-t border-gray-800">
      <div className="flex items-center gap-1.5">
        <span className={isBackendConnected ? 'text-green-400' : 'text-red-400'}>●</span>
        <span>Backend: {isBackendConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div className="mx-3 text-gray-700">|</div>

      <div className="flex items-center gap-1.5">
        <span className={hasGPU ? 'text-green-400' : 'text-gray-500'}>🖥</span>
        <span>GPU: {hasGPU ? gpu.gpus[0].name : 'Not detected'}</span>
      </div>

      <div className="mx-3 text-gray-700">|</div>

      <div className="flex items-center gap-1.5">
        <span className={llmProvider ? 'text-green-400' : 'text-gray-500'}>🤖</span>
        <span>AI: {llmProvider || 'Loading...'}</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <span className="text-green-400">●</span>
        <span>Docker</span>
      </div>

      <div className="mx-3 text-gray-700">|</div>

      <span className="text-gray-500">v2.0.0</span>
    </footer>
  )
}
