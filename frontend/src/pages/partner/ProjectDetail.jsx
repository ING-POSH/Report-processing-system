import { useState, useEffect } from 'react'
import {
  Tabs, Card, Button, Modal, Form, Input, Select, Tag, Space, Typography,
  Table, Empty, message, Breadcrumb, Descriptions, Row, Col, Spin, DatePicker, InputNumber
} from 'antd'
import {
  ArrowLeftOutlined, PlusOutlined, WarningOutlined, TeamOutlined,
  CheckCircleOutlined, EditOutlined
} from '@ant-design/icons'
import { projectAPI, riskAPI, reportAPI, taskAPI } from '../../api/client'
import useAuthStore from '../../store/authStore'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

const riskColor = { low: 'green', medium: 'orange', high: 'red' }
const statusColor = { active: 'processing', completed: 'success', on_hold: 'warning', open: 'error', mitigated: 'warning', closed: 'success', pending: 'default', in_progress: 'processing' }
const statusLabel = { active: 'Active', completed: 'Completed', on_hold: 'On Hold', open: 'Open', mitigated: 'Mitigated', closed: 'Closed', pending: 'Pending', in_progress: 'In Progress' }

const engagementTypeColor = { meeting: 'blue', consultation: 'cyan', survey: 'green', workshop: 'purple' }

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
function TasksTab({ project, organization }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const load = () => {
    taskAPI.list({ organization_id: organization.id, project_id: project.id })
      .then(r => setTasks(r.data.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [project])

  const handleSubmit = async (values) => {
    try {
      await taskAPI.create({ ...values, organization_id: organization.id, project_id: project.id })
      message.success('Task created')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch { message.error('Failed') }
  }

  const columns = [
    { title: 'Task', dataIndex: 'title', key: 'title', render: (t, r) => <Space direction="vertical" size={0}><Text strong>{t}</Text>{r.description && <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>}</Space> },
    { title: 'Assigned To', dataIndex: 'assigned_to', key: 'assigned_to', width: 140, render: v => v || <Text type="secondary">—</Text> },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 90, render: v => v ? <Tag color={riskColor[v] || 'default'}>{v}</Tag> : '—' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 150,
      render: (val, row) => (
        <Select value={val} size="small" style={{ width: 130 }}
          onChange={v => taskAPI.update(row.id, { status: v }).then(load)}
          options={[{ label: 'Pending', value: 'pending' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Completed', value: 'completed' }]}
        />
      )
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ backgroundColor: '#d4a017', borderColor: '#d4a017' }}>Add Task</Button>
      </div>
      <Table columns={columns} dataSource={tasks} rowKey="id" loading={loading} size="small"
        locale={{ emptyText: <Empty description="No tasks" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} pagination={false} />
      <Modal title="Add Task" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields() }} onOk={() => form.submit()} okButtonProps={{ style: { backgroundColor: '#d4a017', borderColor: '#d4a017' } }} okText="Create">
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="assigned_to" label="Assign To"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="priority" label="Priority"><Select options={[{ label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }]} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({ project, organization }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const load = () => {
    reportAPI.list({ organization_id: organization.id, project_id: project.id })
      .then(r => setReports(r.data.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [project])

  const handleSubmit = async (values) => {
    try {
      await reportAPI.create({ ...values, organization_id: organization.id, project_id: project.id })
      message.success('Report submitted')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch { message.error('Failed') }
  }

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', render: t => <Text strong>{t}</Text> },
    { title: 'Period', dataIndex: 'period', key: 'period', width: 130, render: v => v || '—' },
    { title: 'Submitted', dataIndex: 'created_at', key: 'created_at', width: 110, render: v => v ? dayjs(v).format('D MMM YYYY') : '—' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ backgroundColor: '#d4a017', borderColor: '#d4a017' }}>Upload Report</Button>
      </div>
      <Table columns={columns} dataSource={reports} rowKey="id" loading={loading} size="small"
        locale={{ emptyText: <Empty description="No reports" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} pagination={false} />
      <Modal title="Upload Report" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields() }} onOk={() => form.submit()} okButtonProps={{ style: { backgroundColor: '#d4a017', borderColor: '#d4a017' } }} okText="Submit">
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Report Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="period" label="Reporting Period"><Input placeholder="e.g. Q2 2025" /></Form.Item>
          <Form.Item name="content" label="Report Content" rules={[{ required: true }]}><TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Risks Tab ─────────────────────────────────────────────────────────────────
function RisksTab({ project, organization }) {
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const load = () => {
    projectAPI.risks(project.id)
      .then(r => setRisks(r.data.risks || []))
      .catch(() => setRisks([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [project])

  const handleSubmit = async (values) => {
    try {
      await projectAPI.createRisk(project.id, values)
      message.success('Risk logged')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch { message.error('Failed') }
  }

  const columns = [
    { title: 'Risk', dataIndex: 'title', key: 'title', render: (t, r) => <Space direction="vertical" size={0}><Text strong>{t}</Text>{r.description && <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>}</Space> },
    { title: 'Likelihood', dataIndex: 'likelihood', key: 'likelihood', width: 100, render: v => v ? <Tag color={riskColor[v]}>{v}</Tag> : '—' },
    { title: 'Impact', dataIndex: 'impact', key: 'impact', width: 90, render: v => v ? <Tag color={riskColor[v]}>{v}</Tag> : '—' },
    { title: 'Mitigation', dataIndex: 'mitigation_plan', key: 'mitigation_plan', render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v || '—'}</Text> },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 140,
      render: (val, row) => (
        <Select value={val} size="small" style={{ width: 120 }}
          onChange={v => riskAPI.update(row.id, { status: v }).then(load)}
          options={[{ label: 'Open', value: 'open' }, { label: 'Mitigated', value: 'mitigated' }, { label: 'Closed', value: 'closed' }]}
        />
      )
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" size="small" icon={<WarningOutlined />} onClick={() => setModalOpen(true)} style={{ backgroundColor: '#d4a017', borderColor: '#d4a017' }}>Log Risk</Button>
      </div>
      <Table columns={columns} dataSource={risks} rowKey="id" loading={loading} size="small"
        locale={{ emptyText: <Empty description="No risks logged" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} pagination={false} />
      <Modal title="Log Risk" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields() }} onOk={() => form.submit()} okButtonProps={{ style: { backgroundColor: '#d4a017', borderColor: '#d4a017' } }} okText="Log Risk">
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Risk Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="likelihood" label="Likelihood"><Select options={[{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="impact" label="Impact"><Select options={[{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }]} /></Form.Item></Col>
          </Row>
          <Form.Item name="mitigation_plan" label="Mitigation Plan"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Engagements Tab ───────────────────────────────────────────────────────────
function EngagementsTab({ project, organization, user }) {
  const [engagements, setEngagements] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const load = () => {
    projectAPI.engagements(project.id)
      .then(r => setEngagements(r.data.engagements || []))
      .catch(() => setEngagements([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [project])

  const handleSubmit = async (values) => {
    try {
      await projectAPI.createEngagement(project.id, {
        ...values,
        engaged_by: user.id,
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
      })
      message.success('Engagement logged')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch { message.error('Failed') }
  }

  const columns = [
    { title: 'Stakeholder', dataIndex: 'stakeholder_name', key: 'stakeholder_name', render: (n, r) => <Space direction="vertical" size={0}><Text strong>{n}</Text>{r.stakeholder_type && <Text type="secondary" style={{ fontSize: 12 }}>{r.stakeholder_type}</Text>}</Space> },
    { title: 'Type', dataIndex: 'engagement_type', key: 'engagement_type', width: 120, render: v => <Tag color={engagementTypeColor[v] || 'default'}>{v}</Tag> },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v || '—'}</Text> },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: v => v ? dayjs(v).format('D MMM YYYY') : '—' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" size="small" icon={<TeamOutlined />} onClick={() => setModalOpen(true)} style={{ backgroundColor: '#d4a017', borderColor: '#d4a017' }}>Log Engagement</Button>
      </div>
      <Table columns={columns} dataSource={engagements} rowKey="id" loading={loading} size="small"
        locale={{ emptyText: <Empty description="No engagements logged" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} pagination={false} />
      <Modal title="Log Stakeholder Engagement" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields() }} onOk={() => form.submit()} okButtonProps={{ style: { backgroundColor: '#d4a017', borderColor: '#d4a017' } }} okText="Log">
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="stakeholder_name" label="Stakeholder Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="stakeholder_type" label="Stakeholder Type"><Input placeholder="e.g. Trader, Resident" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="engagement_type" label="Engagement Type" rules={[{ required: true }]}>
                <Select options={[{ label: 'Meeting', value: 'meeting' }, { label: 'Consultation', value: 'consultation' }, { label: 'Survey', value: 'survey' }, { label: 'Workshop', value: 'workshop' }]} />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="date" label="Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Notes"><TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams()
  const { organization, user } = useAuthStore()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    projectAPI.get(id)
      .then(r => setProject(r.data.project || r.data))
      .catch(() => message.error('Project not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (!project) return <Empty description="Project not found" />

  const tabItems = [
    { key: 'tasks', label: 'Tasks', children: <TasksTab project={project} organization={organization} /> },
    { key: 'reports', label: 'Reports', children: <ReportsTab project={project} organization={organization} /> },
    { key: 'risks', label: 'Risk Register', children: <RisksTab project={project} organization={organization} /> },
    { key: 'engagements', label: 'Stakeholder Engagements', children: <EngagementsTab project={project} organization={organization} user={user} /> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/partner/projects')} style={{ marginBottom: 8, color: '#d4a017' }}>
          Back to Projects
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>{project.name}</Title>
            <Space>
              <Tag color={statusColor[project.status] || 'default'}>{statusLabel[project.status] || project.status}</Tag>
              {project.risk_level && <Tag color={riskColor[project.risk_level]}>Risk: {project.risk_level}</Tag>}
              {project.partner_name && <Text type="secondary" style={{ fontSize: 13 }}>{project.partner_name}{project.partner_org ? ` · ${project.partner_org}` : ''}</Text>}
            </Space>
          </div>
        </div>
        {project.description && (
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{project.description}</Text>
        )}
        {(project.start_date || project.end_date) && (
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            {project.start_date && `Start: ${dayjs(project.start_date).format('D MMM YYYY')}`}
            {project.start_date && project.end_date && ' → '}
            {project.end_date && `End: ${dayjs(project.end_date).format('D MMM YYYY')}`}
          </Text>
        )}
      </div>

      <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Tabs items={tabItems} type="line" />
      </Card>
    </div>
  )
}
