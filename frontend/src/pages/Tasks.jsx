import {
  Card, Table, Tag, Button, Modal, Form, Input, Select, DatePicker,
  Typography, Space, message, Spin, Empty, Badge
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { taskAPI, workspaceAPI, orgAPI } from '../api/client'
import useAuthStore from '../store/authStore'

const { Title, Text } = Typography
const { TextArea } = Input

const priorityColor = { low: 'green', medium: 'orange', high: 'red' }
const statusColor = { open: 'blue', in_progress: 'gold', completed: 'green', cancelled: 'default' }
const stakeholderLabel = {
  trader: 'Trader', street_vendor: 'Street Vendor',
  resident: 'Resident', urban_regen_team: 'Urban Regen Team',
}

export default function Tasks() {
  const { organization, user } = useAuthStore()
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()

  const canCreate = ['admin', 'team_lead'].includes(user?.role)

  const load = () => {
    if (!organization?.id) return
    Promise.all([
      taskAPI.list({ organization_id: organization.id }),
      orgAPI.getMembers(organization.id),
      workspaceAPI.list(),
    ]).then(([tRes, mRes, wRes]) => {
      setTasks(tRes.data.tasks || [])
      setMembers(mRes.data.members || [])
      setWorkspaces(wRes.data.workspaces || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [organization])

  const handleCreate = async (values) => {
    setCreating(true)
    try {
      await taskAPI.create({
        ...values,
        organization_id: organization.id,
        due_date: values.due_date?.toISOString(),
      })
      message.success('Task created successfully')
      form.resetFields()
      setModalOpen(false)
      load()
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await taskAPI.update(id, { status })
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t))
      message.success('Task updated')
    } catch {
      message.error('Failed to update task')
    }
  }

  const columns = [
    {
      title: 'Task',
      key: 'task',
      render: (_, r) => (
        <div>
          <Text strong style={{ display: 'block' }}>{r.title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>
        </div>
      ),
    },
    {
      title: 'Stakeholder',
      dataIndex: 'stakeholder_type',
      render: (t) => t ? <Tag color="blue">{stakeholderLabel[t] || t}</Tag> : '—',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (p) => <Tag color={priorityColor[p] || 'default'} style={{ textTransform: 'capitalize' }}>{p}</Tag>,
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignee_name',
      render: (name) => name || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s, r) => (
        <Select
          value={s}
          size="small"
          style={{ width: 130 }}
          onChange={(val) => handleStatusChange(r.id, val)}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      ),
    },
    {
      title: 'Due',
      dataIndex: 'due_date',
      render: (d) => d ? new Date(d).toLocaleDateString() : '—',
    },
  ]

  const openCount = tasks.filter((t) => t.status === 'open').length
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length

  return (
    <div>
      <div style={styles.header}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Task Management</Title>
          <Text type="secondary">
            Assign and track field activities by stakeholder group.
          </Text>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Task
          </Button>
        )}
      </div>

      {/* Summary badges */}
      <Space style={{ marginBottom: 16 }}>
        <Badge count={openCount} color="#1890ff" showZero>
          <Tag style={{ padding: '4px 12px', fontSize: 13 }}>Open</Tag>
        </Badge>
        <Badge count={inProgressCount} color="#faad14" showZero>
          <Tag style={{ padding: '4px 12px', fontSize: 13 }}>In Progress</Tag>
        </Badge>
        <Badge count={tasks.filter(t => t.status === 'completed').length} color="#52c41a" showZero>
          <Tag style={{ padding: '4px 12px', fontSize: 13 }}>Completed</Tag>
        </Badge>
      </Space>

      <Card bordered={false} style={styles.card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
        ) : tasks.length === 0 ? (
          <Empty description="No tasks yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table dataSource={tasks} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
        )}
      </Card>

      <Modal
        title="Create New Task"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Conduct trader consultation in Zone 3" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Describe what needs to be done..." />
          </Form.Item>

          <Form.Item name="workspace_id" label="Workspace" rules={[{ required: true }]}>
            <Select placeholder="Select workspace"
              options={workspaces.map(w => ({ value: w.id, label: w.name }))} />
          </Form.Item>

          <Form.Item name="stakeholder_type" label="Stakeholder Group">
            <Select placeholder="Who does this task relate to?">
              <Select.Option value="trader">Trader / Informal Market Operator</Select.Option>
              <Select.Option value="street_vendor">Street Vendor</Select.Option>
              <Select.Option value="resident">Resident</Select.Option>
              <Select.Option value="urban_regen_team">Urban Regeneration Team</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="assigned_to" label="Assign To">
            <Select placeholder="Select team member"
              options={members.map(m => ({ value: m.user_id, label: m.name || m.email }))} />
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select>
              <Select.Option value="low">Low</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="high">High</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="due_date" label="Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creating}>Create Task</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  card: { borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
}
