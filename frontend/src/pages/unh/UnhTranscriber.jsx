import { useState, useEffect, useRef } from 'react'
import {
  Card, Button, Upload, Typography, Steps, Spin, Alert, Tag, Space, Divider,
  List, Modal, message, Empty, Tooltip
} from 'antd'
import {
  UploadOutlined, AudioOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, EyeOutlined, CopyOutlined
} from '@ant-design/icons'
import { transcribeAPI } from '../../api/client'
import useAuthStore from '../../store/authStore'

const { Title, Text, Paragraph } = Typography

const STATUS_STEPS = {
  pending: 0,
  transcribing: 1,
  generating: 2,
  completed: 3,
  failed: -1,
}

const statusMeta = {
  pending: { color: 'default', icon: <ClockCircleOutlined />, label: 'Queued' },
  transcribing: { color: 'processing', icon: <AudioOutlined />, label: 'Transcribing' },
  generating: { color: 'processing', icon: <FileTextOutlined />, label: 'Generating Report' },
  completed: { color: 'success', icon: <CheckCircleOutlined />, label: 'Complete' },
  failed: { color: 'error', icon: <ExclamationCircleOutlined />, label: 'Failed' },
}

function JobCard({ job, onView }) {
  const meta = statusMeta[job.status] || statusMeta.pending
  return (
    <List.Item
      actions={[
        job.status === 'completed' && (
          <Tooltip title="View Report">
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => onView(job)} />
          </Tooltip>
        )
      ].filter(Boolean)}
    >
      <List.Item.Meta
        title={
          <Space>
            <Text strong style={{ fontSize: 13 }}>{job.audio_file_name || 'Audio File'}</Text>
            <Tag color={meta.color}>{meta.icon} {meta.label}</Tag>
            <Tag color="purple" style={{ fontSize: 11 }}>UNH Template</Tag>
          </Space>
        }
        description={
          <Text type="secondary" style={{ fontSize: 12 }}>
            Submitted {new Date(job.created_at).toLocaleString()}
          </Text>
        }
      />
    </List.Item>
  )
}

export default function UnhTranscriber() {
  const { organization, user, getSpace } = useAuthStore()
  const [jobs, setJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewJob, setViewJob] = useState(null)
  const [pollingId, setPollingId] = useState(null)
  const pollRef = useRef(null)

  const spaceId = getSpace('unh_internal')?.id

  const loadJobs = () => {
    if (!organization?.id) return
    transcribeAPI.list({ organization_id: organization.id, space_id: spaceId })
      .then(r => setJobs(r.data.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoadingJobs(false))
  }

  useEffect(() => {
    loadJobs()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [organization])

  const startPolling = (jobId) => {
    setPollingId(jobId)
    pollRef.current = setInterval(async () => {
      try {
        const r = await transcribeAPI.get(jobId)
        const job = r.data
        setJobs(prev => prev.map(j => j.id === jobId ? job : j))
        if (['completed', 'failed'].includes(job.status)) {
          clearInterval(pollRef.current)
          pollRef.current = null
          setPollingId(null)
          if (job.status === 'completed') message.success('Transcription complete — report ready!')
          else message.error('Transcription failed')
        }
      } catch {
        clearInterval(pollRef.current)
        setPollingId(null)
      }
    }, 3000)
  }

  const handleUpload = async ({ file }) => {
    if (!spaceId) { message.error('UNH space not found'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('audio', file)
      formData.append('space_id', spaceId)
      formData.append('organization_id', organization.id)
      formData.append('submitted_by', user.id)
      formData.append('report_format', 'unh_template')

      const r = await transcribeAPI.submit(formData)
      const newJob = r.data.job || r.data
      message.success('Audio uploaded — transcription started')
      setJobs(prev => [newJob, ...prev])
      startPolling(newJob.id)
    } catch {
      message.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => message.success('Copied to clipboard'))
  }

  const activeJob = pollingId ? jobs.find(j => j.id === pollingId) : null
  const stepCurrent = activeJob ? STATUS_STEPS[activeJob.status] ?? 0 : 0

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>AI Transcriber</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Upload audio recordings. The AI will transcribe the audio and generate a formatted report using UNH reporting templates.
      </Text>

      <Card
        bordered={false}
        style={styles.card}
        title={<Space><AudioOutlined style={{ color: '#722ed1' }} /><span>Upload Audio File</span></Space>}
      >
        <Alert
          type="info"
          showIcon
          message="UNH Template Mode"
          description="Reports generated here will follow the UN-Habitat reporting structure with fields for location, stakeholder type, date, attendees, and action items."
          style={{ marginBottom: 16 }}
        />

        <Upload.Dragger
          accept=".mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4"
          beforeUpload={() => false}
          onChange={({ file }) => { if (file.status !== 'removed') handleUpload({ file }) }}
          showUploadList={false}
          disabled={uploading || !!pollingId}
          style={{ borderColor: '#722ed1', borderRadius: 8 }}
        >
          <p className="ant-upload-drag-icon">
            <AudioOutlined style={{ fontSize: 36, color: '#722ed1' }} />
          </p>
          <p className="ant-upload-text">Click or drag an audio file here</p>
          <p className="ant-upload-hint" style={{ fontSize: 12 }}>
            Supports MP3, WAV, M4A, OGG, FLAC, WebM. Max 100MB.
          </p>
        </Upload.Dragger>

        {(uploading || pollingId) && (
          <div style={{ marginTop: 20 }}>
            <Steps
              current={uploading ? 0 : stepCurrent}
              size="small"
              items={[
                { title: 'Upload', description: 'Audio file received' },
                { title: 'Transcribe', description: 'Speech to text' },
                { title: 'Generate', description: 'UNH report format' },
                { title: 'Done', description: 'Report ready' },
              ]}
            />
            {pollingId && <div style={{ marginTop: 12, textAlign: 'center' }}><Spin /> <Text type="secondary" style={{ marginLeft: 8 }}>Processing...</Text></div>}
          </div>
        )}
      </Card>

      <Card
        bordered={false}
        style={{ ...styles.card, marginTop: 16 }}
        title="Previous Transcriptions"
      >
        {loadingJobs ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : jobs.length === 0 ? (
          <Empty description="No transcriptions yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={jobs}
            renderItem={job => <JobCard job={job} onView={setViewJob} />}
          />
        )}
      </Card>

      <Modal
        title="Generated Report"
        open={!!viewJob}
        onCancel={() => setViewJob(null)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => copyToClipboard(viewJob?.generated_report || '')}>
            Copy Report
          </Button>,
          <Button key="copy-transcript" onClick={() => copyToClipboard(viewJob?.transcript_text || '')}>
            Copy Transcript
          </Button>,
          <Button key="close" type="primary" onClick={() => setViewJob(null)}
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
            Close
          </Button>
        ]}
        width={700}
      >
        {viewJob && (
          <div>
            <Tag color="purple" style={{ marginBottom: 12 }}>UNH Template</Tag>
            <Divider orientation="left">Transcript</Divider>
            <Card size="small" style={{ background: '#fafafa', marginBottom: 16, maxHeight: 200, overflow: 'auto' }}>
              <Paragraph style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>
                {viewJob.transcript_text || 'No transcript available'}
              </Paragraph>
            </Card>
            <Divider orientation="left">Generated Report</Divider>
            <Card size="small" style={{ background: '#f9f0ff', maxHeight: 350, overflow: 'auto' }}>
              <Paragraph style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>
                {viewJob.generated_report || 'No report generated'}
              </Paragraph>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}

const styles = {
  card: { borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
}
