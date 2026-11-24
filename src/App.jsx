
import {
  useEffect,
  useState,
  useRef
} from 'react'

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom'

import {
  LoaderCircle,
  ShieldAlert,
  RefreshCw,
  LogOut
} from 'lucide-react'

import { supabase } from './services/supabase'

import './App.css'

// ==========================================
// AUTHENTIFICATION
// ==========================================

import Login from './pages/Login'
import Register from './pages/Register'

import ProtectedRoute from './components/ProtectedRoute'
import AccountRestricted from './components/AccountRestricted'

// ==========================================
// SECURITE ADMIN V9
// ==========================================

import AdminMFAGate from './components/security/AdminMFAGate'

// ==========================================
// SERVICES
// ==========================================

import {
  getEffectiveStatus
} from './services/userService'

import {
  recordAuthActivity
} from './services/activityService'

// ==========================================
// ADMINISTRATION
// ==========================================

import AdminDashboard from './pages/admin/AdminDashboard'
import ProductsModeration from './pages/admin/ProductsModeration'
import UsersManagement from './pages/admin/UsersManagement'
import CategoriesManagement from './pages/admin/CategoriesManagement'
import ReportsManagement from './pages/admin/ReportsManagement'
import Notifications from './pages/admin/Notifications'
import Analytics from './pages/admin/Analytics'
import ActivityLogs from './pages/admin/ActivityLogs'
import SecurityCenter from './pages/admin/SecurityCenter'
import AdminSettings from './pages/admin/AdminSettings'

// ==========================================
// ESPACE UTILISATEUR
// ==========================================

import UserDashboard from './pages/user/UserDashboard'

// ==========================================
// BIZINA IPHONE - APP V9
// CONFIGURATION
// ==========================================

const PROFILE_REFRESH_INTERVAL = 30000

const VALID_ROLES = [
  'admin',
  'user'
]

const VALID_ACCOUNT_STATUSES = [
  'active',
  'suspended',
  'banned'
]

const PROFILE_COLUMNS = `
  id,
  full_name,
  email,
  phone,
  avatar_url,
  role,
  account_status,
  suspension_reason,
  suspended_until,
  status_updated_at,
  created_at,
  updated_at
`

// ==========================================
// ROUTES ADMINISTRATEUR
// ==========================================

const ADMIN_ROUTES = [
  {
    path: '/admin',
    component: AdminDashboard
  },
  {
    path: '/admin/products',
    component: ProductsModeration
  },
  {
    path: '/admin/users',
    component: UsersManagement
  },
  {
    path: '/admin/categories',
    component: CategoriesManagement
  },
  {
    path: '/admin/reports',
    component: ReportsManagement
  },
  {
    path: '/admin/notifications',
    component: Notifications
  },
  {
    path: '/admin/analytics',
    component: Analytics
  },
  {
    path: '/admin/logs',
    component: ActivityLogs
  },
  {
    path: '/admin/security',
    component: SecurityCenter
  },
  {
    path: '/admin/settings',
    component: AdminSettings
  }
]

// ==========================================
// ECRAN DE CHARGEMENT
// ==========================================

function LoadingScreen({
  message = 'Vérification de votre accès...'
}) {
  return (
    <div
      className="auth-loading"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        size={36}
        className="app-loading-spinner"
        aria-hidden="true"
      />

      <h3>Bizina Iphone</h3>

      <p>{message}</p>
    </div>
  )
}

// ==========================================
// ECRAN D'ERREUR
// ==========================================

function AuthErrorScreen({
  message,
  onRetry,
  onLogout,
  logoutLoading = false
}) {
  return (
    <div className="auth-error">

      <ShieldAlert
        size={42}
        aria-hidden="true"
      />

      <h2>Accès indisponible</h2>

      <p role="alert">
        {message ||
          'Impossible de vérifier votre accès.'}
      </p>

      <div className="auth-error-actions">

        <button
          type="button"
          onClick={onRetry}
          disabled={logoutLoading}
        >
          <RefreshCw size={16} />

          Réessayer
        </button>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? (
              <LoaderCircle
                size={16}
                className="app-loading-spinner"
              />
            ) : (
              <LogOut size={16} />
            )}

            {logoutLoading
              ? 'Déconnexion...'
              : 'Se déconnecter'}
          </button>
        )}

      </div>
    </div>
  )
}

// ==========================================
// APPLICATION PRINCIPALE
// ==========================================

