import {
  Card, Upload, Button, Table, Tag, Typography, Space, Select, Empty, Spin, message, Progress
} from 'antd'
import { UploadOutlined, FileTextOutlined, FilePdfOutlined, AudioOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { reportAPI, workspaceAPI } from '../api/client'

const { Title, Text } = Typography
const { Dragger } = Upload

const fileIcon = (type) => {
  if (type?.includes('pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
  if (type?.includes('audio') || type?.includes('mp3') || type?.includes('wav'))
    return <AudioOutlined style={{ color: '#722ed1', fontSize: 18 }} />
  return <FileTextOutlined style={{ color: '#1890ff', fontSize: 18 }} />
}

const statusColor = { pending: 'orange', processing: 'blue', completed: 'green', failed: 'red' }

export default function Reports() {
  const [workspaces, setWorkspaces] = useState([])
  const [selectedWs, setSelectedWs] = useState(null)
  const [reports, setReports] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    workspaceAPI.list().then((res) => {
      const ws = res.data.workspaces || []
      setWorkspaces(ws)
      if (ws.length > 0) setSelectedWs(ws[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedWs) return
    setLoading(true)
    reportAPI.list(selectedWs)
      .then((res) => setReports(res.data.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [selectedWs])

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf,.doc,.docx,.txt,.mp3,.wav,.m4a',
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspace_id', selectedWs)
      try {
        const res = await reportAPI.upload(formData)
        message.success(`${file.name} uploaded successfully`)
        setReports((prev) => [res.data.task, ...prev])
        onSuccess()
      } catch (err) {
        message.error(err.response?.data?.error || 'Upload failed')
        onError()
      } finally {
        setUploading(false)
      }
    },
  }

  const columns = [
    {
      title: 'File',
      key: 'file',
      render: (_, r) => (
        <Space>
          {fileIcon(r.file_type)}
          <div>
            <Text strong style={{ display: 'block' }}>{r.original_filename || r.file_name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.file_type}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColor[status] || 'default'} style={{ textTransform: 'capitalize' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (p, r) => r.status === 'processing'
        ? <Progress percent={p || 0} size="small" style={{ width: 120 }} />
        : r.status === 'completed' ? <Progress percent={100} size="small" style={{ width: 120 }} />
        : '—',
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d) => d ? new Date(d).toLocaleString() : '—',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, r) => r.status === 'completed'
        ? <Button size="small" type="link">Download</Button>
        : null,
    },
  ]

  return (
    <div>
      <div style={styles.pageHeader}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Reports</Title>
          <Text type="secondary">Upload and process your reports.</Text>
        </div>
        <Select
          value={selectedWs}
          onChange={setSelectedWs}
          style={{ width: 200 }}
          placeholder="Select workspace"
          options={workspaces.map((ws) => ({ label: ws.name, value: ws.id }))}
        />
      </div>

      {/* Upload Area */}
      <Card bordered={false} style={{ ...styles.card, marginBottom: 16 }}>
        <Dragger {...uploadProps} disabled={!selectedWs || uploading} style={styles.dragger}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📎</p>
          <p style={{ fontWeight: 600 }}>Drop your report here or click to browse</p>
          <p style={{ color: '#888', fontSize: 13 }}>
            Supports PDF, Word (.docx), Plain Text, MP3, WAV, M4A
          </p>
          {uploading && <Spin style={{ marginTop: 8 }} />}
        </Dragger>
      </Card>

      {/* Reports Table */}
      <Card bordered={false} style={styles.card} title="Processed Reports">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
        ) : reports.length === 0 ? (
          <Empty
            description="No reports yet — upload your first report above"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table dataSource={reports} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
        )}
      </Card>
    </div>
  )
}

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  card: {
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  dragger: {
    background: '#fafbff',
    border: '2px dashed #d0d5ff',
    borderRadius: 10,
    padding: '20px 0',
  },
}
