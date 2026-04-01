import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

const APP_VERSION = '2.3.5'

const AI_PROVIDERS = [
  { value: 'ollama', label: 'Ollama (Local)', icon: '🏠', baseUrl: 'http://localhost:11434/v1', needsApiKey: false },
  { value: 'openai', label: 'OpenAI', icon: '🤖', baseUrl: 'https://api.openai.com/v1', needsApiKey: true },
  { value: 'anthropic', label: 'Anthropic Claude', icon: '🧠', baseUrl: 'https://api.anthropic.com/v1', needsApiKey: true },
  { value: 'gemini', label: 'Google Gemini', icon: '✨', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', needsApiKey: true },
  { value: 'deepseek', label: 'DeepSeek', icon: '🔮', baseUrl: 'https://api.deepseek.com/v1', needsApiKey: true },
  { value: 'mistral', label: 'Mistral AI', icon: '🌬️', baseUrl: 'https://api.mistral.ai/v1', needsApiKey: true },
  { value: 'groq', label: 'Groq', icon: '⚡', baseUrl: 'https://api.groq.com/openai/v1', needsApiKey: true },
  { value: 'openrouter', label: 'OpenRouter', icon: '🛣️', baseUrl: 'https://openrouter.ai/api/v1', needsApiKey: true },
  { value: 'siliconflow', label: 'SiliconFlow', icon: '💎', baseUrl: 'https://api.siliconflow.cn/v1', needsApiKey: true },
  { value: 'qwen', label: 'Qwen (Alibaba)', icon: '🌏', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', needsApiKey: true },
  { value: 'custom', label: 'Custom (OpenAI-compatible)', icon: '⚙️', baseUrl: '', needsApiKey: true },
]

const MODELS_BY_PROVIDER: Record<string, Array<{ value: string; label: string }>> = {
  ollama: [
    { value: 'llama3.2', label: 'Llama 3.2' },
    { value: 'llama3.1', label: 'Llama 3.1' },
    { value: 'llama3', label: 'Llama 3' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'mixtral', label: 'Mixtral' },
    { value: 'codellama', label: 'Code Llama' },
    { value: 'qwen2.5', label: 'Qwen 2.5' },
    { value: 'phi3', label: 'Phi-3' },
    { value: 'gemma2', label: 'Gemma 2' },
    { value: 'nomic-embed-text', label: 'Nomic Embed Text' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Exp)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  ],
  mistral: [
    { value: 'mistral-large', label: 'Mistral Large' },
    { value: 'mistral-small', label: 'Mistral Small' },
    { value: 'mistral-7b-instruct', label: 'Mistral 7B' },
    { value: 'codestral', label: 'Codestral' },
  ],
  groq: [
    { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  ],
  openrouter: [
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'google/gemini-pro', label: 'Gemini Pro' },
    { value: 'mistralai/mistral-large', label: 'Mistral Large' },
    { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
  ],
  siliconflow: [
    { value: 'Qwen/Qwen2-72B-Instruct', label: 'Qwen2-72B' },
    { value: 'deepseek-ai/DeepSeek-V2.5', label: 'DeepSeek V2.5' },
    { value: '01-ai/Yi-Large', label: 'Yi Large' },
    { value: 'THUDM/GLM-4-9B-Chat', label: 'GLM-4-9B' },
  ],
  qwen: [
    { value: 'qwen-plus', label: 'Qwen Plus' },
    { value: 'qwen-turbo', label: 'Qwen Turbo' },
    { value: 'qwen-max', label: 'Qwen Max' },
    { value: 'qwen-long', label: 'Qwen Long (1M ctx)' },
  ],
  custom: [
    { value: 'custom-model', label: 'Custom Model' },
  ],
}

export function Settings() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  
  const [activeTab, setActiveTab] = useState<'llm' | 'system' | 'about'>('llm')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [testResult, setTestResult] = useState<{ status: string; response?: string; error?: string } | null>(null)
  const [message, setMessage] = useState('')
  const [availableOllamaModels, setAvailableOllamaModels] = useState<string[]>([])

  const [llmConfig, setLlmConfig] = useState({
    provider: 'ollama',
    model: 'llama3.2',
    apiKey: '',
    baseUrl: 'http://localhost:11434/v1',
    temperature: '0.7',
    maxTokens: '4096',
  })

  useEffect(() => {
    fetchLLMSettings()
    if (llmConfig.provider === 'ollama') {
      fetchOllamaModels()
    }
  }, [])

  const fetchLLMSettings = async () => {
    try {
      const res = await fetch('/llm/settings')
      const data = await res.json()
      setLlmConfig({
        provider: data.provider || 'ollama',
        model: data.model || 'llama3.2',
        apiKey: data.api_key || '',
        baseUrl: data.base_url || 'http://localhost:11434/v1',
        temperature: String(data.temperature || 0.7),
        maxTokens: String(data.max_tokens || 4096),
      })
    } catch (e) {
      console.error('Failed to fetch LLM settings:', e)
    }
  }

  const fetchOllamaModels = async () => {
    setFetchingModels(true)
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      if (res.ok) {
        const data = await res.json()
        const models = (data.models || []).map((m: any) => m.name)
        setAvailableOllamaModels(models)
        if (models.length > 0 && !models.includes(llmConfig.model)) {
          setLlmConfig(prev => ({ ...prev, model: models[0] }))
        }
      }
    } catch (e) {
      console.error('Failed to fetch Ollama models:', e)
    } finally {
      setFetchingModels(false)
    }
  }

  const handleProviderChange = (provider: string) => {
    const providerInfo = AI_PROVIDERS.find(p => p.value === provider)
    const models = MODELS_BY_PROVIDER[provider] || MODELS_BY_PROVIDER.ollama
    
    setLlmConfig(prev => ({
      ...prev,
      provider,
      baseUrl: providerInfo?.baseUrl || '',
      model: models[0]?.value || '',
      apiKey: providerInfo?.needsApiKey ? prev.apiKey : '',
    }))
    setTestResult(null)
    
    if (provider === 'ollama') {
      fetchOllamaModels()
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/llm/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: llmConfig.provider,
          model: llmConfig.model,
          api_key: llmConfig.apiKey,
          base_url: llmConfig.baseUrl,
          temperature: parseFloat(llmConfig.temperature) || 0.7,
          max_tokens: parseInt(llmConfig.maxTokens) || 4096,
        }),
      })
      if (res.ok) {
        setMessage('Settings saved successfully')
      } else {
        setMessage('Failed to save settings')
      }
    } catch {
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setMessage('')
    try {
      const res = await fetch('/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: llmConfig.provider,
          model: llmConfig.model,
          api_key: llmConfig.apiKey,
          base_url: llmConfig.baseUrl,
        }),
      })
      const data = await res.json()
      setTestResult(data)
      if (data.status === 'ok') {
        setMessage('Connection successful!')
      } else {
        setMessage(data.error || 'Connection failed')
      }
    } catch (err: any) {
      setTestResult({ status: 'error', error: err?.message || 'Connection failed' })
      setMessage('Connection failed')
    } finally {
      setTesting(false)
    }
  }

  const inputClass = (hasError = false) => `
    w-full px-3 py-2.5 rounded-lg border text-sm transition-all
    ${isDark 
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500' 
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
    }
    focus:outline-none focus:ring-2 focus:border-transparent
    ${hasError ? 'border-red-500' : ''}
  `

  const labelClass = `block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`
  const hintClass = `text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`

  const providerInfo = AI_PROVIDERS.find(p => p.value === llmConfig.provider)

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Configure AI provider and application preferences
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm border ${
            isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
          }`}>
            v{APP_VERSION}
          </span>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.includes('successful') || message.includes('successful')
              ? isDark ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-green-50 text-green-700 border border-green-200'
              : isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit ${isDark ? 'bg-gray-800' : 'bg-gray-200'}">
          {(['llm', 'system', 'about'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'llm' ? 'AI Provider' : tab === 'system' ? 'System' : 'About'}
            </button>
          ))}
        </div>

        {activeTab === 'llm' && (
          <div className="space-y-6">
            <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">AI Provider Configuration</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select your preferred LLM provider and model
                </p>
              </div>
              
              <div className="p-6 space-y-5">
                <div>
                  <label className={labelClass}>Provider</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {AI_PROVIDERS.map(p => (
                      <button
                        key={p.value}
                        onClick={() => handleProviderChange(p.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          llmConfig.provider === p.value
                            ? isDark 
                              ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                              : 'bg-blue-50 border-blue-500 text-blue-700'
                            : isDark
                              ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{p.icon}</span>
                          <span className="text-sm font-medium">{p.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Model</label>
                    <div className="relative">
                      <select
                        value={llmConfig.model}
                        onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                        className={inputClass()}
                      >
                        {llmConfig.provider === 'ollama' && availableOllamaModels.length > 0 ? (
                          <>
                            <optgroup label="Installed Models">
                              {availableOllamaModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Common Models">
                              {MODELS_BY_PROVIDER.ollama.filter(m => !availableOllamaModels.includes(m.value)).map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </optgroup>
                          </>
                        ) : (
                          MODELS_BY_PROVIDER[llmConfig.provider]?.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          )) || (
                            <option value="llama3.2">Llama 3.2</option>
                          )
                        )}
                      </select>
                      {llmConfig.provider === 'ollama' && (
                        <button
                          onClick={fetchOllamaModels}
                          disabled={fetchingModels}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded ${
                            isDark ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {fetchingModels ? '...' : 'Refresh'}
                        </button>
                      )}
                    </div>
                    {llmConfig.provider === 'ollama' && availableOllamaModels.length === 0 && (
                      <p className={hintClass}>
                        Ollama not running or no models installed.{' '}
                        <a href="https://ollama.com" target="_blank" className="text-blue-500 hover:underline">Install Ollama</a>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Max Tokens</label>
                    <input
                      type="number"
                      value={llmConfig.maxTokens}
                      onChange={(e) => setLlmConfig({ ...llmConfig, maxTokens: e.target.value })}
                      min={100}
                      max={128000}
                      className={inputClass()}
                      placeholder="4096"
                    />
                    <p className={hintClass}>Maximum response length</p>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Base URL</label>
                  <input
                    type="text"
                    value={llmConfig.baseUrl}
                    onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                    className={inputClass()}
                    placeholder={providerInfo?.baseUrl || 'https://api.example.com/v1'}
                  />
                  <p className={hintClass}>
                    {providerInfo?.needsApiKey 
                      ? 'API endpoint for your provider (OpenAI-compatible)'
                      : 'Ollama server URL (default: http://localhost:11434/v1)'}
                  </p>
                </div>

                <div>
                  <label className={labelClass}>API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={llmConfig.apiKey}
                      onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                      className={inputClass() + ' pr-20'}
                      placeholder={providerInfo?.needsApiKey ? 'sk-...' : 'Not required for Ollama'}
                      disabled={!providerInfo?.needsApiKey}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                        isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className={hintClass}>
                    {providerInfo?.needsApiKey 
                      ? 'Your API key is stored securely in memory only'
                      : 'No API key required for local Ollama models'}
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Temperature: {llmConfig.temperature}</label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={llmConfig.temperature}
                    onChange={(e) => setLlmConfig({ ...llmConfig, temperature: e.target.value })}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-300 dark:bg-gray-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Precise</span>
                    <span>Balanced</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className={`px-5 py-2.5 font-medium rounded-lg transition-colors ${
                      isDark 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600' 
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-lg border ${
                    testResult.status === 'ok'
                      ? isDark ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
                      : isDark ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <p className="font-semibold text-sm flex items-center gap-2">
                      {testResult.status === 'ok' ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Connection successful!
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Connection failed
                        </>
                      )}
                    </p>
                    {testResult.response && (
                      <p className="text-sm mt-2 opacity-80">Model: "{testResult.response}"</p>
                    )}
                    {testResult.error && (
                      <p className="text-xs mt-2 font-mono opacity-80">Error: {testResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Theme</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Choose your preferred appearance
                </p>
              </div>
              <div className="p-6">
                <div className="flex gap-3">
                  {(['light', 'dark'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        theme === t
                          ? isDark
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-blue-500 bg-blue-50'
                          : isDark
                            ? 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{t === 'light' ? '☀️' : '🌙'}</div>
                      <div className="font-medium capitalize">{t === 'light' ? 'Light' : 'Dark'}</div>
                      <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t === 'light' ? 'Clean and bright' : 'Easy on the eyes'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Docker Configuration</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Container runtime settings
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={labelClass}>GPU Acceleration</label>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium">Enable NVIDIA GPU</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Pass through NVIDIA GPU to containers for acceleration
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">About BioDockify Studio AI</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                    🧬
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">BioDockify Studio AI</h3>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>AI-Powered Drug Discovery Platform</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Version</span>
                    <span className="font-medium">{APP_VERSION}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Stack</span>
                    <span className="font-medium">React + FastAPI + RDKit</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Docking</span>
                    <span className="font-medium">AutoDock Vina + GNINA + RF</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>License</span>
                    <span className="font-medium">MIT</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Features</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                {[
                  { icon: '🧪', name: 'ChemDraw', desc: '2D/3D molecule editor' },
                  { icon: '🔬', name: 'Docking', desc: 'Vina/GNINA/RF scoring' },
                  { icon: '⚡', name: 'MD Simulation', desc: 'Molecular dynamics' },
                  { icon: '🤖', name: 'AI Assistant', desc: 'LLM-powered chat' },
                  { icon: '📊', name: 'QSAR Modeling', desc: 'Predictive analysis' },
                  { icon: '💊', name: 'Pharmacophore', desc: 'Feature-based screening' },
                ].map(f => (
                  <div key={f.name} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="text-xl mb-1">{f.icon}</div>
                    <div className="font-medium text-sm">{f.name}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
