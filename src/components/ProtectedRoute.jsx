import { Navigate } from 'react-router-dom'
import AccountRestricted from './AccountRestricted'
import { getEffectiveStatus } from '../services/userService'

function ProtectedRoute({
  session,
  profile,
  sessionLoading,
  profileLoading,
  allowedRole,
  children
}) {
  // 1. Vérification du chargement
  if (sessionLoading || profileLoading) {
    return (
      <div className="auth-loading">
        <p>Vérification de votre accès...</p>
      </div>
    )
  }

  // 2. Vérification de la connexion
  if (!session) {
    return <Navigate to="/" replace />
  }

  // 3. Vérification du profil
  if (!profile || profile.id !== session.user.id) {
    return (
      <div className="auth-error">
        <h2>Profil introuvable</h2>

        <p>
          Impossible de récupérer votre profil.
          Contactez l'administrateur.
        </p>
      </div>
    )
  }

  // 4. Vérification du rôle
  if (!['admin', 'user'].includes(profile.role)) {
    return (
      <div className="auth-error">
        <h2>Accès refusé</h2>
        <p>Votre rôle utilisateur est invalide.</p>
      </div>
    )
  }

  // 5. Vérification du statut du compte
  const accountStatus = getEffectiveStatus(profile)

  // Bloquer les comptes suspendus ou bannis
  if (accountStatus !== 'active') {
    return <AccountRestricted profile={profile} />
  }

  // 6. Vérification des autorisations
  if (allowedRole && profile.role !== allowedRole) {
    return (
      <Navigate
        to={profile.role === 'admin' ? '/admin' : '/user'}
        replace
      />
    )
  }

  // 7. Accès autorisé
  return children
}

export default ProtectedRoute