function AppContent() {

  const navigate = useNavigate()

  // ========================================
  // ETATS DE SESSION
  // ========================================

  const [session, setSession] =
    useState(null)

  const [profile, setProfile] =
    useState(null)

  const [sessionLoading, setSessionLoading] =
    useState(true)

  const [profileLoading, setProfileLoading] =
    useState(true)

  const [logoutLoading, setLogoutLoading] =
    useState(false)

  // ========================================
  // ETATS D'ERREUR
  // ========================================

  const [sessionError, setSessionError] =
    useState('')

  const [profileError, setProfileError] =
    useState('')

  const [logoutError, setLogoutError] =
    useState('')

  // ========================================
  // ACTUALISATION
  // ========================================

  const [sessionRefresh, setSessionRefresh] =
    useState(0)

  const [profileRefresh, setProfileRefresh] =
    useState(0)

  // ========================================
  // REFERENCES
  // ========================================

  const logoutLock = useRef(false)

  const previousUserId = useRef(null)

  // ========================================
  // IDENTITE UTILISATEUR
  // ========================================

  const userId =
    session?.user?.id || null

  const profileReady = Boolean(
    profile &&
    userId &&
    profile.id === userId
  )

  // ========================================
  // 1. GESTION DE LA SESSION SUPABASE
  // ========================================

  useEffect(() => {

    let active = true

    let authEventReceived = false

    setSessionLoading(true)

    setSessionError('')

    function applySession(newSession) {

      if (!active) return

      const nextUserId =
        newSession?.user?.id || null

      // Empêcher la réutilisation
      // du profil d'une ancienne session.

      if (
        previousUserId.current !== nextUserId
      ) {

        previousUserId.current = nextUserId

        setProfile(null)

        setProfileError('')

        setProfileLoading(
          Boolean(nextUserId)
        )
      }

      // La session est également mise à jour
      // après une vérification MFA réussie.

      setSession(newSession || null)

      setSessionError('')

      setSessionLoading(false)
    }

    // ======================================
    // ECOUTE DES EVENEMENTS AUTH
    // ======================================

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {

        if (!active) return

        authEventReceived = true

        applySession(newSession)
      }
    )

    // ======================================
    // RECUPERATION DE LA SESSION INITIALE
    // ======================================

    async function initializeSession() {

      try {

        const {
          data,
          error
        } = await supabase.auth.getSession()

        if (!active || authEventReceived) {
          return
        }

        if (error) {
          throw error
        }

        applySession(data.session)

      } catch (error) {

        if (!active || authEventReceived) {
          return
        }

        console.error(
          'Erreur session Supabase :',
          error.message
        )

        previousUserId.current = null

        setSession(null)

        setProfile(null)

        setProfileError('')

        setSessionError(
          'Impossible de vérifier votre session.'
        )

        setSessionLoading(false)

        setProfileLoading(false)
      }
    }

    initializeSession()

    // ======================================
    // NETTOYAGE
    // ======================================

    return () => {

      active = false

      subscription.unsubscribe()
    }

  }, [sessionRefresh])

  // ========================================
  // 2. RECUPERATION DU PROFIL
  // ========================================

  useEffect(() => {

    let active = true

    let requestRunning = false

    setProfile(null)

    setProfileError('')

    if (!userId) {

      setProfileLoading(false)

      return
    }

    // ======================================
    // CHARGEMENT DU PROFIL
    // ======================================

    async function loadProfile(
      initial = false
    ) {

      if (!active || requestRunning) {
        return
      }

      requestRunning = true

      if (initial) {
        setProfileLoading(true)
      }

      try {

        const {
          data,
          error
        } = await supabase

          .from('profiles')

          .select(PROFILE_COLUMNS)

          .eq('id', userId)

          .maybeSingle()

        if (!active) return

        // ==================================
        // VERIFICATION DES ERREURS
        // ==================================

        if (error) {
          throw error
        }

        if (!data) {
          throw new Error(
            'Votre profil utilisateur est introuvable.'
          )
        }

        // ==================================
        // VERIFICATION DE L'IDENTITE
        // ==================================

        if (data.id !== userId) {
          throw new Error(
            'Le profil ne correspond pas à votre session.'
          )
        }

        // ==================================
        // VERIFICATION DU ROLE
        // ==================================

        if (!VALID_ROLES.includes(data.role)) {
          throw new Error(
            'Votre rôle utilisateur est invalide.'
          )
        }

        // ==================================
        // VERIFICATION DU STATUT
        // ==================================

        if (
          !VALID_ACCOUNT_STATUSES.includes(
            data.account_status
          )
        ) {
          throw new Error(
            'Le statut de votre compte est invalide.'
          )
        }

        // ==================================
        // PROFIL VALIDE
        // ==================================

        setProfile(data)

        setProfileError('')

      } catch (error) {

        if (!active) return

        console.error(
          'Erreur de récupération du profil :',
          error.message
        )

        // En cas d'erreur, bloquer
        // l'accès aux pages protégées.

        setProfile(null)

        setProfileError(
          'Impossible de vérifier votre profil utilisateur.'
        )

      } finally {

        requestRunning = false

        if (active) {
          setProfileLoading(false)
        }
      }
    }

    // ======================================
    // CHARGEMENT INITIAL
    // ======================================

    loadProfile(true)

    // ======================================
    // ACTUALISATION TOUTES LES 30 SECONDES
    // ======================================

    const interval = setInterval(() => {
      loadProfile()
    }, PROFILE_REFRESH_INTERVAL)

    // ======================================
    // RETOUR SUR LA FENETRE
    // ======================================

    function handleFocus() {
      loadProfile()
    }

    // ======================================
    // RETOUR SUR L'ONGLET
    // ======================================

    function handleVisibility() {

      if (
        document.visibilityState === 'visible'
      ) {
        loadProfile()
      }
    }

    window.addEventListener(
      'focus',
      handleFocus
    )

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    )

    // ======================================
    // NETTOYAGE
    // ======================================

    return () => {

      active = false

      clearInterval(interval)

      window.removeEventListener(
        'focus',
        handleFocus
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      )
    }

  }, [userId, profileRefresh])

  // ========================================
  // 3. DECONNEXION CENTRALISEE
  // ========================================

  async function handleLogout() {

    if (logoutLock.current) return

    logoutLock.current = true

    setLogoutLoading(true)

    setLogoutError('')

    try {

      // ====================================
      // AUDIT ADMIN V7
      // ====================================

      if (session?.user?.id) {

        try {

          await recordAuthActivity(
            'logout_requested'
          )

        } catch (auditError) {

          console.warn(
            'Journal de déconnexion :',
            auditError.message
          )
        }
      }

      // ====================================
      // DECONNEXION SUPABASE
      // ====================================

      const { error } =
        await supabase.auth.signOut({
          scope: 'local'
        })

      if (error) {
        throw error
      }

      // ====================================
      // NETTOYAGE DE LA SESSION
      // ====================================

      previousUserId.current = null

      setSession(null)

      setProfile(null)

      setProfileError('')

      setSessionError('')

      setSessionLoading(false)

      setProfileLoading(false)

      // ====================================
      // REDIRECTION
      // ====================================

      navigate('/', {
        replace: true
      })

    } catch (error) {

      console.error(
        'Erreur déconnexion :',
        error.message
      )

      setLogoutError(
        'Impossible de se déconnecter. Veuillez réessayer.'
      )

    } finally {

      logoutLock.current = false

      setLogoutLoading(false)
    }
  }

  // ========================================
  // 4. DESTINATION SELON LE ROLE
  // ========================================

  function getDestination() {

    if (!profileReady) {
      return '/'
    }

    return profile.role === 'admin'
      ? '/admin'
      : '/user'
  }

  // ========================================
  // 5. ERREUR DE SESSION
  // ========================================

  function renderSessionError() {

    return (
      <AuthErrorScreen

        message={sessionError}

        onRetry={() =>
          setSessionRefresh(
            value => value + 1
          )
        }

      />
    )
  }

  // ========================================
  // 6. ERREUR DE PROFIL
  // ========================================

  function renderProfileError() {

    return (
      <AuthErrorScreen

        message={
          profileError ||
          'Impossible de récupérer votre profil.'
        }

        onRetry={() =>
          setProfileRefresh(
            value => value + 1
          )
        }

        onLogout={handleLogout}

        logoutLoading={logoutLoading}

      />
    )
  }

  // ========================================
  // 7. COMPTE RESTREINT
  // ========================================

  function renderRestrictedAccount() {

    return (
      <AccountRestricted

        profile={profile}

        onLogout={handleLogout}

        logoutLoading={logoutLoading}

      />
    )
  }

  // ========================================
  // 8. PAGES PUBLIQUES
  // LOGIN ET REGISTER
  // ========================================

  function renderPublicPage(Page) {

    // Vérification de la session.

    if (sessionLoading) {

      return (
        <LoadingScreen
          message="Vérification de la session..."
        />
      )
    }

    // Erreur Supabase Auth.

    if (sessionError) {
      return renderSessionError()
    }

    // Aucun utilisateur connecté.

    if (!session) {
      return <Page />
    }

    // Chargement du profil.

    if (profileLoading) {

      return (
        <LoadingScreen
          message="Chargement de votre profil..."
        />
      )
    }

    // Vérification de l'identité.

    if (!profileReady || profileError) {
      return renderProfileError()
    }

    // Vérification des restrictions.

    if (
      getEffectiveStatus(profile) !== 'active'
    ) {
      return renderRestrictedAccount()
    }

    // Redirection automatique.
    // La vérification MFA sera effectuée
    // dans protectedRoute pour les admins.

    return (
      <Navigate
        to={getDestination()}
        replace
      />
    )
  }

  // ========================================
  // 9. PROPRIETES COMMUNES
  // ========================================

  const pageProps = {

    profile,

    session,

    onLogout: handleLogout,

    logoutLoading

  }

  // ========================================
  // 10. PROTECTION DES ROUTES
  // ADMIN V9 + MFA
  // ========================================

  function protectedRoute(
    Component,
    allowedRole
  ) {

    // ======================================
    // VERIFICATION DE LA SESSION
    // ======================================

    if (sessionLoading) {

      return (
        <LoadingScreen
          message="Vérification de votre accès..."
        />
      )
    }

    if (sessionError) {
      return renderSessionError()
    }

    if (!session) {
      return <Navigate to="/" replace />
    }

    // ======================================
    // VERIFICATION DU PROFIL
    // ======================================

    if (profileLoading) {

      return (
        <LoadingScreen
          message="Chargement de votre profil..."
        />
      )
    }

    if (!profileReady || profileError) {
      return renderProfileError()
    }

    // ======================================
    // VERIFICATION DU STATUT
    // ======================================

    if (
      getEffectiveStatus(profile) !== 'active'
    ) {
      return renderRestrictedAccount()
    }

    // ======================================
    // VERIFICATION DU ROLE
    // ======================================

    if (profile.role !== allowedRole) {

      return (
        <Navigate

          to={
            profile.role === 'admin'
              ? '/admin'
              : '/user'
          }

          replace

        />
      )
    }

    // ======================================
    // ADMIN V9
    // PROTECTION MFA ADMINISTRATEUR
    // ======================================

    const content =
      allowedRole === 'admin' ? (

        <AdminMFAGate

          key={session.user.id}

          session={session}

          profile={profile}

          onLogout={handleLogout}

        >

          <Component {...pageProps} />

        </AdminMFAGate>

      ) : (

        <Component {...pageProps} />

      )

    // ======================================
    // PROTECTION COMPLEMENTAIRE
    // ======================================

    return (
      <ProtectedRoute

        session={session}

        profile={profile}

        sessionLoading={sessionLoading}

        profileLoading={profileLoading}

        allowedRole={allowedRole}

      >

        {content}

      </ProtectedRoute>
    )
  }

  // ========================================
  // 11. PAGE INCONNUE
  // ========================================

  function renderUnknownPage() {

    if (sessionLoading) {
      return <LoadingScreen />
    }

    if (sessionError) {
      return renderSessionError()
    }

    if (!session) {
      return <Navigate to="/" replace />
    }

    if (profileLoading) {
      return <LoadingScreen />
    }

    if (!profileReady || profileError) {
      return renderProfileError()
    }

    if (
      getEffectiveStatus(profile) !== 'active'
    ) {
      return renderRestrictedAccount()
    }

    return (
      <Navigate

        to={getDestination()}

        replace

      />
    )
  }

  // ========================================
  // 12. ROUTES DE L'APPLICATION
  // ========================================

  return (

    <>

      {/* ==================================
          ERREUR DE DECONNEXION
      ================================== */}

      {logoutError && (

        <div

          className="app-logout-error"

          role="alert"

        >

          <span>{logoutError}</span>

          <button

            type="button"

            onClick={() =>
              setLogoutError('')
            }

          >

            Fermer

          </button>

        </div>

      )}

      <Routes>

        {/* ==================================
            AUTHENTIFICATION
        ================================== */}

        <Route

          path="/"

          element={renderPublicPage(Login)}

        />

        <Route

          path="/login"

          element={renderPublicPage(Login)}

        />

        <Route

          path="/register"

          element={renderPublicPage(Register)}

        />

        {/* ==================================
            ADMINISTRATION V1 - V9
            TOUTES LES ROUTES PROTEGEES MFA
        ================================== */}

        {ADMIN_ROUTES.map(

          ({ path, component }) => (

            <Route

              key={path}

              path={path}

              element={protectedRoute(
                component,
                'admin'
              )}

            />

          )

        )}

        {/* ==================================
            ESPACE UTILISATEUR
        ================================== */}

        <Route

          path="/user"

          element={protectedRoute(
            UserDashboard,
            'user'
          )}

        />

        {/* ==================================
            REDIRECTION DASHBOARD
        ================================== */}

        <Route

          path="/dashboard"

          element={renderUnknownPage()}

        />

        {/* ==================================
            PAGE INCONNUE
        ================================== */}

        <Route

          path="*"

          element={renderUnknownPage()}

        />

      </Routes>

    </>

  )
}

// ==========================================
// APPLICATION PRINCIPALE
// ==========================================

function App() {

  return (

    <BrowserRouter>

      <AppContent />

    </BrowserRouter>

  )
}

export default App
