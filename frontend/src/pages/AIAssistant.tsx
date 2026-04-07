import { useState, useRef, useEffect } from 'react'
import { sendChat } from '@/api/chat'
import { useTheme } from '@/contexts/ThemeContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolsUsed?: string[]
}

interface JobSummary {
  job_uuid: string
  job_name: string
  status: string
  binding_energy: number | null
  engine: string | null
  created_at: string
}

interface ActiveJob {
  status: string
  progress: number
  message: string
}

interface AiContext {
  stats: { total: number; active: number; completed: number; failed: number }
  recent_jobs: JobSummary[]
  docking_active: Record<string, ActiveJob>
  md_active: Record<string, ActiveJob>
}

interface SystemStatus {
  services?: { rdkit: any; vina: any; gnina: any; ollama: any }
  system?: { cpu_percent: number; memory_percent: number }
}

export function AIAssistant() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providerStatus, setProviderStatus] = useState<{ provider: string; available: boolean } | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [context, setContext] = useState<AiContext | null>(null)
  const [llmSettings, setLlmSettings] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const fetchContext = async () => {
    try { const r = await fetch('/ai/context'); if (r.ok) setContext(await r.json()) } catch (_) {}
  }
  const fetchSystemStatus = async () => {
    try { const r = await fetch('/system/status'); if (r.ok) setSystemStatus(await r.json()) } catch (_) {}
  }
  const fetchLLMSettings = async () => {
    try { const r = await fetch('/llm/settings'); if (r.ok) setLlmSettings(await r.json()) } catch (_) {}
    try { const r2 = await fetch('/brain/chat/status'); if (r2.ok) { const d = await r2.json(); setProviderStatus({ provider: d.provider || 'ollama', available: !!(d.available ?? d.ollama_available) }) } } catch (_) {}
  }

  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    fetchContext(); fetchSystemStatus(); fetchLLMSettings()
    const t1 = setInterval(fetchContext, 5000)
    const t2 = setInterval(fetchSystemStatus, 30000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  const handleSend = async (override?: string) => {
    const txt = (override !== undefined ? override : input).trim()
    if (!txt || loading) return
    const uMsg: Message = { id: Date.now().toString(), role: 'user', content: txt, timestamp: new Date() }
    setMessages((p: Message[]) => [...p, uMsg])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const res = await sendChat(txt)
      setMessages((p: Message[]) => [...p, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: res.response || 'No response — check LLM Settings.',
        timestamp: new Date(), toolsUsed: res.tools_used,
      }])
      setProviderStatus({ provider: res.provider || 'unknown', available: res.available !== false })
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Connection failed.')
    } finally {
      setLoading(false)
    }
  }

  const quickSend = (prompt: string) => { setInput(prompt); setTimeout(() => handleSend(prompt), 60) }

  const fmt = (c: string) => c
    .replace(/`([^`]+)`/g, '<code style="background:#1e293b;padding:1px 5px;border-radius:3px;font-size:.85em;font-family:monospace;color:#7dd3fc">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3 style="font-weight:700;margin:10px 0 4px;font-size:1em">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-weight:700;margin:12px 0 4px;font-size:1.1em">$1</h2>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:18px;list-style:disc;margin-bottom:2px">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:18px;list-style:decimal;margin-bottom:2px">$2</li>')

  const sc = (s: string) => s === 'completed' ? '#22c55e' : s === 'running' || s === 'pending' ? '#f59e0b' : s === 'failed' ? '#ef4444' : '#6b7280'

  const D = isDark
  const bg = D ? '#0d1117' : '#f1f5f9'
  const pnl = D ? '#161b27' : '#ffffff'
  const crd = D ? '#1e2840' : '#f8fafc'
  const bdr = D ? '#2a3650' : '#e2e8f0'
  const tx = D ? '#e2e8f0' : '#1e293b'
  const sub = D ? '#94a3b8' : '#64748b'

  const hasActive = (context?.stats?.active ?? 0) > 0
    || Object.keys(context?.docking_active ?? {}).length > 0
    || Object.keys(context?.md_active ?? {}).length > 0

  const QUICK = [
    { i: '📊', l: 'All jobs summary', p: 'Give me a full summary of all my docking jobs, their statuses and best binding scores.' },
    { i: '🏆', l: 'Best binding result', p: 'Which compound has the best binding affinity? Show me the details.' },
    { i: '⚡', l: 'Active jobs status', p: 'What docking and MD simulation jobs are currently running? Give me progress updates.' },
    { i: '🔬', l: 'Failed job analysis', p: 'Which jobs failed and what are the most likely causes? How can I fix them?' },
    { i: '💊', l: 'Top drug candidates', p: 'Based on all docking results, rank the top drug candidates with reasoning.' },
    { i: '🧬', l: 'MD simulation advice', p: 'Which docked compounds should I validate with molecular dynamics? Recommend a strategy.' },
    { i: '📈', l: 'Score analysis', p: 'Analyze all Vina and GNINA scores. What patterns do you see? What is statistically significant?' },
    { i: '🩺', l: 'System diagnostics', p: 'Run a full system health check. Are all services (RDKit, Vina, Ollama) working correctly?' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', background: bg, overflow: 'hidden', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* ── LEFT PANEL: Commander Monitor ─────────────── */}
      <div style={{ width: 295, flexShrink: 0, background: pnl, borderRight: `1px solid ${bdr}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Identity */}
        <div style={{ padding: '18px 14px 12px', borderBottom: `1px solid ${bdr}`, background: D ? 'linear-gradient(160deg,#1a2540,#12192e)' : 'linear-gradient(160deg,#eff6ff,#f0fdf4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 16px rgba(99,102,241,.5)', flexShrink: 0 }}>🧬</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: tx, letterSpacing: '-.3px' }}>BioDockify AI</div>
              <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600, letterSpacing: '.5px' }}>COMMANDER · MAIN BRAIN</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: providerStatus?.available ? '#22c55e' : '#6b7280', display: 'inline-block', boxShadow: providerStatus?.available ? '0 0 8px #22c55e88' : 'none', flexShrink: 0 }} />
            <span style={{ color: sub }}>{providerStatus?.available ? `Online · ${llmSettings?.model || providerStatus?.provider || 'AI'}` : 'Offline — Check Settings'}</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            {[
              { l: 'Soul', v: '✓', c: '#22c55e' },
              { l: 'Memory', v: '✓', c: '#22c55e' },
              { l: 'Control', v: '✓', c: '#22c55e' },
            ].map(t => (
              <div key={t.l} style={{ flex: 1, background: D ? '#1e2840' : '#f0fdf4', borderRadius: 6, padding: '4px 0', textAlign: 'center', border: `1px solid ${D ? '#2a3650' : '#bbf7d0'}` }}>
                <div style={{ fontSize: 11, color: t.c, fontWeight: 700 }}>{t.v} {t.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '10px 10px 6px', borderBottom: `1px solid ${bdr}` }}>
          {[
            { l: 'Total Jobs', v: context?.stats?.total ?? '—', c: '#6366f1' },
            { l: 'Active Now', v: context?.stats?.active ?? '—', c: '#f59e0b' },
            { l: 'Completed', v: context?.stats?.completed ?? '—', c: '#22c55e' },
            { l: 'Failed', v: context?.stats?.failed ?? '—', c: '#ef4444' },
          ].map(s => (
            <div key={s.l} style={{ background: crd, borderRadius: 8, padding: '8px 10px', border: `1px solid ${bdr}` }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 10, color: sub, marginTop: 3, fontWeight: 500 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Scroll monitor area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>

          {/* Active Docking */}
          {Object.keys(context?.docking_active ?? {}).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>🔬 Active Docking</div>
              {Object.entries(context!.docking_active).map(([id, j]) => (
                <div key={id} style={{ background: crd, borderRadius: 8, padding: '8px 10px', marginBottom: 5, border: `1px solid ${bdr}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: tx, fontWeight: 600, fontFamily: 'monospace' }}>{id.slice(-10)}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{j.progress}%</span>
                  </div>
                  <div style={{ height: 4, background: D ? '#2a3650' : '#e2e8f0', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${j.progress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99, transition: 'width .5s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: sub, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.message}</div>
                </div>
              ))}
            </div>
          )}

          {/* Active MD */}
          {Object.keys(context?.md_active ?? {}).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>⚛️ Active MD Sims</div>
              {Object.entries(context!.md_active).map(([id, j]) => (
                <div key={id} style={{ background: crd, borderRadius: 8, padding: '8px 10px', marginBottom: 5, border: `1px solid ${bdr}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: tx, fontWeight: 600, fontFamily: 'monospace' }}>{id.slice(-10)}</span>
                    <span style={{ color: '#06b6d4', fontWeight: 700 }}>{j.progress}%</span>
                  </div>
                  <div style={{ height: 4, background: D ? '#2a3650' : '#e2e8f0', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${j.progress}%`, background: 'linear-gradient(90deg,#06b6d4,#3b82f6)', borderRadius: 99, transition: 'width .5s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: sub, marginTop: 4 }}>{j.message}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recent jobs */}
          {(context?.recent_jobs?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>📋 Recent Jobs</div>
              {context!.recent_jobs.slice(0, 8).map(j => (
                <button key={j.job_uuid}
                  onClick={() => quickSend(`Tell me about docking job "${j.job_name}" (id: ${j.job_uuid}). Analyze its results and binding affinity in detail.`)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '5px 6px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.background = crd)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc(j.status), flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: tx }}>{j.job_name}</span>
                  {j.binding_energy != null && <span style={{ fontSize: 10, color: sub, flexShrink: 0, fontFamily: 'monospace' }}>{j.binding_energy.toFixed(1)}</span>}
                </button>
              ))}
            </div>
          )}

          {/* System health */}
          {systemStatus?.services && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>🖥️ System Health</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {[
                  { n: 'RDKit', ok: systemStatus.services?.rdkit?.available },
                  { n: 'Vina', ok: systemStatus.services?.vina?.available },
                  { n: 'Ollama', ok: systemStatus.services?.ollama?.available },
                ].map(s => (
                  <div key={s.n} style={{ background: crd, borderRadius: 6, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${bdr}` }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.ok ? '#22c55e' : '#4b5563', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: sub }}>{s.n}</span>
                    <span style={{ fontSize: 10, color: s.ok ? '#22c55e' : '#6b7280', marginLeft: 'auto' }}>{s.ok ? '✓' : '–'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick commands */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>⚡ Quick Commands</div>
            {QUICK.map(a => (
              <button key={a.l} onClick={() => quickSend(a.p)} disabled={loading}
                style={{ width: '100%', background: 'none', border: `1px solid ${bdr}`, padding: '6px 10px', borderRadius: 7, cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: tx, fontSize: 12, opacity: loading ? .5 : 1 }}
                onMouseEnter={e => !loading && (e.currentTarget.style.background = crd)}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontSize: 14 }}>{a.i}</span>
                <span style={{ fontWeight: 500 }}>{a.l}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Refresh footer */}
        <div style={{ padding: '8px 10px', borderTop: `1px solid ${bdr}` }}>
          <button onClick={() => { fetchContext(); fetchSystemStatus() }}
            style={{ width: '100%', padding: '7px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'none', cursor: 'pointer', color: sub, fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', animation: hasActive ? 'cmspin 1.5s linear infinite' : 'none' }}>↻</span>
            {hasActive ? 'Live — Auto-refreshing every 5s' : 'Refresh Status'}
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL: Chat ──────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${bdr}`, background: pnl, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: tx, display: 'flex', alignItems: 'center', gap: 8 }}>
              Commander Chat
              {hasActive && <span style={{ fontSize: 11, background: '#f59e0b22', color: '#f59e0b', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>● LIVE</span>}
            </div>
            <div style={{ fontSize: 12, color: sub }}>Full platform awareness · Sub-agent orchestration · Live job monitoring</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMessages([])} style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'none', cursor: 'pointer', color: sub, fontSize: 12 }}>Clear</button>
            <a href="/settings" style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'none', cursor: 'pointer', color: sub, fontSize: 12, textDecoration: 'none' }}>⚙ Settings</a>
          </div>
        </div>

        {error && <div style={{ padding: '8px 20px', background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>⚠️ {error}</div>}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, background: bg }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 50, maxWidth: 560, margin: '0 auto', width: '100%' }}>
              <div style={{ fontSize: 60, marginBottom: 14, filter: 'drop-shadow(0 4px 12px rgba(99,102,241,.4))' }}>🧬</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: tx, marginBottom: 8 }}>BioDockify AI Commander</div>
              <div style={{ fontSize: 14, color: sub, lineHeight: 1.7, marginBottom: 28 }}>
                I am the <strong style={{ color: '#8b5cf6' }}>main brain</strong> of BioDockify. I have complete awareness of all your docking jobs, MD simulations, results, logs, and platform health. I can instruct specialized sub-agents and give you full intelligent control.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { i: '🎯', t: 'Full Platform Control', d: 'Monitor docking, MD, ADMET, Chemistry agents' },
                  { i: '🧠', t: 'Persistent Memory', d: 'Remembers all jobs, scores, and experiment history' },
                  { i: '🤖', t: 'Sub-Agent Commander', d: 'Directs Docking Specialist, MD Expert, ADMET Analyst' },
                  { i: '💡', t: 'Smart Recommendations', d: 'AI-driven next steps based on your actual data' },
                  { i: '📊', t: 'Live Job Monitoring', d: 'Real-time docking progress and simulation status' },
                  { i: '🔬', t: 'Deep Analysis', d: 'Binding site analysis, drug-likeness, ADMET prediction' },
                ].map(c => (
                  <button key={c.t} onClick={() => quickSend(c.d)}
                    style={{ background: pnl, borderRadius: 10, padding: '12px 14px', textAlign: 'left', border: `1px solid ${bdr}`, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{c.i}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: tx, marginBottom: 3 }}>{c.t}</div>
                    <div style={{ fontSize: 11, color: sub }}>{c.d}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : messages.map((msg: Message) => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 10 }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, marginTop: 2, boxShadow: '0 2px 8px rgba(99,102,241,.4)' }}>🧬</div>
              )}
              <div style={{ maxWidth: '74%', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px', padding: '11px 16px', background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : pnl, color: msg.role === 'user' ? '#fff' : tx, border: msg.role === 'assistant' ? `1px solid ${bdr}` : 'none', boxShadow: '0 2px 10px rgba(0,0,0,.1)' }}>
                {msg.role === 'assistant' && (msg.toolsUsed?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                    {msg.toolsUsed!.map((t: string) => (
                      <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: D ? '#1e3a5f' : '#dbeafe', color: D ? '#93c5fd' : '#1d4ed8', fontWeight: 600 }}>🔧 {t}</span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} />
                <div style={{ fontSize: 10.5, marginTop: 6, opacity: .55 }}>{msg.timestamp.toLocaleTimeString()}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,.4)' }}>🧬</div>
              <div style={{ background: pnl, border: `1px solid ${bdr}`, borderRadius: '4px 18px 18px 18px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                {[0, 150, 300].map(d => <span key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', display: 'inline-block', animation: `cmbnc 1s ${d}ms infinite` }} />)}
                <span style={{ fontSize: 12.5, color: sub, marginLeft: 4 }}>Commander is thinking…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '14px 20px 16px', borderTop: `1px solid ${bdr}`, background: pnl, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input ref={inputRef} type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask Commander about jobs, scores, simulations, drug candidates, ADMET…"
              disabled={loading}
              style={{ flex: 1, padding: '11px 16px', borderRadius: 12, border: `1px solid ${bdr}`, background: D ? '#1a2035' : '#f8fafc', color: tx, fontSize: 14, outline: 'none' }}
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              style={{ padding: '11px 24px', borderRadius: 12, border: 'none', background: loading || !input.trim() ? (D ? '#374151' : '#d1d5db') : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer' }}>
              {loading ? '⚙️' : 'Send →'}
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: sub, marginTop: 8, textAlign: 'center' }}>
            Enter to send · Commander knows all {context?.stats?.total ?? 0} jobs · Live platform data injected into every response
          </div>
        </div>
      </div>

      <style>{`@keyframes cmbnc{0%,100%{transform:translateY(0);opacity:.6}50%{transform:translateY(-5px);opacity:1}}@keyframes cmspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
