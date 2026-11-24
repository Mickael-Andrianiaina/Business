import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import './Admin.css'

export default function AdminLayout({ profile, children }) {
  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <AdminHeader profile={profile} />

        <section className="admin-content">
          {children ?? <Outlet />}
        </section>
      </main>
    </div>
  )
}