import { Link } from 'react-router-dom'
import { useJobs, useDeleteJob } from '@/hooks'
import { Card, Badge, DataTable, Button } from '@/components/ui'

export function JobQueue() {
  const { data, isLoading } = useJobs()
  const deleteJob = useDeleteJob()

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return '-'
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'RUNNING':
        return 'info'
      case 'FAILED':
        return 'error'
      case 'CANCELLED':
        return 'warning'
      default:
        return 'default'
    }
  }

  const columns = [
    { key: 'job_name', label: 'Job Name', width: '25%' },
    { key: 'engine', label: 'Engine', width: '15%' },
    { key: 'status', label: 'Status', width: '15%' },
    { key: 'binding_energy', label: 'Energy (kcal/mol)', width: '15%' },
    { key: 'created_at', label: 'Created', width: '20%' },
    { key: 'actions', label: '', width: '10%' },
  ]

  const jobs = data?.jobs || []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Job Queue</h1>
          <p className="text-text-secondary mt-1">Manage your docking experiments</p>
        </div>
        <Link to="/docking">
          <Button>＋ New Job</Button>
        </Link>
      </div>

      <Card>
        {isLoading ? (
          <div className="text-center py-12 text-text-tertiary">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-tertiary">No jobs yet</p>
            <Link to="/docking" className="text-primary hover:underline text-sm mt-2 inline-block">
              Start your first docking experiment
            </Link>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={jobs.map((job) => ({
              ...job,
              created_at: formatDate(job.created_at),
              status: <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>,
              binding_energy: job.binding_energy != null ? job.binding_energy.toFixed(3) : '-',
              actions: (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteJob.mutate(job.job_uuid)}
                >
                  Delete
                </Button>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  )
}
