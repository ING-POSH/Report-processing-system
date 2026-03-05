import { useState, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space, Typography,
  message, Empty, Card, Row, Col, Progress
} from 'antd'
import { PlusOutlined, FolderOpenOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { projectAPI } from '../../api/client'
import useAuthStore from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
]

const RISK_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const statusColor = { active: 'processing', completed: 'success', on_hold: 'warning' }
const statusLabel = { active: 'Active', completed: 'Completed', on_hold: 'On Hold' }
const riskColor = { low: 'green', medium: 'orange', high: 'red' }

export default function Projects() {
  const { organization, getSpace } = useAuthStore()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const spaceId = getSpace('partner_projects')?.id

  const load = () => {
    if (!organization?.id) return
    setLoading(true)
    projectAPI.list({ organization_id: organization.id })
      .then(r => setProjects(r.data.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [organization])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await projectAPI.create({
        ...values,
        organization_id: organization.id,
        space_id: spaceId,
        start_date: values.start_date ? values.start_date.toISOString() : null,
        end_date: values.end_date ? values.end_date.toISOString() : null,
      })
      message.success('Project created')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch {
      message.error('Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: 'Project', dataIndex: 'name', key: 'name',
      render: (text, row) => (
        <Space direction="vertical" size={0}>
          <Text strong><FolderOpenOutlined style={{ marginRight: 6, color: '#d4a017' }} />{text}</Text>
          {row.description && <Text type="secondary" style={{ fontSize: 12 }}>{row.description.substring(0, 80)}{row.description.length > 80 ? '...' : ''}</Text>}
        </Space>
      )
    },
    {
      title: 'Partner', key: 'partner', width: 160,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{row.partner_name || '—'}</Text>
          {row.partner_org && <Text type="secondary" style={{ fontSize: 12 }}>{row.partner_org}</Text>}
        </Space>
      )
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (val) => <Tag color={statusColor[val] || 'default'}>{statusLabel[val] || val}</Tag>
    },
    {
      title: 'Risk', dataIndex: 'risk_level', key: 'risk_level', width: 90,
      render: (val) => val ? <Tag color={riskColor[val]}>{val.charAt(0).toUpperCase() + val.slice(1)}</Tag> : '—'
    },
    {
      title: 'Timeline', key: 'timeline', width: 160,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          {row.start_date && <Text style={{ fontSize: 12 }}>From: {dayjs(row.start_date).format('D MMM YYYY')}</Text>}
          {row.end_date && <Text type="secondary" style={{ fontSize: 12 }}>To: {dayjs(row.end_date).format('D MMM YYYY')}</Text>}
        </Space>
      )
    },
    {
      title: '', key: 'action', width: 50,
      render: (_, row) => (
        <Button
          type="text"
          icon={<ArrowRightOutlined style={{ color: '#d4a017' }} />}
          onClick={() => navigate(`/partner/projects/${row.id}`)}
        />
      )
    }
  ]

  const active = projects.filter(p => p.status === 'active').length
  const completed = projects.filter(p => p.status === 'completed').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>Projects</Title>
          <Text type="secondary">Manage all partner projects, track progress and risks.</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          style={{ backgroundColor: '#d4a017', borderColor: '#d4a017' }}
        >
          New Project
        </Button>
      </div>

      {projects.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {[
            { label: 'Total', value: projects.length, color: '#d4a017' },
            { label: 'Active', value: active, color: '#52c41a' },
            { label: 'Completed', value: completed, color: '#1890ff' },
            { label: 'On Hold', value: projects.length - active - completed, color: '#fa8c16' },
          ].map(s => (
            <Col key={s.label}>
              <Card size="small" bordered={false} style={{ ...styles.card, minWidth: 100, textAlign: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: 700, color: s.color, display: 'block' }}>{s.value}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card bordered={false} style={styles.card}>
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="No projects yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={row => ({ onClick: () => navigate(`/partner/projects/${row.id}`) })}
          rowClassName={() => 'clickable-row'}
          size="small"
        />
      </Card>

      <Modal
        title="Create New Project"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="Create Project"
        okButtonProps={{ style: { backgroundColor: '#d4a017', borderColor: '#d4a017' } }}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
          <Form.Item name="name" label="Project Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Nairobi CBD Regeneration Phase 2" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Project objectives and scope..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="partner_name" label="Lead Partner Contact">
                <Input placeholder="e.g. John Doe" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="partner_org" label="Partner Organisation">
                <Input placeholder="e.g. City Council of Nairobi" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="status" label="Status" initialValue="active">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="risk_level" label="Risk Level" initialValue="low">
                <Select options={RISK_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="start_date" label="Start Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_date" label="End Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <style>{`.clickable-row { cursor: pointer; } .clickable-row:hover td { background: #fffbe6 !important; }`}</style>
    </div>
  )
}

const styles = {
  card: { borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
}
