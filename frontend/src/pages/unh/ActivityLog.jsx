import { useState, useEffect } from 'react'
import { Table, Card, Tag, Typography, Select, Space, Empty, Spin, Avatar } from 'antd'
import { activityAPI } from '../../api/client'
import useAuthStore from '../../store/authStore'

const { Title, Text } = Typography

const actionMeta = {
  report_uploaded: { label: 'Uploaded Report', color: 'purple', emoji: '📄' },
  task_assigned: { label: 'Assigned Task', color: 'blue', emoji: '📌' },
  task_completed: { label: 'Completed Task', color: 'green', emoji: '✅' },
  engagement_logged: { label: 'Logged Engagement', color: 'cyan', emoji: '🤝' },
  project_created: { label: 'Created Project', color: 'orange', emoji: '📁' },
  member_added: { label: 'Added Member', color: 'geekblue', emoji: '👤' },
  transcription_completed: { label: 'Transcription Done', color: 'lime', emoji: '🎤' },
}

const stakeholderColor = { trader: 'gold', street_vendor: 'orange', resident: 'blue', urban_regen_team: 'purple' }
const stakeholderLabel = { trader: 'Traders', street_vendor: 'Street Vendors', resident: 'Residents', urban_regen_team: 'Urban Regen Team' }

export default function ActivityLog() {
  const { organization } = useAuthStore()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState(null)

  useEffect(() => {
    if (!organization?.id) return
    setLoading(true)
    activityAPI.list({ organization_id: organization.id })
      .then(r => setLogs(r.data.activity || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [organization])

  const filtered = actionFilter ? logs.filter(l => l.action === actionFilter) : logs

  const columns = [
    {
      title: 'Member', dataIndex: 'user_name', key: 'user_name', width: 160,
      render: (name) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#722ed1', fontSize: 12 }}>
            {name?.[0]?.toUpperCase() || '?'}
          </Avatar>
          <Text style={{ fontSize: 13 }}>{name || 'Unknown'}</Text>
        </Space>
      )
    },
    {
      title: 'Action', dataIndex: 'action', key: 'action', width: 180,
      render: (val) => {
        const meta = actionMeta[val] || { label: val, color: 'default', emoji: '•' }
        return (
          <Tag color={meta.color}>
            {meta.emoji} {meta.label}
          </Tag>
        )
      }
    },
    {
      title: 'Stakeholder', dataIndex: 'stakeholder_type', key: 'stakeholder_type', width: 150,
      render: (val) => val
        ? <Tag color={stakeholderColor[val] || 'default'}>{stakeholderLabel[val] || val}</Tag>
        : <Text type="secondary">—</Text>
    },
    {
      title: 'Details', dataIndex: 'description', key: 'description',
      render: (val) => <Text type="secondary" style={{ fontSize: 13 }}>{val || '—'}</Text>
    },
    {
      title: 'Date & Time', dataIndex: 'created_at', key: 'created_at', width: 160,
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      defaultSortOrder: 'descend',
      render: (val) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{new Date(val).toLocaleDateString()}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{new Date(val).toLocaleTimeString()}</Text>
        </Space>
      )
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>Activity Log</Title>
          <Text type="secondary">Full audit trail of all team activities in the UNH internal space.</Text>
        </div>
        <Select
          placeholder="Filter by action"
          allowClear
          style={{ width: 200 }}
          onChange={setActionFilter}
          options={Object.entries(actionMeta).map(([k, v]) => ({ label: `${v.emoji} ${v.label}`, value: k }))}
        />
      </div>

      <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="No activity recorded yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          size="small"
        />
      </Card>
    </div>
  )
}
