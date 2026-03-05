import { useState, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space, Typography,
  message, Empty, Tooltip, Card, Row, Col, Progress, Badge
} from 'antd'
import {
  PlusOutlined, CheckOutlined, ClockCircleOutlined, UserOutlined,
  CalendarOutlined, ReloadOutlined
} from '@ant-design/icons'
import { taskAPI } from '../../api/client'
import useAuthStore from '../../store/authStore'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek.js'

dayjs.extend(isoWeek)

const { Title, Text } = Typography
const { TextArea } = Input

const PRIORITY_OPTIONS = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

const priorityColor = { high: 'red', medium: 'orange', low: 'green' }

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
]

const statusColor = { pending: 'default', in_progress: 'processing', completed: 'success' }
const statusLabel = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }

function WeekNav({ weekOf, onChange }) {
  return (
    <Space>
      <Button size="small" onClick={() => onChange(dayjs(weekOf).subtract(1, 'week'))}>‹ Prev</Button>
      <Text strong style={{ minWidth: 160, textAlign: 'center', display: 'inline-block' }}>
        Week of {dayjs(weekOf).startOf('isoWeek').format('D MMM')} – {dayjs(weekOf).endOf('isoWeek').format('D MMM YYYY')}
      </Text>
      <Button size="small" onClick={() => onChange(dayjs(weekOf).add(1, 'week'))}>Next ›</Button>
      <Button size="small" icon={<ReloadOutlined />} onClick={() => onChange(dayjs())}>This Week</Button>
    </Space>
  )
}

export default function UnhTasks() {
  const { organization, user } = useAuthStore()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOf, setWeekOf] = useState(dayjs())
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const load = () => {
    if (!organization?.id) return
    setLoading(true)
    const weekStart = dayjs(weekOf).startOf('isoWeek').toISOString()
    taskAPI.list({ organization_id: organization.id, week_of: weekStart })
      .then(r => setTasks(r.data.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [organization, weekOf])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await taskAPI.create({
        ...values,
        organization_id: organization.id,
        week_of: dayjs(weekOf).startOf('isoWeek').toISOString(),
        due_date: values.due_date ? values.due_date.toISOString() : null,
      })
      message.success('Task created')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch {
      message.error('Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.update(taskId, { status: newStatus })
      message.success('Status updated')
      load()
    } catch {
      message.error('Failed to update status')
    }
  }

  const pending = tasks.filter(t => t.status === 'pending')
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const completed = tasks.filter(t => t.status === 'completed')
  const completionRate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0

  const columns = [
    {
      title: 'Task', dataIndex: 'title', key: 'title',
      render: (text, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {row.description && <Text type="secondary" style={{ fontSize: 12 }}>{row.description}</Text>}
        </Space>
      )
    },
    {
      title: 'Assigned To', dataIndex: 'assigned_to', key: 'assigned_to', width: 140,
      render: (val) => val ? <Space><UserOutlined /><Text style={{ fontSize: 13 }}>{val}</Text></Space> : <Text type="secondary">Unassigned</Text>
    },
    {
      title: 'Priority', dataIndex: 'priority', key: 'priority', width: 100,
      render: (val) => <Tag color={priorityColor[val] || 'default'}>{val || '—'}</Tag>
    },
    {
      title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 110,
      render: (val) => val ? (
        <Space size={4}>
          <CalendarOutlined style={{ fontSize: 11, color: '#999' }} />
          <Text style={{ fontSize: 12 }}>{dayjs(val).format('D MMM')}</Text>
        </Space>
      ) : '—'
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 150,
      render: (val, row) => (
        <Select
          value={val}
          size="small"
          style={{ width: 130 }}
          onChange={(v) => handleStatusChange(row.id, v)}
          options={STATUS_OPTIONS}
        />
      )
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>Weekly Tasks</Title>
          <Text type="secondary">Assign and track weekly activities for the urban regeneration team.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}
          style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
          Add Task
        </Button>
      </div>

      <Card bordered={false} style={styles.card} bodyStyle={{ paddingBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <WeekNav weekOf={weekOf} onChange={setWeekOf} />
          <Space>
            <Badge status="error" text={`${pending.length} Pending`} />
            <Badge status="processing" text={`${inProgress.length} In Progress`} />
            <Badge status="success" text={`${completed.length} Done`} />
          </Space>
        </div>
        {tasks.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Progress
              percent={completionRate}
              status={completionRate === 100 ? 'success' : 'active'}
              strokeColor="#722ed1"
              trailColor="#f0f0f0"
            />
          </div>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="No tasks for this week" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          size="small"
          style={styles.card}
        />
      </div>

      <Modal
        title="Add Weekly Task"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="Create Task"
        okButtonProps={{ style: { backgroundColor: '#722ed1', borderColor: '#722ed1' } }}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Conduct field survey in Block C" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Additional details..." />
          </Form.Item>
          <Form.Item name="assigned_to" label="Assign To">
            <Input placeholder="Team member name or ID" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="priority" label="Priority">
                <Select placeholder="Select priority" options={PRIORITY_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

const styles = {
  card: { borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: '#fff' },
}
