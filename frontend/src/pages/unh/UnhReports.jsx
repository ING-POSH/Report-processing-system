import { useState, useEffect } from 'react'
import {
  Tabs, Table, Button, Modal, Form, Input, Select, Upload, Tag, Space, Typography,
  message, Empty, Tooltip, Badge
} from 'antd'
import {
  PlusOutlined, UploadOutlined, FilePdfOutlined, FileTextOutlined,
  EyeOutlined, DeleteOutlined
} from '@ant-design/icons'
import { reportAPI } from '../../api/client'
import useAuthStore from '../../store/authStore'

const { Title, Text } = Typography
const { TextArea } = Input

const CATEGORIES = [
  { key: 'biweekly', label: 'Biweekly Reports', color: 'purple' },
  { key: 'monthly', label: 'Monthly Reports', color: 'blue' },
  { key: 'field', label: 'Field Reports', color: 'green' },
  { key: 'meeting_minutes', label: 'Meeting Minutes', color: 'orange' },
]

const STAKEHOLDER_OPTIONS = [
  { label: 'Traders', value: 'trader' },
  { label: 'Street Vendors', value: 'street_vendor' },
  { label: 'Residents', value: 'resident' },
  { label: 'Urban Regen Team', value: 'urban_regen_team' },
]

const stakeholderColor = { trader: 'gold', street_vendor: 'orange', resident: 'blue', urban_regen_team: 'purple' }

export default function UnhReports() {
  const { organization, getSpace } = useAuthStore()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('biweekly')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const spaceId = getSpace('unh_internal')?.id

  const load = () => {
    if (!organization?.id) return
    setLoading(true)
    reportAPI.list({ organization_id: organization.id, report_category: activeCategory })
      .then(r => setReports(r.data.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [organization, activeCategory])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      const payload = {
        ...values,
        organization_id: organization.id,
        report_category: activeCategory,
        space_id: spaceId,
      }
      await reportAPI.create(payload)
      message.success('Report submitted successfully')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch {
      message.error('Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: 'Title', dataIndex: 'title', key: 'title',
      render: (text) => <Text strong><FileTextOutlined style={{ marginRight: 6, color: '#722ed1' }} />{text}</Text>
    },
    {
      title: 'Stakeholder', dataIndex: 'stakeholder_type', key: 'stakeholder_type',
      render: (val) => val ? <Tag color={stakeholderColor[val] || 'default'}>{STAKEHOLDER_OPTIONS.find(s => s.value === val)?.label || val}</Tag> : <Text type="secondary">—</Text>
    },
    {
      title: 'Period / Location', dataIndex: 'location', key: 'location',
      render: (val, row) => (
        <Space direction="vertical" size={0}>
          {row.period && <Text style={{ fontSize: 12 }}>{row.period}</Text>}
          {val && <Text type="secondary" style={{ fontSize: 12 }}>{val}</Text>}
        </Space>
      )
    },
    {
      title: 'Submitted', dataIndex: 'created_at', key: 'created_at',
      render: (val) => val ? new Date(val).toLocaleDateString() : '—',
      width: 120
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, row) => (
        <Space>
          <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} size="small" /></Tooltip>
        </Space>
      )
    }
  ]

  const tabItems = CATEGORIES.map(cat => ({
    key: cat.key,
    label: (
      <span>
        <Badge count={activeCategory === cat.key ? reports.length : null} size="small" offset={[6, 0]}
          style={{ backgroundColor: cat.color === 'purple' ? '#722ed1' : undefined }}>
          {cat.label}
        </Badge>
      </span>
    ),
    children: (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text type="secondary">{cat.label} for the urban regeneration programme</Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
            New Report
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="No reports yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="small"
        />
      </div>
    )
  }))

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>Reports</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Submit and manage biweekly, monthly, field, and meeting minute reports.
      </Text>

      <Tabs
        activeKey={activeCategory}
        onChange={setActiveCategory}
        items={tabItems}
        type="card"
        style={{ background: '#fff', padding: '16px', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      />

      <Modal
        title={`New ${CATEGORIES.find(c => c.key === activeCategory)?.label}`}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="Submit Report"
        okButtonProps={{ style: { backgroundColor: '#722ed1', borderColor: '#722ed1' } }}
        width={580}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Report Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Biweekly progress – Week 14" />
          </Form.Item>
          <Form.Item name="stakeholder_type" label="Primary Stakeholder">
            <Select placeholder="Select stakeholder group" allowClear options={STAKEHOLDER_OPTIONS} />
          </Form.Item>
          <Form.Item name="period" label="Reporting Period">
            <Input placeholder="e.g. 1–15 July 2025" />
          </Form.Item>
          <Form.Item name="location" label="Location / Area">
            <Input placeholder="e.g. Eastleigh, Nairobi" />
          </Form.Item>
          <Form.Item name="content" label="Report Content" rules={[{ required: true }]}>
            <TextArea rows={5} placeholder="Enter the report content or paste from transcript..." />
          </Form.Item>
          <Form.Item name="attendees" label="Attendees (if meeting minutes)">
            <Input placeholder="e.g. John, Jane, Ahmed" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
