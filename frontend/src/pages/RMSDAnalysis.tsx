import { useState } from 'react'
import { Card, Button } from '@/components/ui'
import { calculateRMSD } from '@/api/analysis'

export function RMSDAnalysis() {
  const [pdb1, setPdb1] = useState('')
  const [pdb2, setPdb2] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    if (!pdb1.trim() || !pdb2.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await calculateRMSD(pdb1, pdb2)
      setResult(data.rmsd)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'RMSD calculation failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">RMSD Analysis</h1>
        <p className="text-text-secondary mt-1">Calculate RMSD between molecular poses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-text-primary mb-4">Calculate RMSD</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Pose 1 (PDB content)</label>
              <textarea
                value={pdb1}
                onChange={(e) => setPdb1(e.target.value)}
                placeholder="Paste PDB content or file path..."
                rows={8}
                className="w-full px-3 py-2 bg-surface-secondary border border-border-light rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Pose 2 (PDB content)</label>
              <textarea
                value={pdb2}
                onChange={(e) => setPdb2(e.target.value)}
                placeholder="Paste PDB content or file path..."
                rows={8}
                className="w-full px-3 py-2 bg-surface-secondary border border-border-light rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
            <Button onClick={handleCalculate} disabled={!pdb1.trim() || !pdb2.trim() || loading}>
              {loading ? 'Calculating...' : 'Calculate RMSD'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {result !== null && (
            <div className="mt-4 p-4 bg-surface-secondary rounded-lg text-center">
              <p className="text-sm text-text-secondary">RMSD</p>
              <p className="text-3xl font-bold text-primary">{typeof result === 'number' ? result.toFixed(3) : result} Å</p>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-text-primary mb-4">Reference</h3>
          <p className="text-sm text-text-secondary">
            Root Mean Square Deviation (RMSD) measures the structural similarity between two molecular poses.
            Lower RMSD indicates higher similarity.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-surface-secondary rounded">
              <span className="text-text-secondary">Excellent</span>
              <span className="text-success font-semibold">&lt; 1.0 Å</span>
            </div>
            <div className="flex justify-between p-2 bg-surface-secondary rounded">
              <span className="text-text-secondary">Good</span>
              <span className="text-success font-semibold">1.0 - 2.0 Å</span>
            </div>
            <div className="flex justify-between p-2 bg-surface-secondary rounded">
              <span className="text-text-secondary">Moderate</span>
              <span className="text-warning font-semibold">2.0 - 3.0 Å</span>
            </div>
            <div className="flex justify-between p-2 bg-surface-secondary rounded">
              <span className="text-text-secondary">Poor</span>
              <span className="text-error font-semibold">&gt; 3.0 Å</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
