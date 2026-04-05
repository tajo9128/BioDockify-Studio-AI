import { useState, type ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

// ── API roots ─────────────────────────────────────────────────────────────────
const PC  = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PDB = 'https://files.rcsb.org/download'
const PDB_API = 'https://data.rcsb.org/rest/v1/core/entry'

// ── PubChem property list ─────────────────────────────────────────────────────
const PC_PROPS = [
  'MolecularFormula','MolecularWeight','IUPACName','IsomericSMILES',
  'CanonicalSMILES','InChI','InChIKey','XLogP','ExactMass',
  'MonoisotopicMass','TPSA','Complexity','Charge',
  'HBondDonorCount','HBondAcceptorCount','RotatableBondCount',
  'HeavyAtomCount','CovalentUnitCount',
].join(',')

// ── Types ─────────────────────────────────────────────────────────────────────
type SummaryFmt  = 'CSV' | 'JSON' | 'JSONL' | 'XML'
type StructFmt   = 'SDF' | 'JSON' | 'XML' | 'ASNT'
type CoordType   = '2D' | '3D'
type Compression = 'None' | 'GZip'
type ImgSize     = 'Small' | 'Large'
type ProtFmt     = 'PDB' | 'mmCIF' | 'FASTA' | 'PDBML/XML'

interface SmallMol {
  cid: number; iupac: string; formula: string; mw: string
  smiles: string; inchikey: string; xlogp: string | null
  hbd: number | null; hba: number | null; tpsa: string | null
  rotatable: number | null; complexity: number | null
}

interface Protein {
  id: string; title: string; organism: string
  method: string; resolution: string | null
  chains: number; ligands: number; deposition: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function dlBlob(url: string, filename: string) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const blob = await r.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  URL.revokeObjectURL(a.href)
}

async function dlText(text: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  URL.revokeObjectURL(a.href)
}

function gzExt(fmt: string, c: Compression) { return fmt.toLowerCase() + (c === 'GZip' ? '.gz' : '') }

function pcSummaryUrl(cid: number, fmt: SummaryFmt, c: Compression) {
  const f = fmt === 'JSONL' ? 'JSON' : fmt
  return `${PC}/compound/cid/${cid}/property/${PC_PROPS}/${f}${c === 'GZip' ? '?compress=gzip' : ''}`
}

function pcStructUrl(cid: number, fmt: StructFmt, coord: CoordType, c: Compression) {
  const params: string[] = []
  if (fmt === 'SDF' && coord === '3D') params.push('record_type=3d')
  if (c === 'GZip') params.push('compress=gzip')
  return `${PC}/compound/cid/${cid}/${fmt}${params.length ? '?' + params.join('&') : ''}`
}

function pcImageUrl(cid: number, size: ImgSize) {
  return `${PC}/compound/cid/${cid}/PNG?image_size=${size === 'Small' ? 'small' : 'large'}`
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function Section({ title, isDark, children }: { title: string; isDark: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{title}</h3>
      {children}
    </div>
  )
}

function Radio<T extends string>({ label, opts, val, set, isDark }: {
  label: string; opts: T[]; val: T; set: (v: T) => void; isDark: boolean
}) {
  return (
    <div className="mb-3">
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <div className="flex flex-wrap gap-3">
        {opts.map(o => (
          <label key={o} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={val === o} onChange={() => set(o)} className="accent-blue-500" />
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{o}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function DlButton({ label, onClick, status, isDark }: {
  label: string; onClick: () => void
  status: 'idle'|'loading'|'done'|'error'; isDark: boolean
}) {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors'
  const cls = status === 'loading' ? `${base} opacity-60 cursor-not-allowed ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`
    : status === 'done'    ? `${base} bg-green-600 text-white`
    : status === 'error'   ? `${base} bg-red-600 text-white`
    : `${base} bg-blue-600 hover:bg-blue-700 text-white cursor-pointer`
  const icon = status === 'loading' ? '⏳' : status === 'done' ? '✓' : status === 'error' ? '✕' : '↓'
  return (
    <button className={cls} onClick={onClick} disabled={status === 'loading'}>
      <span>{icon}</span>{label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMALL MOLECULE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SmallMolTab({ isDark }: { isDark: boolean }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [mol, setMol] = useState<SmallMol | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [sumFmt, setSumFmt]       = useState<SummaryFmt>('CSV')
  const [sumCmp, setSumCmp]       = useState<Compression>('None')
  const [strFmt, setStrFmt]       = useState<StructFmt>('SDF')
  const [strCoord, setStrCoord]   = useState<CoordType>('3D')
  const [strCmp, setStrCmp]       = useState<Compression>('None')
  const [imgSize, setImgSize]     = useState<ImgSize>('Large')

  const [st, setSt] = useState<Record<string, 'idle'|'loading'|'done'|'error'>>({})  
  const s  = (k: string, v: 'idle'|'loading'|'done'|'error') => setSt((p: Record<string, 'idle'|'loading'|'done'|'error'>) => ({ ...p, [k]: v }))

  const search = async () => {
    const q2 = q.trim(); if (!q2) return
    setBusy(true); setErr(null); setMol(null)
    try {
      let cid: number
      if (/^\d+$/.test(q2)) {
        cid = parseInt(q2)
      } else {
        const r = await fetch(`${PC}/compound/name/${encodeURIComponent(q2)}/cids/JSON`)
        if (!r.ok) throw new Error('Compound not found on PubChem')
        cid = (await r.json()).IdentifierList.CID[0]
      }
      const pr = await fetch(`${PC}/compound/cid/${cid}/property/${PC_PROPS}/JSON`)
      if (!pr.ok) throw new Error('Failed to fetch properties')
      const p = (await pr.json()).PropertyTable.Properties[0]
      setMol({
        cid, iupac: p.IUPACName ?? '', formula: p.MolecularFormula ?? '',
        mw: p.MolecularWeight ?? '', smiles: p.IsomericSMILES ?? p.CanonicalSMILES ?? '',
        inchikey: p.InChIKey ?? '', xlogp: p.XLogP ?? null,
        hbd: p.HBondDonorCount ?? null, hba: p.HBondAcceptorCount ?? null,
        tpsa: p.TPSA ?? null, rotatable: p.RotatableBondCount ?? null,
        complexity: p.Complexity ?? null,
      })
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const dlSummary = async () => {
    if (!mol) return
    const k = `sum`; s(k, 'loading')
    try {
      const url = pcSummaryUrl(mol.cid, sumFmt, sumCmp)
      const fname = `pubchem_${mol.cid}_summary.${gzExt(sumFmt === 'JSONL' ? 'jsonl' : sumFmt, sumCmp)}`
      if (sumFmt === 'JSONL') {
        const d = await (await fetch(url)).json()
        const lines = (d?.PropertyTable?.Properties ?? [d]).map((r: any) => JSON.stringify(r)).join('\n')
        await dlText(lines, fname.replace('.gz', ''), 'application/jsonlines')
      } else {
        await dlBlob(url, fname)
      }
      s(k, 'done'); setTimeout(() => s(k, 'idle'), 2500)
    } catch { s(k, 'error'); setTimeout(() => s(k, 'idle'), 3000) }
  }

  const dlStruct = async () => {
    if (!mol) return
    const k = `str`; s(k, 'loading')
    try {
      await dlBlob(
        pcStructUrl(mol.cid, strFmt, strCoord, strCmp),
        `pubchem_${mol.cid}_${strCoord.toLowerCase()}.${gzExt(strFmt, strCmp)}`
      )
      s(k, 'done'); setTimeout(() => s(k, 'idle'), 2500)
    } catch { s(k, 'error'); setTimeout(() => s(k, 'idle'), 3000) }
  }

  const dlImage = async () => {
    if (!mol) return
    const k = `img`; s(k, 'loading')
    try {
      await dlBlob(pcImageUrl(mol.cid, imgSize), `pubchem_${mol.cid}_${imgSize.toLowerCase()}.png`)
      s(k, 'done'); setTimeout(() => s(k, 'idle'), 2500)
    } catch { s(k, 'error'); setTimeout(() => s(k, 'idle'), 3000) }
  }

  const inp = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <input
          className={inp} placeholder="Name, CID, SMILES, InChIKey… e.g. Aspirin or 2244"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button
          onClick={search} disabled={busy}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? '…' : 'Search'}
        </button>
      </div>

      {err && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {mol && (
        <>
          {/* Compound card */}
          <div className={`rounded-xl border p-4 flex gap-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <img
              src={pcImageUrl(mol.cid, 'Large')}
              alt={mol.iupac}
              className="w-36 h-36 object-contain rounded-lg bg-white border border-gray-100 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h2 className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{mol.iupac || '—'}</h2>
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${mol.cid}`}
                  target="_blank" rel="noreferrer"
                  className="shrink-0 text-xs text-blue-500 hover:underline"
                >CID {mol.cid} ↗</a>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs mt-2">
                {[
                  ['Formula', mol.formula], ['MW', mol.mw ? `${mol.mw} g/mol` : '—'],
                  ['XLogP', mol.xlogp ?? '—'], ['HBD', mol.hbd ?? '—'],
                  ['HBA', mol.hba ?? '—'], ['TPSA', mol.tpsa ? `${mol.tpsa} Å²` : '—'],
                  ['Rotatable', mol.rotatable ?? '—'], ['Complexity', mol.complexity ?? '—'],
                ].map(([l, v]) => (
                  <div key={l as string}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{l}: </span>
                    <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{v}</span>
                  </div>
                ))}
              </div>
              <p className={`text-xs mt-2 break-all ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                InChIKey: {mol.inchikey}
              </p>
              <p className={`text-xs mt-1 break-all ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                SMILES: {mol.smiles}
              </p>
            </div>
          </div>

          {/* ── Summary ── */}
          <Section title="Summary (Search Results)" isDark={isDark}>
            <Radio label="Format" opts={['CSV','JSON','JSONL','XML'] as SummaryFmt[]} val={sumFmt} set={setSumFmt} isDark={isDark} />
            <Radio label="Fields to Download" opts={['All (default)'] as any[]} val={'All (default)'} set={() => {}} isDark={isDark} />
            <Radio label="Compression" opts={['None','GZip'] as Compression[]} val={sumCmp} set={setSumCmp} isDark={isDark} />
            <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <a href="https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest#section=Output" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                Read about supported file formats
              </a>
            </p>
            <DlButton label={`Download ${sumFmt}${sumCmp === 'GZip' ? '.gz' : ''}`} onClick={dlSummary} status={st['sum'] ?? 'idle'} isDark={isDark} />
          </Section>

          {/* ── Chemical Structure Records ── */}
          <Section title="Chemical Structure Records" isDark={isDark}>
            <Radio label="Format" opts={['SDF','JSON','XML','ASNT'] as StructFmt[]} val={strFmt} set={setStrFmt} isDark={isDark} />
            <Radio label="Coordinate Type" opts={['2D','3D'] as CoordType[]} val={strCoord} set={setStrCoord} isDark={isDark} />
            <Radio label="Compression" opts={['None','GZip'] as Compression[]} val={strCmp} set={setStrCmp} isDark={isDark} />
            <DlButton label={`Download ${strFmt} ${strCoord}${strCmp === 'GZip' ? '.gz' : ''}`} onClick={dlStruct} status={st['str'] ?? 'idle'} isDark={isDark} />
          </Section>

          {/* ── Chemical Structure Images ── */}
          <Section title="Chemical Structure Images" isDark={isDark}>
            <Radio label="Format" opts={['PNG'] as any[]} val={'PNG'} set={() => {}} isDark={isDark} />
            <Radio label="Image Size" opts={['Small','Large'] as ImgSize[]} val={imgSize} set={setImgSize} isDark={isDark} />
            <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Compression: Zip Only (saved as .zip when downloaded via browser)</p>
            <DlButton label={`Download PNG (${imgSize})`} onClick={dlImage} status={st['img'] ?? 'idle'} isDark={isDark} />
          </Section>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROTEIN TAB (RCSB PDB)
// ═══════════════════════════════════════════════════════════════════════════════
function ProteinTab({ isDark }: { isDark: boolean }) {
  const [q, setQ]       = useState('')
  const [busy, setBusy] = useState(false)
  const [prot, setProt] = useState<Protein | null>(null)
  const [err, setErr]   = useState<string | null>(null)

  const [fmt, setFmt]         = useState<ProtFmt>('PDB')
  const [compress, setCompress] = useState<Compression>('None')

  const [st, setSt] = useState<Record<string, 'idle'|'loading'|'done'|'error'>>({})  
  const s = (k: string, v: 'idle'|'loading'|'done'|'error') => setSt((p: Record<string, 'idle'|'loading'|'done'|'error'>) => ({ ...p, [k]: v }))

  const search = async () => {
    const id = q.trim().toUpperCase(); if (!id) return
    setBusy(true); setErr(null); setProt(null)
    try {
      const r = await fetch(`${PDB_API}/${id}`)
      if (!r.ok) throw new Error(`PDB entry "${id}" not found`)
      const d = await r.json()
      const struct = d.struct ?? {}
      const exp    = d.exptl?.[0] ?? {}
      const refine = d.refine?.[0] ?? {}
      const src    = d.rcsb_entry_info ?? {}
      setProt({
        id,
        title:      struct.title ?? id,
        organism:   d.rcsb_entry_container_identifiers?.entity_ids?.join(', ') ?? '—',
        method:     exp.method ?? src.experimental_method ?? '—',
        resolution: refine.ls_d_res_high ?? src.resolution_combined?.[0] ?? null,
        chains:     src.deposited_polymer_entity_instance_count ?? 0,
        ligands:    src.deposited_nonpolymer_entity_instance_count ?? 0,
        deposition: d.rcsb_accession_info?.deposit_date?.slice(0, 10) ?? '—',
      })
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const buildUrl = (id: string, f: ProtFmt, c: Compression) => {
    if (f === 'FASTA')     return `https://www.rcsb.org/fasta/entry/${id}`
    if (f === 'PDBML/XML') return `${PDB}/${id}.xml${c === 'GZip' ? '.gz' : ''}`
    if (f === 'mmCIF')     return `${PDB}/${id}.cif${c === 'GZip' ? '.gz' : ''}`
    return `${PDB}/${id}.pdb${c === 'GZip' ? '.gz' : ''}`
  }

  const dlStruct = async () => {
    if (!prot) return
    const k = 'struct'; s(k, 'loading')
    try {
      const url = buildUrl(prot.id, fmt, compress)
      const extMap: Record<ProtFmt, string> = { PDB: 'pdb', mmCIF: 'cif', FASTA: 'fasta', 'PDBML/XML': 'xml' }
      const fname = `${prot.id}.${extMap[fmt as ProtFmt]}${compress === 'GZip' ? '.gz' : ''}`
      await dlBlob(url, fname)
      s(k, 'done'); setTimeout(() => s(k, 'idle'), 2500)
    } catch { s(k, 'error'); setTimeout(() => s(k, 'idle'), 3000) }
  }

  const dlFasta = async () => {
    if (!prot) return
    const k = 'fasta'; s(k, 'loading')
    try {
      await dlBlob(`https://www.rcsb.org/fasta/entry/${prot.id}`, `${prot.id}.fasta`)
      s(k, 'done'); setTimeout(() => s(k, 'idle'), 2500)
    } catch { s(k, 'error'); setTimeout(() => s(k, 'idle'), 3000) }
  }

  const dlAssembly = async () => {
    if (!prot) return
    const k = 'assembly'; s(k, 'loading')
    try {
      await dlBlob(
        `${PDB}/${prot.id}-assembly1.cif${compress === 'GZip' ? '.gz' : ''}`,
        `${prot.id}_assembly1.cif${compress === 'GZip' ? '.gz' : ''}`
      )
      s(k, 'done'); setTimeout(() => s(k, 'idle'), 2500)
    } catch { s(k, 'error'); setTimeout(() => s(k, 'idle'), 3000) }
  }

  const inp = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <input
          className={inp} placeholder="PDB ID (4 chars) — e.g. 1HSG, 6LU7, 4HHB"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button
          onClick={search} disabled={busy}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? '…' : 'Search'}
        </button>
      </div>

      {err && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {prot && (
        <>
          {/* Protein card */}
          <div className={`rounded-xl border p-4 flex gap-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <img
              src={`https://cdn.rcsb.org/images/structures/${prot.id.toLowerCase()}_assembly-1.jpeg`}
              alt={prot.id}
              className="w-36 h-36 object-cover rounded-lg bg-gray-100 border border-gray-200 shrink-0"
              onError={e => { (e.target as HTMLImageElement).src = `https://www.rcsb.org/image/200x200/${prot.id}` }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <span className={`text-lg font-bold font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{prot.id}</span>
                <a
                  href={`https://www.rcsb.org/structure/${prot.id}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-1"
                >View on RCSB ↗</a>
              </div>
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{prot.title}</p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                {[
                  ['Method',     prot.method],
                  ['Resolution', prot.resolution ? `${prot.resolution} Å` : 'N/A'],
                  ['Chains',     prot.chains],
                  ['Ligands',    prot.ligands],
                  ['Deposited',  prot.deposition],
                ].map(([l, v]) => (
                  <div key={l as string}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{l}: </span>
                    <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Asymmetric Unit ── */}
          <Section title="Asymmetric Unit (Structure File)" isDark={isDark}>
            <Radio label="Format" opts={['PDB','mmCIF','PDBML/XML'] as ProtFmt[]} val={fmt} set={setFmt} isDark={isDark} />
            <Radio label="Compression" opts={['None','GZip'] as Compression[]} val={compress} set={setCompress} isDark={isDark} />
            <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <a href="https://www.rcsb.org/docs/programmatic-access/file-download-services" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                Read about supported file formats
              </a>
            </p>
            <DlButton
              label={`Download ${fmt}${compress === 'GZip' ? '.gz' : ''}`}
              onClick={dlStruct} status={st['struct'] ?? 'idle'} isDark={isDark}
            />
          </Section>

          {/* ── Biological Assembly ── */}
          <Section title="Biological Assembly" isDark={isDark}>
            <Radio label="Format" opts={['mmCIF'] as any[]} val={'mmCIF'} set={() => {}} isDark={isDark} />
            <Radio label="Compression" opts={['None','GZip'] as Compression[]} val={compress} set={setCompress} isDark={isDark} />
            <DlButton
              label={`Download Assembly-1 mmCIF${compress === 'GZip' ? '.gz' : ''}`}
              onClick={dlAssembly} status={st['assembly'] ?? 'idle'} isDark={isDark}
            />
          </Section>

          {/* ── Sequence ── */}
          <Section title="Sequence (FASTA)" isDark={isDark}>
            <Radio label="Format" opts={['FASTA'] as any[]} val={'FASTA'} set={() => {}} isDark={isDark} />
            <Radio label="Compression" opts={['None'] as any[]} val={'None'} set={() => {}} isDark={isDark} />
            <DlButton label="Download FASTA" onClick={dlFasta} status={st['fasta'] ?? 'idle'} isDark={isDark} />
          </Section>

          {/* ── Use for Docking ── */}
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>💡 Using for Docking</p>
            <p className={`text-xs ${isDark ? 'text-blue-200' : 'text-blue-600'}`}>
              Download the <strong>PDB</strong> file above and upload it as your receptor in the Docking module.
              Remove water molecules and co-crystallised ligands in the Viewer before docking.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function DatabaseDownload() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [tab, setTab] = useState<'mol' | 'prot'>('prot')

  const card = `flex-1 min-h-0 overflow-y-auto rounded-xl border p-4 ${
    isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      {/* Header */}
      <div className="shrink-0">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Database Download
        </h1>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Download protein structures from RCSB PDB and small molecules from PubChem
        </p>
      </div>

      {/* Tabs */}
      <div className={`shrink-0 flex gap-1 p-1 rounded-xl w-fit ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        {([['prot','🧬 Protein Structure (RCSB PDB)'],['mol','🔬 Small Molecule (PubChem)']] as const).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === k
                ? isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={card}>
        {tab === 'mol'  ? <SmallMolTab isDark={isDark} /> : <ProteinTab isDark={isDark} />}
      </div>
    </div>
  )
}
