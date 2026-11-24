
import { Navigate } from 'react-router-dom'

export default function AdminProtectedRoute({
  session,
  profile,
  sessionLoading,
  profileLoading,
  children
}) {
  if (sessionLoading || profileLoading) {
    return <p>Vérification des accès...</p>
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/user" replace />
  }

  return children
}
