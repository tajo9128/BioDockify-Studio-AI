import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { sendChat, getChatStatus, getPlatformContext } from '@/api/chat'
import type { PlatformContext } from '@/lib/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolsUsed?: string[]
}

const SERVICE_CONFIG: Record<string, { label: string; icon: string }> = {
  brain_service:         { label: 'NanoBOT Brain',       icon: '🧠' },
  docking_service:       { label: 'Docking (Vina+GNINA)', icon: '🔬' },
  rdkit_service:         { label: 'RDKit Chemistry',      icon: '⚗️' },
  pharmacophore_service: { label: 'Pharmacophore',        icon: '🧲' },
  qsar_service:          { label: 'QSAR ML',              icon: '📈' },
  md_service:            { label: 'Molecular Dynamics',   icon: '💫' },
  sentinel_service:      { label: 'Sentinel (Watchdog)',  icon: '🛡️' },
  analysis_service:      { label: 'Analysis Engine',      icon: '📊' },
  api_backend:           { label: 'API Gateway',          icon: '⚡' },
}

const QUICK_CMDS = [
  { label: '⚡ Active Jobs',      text: 'Show me all active and recent jobs with their current status and binding energies' },
  { label: '🏆 Top Hits',         text: 'What are the best docking results so far? Rank by binding energy and explain the top hits' },
  { label: '🔬 Virtual Screen',   text: 'Walk me through running a complete virtual screening pipeline — pharmacophore, docking, and ranking' },
  { label: '💊 Lead Optimize',    text: 'How do I run a lead optimization workflow on my best docking hit using the analysis and QSAR services?' },
  { label: '📈 QSAR Modeling',    text: 'Explain how to train a QSAR model and predict activity for a new set of compounds' },
  { label: '💫 MD Validation',    text: 'How do I validate my top docking pose with molecular dynamics? What RMSD thresholds should I use?' },
  { label: '🧲 Pharmacophore',    text: 'Generate a pharmacophore model from my receptor-ligand complex and screen a compound library' },
  { label: '🛡️ Platform Health',  text: 'Check the health of all 9 platform services and tell me if anything needs attention' },
]

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providerStatus, setProviderStatus] = useState<{ provider: string; available: boolean } | null>(null)
  const [ctx, setCtx] = useState<PlatformContext | null>(null)
  const [convId, setConvId] = useState<string>(() => crypto.randomUUID())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchCtx = useCallback(async () => {
    try { setCtx(await getPlatformContext()) } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchCtx()
    getChatStatus()
      .then(s => setProviderStatus({ provider: s.provider, available: s.ollama_available }))
      .catch(() => {})
    const t = setInterval(fetchCtx, 8000)
    return () => clearInterval(t)
  }, [fetchCtx])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (override?: string) => {
    const txt = (override !== undefined ? override : input).trim()
    if (!txt || loading) return
    setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: txt, timestamp: new Date() }])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const res = await sendChat(txt, convId)
      if (res.conversation_id) setConvId(res.conversation_id)
      setMessages(p => [...p, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.response || 'No response.',
        timestamp: new Date(),
        toolsUsed: res.tools_used,
      }])
      setProviderStatus({ provider: res.provider || 'unknown', available: res.available !== false })
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Connection failed. Check LLM settings.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const newSession = () => { setMessages([]); setConvId(crypto.randomUUID()) }

  const fmt = (content: string) => content
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,.08);padding:1px 4px;border-radius:3px;font-size:.85em;font-family:monospace">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<div style="font-weight:700;margin-top:8px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:1.05em;margin-top:10px">$1</div>')
    .replace(/^- (.+)$/gm, '<div style="margin-left:12px">• $1</div>')

  const activeJobs = ctx?.recent_jobs?.filter(j => ['running','queued','pending'].includes(j.status?.toLowerCase())) ?? []
  const completedJobs = ctx?.recent_jobs?.filter(j => j.status?.toLowerCase() === 'completed') ?? []
  const failedJobs = ctx?.recent_jobs?.filter(j => j.status?.toLowerCase() === 'failed') ?? []
  const healthyCount = Object.values(ctx?.services ?? {}).filter(v => v === 'healthy').length
  const totalSvc = Object.keys(SERVICE_CONFIG).length

  return (
    <div className="h-full flex flex-col p-4 gap-3 min-h-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-md text-lg">
            🧬
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              BioDockify AI Commander
              {activeJobs.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Jobs running" />
              )}
            </h1>
            <p className="text-xs text-text-secondary">
              v4.3.7 · {totalSvc} services · {ctx?.tools_count ?? 0} AI tools
              {ctx?.provider && ctx.provider !== 'unknown' ? ` · ${ctx.provider}` : ''}
              {ctx?.model && ctx.model !== 'unknown' ? ` / ${ctx.model}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="success">Soul</Badge>
          <Badge variant="info">Memory</Badge>
          <Badge variant={healthyCount >= 7 ? 'success' : healthyCount >= 4 ? 'warning' : 'error'}>
            {healthyCount}/{totalSvc} online
          </Badge>
          <Button variant="outline" size="sm" onClick={() => fetchCtx()}>↻</Button>
          <Button variant="outline" size="sm" onClick={newSession}>New Session</Button>
        </div>
      </div>

      {/* ── Main two-panel layout ── */}
      <div className="flex-1 flex gap-3 min-h-0">

        {/* ── LEFT: Command Centre ── */}
        <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">

          {/* Platform stats */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">📊 Platform</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Total',   val: ctx?.stats?.total_jobs ?? 0,  col: 'text-blue-500'   },
                { label: 'Active',  val: activeJobs.length,             col: 'text-yellow-500' },
                { label: 'Done',    val: completedJobs.length,          col: 'text-green-500'  },
                { label: 'Failed',  val: failedJobs.length,             col: 'text-red-500'    },
              ].map(s => (
                <div key={s.label} className="bg-surface-secondary rounded p-2 text-center">
                  <div className={`text-lg font-bold ${s.col}`}>{s.val}</div>
                  <div className="text-xs text-text-tertiary">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Services health */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">🔬 Services</div>
            <div className="space-y-0.5">
              {Object.entries(SERVICE_CONFIG).map(([key, { label, icon }]) => {
                const st = ctx?.services?.[key] ?? 'unknown'
                const dot = st === 'healthy' ? 'bg-green-500' : st === 'unhealthy' ? 'bg-red-500' : 'bg-gray-400'
                return (
                  <div key={key} className="flex items-center gap-1.5 py-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${st === 'healthy' ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-text-primary truncate flex-1">{icon} {label}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Active jobs */}
          {activeJobs.length > 0 && (
            <Card className="p-3">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">⚡ Active ({activeJobs.length})</div>
              <div className="space-y-1.5">
                {activeJobs.slice(0, 4).map((job, i) => (
                  <button
                    key={i}
                    className="w-full text-left bg-surface-secondary rounded p-2 hover:bg-surface-tertiary transition-colors"
                    onClick={() => send(`Explain job status: ${job.job_uuid ?? job.job_name ?? 'unknown'}`)}
                  >
                    <div className="text-xs font-medium text-text-primary truncate">{job.job_name ?? job.job_uuid ?? `Job ${i + 1}`}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                      <span className="text-xs text-yellow-500">{job.status}</span>
                      {job.engine && <span className="text-xs text-text-tertiary">· {job.engine}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Recent jobs */}
          {(ctx?.recent_jobs?.length ?? 0) > 0 && (
            <Card className="p-3">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">🕐 Recent</div>
              <div className="space-y-0.5">
                {ctx!.recent_jobs.slice(0, 7).map((job, i) => {
                  const st = job.status?.toLowerCase()
                  const col = st === 'completed' ? 'text-green-500' : st === 'failed' ? 'text-red-500' : 'text-yellow-500'
                  return (
                    <button
                      key={i}
                      className="w-full flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-surface-secondary transition-colors"
                      onClick={() => send(`Tell me about this job: ${job.job_uuid ?? job.job_name}`)}
                    >
                      <span className={`text-xs ${col}`}>●</span>
                      <span className="text-xs text-text-primary truncate flex-1">{job.job_name ?? job.job_uuid ?? '—'}</span>
                      {job.binding_energy != null && (
                        <span className="text-xs font-mono text-blue-400 shrink-0">{job.binding_energy.toFixed(1)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>
          )}

          {/* AI tools */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              🛠️ Tools ({ctx?.tools_count ?? 0})
            </div>
            <div className="flex flex-wrap gap-1">
              {(ctx?.tools ?? []).map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-surface-secondary rounded text-xs text-text-secondary font-mono">{t}</span>
              ))}
              {!ctx?.tools?.length && <span className="text-xs text-text-tertiary">Loading...</span>}
            </div>
          </Card>

          {/* Quick commands */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">⚡ Quick Commands</div>
            <div className="space-y-0.5">
              {QUICK_CMDS.map(cmd => (
                <button
                  key={cmd.label}
                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface-secondary transition-colors text-text-primary"
                  onClick={() => send(cmd.text)}
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: Commander Chat ── */}
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0" padding="none">

          {/* Chat header bar */}
          <div className="px-4 py-2.5 border-b border-border-light flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">Commander Chat</span>
              {activeJobs.length > 0 && (
                <Badge variant="warning">{activeJobs.length} running</Badge>
              )}
              {providerStatus?.available && (
                <Badge variant="success">{providerStatus.provider}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary font-mono">
                {convId.slice(0, 8)}…
              </span>
              <Button variant="outline" size="sm" onClick={newSession}>Clear</Button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2 shrink-0">
              <span>⚠️</span>
              <span className="flex-1">{error}</span>
              <button className="text-red-400 hover:text-red-600" onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6">
                <div className="text-5xl mb-3">🧬</div>
                <h2 className="text-lg font-bold text-text-primary mb-1">BioDockify AI Commander</h2>
                <p className="text-sm text-text-secondary mb-1 max-w-sm">
                  Central intelligence of BioDockify Studio v4.3.7
                </p>
                <p className="text-xs text-text-tertiary mb-6 max-w-xs">
                  I command all sub-agents, monitor all jobs, and guide you through the complete drug discovery pipeline.
                </p>
                <div className="grid grid-cols-3 gap-2 max-w-lg text-left w-full">
                  {[
                    { icon: '🔬', title: 'Docking + GNINA',    desc: 'Vina physics + CNN scoring consensus' },
                    { icon: '📈', title: 'QSAR Modeling',       desc: 'ML-based activity prediction' },
                    { icon: '💫', title: 'Molecular Dynamics',  desc: 'OpenMM NPT ensemble simulation' },
                    { icon: '🧲', title: 'Pharmacophore',       desc: 'Virtual screening & 3D matching' },
                    { icon: '📊', title: 'Analysis Engine',     desc: 'Interactions, ranking, ADMET' },
                    { icon: '🛡️', title: 'Sentinel Watchdog',   desc: 'Auto-retry & job escalation' },
                  ].map(f => (
                    <div key={f.title} className="bg-surface-secondary rounded-lg p-2.5">
                      <div className="font-semibold text-xs mb-0.5">{f.icon} {f.title}</div>
                      <p className="text-xs text-text-tertiary">{f.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-tertiary mt-4">
                  Use Quick Commands on the left or type a question below ↓
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                      : 'bg-surface-secondary text-text-primary'
                  }`}>
                    {msg.role === 'assistant' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mb-2">
                        <span className="text-xs opacity-60">Tools used:</span>
                        {msg.toolsUsed.map(tool => (
                          <Badge key={tool} variant="info">{tool}</Badge>
                        ))}
                      </div>
                    )}
                    <div
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: fmt(msg.content) }}
                    />
                    <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-text-tertiary'}`}>
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-secondary rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🧠</span>
                    <div className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span
                          key={d}
                          className="w-2 h-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">Commander is thinking…</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="p-3 border-t border-border-light shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Command — docking, QSAR, MD, pharmacophore, analysis, ADMET…"
                className="flex-1 px-4 py-2.5 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <Button
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-5"
                onClick={() => send()}
              >
                {loading ? '…' : 'Send'}
              </Button>
            </div>
            <p className="text-xs text-text-tertiary mt-1 text-center">
              Enter to send · {ctx?.tools_count ?? 0} tools available · chain-of-thought reasoning
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
