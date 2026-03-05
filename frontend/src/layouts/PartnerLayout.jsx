import { Layout, Menu, Avatar, Dropdown, Typography, Space, Tag, Button } from 'antd'
import {
  DashboardOutlined, ProjectOutlined, RiseOutlined, TeamOutlined,
  LogoutOutlined, AudioOutlined, ArrowLeftOutlined, AlertOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const { Sider, Header, Content } = Layout
const { Text } = Typography

export default function PartnerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, organization, logout } = useAuthStore()
  const pathSegment = location.pathname.split('/')[2] || 'dashboard'
  const selectedKey = pathSegment === 'projects' ? 'projects' : pathSegment

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'projects', icon: <ProjectOutlined />, label: 'Projects' },
    { key: 'risks', icon: <AlertOutlined />, label: 'Risk Register' },
    { key: 'engagements', icon: <TeamOutlined />, label: 'Engagements' },
    { key: 'transcriber', icon: <AudioOutlined />, label: 'Transcriber' },
  ]

  const userMenu = {
    items: [
      { key: 'spaces', label: 'Switch Space', onClick: () => navigate('/dashboard') },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true, onClick: () => { logout(); navigate('/login') } },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} style={styles.sider}>
        <div style={styles.spaceTag}>
          <Tag color="gold" style={{ fontSize: 11 }}>PARTNER PROJECTS</Tag>
        </div>
        <div style={styles.brand}>
          <span style={{ fontSize: 20 }}>🤝</span>
          <Text strong style={{ color: '#fff', marginLeft: 8, fontSize: 14 }}>Partner Space</Text>
        </div>
        {organization && (
          <div style={styles.orgBadge}>
            <Text style={{ color: '#aaa', fontSize: 10 }}>ORGANIZATION</Text>
            <Text style={{ color: '#fff', display: 'block', fontSize: 12 }} ellipsis>
              {organization.name}
            </Text>
          </div>
        )}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(`/partner/${key}`)}
          style={{ borderRight: 0, marginTop: 8, background: 'transparent' }}
        />
        <div style={styles.switchBtn}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard')}
            size="small"
            style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ccc' }}
          >
            Switch Space
          </Button>
        </div>
      </Sider>

      <Layout>
        <Header style={styles.header}>
          <Text strong style={{ color: '#d48806' }}>Partner Projects Space</Text>
          <Dropdown menu={userMenu} placement="bottomRight" arrow>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ background: '#d48806' }}>
                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Text>{user?.full_name || user?.email}</Text>
              {user?.role && <Tag color="gold" style={{ textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</Tag>}
            </Space>
          </Dropdown>
        </Header>
        <Content style={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

const styles = {
  sider: { background: '#1a1400', boxShadow: '2px 0 8px rgba(0,0,0,0.2)' },
  spaceTag: { padding: '12px 16px 0', textAlign: 'center' },
  brand: { padding: '8px 20px 12px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  orgBadge: { padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 },
  switchBtn: { position: 'absolute', bottom: 16, left: 12, right: 12 },
  header: { background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  content: { padding: 24, background: '#fffdf0', overflowY: 'auto' },
}
