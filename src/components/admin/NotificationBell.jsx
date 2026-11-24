
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'

import useNotifications from '../../hooks/useNotifications'

import './NotificationBell.css'

export default function NotificationBell({ userId }) {
  const {
    unreadCount,
    connected,
    error
  } = useNotifications(userId)

  const label = error
    ? 'Notifications - compteur indisponible'
    : `Notifications : ${unreadCount} non lue(s)`

  return (
    <Link
      to="/admin/notifications"
      className="admin-icon-button notification-bell"
      aria-label={label}
      title={label}
    >
      <Bell size={19} strokeWidth={1.8} />

      {unreadCount > 0 && (
        <span className="notification-bell-count">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {connected && !error && (
        <span
          className="notification-bell-live"
          aria-hidden="true"
        />
      )}
    </Link>
  )
}
