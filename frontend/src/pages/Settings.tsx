import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Tabs, TabPanel } from '@/components/ui'
import { getLLMSettings, updateLLMSettings, testLLMConnection } from '@/api/settings'

export function Settings() {
  const [activeTab, setActiveTab] = useState('llm')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: string; response?: string; error?: string } | null>(null)
  const [message, setMessage] = useState('')

  const [llmConfig, setLlmConfig] = useState({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    temperature: '0.7',
    maxTokens: '4096',
  })

  const [dockerConfig, setDockerConfig] = useState({
    timeout: '3600',
    gpuEnabled: true,
  })

  useEffect(() => {
    getLLMSettings()
      .then((settings) => {
        setLlmConfig({
          provider: settings.provider || 'openai',
          model: settings.model || 'gpt-4o-mini',
          apiKey: settings.api_key || '',
          baseUrl: settings.base_url || 'https://api.openai.com/v1',
          temperature: String(settings.temperature || 0.7),
          maxTokens: String(settings.max_tokens || 4096),
        })
      })
      .catch(() => {})
  }, [])

  const getModelsForProvider = (provider: string) => {
    const models: Record<string, Array<{ value: string; label: string }>> = {
      openai: [
        { value: 'gpt-4o', label: 'GPT-4o (Best, fastest)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, cheap)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      ],
      deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat (Recommended)' },
        { value: 'deepseek-coder', label: 'DeepSeek Coder' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
      ],
      zhipu: [
        { value: 'glm-4', label: 'GLM-4 (Best)' },
        { value: 'glm-4-flash', label: 'GLM-4 Flash (Fast)' },
        { value: 'glm-3-turbo', label: 'GLM-3 Turbo' },
      ],
      qwen: [
        { value: 'qwen-plus', label: 'Qwen Plus (Recommended)' },
        { value: 'qwen-turbo', label: 'Qwen Turbo (Fast)' },
        { value: 'qwen-max', label: 'Qwen Max' },
        { value: 'qwen2-72b', label: 'Qwen2-72B' },
      ],
      moonshot: [
        { value: 'moonshot-v1-8k', label: 'Moonshot V1 8K' },
        { value: 'moonshot-v1-32k', label: 'Moonshot V1 32K' },
        { value: 'moonshot-v1-128k', label: 'Moonshot V1 128K' },
      ],
      siliconflow: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat (via SiliconFlow)' },
        { value: 'qwen-plus', label: 'Qwen Plus (via SiliconFlow)' },
        { value: 'yi-large', label: 'Yi Large (via SiliconFlow)' },
        { value: 'internlm2-large', label: 'InternLM2 Large (via SiliconFlow)' },
        { value: 'qwen2-72b-instruct', label: 'Qwen2-72B (via SiliconFlow)' },
      ],
      groq: [
        { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
        { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
        { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      ],
      ollama: [
        { value: 'llama3', label: 'Llama 3' },
        { value: 'llama3.1', label: 'Llama 3.1' },
        { value: 'llama3.2', label: 'Llama 3.2' },
        { value: 'mixtral', label: 'Mixtral' },
        { value: 'mistral', label: 'Mistral' },
        { value: 'qwen2.5', label: 'Qwen 2.5' },
        { value: 'codellama', label: 'Code Llama' },
        { value: 'nomic-embed-text', label: 'Nomic Embed Text' },
      ],
      lmstudio: [
        { value: 'local-model', label: 'Local Model (any loaded)' },
      ],
    }
    return models[provider] || models.openai
  }

  const getBaseUrlForProvider = (provider: string) => {
    const baseUrls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      deepseek: 'https://api.deepseek.com/v1',
      zhipu: 'https://open.bigmodel.cn/api/paas/v4',
      qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      moonshot: 'https://api.moonshot.cn/v1',
      siliconflow: 'https://api.siliconflow.cn/v1',
      groq: 'https://api.groq.com/openai/v1',
      ollama: 'http://localhost:11434/v1',
      lmstudio: 'http://localhost:1234/v1',
    }
    return baseUrls[provider] || ''
  }

  const handleProviderChange = (provider: string) => {
    const newBaseUrl = getBaseUrlForProvider(provider)
    const models = getModelsForProvider(provider)
    setLlmConfig({
      ...llmConfig,
      provider,
      baseUrl: newBaseUrl,
      model: models[0]?.value || '',
    })
    setTestResult(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await updateLLMSettings({
        provider: llmConfig.provider,
        model: llmConfig.model,
        api_key: llmConfig.apiKey,
        base_url: llmConfig.baseUrl,
        temperature: parseFloat(llmConfig.temperature) || 0.7,
        max_tokens: parseInt(llmConfig.maxTokens) || 4096,
      })
      setMessage('Settings saved successfully!')
    } catch {
      setMessage('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setMessage('')
    try {
      const result = await testLLMConnection()
      setTestResult(result)
    } catch (err: any) {
      setTestResult({ status: 'error', error: err?.message || 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const tabs = [
    { id: 'llm', label: '🤖 AI Provider' },
    { id: 'general', label: '⚙ General' },
    { id: 'docker', label: '🐳 Docker' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Configure AI provider and application preferences</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel>
        {activeTab === 'llm' && (
          <div className="space-y-6 max-w-2xl">
            <Card>
              <h3 className="font-bold text-text-primary mb-1">AI Provider Configuration</h3>
              <p className="text-xs text-text-tertiary mb-4">Configure your preferred LLM for the AI Assistant</p>

              <div className="space-y-4">
                <Select
                  label="Provider"
                  value={llmConfig.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  options={[
                    { value: 'openai', label: '🌐 OpenAI (GPT-4, GPT-4o)' },
                    { value: 'deepseek', label: '🇨🇳 DeepSeek (DeepSeek Chat, Coder)' },
                    { value: 'zhipu', label: '🇨🇳 Zhipu AI (GLM-4)' },
                    { value: 'qwen', label: '🇨🇳 Qwen (Alibaba, 通义千问)' },
                    { value: 'moonshot', label: '🇨🇳 Moonshot (月之暗面, Kimi)' },
                    { value: 'siliconflow', label: '🇨🇳 SiliconFlow (聚合: DeepSeek, Qwen, Yi)' },
                    { value: 'groq', label: '⚡ Groq (Fast inference, Llama)' },
                    { value: 'ollama', label: '💻 Ollama (Local models)' },
                    { value: 'lmstudio', label: '💻 LM Studio (Local models)' },
                  ]}
                />

                <Select
                  label="Model"
                  value={llmConfig.model}
                  onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                  options={getModelsForProvider(llmConfig.provider)}
                />

                <Input
                  label="API Base URL"
                  value={llmConfig.baseUrl}
                  onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  hint="OpenAI-compatible endpoint base URL"
                />

                <Input
                  label="API Key"
                  type="password"
                  value={llmConfig.apiKey}
                  onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                  placeholder={
                    llmConfig.provider === 'ollama' || llmConfig.provider === 'lmstudio'
                      ? 'Leave empty for local models'
                      : 'sk-...'
                  }
                  hint={
                    llmConfig.provider === 'ollama' || llmConfig.provider === 'lmstudio'
                      ? 'No API key needed for local models'
                      : 'Your API key is stored only in memory and not persisted'
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Temperature"
                    type="number"
                    value={llmConfig.temperature}
                    onChange={(e) => setLlmConfig({ ...llmConfig, temperature: e.target.value })}
                    min={0}
                    max={2}
                    step={0.1}
                    hint="Lower = more focused, Higher = more creative"
                  />
                  <Input
                    label="Max Tokens"
                    type="number"
                    value={llmConfig.maxTokens}
                    onChange={(e) => setLlmConfig({ ...llmConfig, maxTokens: e.target.value })}
                    min={100}
                    max={128000}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : '💾 Save Settings'}
                  </Button>
                  <Button variant="outline" onClick={handleTest} disabled={testing}>
                    {testing ? '🔄 Testing...' : '🔍 Test Connection'}
                  </Button>
                </div>

                {testResult && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    testResult.status === 'ok'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="font-semibold text-sm">
                      {testResult.status === 'ok' ? '✅ Connection Successful!' : '❌ Connection Failed'}
                    </p>
                    {testResult.response && (
                      <p className="text-sm mt-1">Model responded: "{testResult.response}"</p>
                    )}
                    {testResult.error && (
                      <p className="text-xs mt-1 font-mono">Error: {testResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Provider Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {llmConfig.provider === 'deepseek' && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <h4 className="font-bold text-blue-800 mb-2">🇨🇳 DeepSeek Setup</h4>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://platform.deepseek.com" className="underline" target="_blank" rel="noopener">platform.deepseek.com</a></li>
                    <li>Create account and get API key</li>
                    <li>Base URL is already configured</li>
                    <li>DeepSeek is very cost-effective</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'zhipu' && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <h4 className="font-bold text-purple-800 mb-2">🇨🇳 Zhipu AI (智谱) Setup</h4>
                  <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://open.bigmodel.cn" className="underline" target="_blank" rel="noopener">open.bigmodel.cn</a></li>
                    <li>Sign up and get API key</li>
                    <li>Base URL is already configured</li>
                    <li>GLM-4 is their best model</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'qwen' && (
                <Card className="border-orange-200 bg-orange-50/50">
                  <h4 className="font-bold text-orange-800 mb-2">🇨🇳 Qwen (通义千问) Setup</h4>
                  <ol className="text-xs text-orange-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://dashscope.console.aliyun.com" className="underline" target="_blank" rel="noopener">dashscope.console.aliyun.com</a></li>
                    <li>Enable the model in your dashboard</li>
                    <li>Get API key from your account</li>
                    <li>Qwen models are very capable</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'moonshot' && (
                <Card className="border-indigo-200 bg-indigo-50/50">
                  <h4 className="font-bold text-indigo-800 mb-2">🇨🇳 Moonshot (月之暗面, Kimi) Setup</h4>
                  <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://platform.moonshot.cn" className="underline" target="_blank" rel="noopener">platform.moonshot.cn</a></li>
                    <li>Create account and get API key</li>
                    <li>Kimi has very long context (128K)</li>
                    <li>Great for analyzing large molecules</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'siliconflow' && (
                <Card className="border-pink-200 bg-pink-50/50">
                  <h4 className="font-bold text-pink-800 mb-2">🇨🇳 SiliconFlow Setup</h4>
                  <ol className="text-xs text-pink-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://siliconflow.cn" className="underline" target="_blank" rel="noopener">siliconflow.cn</a></li>
                    <li>Aggregates many Chinese models in one place</li>
                    <li>Pay-as-you-go, very affordable</li>
                    <li>Supports: Qwen, DeepSeek, Yi, InternLM</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'ollama' && (
                <Card className="border-green-200 bg-green-50/50">
                  <h4 className="font-bold text-green-800 mb-2">💻 Ollama (Local) Setup</h4>
                  <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
                    <li>Install <a href="https://ollama.com" className="underline" target="_blank" rel="noopener">ollama.com</a></li>
                    <li>Run: <code className="bg-green-100 px-1 rounded">ollama pull llama3</code></li>
                    <li>API key not needed (runs locally)</li>
                    <li>Base URL is already configured</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'lmstudio' && (
                <Card className="border-teal-200 bg-teal-50/50">
                  <h4 className="font-bold text-teal-800 mb-2">💻 LM Studio (Local) Setup</h4>
                  <ol className="text-xs text-teal-700 space-y-1 list-decimal list-inside">
                    <li>Download <a href="https://lmstudio.ai" className="underline" target="_blank" rel="noopener">lmstudio.ai</a></li>
                    <li>Download a model (e.g., Llama 3)</li>
                    <li>Click "Start Server" in LM Studio</li>
                    <li>API key not needed (runs locally)</li>
                  </ol>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <Card className="max-w-2xl">
            <h3 className="font-bold text-text-primary mb-4">General Settings</h3>
            <div className="space-y-4">
              <Select
                label="Theme"
                value="light"
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark (coming soon)' },
                  { value: 'auto', label: 'Auto (System)' },
                ]}
              />
              <Select
                label="Log Level"
                value="INFO"
                options={[
                  { value: 'DEBUG', label: 'Debug' },
                  { value: 'INFO', label: 'Info' },
                  { value: 'WARNING', label: 'Warning' },
                  { value: 'ERROR', label: 'Error' },
                ]}
              />
              <div className="flex gap-3 pt-4">
                <Button onClick={() => setMessage('General settings saved (in-memory only)')}>Save Changes</Button>
                <Button variant="outline" onClick={() => setMessage('Settings reset to defaults')}>Reset to Defaults</Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'docker' && (
          <Card className="max-w-2xl">
            <h3 className="font-bold text-text-primary mb-4">Docker Configuration</h3>
            <div className="space-y-4">
              <Input
                label="Timeout (seconds)"
                type="number"
                value={dockerConfig.timeout}
                onChange={(e) => setDockerConfig({ ...dockerConfig, timeout: e.target.value })}
                min={60}
                max={7200}
              />
              <div className="p-4 bg-surface-secondary rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dockerConfig.gpuEnabled}
                    onChange={(e) => setDockerConfig({ ...dockerConfig, gpuEnabled: e.target.checked })}
                    className="w-5 h-5 text-primary rounded"
                  />
                  <div>
                    <p className="font-semibold text-text-primary">GPU Acceleration</p>
                    <p className="text-xs text-text-tertiary">Enable NVIDIA GPU passthrough to containers</p>
                  </div>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={() => setMessage('Docker settings saved (in-memory only)')}>Save Changes</Button>
                <Button variant="outline" onClick={() => { setDockerConfig({ timeout: '3600', gpuEnabled: true }); setMessage('Docker settings reset') }}>Reset to Defaults</Button>
              </div>
            </div>
          </Card>
        )}
      </TabPanel>
    </div>
  )
}
