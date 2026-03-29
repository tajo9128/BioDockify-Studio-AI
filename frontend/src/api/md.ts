import { apiClient } from '@/lib/apiClient'

export interface MDDynamicsRequest {
  pdb_content: string
  steps: number
  temperature: number
  pressure: number
  frame_interval: number
  solvent_model: string
  ionic_strength: number
  name: string
  notify_on_start: boolean
  notify_on_complete: boolean
}

export interface MDJobResponse {
  job_id: string
  status: string
  message: string
}

export interface MDJobStatus {
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  updated_at: string
  result?: MDResult
  error?: string
}

export interface MDResult {
  trajectory_path: string
  final_frame_path: string
  energy_csv_path: string
  n_frames: number
  n_steps: number
  sim_time_ns: number
  temperature_K: number
  avg_energy_kj_mol: number
  solvent_model: string
}

export interface MDAnalysisRequest {
  job_id: string
  trajectory_path?: string
  energy_csv_path?: string
}

export interface MDAnalysisResult {
  success: boolean
  output_file: string
  plot_data?: PlotlyData
  [key: string]: any
}

export interface PlotlyData {
  data: any[]
  layout: any
}

export interface MDPublicationRequest {
  job_id: string
  project_name: string
  analysis_job_id?: string
  compress: boolean
  notify_on_complete: boolean
}

export interface MDNotifyStatus {
  telegram: boolean
  discord: boolean
  slack: boolean
  email: boolean
}

export async function runDynamics(request: MDDynamicsRequest): Promise<MDJobResponse> {
  const { data } = await apiClient.post('/md/dynamics', request)
  return data
}

export async function getMDJobStatus(jobId: string): Promise<MDJobStatus> {
  const { data } = await apiClient.get(`/md/job/${jobId}`)
  return data
}

export async function analyzeRMSD(request: MDAnalysisRequest): Promise<MDAnalysisResult> {
  const { data } = await apiClient.post('/md/analysis/rmsd', request)
  return data
}

export async function analyzeRMSF(request: MDAnalysisRequest): Promise<MDAnalysisResult> {
  const { data } = await apiClient.post('/md/analysis/rmsf', request)
  return data
}

export async function analyzeEnergy(request: MDAnalysisRequest): Promise<MDAnalysisResult> {
  const { data } = await apiClient.post('/md/analysis/energy', request)
  return data
}

export async function analyzeGyration(request: MDAnalysisRequest): Promise<MDAnalysisResult> {
  const { data } = await apiClient.post('/md/analysis/gyration', request)
  return data
}

export async function analyzeSASA(request: MDAnalysisRequest): Promise<MDAnalysisResult> {
  const { data } = await apiClient.post('/md/analysis/sasa', request)
  return data
}

export async function analyzeHBonds(request: MDAnalysisRequest): Promise<MDAnalysisResult> {
  const { data } = await apiClient.post('/md/analysis/hbonds', request)
  return data
}

export async function runFullAnalysis(request: MDAnalysisRequest): Promise<MDJobResponse> {
  const { data } = await apiClient.post('/md/analysis/all', request)
  return data
}

export async function createPublication(request: MDPublicationRequest): Promise<{ success: boolean; package_path: string }> {
  const { data } = await apiClient.post('/md/publication/package', request)
  return data
}

export async function getNotifyStatus(): Promise<MDNotifyStatus> {
  const { data } = await apiClient.get('/md/notify/status')
  return data
}

export async function testNotification(channel: string = 'discord'): Promise<{ sent_to: string[] }> {
  const { data } = await apiClient.post('/md/notify/test', null, { params: { channel } })
  return data
}

export async function sendNotification(event: string, title: string, message: string): Promise<{ sent_to: string[] }> {
  const { data } = await apiClient.post('/md/notify', { event, title, message })
  return data
}

export async function minimizeStructure(pdbContent: string): Promise<{ job_id: string; status: string }> {
  const { data } = await apiClient.post('/md/minimize', null, { params: { pdb_content: pdbContent } })
  return data
}

export async function getMDHealth(): Promise<{ status: string; engine: string }> {
  const { data } = await apiClient.get('/md/health')
  return data
}
