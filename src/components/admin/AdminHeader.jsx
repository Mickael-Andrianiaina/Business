
import { useState, useRef } from 'react'

import { useNavigate } from 'react-router-dom'

import {
  ShieldCheck,
  LogOut,
  LoaderCircle
} from 'lucide-react'

import { supabase } from '../../services/supabase'

import {
  recordAuthActivity
} from '../../services/activityService'

import NotificationBell from './NotificationBell'

// ==========================================
// BIZINA IPHONE - ADMIN HEADER V7
// NOTIFICATIONS REALTIME
// AUTHENTIFICATION ET JOURNAL D'ACTIVITE
// ==========================================

export default function AdminHeader({ profile }) {

  const navigate = useNavigate()

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const logoutLock = useRef(false)

  // ========================================
  // INFORMATIONS ADMINISTRATEUR
  // ========================================

  const fullName =
    profile?.full_name?.trim() ||
    'Administrateur'

  const initials = fullName

    .split(/\s+/)

    .slice(0, 2)

    .map(word => word[0])

    .join('')

    .toUpperCase()

  // ========================================
  // DECONNEXION SECURISEE
  // ADMIN V7
  // ========================================

  async function handleLogout() {

    // Protection contre les doubles clics.

    if (logoutLock.current) return

    logoutLock.current = true

    setLoading(true)

    setError('')

    try {

      // ====================================
      // JOURNAL D'ACTIVITE - ADMIN V7
      // ====================================

      // L'événement doit être déclaré avant
      // la suppression de la session.

      try {

        await recordAuthActivity(
          'logout_requested'
        )

      } catch (auditError) {

        // Une erreur du journal ne doit pas
        // empêcher la déconnexion.

        console.warn(
          'Journal de déconnexion :',
          auditError.message
        )

      }

      // ====================================
      // DECONNEXION SUPABASE
      // ====================================

      const { error: logoutError } =
        await supabase.auth.signOut()

      if (logoutError) {

        throw logoutError

      }

      // ====================================
      // REDIRECTION VERS LOGIN
      // ====================================

      navigate('/', {
        replace: true
      })

    } catch (err) {

      setError(
        'Déconnexion impossible. Veuillez réessayer.'
      )

      console.error(
        'Erreur de déconnexion :',
        err.message
      )

    } finally {

      logoutLock.current = false

      setLoading(false)

    }
  }

  // ========================================
  // INTERFACE ADMINISTRATEUR
  // ========================================

  return (

    <header className="admin-header">

      {/* ==================================
          TITRE DU HEADER
      ================================== */}

      <div className="admin-header-title">

        <span className="admin-header-label">

          Bizina Iphone

        </span>

        <h2>

          Espace administrateur

        </h2>

      </div>

      {/* ==================================
          ACTIONS ADMINISTRATEUR
      ================================== */}

      <div className="admin-header-user">

        {/* NOTIFICATIONS REALTIME V6 */}

        <NotificationBell
          userId={profile?.id}
        />

        {/* PROFIL ADMINISTRATEUR */}

        <div className="admin-profile">

          {/* AVATAR */}

          <div
            className="admin-user-avatar"
            aria-hidden="true"
          >

            {initials}

          </div>

          {/* INFORMATIONS */}

          <div className="admin-user-info">

            <strong title={fullName}>

              {fullName}

            </strong>

            <span>

              <ShieldCheck
                size={13}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              Administrateur

            </span>

          </div>

        </div>

        {/* ==================================
            BOUTON DE DECONNEXION V7
        ================================== */}

        <button

          type="button"

          className="admin-logout-btn"

          onClick={handleLogout}

          disabled={loading}

          aria-busy={loading}

          aria-label={
            loading
              ? 'Déconnexion en cours'
              : 'Déconnexion'
          }

          title={
            loading
              ? 'Déconnexion en cours'
              : 'Se déconnecter'
          }

        >

          {loading ? (

            <LoaderCircle

              size={18}

              strokeWidth={1.8}

              className="admin-spin"

              aria-hidden="true"

            />

          ) : (

            <LogOut

              size={18}

              strokeWidth={1.8}

              aria-hidden="true"

            />

          )}

          <span>

            {loading
              ? 'Déconnexion…'
              : 'Déconnexion'}

          </span>

        </button>

      </div>

      {/* ==================================
          MESSAGE D'ERREUR
      ================================== */}

      {error && (

        <div

          className="admin-header-error"

          role="alert"

        >

          {error}

        </div>

      )}

    </header>

  )
}
