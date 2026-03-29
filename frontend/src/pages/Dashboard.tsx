import { Link } from 'react-router-dom'
import { useHealth, useGPU } from '@/hooks'
import { Card, Badge } from '@/components/ui'
import { Button } from '@/components/ui'

import { useEffect, useState } from 'react'

export function Dashboard() {
  const { data: health } = useHealth()
  const { data: gpu } = useGPU()
  const [dockerRunning, setDockerRunning] = useState(false)

  useEffect(() => {
    fetch('/stats')
      .then(res => res.json())
      .then(data => {
        if (data.docker_running !== undefined) {
          setDockerRunning(data.docker_running)
        }
      })
      .catch(() => {
        setDockerRunning(false)
      })
  }, [])

  const isHealthy = health?.status === 'healthy'
  const gpuAvailable = gpu?.available

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">🧬 BioDockify</h1>
        <p className="text-text-secondary mt-1">Molecular Docking Studio - Virtual screening and binding affinity prediction</p>
      </div>

      {/* Welcome Banner for Students */}
      <div className="mb-8 bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🎓</div>
          <div className="flex-1">
            <h2 className="font-bold text-text-primary text-lg mb-2">Welcome to Molecular Docking!</h2>
            <p className="text-sm text-text-secondary mb-3">
              Learn how small molecule drugs bind to protein targets. This tool uses AutoDock Vina and GNINA deep learning to predict binding affinities.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/docking">
                <Button size="sm" className="bg-primary">
                  🚀 Start Docking
                </Button>
              </Link>
              <Link to="/viewer">
                <Button size="sm" variant="outline">
                  👁 Try 3D Viewer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/docking">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-primary">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🧪</span>
              <div>
                <h3 className="font-semibold text-text-primary">New Docking</h3>
                <p className="text-sm text-text-secondary">Start a molecular docking experiment</p>
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
                <p className="text-sm text-text-secondary">View your docking jobs</p>
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
                <p className="text-sm text-text-secondary">Visualize molecules in 3D</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Learning Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card padding="lg" className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📚</span>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">What is Molecular Docking?</h3>
              <p className="text-xs text-blue-700 mb-2">
                Molecular docking predicts how a small molecule (ligand) binds to a protein (receptor) by exploring billions of possible orientations and scoring them based on binding affinity.
              </p>
              <p className="text-xs text-blue-600">
                <strong>AutoDock Vina</strong> uses physics-based scoring. <strong>GNINA</strong> adds deep learning CNN scores for improved accuracy.
              </p>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-green-800 mb-2">Getting Started</h3>
              <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
                <li>Upload a protein receptor (PDB format)</li>
                <li>Prepare it with AMBER charges for best results</li>
                <li>Upload your ligand compound (SDF, MOL2, or SMILES)</li>
                <li>Set the search space around the binding site</li>
                <li>Run docking and analyze the results!</li>
              </ol>
            </div>
          </div>
        </Card>
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
              <Badge variant={dockerRunning ? 'success' : 'error'}>
                {dockerRunning ? 'Running' : 'Not Running'}
              </Badge>
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
