import { Link } from 'react-router-dom'
import { useHealth, useGPU } from '@/hooks'
import { Card, Badge } from '@/components/ui'
import { Button } from '@/components/ui'

export function Dashboard() {
  const { data: health } = useHealth()
  const { data: gpu } = useGPU()

  const isHealthy = health?.status === 'healthy'
  const gpuAvailable = gpu?.available

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Molecular Docking</h1>
        <p className="text-text-secondary mt-1">Virtual screening and binding affinity prediction</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/docking">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🧪</span>
              <div>
                <h3 className="font-semibold text-text-primary">New Docking</h3>
                <p className="text-sm text-text-secondary">Start a new molecular docking experiment</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="text-3xl">📋</span>
              <div>
                <h3 className="font-semibold text-text-primary">Job Queue</h3>
                <p className="text-sm text-text-secondary">View and manage docking jobs</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/viewer">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="text-3xl">👁</span>
              <div>
                <h3 className="font-semibold text-text-primary">Molecule Viewer</h3>
                <p className="text-sm text-text-secondary">Visualize molecular structures in 3D</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-bold text-text-primary mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border-light">
              <span className="text-text-secondary">Backend API</span>
              <Badge variant={isHealthy ? 'success' : 'error'}>
                {isHealthy ? 'Healthy' : 'Unhealthy'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-light">
              <span className="text-text-secondary">Docker</span>
              <Badge variant="success">Running</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-light">
              <span className="text-text-secondary">AI Assistant</span>
              <Link to="/settings">
                <Badge variant="info">Configure</Badge>
              </Link>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-secondary">GPU Acceleration</span>
              <Badge variant={gpuAvailable ? 'success' : 'warning'}>
                {gpuAvailable ? gpu.gpus?.[0]?.name || 'Available' : 'CPU Only'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-text-primary mb-4">Quick Start</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
              <div>
                <p className="text-sm font-medium text-text-primary">Upload receptor and ligand files</p>
                <p className="text-xs text-text-tertiary">PDB, PDBQT, SDF, MOL2 formats supported</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
              <div>
                <p className="text-sm font-medium text-text-primary">Configure grid box and parameters</p>
                <p className="text-xs text-text-tertiary">Set search space around binding site</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">3</span>
              <div>
                <p className="text-sm font-medium text-text-primary">Run docking simulation</p>
                <p className="text-xs text-text-tertiary">Powered by Vina + GNINA + RF-Score</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">4</span>
              <div>
                <p className="text-sm font-medium text-text-primary">Analyze results</p>
                <p className="text-xs text-text-tertiary">View poses, interactions, and export reports</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/docking">
              <Button className="w-full">Start New Docking</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
