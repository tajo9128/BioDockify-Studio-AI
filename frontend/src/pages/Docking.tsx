import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Link } from 'react-router-dom'

const PC = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'

interface PcResult {
  cid: number
  name: string
  formula: string
  mw: string
  smiles: string
}

export function Docking() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [receptorFile, setReceptorFile] = useState<File | null>(null)
  const [ligandFile, setLigandFile] = useState<File | null>(null)
  const [center, setCenter] = useState({ x: 0, y: 0, z: 0 })
  const [size, setSize] = useState({ x: 20, y: 20, z: 20 })
  const [exhaustiveness, setExhaustiveness] = useState(8)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState<any[]>([])

  // PubChem lookup
  const [pcOpen, setPcOpen]     = useState(false)
  const [pcQuery, setPcQuery]   = useState('')
  const [pcBusy, setPcBusy]     = useState(false)
  const [pcResult, setPcResult] = useState<PcResult | null>(null)
  const [pcErr, setPcErr]       = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)

  const searchPubChem = async () => {
    const q = pcQuery.trim()
    if (!q) return
    setPcBusy(true); setPcErr(null); setPcResult(null)
    try {
      const cidRes = await fetch(`${PC}/compound/name/${encodeURIComponent(q)}/cids/JSON`)
      if (!cidRes.ok) throw new Error('Compound not found')
      const cid: number = (await cidRes.json()).IdentifierList.CID[0]
      const propRes = await fetch(
        `${PC}/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight,IsomericSMILES/JSON`
      )
      const p = (await propRes.json()).PropertyTable.Properties[0]
      setPcResult({ cid, name: p.IUPACName ?? q, formula: p.MolecularFormula ?? '', mw: String(p.MolecularWeight ?? ''), smiles: p.IsomericSMILES ?? '' })
    } catch (e: any) { setPcErr(e.message ?? 'Not found') }
    finally { setPcBusy(false) }
  }

  const copySMILES = () => {
    if (!pcResult) return
    navigator.clipboard.writeText(pcResult.smiles)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => { fetchJobs() }, [])

  const fetchJobs = async () => {
    try {
      const res = await fetch('/jobs')
      const data = await res.json()
      setJobs((data.jobs || []).filter((j: any) => j.status === 'completed').slice(0, 10))
    } catch { /* no-op */ }
  }

  const runDocking = async () => {
    if (!receptorFile || !ligandFile) {
      setError('Upload both receptor and ligand PDBQT files')
      return
    }
    if (!receptorFile.name.endsWith('.pdbqt') || !ligandFile.name.endsWith('.pdbqt')) {
      setError('Only PDBQT files are supported')
      return
    }
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('receptor_file', receptorFile)
      fd.append('ligand_file', ligandFile)
      fd.append('center_x', String(center.x))
      fd.append('center_y', String(center.y))
      fd.append('center_z', String(center.z))
      fd.append('size_x', String(size.x))
      fd.append('size_y', String(size.y))
      fd.append('size_z', String(size.z))
      fd.append('exhaustiveness', String(exhaustiveness))
      fd.append('scoring', 'vina')
      const res = await fetch('/api/docking/run', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) setError(data.error)
      else { setResult(data); fetchJobs() }
    } catch (e: any) {
      setError(e.message || 'Docking failed')
    }
    setRunning(false)
  }

  return (
    <div className={`h-full flex ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Left - Form */}
      <div className="w-96 p-6 border-r overflow-y-auto" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
        <h1 className="text-xl font-bold mb-1">AutoDock Vina</h1>
        <p className={`text-xs mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Upload prepared PDBQT files. Use AutoDock Tools or other software to prepare files.
        </p>

        {/* ── PubChem Lookup ── */}
        <div className={`mb-4 rounded-lg border ${isDark ? 'border-blue-800 bg-blue-950/40' : 'border-blue-200 bg-blue-50'}`}>
          <button
            onClick={() => setPcOpen(o => !o)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium ${
              isDark ? 'text-blue-300' : 'text-blue-700'
            }`}
          >
            <span>🔬 Find ligand on PubChem by name</span>
            <span>{pcOpen ? '▲' : '▼'}</span>
          </button>

          {pcOpen && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex gap-2">
                <input
                  className={`flex-1 px-2.5 py-1.5 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="e.g. Ibuprofen, Aspirin, Caffeine…"
                  value={pcQuery}
                  onChange={e => setPcQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchPubChem()}
                />
                <button
                  onClick={searchPubChem} disabled={pcBusy}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
                >
                  {pcBusy ? '…' : 'Search'}
                </button>
              </div>

              {pcErr && <p className="text-xs text-red-500">{pcErr}</p>}

              {pcResult && (
                <div className={`rounded-lg p-2.5 flex gap-3 ${
                  isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'
                }`}>
                  <img
                    src={`${PC}/compound/cid/${pcResult.cid}/PNG?image_size=small`}
                    alt={pcResult.name}
                    className="w-20 h-20 object-contain rounded bg-white shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className={`text-xs font-semibold truncate ${
                      isDark ? 'text-gray-200' : 'text-gray-800'
                    }`}>{pcResult.name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {pcResult.formula} · {pcResult.mw} g/mol
                    </p>
                    <p className={`text-xs font-mono break-all leading-tight ${
                      isDark ? 'text-green-400' : 'text-green-700'
                    }`}>{pcResult.smiles}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={copySMILES}
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          copied
                            ? 'bg-green-600 text-white'
                            : isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {copied ? '✓ Copied!' : 'Copy SMILES'}
                      </button>
                      <Link
                        to="/database"
                        className="text-xs px-2 py-1 rounded font-medium bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Download SDF/PDB ↗
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receptor (.pdbqt)</label>
            <input type="file" accept=".pdbqt" onChange={e => setReceptorFile(e.target.files?.[0] || null)}
              className={`w-full mt-1 p-2 rounded border text-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`} />
            {receptorFile && <p className="text-xs text-green-500 mt-1">✓ {receptorFile.name}</p>}
          </div>

          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ligand (.pdbqt)</label>
            <input type="file" accept=".pdbqt" onChange={e => setLigandFile(e.target.files?.[0] || null)}
              className={`w-full mt-1 p-2 rounded border text-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`} />
            {ligandFile && <p className="text-xs text-green-500 mt-1">✓ {ligandFile.name}</p>}
          </div>

          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Grid Center (X, Y, Z)</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['x', 'y', 'z'] as const).map(axis => (
                <input key={axis} type="number" value={center[axis]} onChange={e => setCenter(p => ({ ...p, [axis]: Number(e.target.value) }))}
                  className={`p-2 rounded border text-sm text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`} />
              ))}
            </div>
          </div>

          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Grid Size (X, Y, Z)</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['x', 'y', 'z'] as const).map(axis => (
                <input key={axis} type="number" value={size[axis]} onChange={e => setSize(p => ({ ...p, [axis]: Number(e.target.value) }))}
                  className={`p-2 rounded border text-sm text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`} />
              ))}
            </div>
          </div>

          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Exhaustiveness: {exhaustiveness}</label>
            <input type="range" min="1" max="64" value={exhaustiveness} onChange={e => setExhaustiveness(Number(e.target.value))}
              className="w-full mt-1" />
          </div>

          <button onClick={runDocking} disabled={running || !receptorFile || !ligandFile}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {running ? 'Docking…' : 'Run Docking'}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        {/* Recent jobs */}
        {jobs.length > 0 && (
          <div className="mt-6">
            <h3 className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Recent Jobs</h3>
            <div className="space-y-1">
              {jobs.map((j: any) => (
                <div key={j.job_uuid} className={`text-xs p-2 rounded ${isDark ? 'bg-gray-800' : 'bg-white border'}`}>
                  <span className="font-medium">{j.job_name}</span>
                  <span className={`ml-2 ${j.binding_energy < -7 ? 'text-green-500' : 'text-gray-400'}`}>
                    {j.binding_energy?.toFixed(2)} kcal/mol
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right - Results */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!result && !running && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3">⬡</div>
              <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Upload PDBQT files and run docking</p>
            </div>
          </div>
        )}
        {running && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin text-3xl mb-3">⟳</div>
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Running AutoDock Vina…</p>
            </div>
          </div>
        )}
        {result && !running && (
          <div>
            <h2 className="text-lg font-bold mb-4">Docking Results</h2>
            {result.results && result.results.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                    <th className="text-left pb-2">#</th>
                    <th className="text-left pb-2">Vina Score (kcal/mol)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r: any, i: number) => (
                    <tr key={i} className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="py-2">{r.mode}</td>
                      <td className={`py-2 font-mono font-bold ${r.vina_score < -7 ? 'text-green-500' : ''}`}>
                        {r.vina_score?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No results available</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
