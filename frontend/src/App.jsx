import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SpaceSelector from './pages/SpaceSelector'

// UNH Space
import UnhLayout from './layouts/UnhLayout'
import UnhDashboard from './pages/unh/UnhDashboard'
import UnhReports from './pages/unh/UnhReports'
import UnhTasks from './pages/unh/UnhTasks'
import ActivityLog from './pages/unh/ActivityLog'
import UnhTeam from './pages/unh/UnhTeam'
import UnhTranscriber from './pages/unh/UnhTranscriber'

// Partner Space
import PartnerLayout from './layouts/PartnerLayout'
import PartnerDashboard from './pages/partner/PartnerDashboard'
import Projects from './pages/partner/Projects'
import ProjectDetail from './pages/partner/ProjectDetail'
import PartnerTranscriber from './pages/partner/PartnerTranscriber'

import useAuthStore from './store/authStore'

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#667eea', borderRadius: 8 } }}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Space Selector */}
        <Route path="/dashboard" element={<PrivateRoute><SpaceSelector /></PrivateRoute>} />

        {/* UNH Internal Space */}
        <Route path="/unh" element={<PrivateRoute><UnhLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<UnhDashboard />} />
          <Route path="reports" element={<UnhReports />} />
          <Route path="tasks" element={<UnhTasks />} />
          <Route path="activity" element={<ActivityLog />} />
          <Route path="team" element={<UnhTeam />} />
          <Route path="transcriber" element={<UnhTranscriber />} />
        </Route>

        {/* Partner Projects Space */}
        <Route path="/partner" element={<PrivateRoute><PartnerLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PartnerDashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="transcriber" element={<PartnerTranscriber />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ConfigProvider>
  )
}
