
import {
  useEffect,
  useRef,
  useState
} from 'react'

import { Link } from 'react-router-dom'

import {
  ShieldCheck,
  ShieldAlert,
  LockKeyhole,
  Smartphone,
  Fingerprint,
  Monitor,
  RefreshCw,
  Plus,
  Trash2,
  LogOut,
  History,
  Clock,
  CheckCircle2,
  LoaderCircle,
  ArrowUpRight,
  X
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import MFASetup from '../../components/security/MFASetup'

import {
  getSecurityStatus,
  getMFAFactors,
  getSecurityEvents,
  removeMFAFactor,
  revokeOtherSessions,
  SECURITY_ACTIONS,
  formatSecurityDate
} from '../../services/securityService'

import './AdminV9.css'

// ==========================================
// COMPOSANTS
// ==========================================

function SecurityCard({
  icon: Icon,
  label,
  value,
  description,
  color = 'blue'
}) {
  return (
    <article className="av9-stat-card">

      <div className={`av9-stat-icon ${color}`}>
        <Icon size={23} />
      </div>

      <span>{label}</span>

      <strong>{value}</strong>

      <small>{description}</small>

    </article>
  )
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  children
}) {
  return (
    <section className="av9-panel">

      <div className="av9-panel-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        <Icon size={22} />
      </div>

      {children}

    </section>
  )
}

// ==========================================
// PAGE SECURITY CENTER
// ==========================================

export default function SecurityCenter({
  profile,
  onLogout,
  logoutLoading
}) {
  const [status, setStatus] = useState(null)
  const [factors, setFactors] = useState([])
  const [events, setEvents] = useState([])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showSetup, setShowSetup] = useState(false)
  const [confirmation, setConfirmation] =
    useState(null)

  const [refresh, setRefresh] = useState(0)

  const actionLock = useRef(false)

  // ========================================
  // CHARGEMENT
  // ========================================

  useEffect(() => {
    let active = true

    async function loadSecurity() {
      setLoading(true)
      setError('')

      try {
        const [
          security,
          allFactors,
          logs
        ] = await Promise.all([
          getSecurityStatus(),
          getMFAFactors(),
          getSecurityEvents()
        ])

        if (!active) return

        setStatus(security)

        setFactors(
          allFactors.filter(
            item => item.status === 'verified'
          )
        )

        setEvents(logs)

      } catch (err) {
        if (!active) return

        setStatus(null)
        setFactors([])
        setEvents([])

        setError(
          err.message ||
          'Impossible de charger les données.'
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSecurity()

    return () => {
      active = false
    }

  }, [refresh])

  // ========================================
  // TOAST
  // ========================================

  useEffect(() => {
    if (!success) return

    const timer = setTimeout(
      () => setSuccess(''),
      4500
    )

    return () => clearTimeout(timer)

  }, [success])

  function reload() {
    setRefresh(value => value + 1)
  }

  // ========================================
  // OPERATIONS SENSIBLES
  // ========================================

  async function handleConfirm() {
    if (
      actionLock.current ||
      !confirmation
    ) return

    actionLock.current = true

    setBusy(true)
    setError('')

    try {
      if (confirmation.type === 'remove') {
        await removeMFAFactor(
          confirmation.factorId
        )

        setSuccess(
          'Facteur d’authentification supprimé.'
        )
      }

      if (confirmation.type === 'revoke') {
        await revokeOtherSessions()

        setSuccess(
          'Les autres sessions ont été révoquées.'
        )
      }

      setConfirmation(null)
      reload()

    } catch (err) {
      setError(err.message)
      setConfirmation(null)
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }

  const verified =
    status?.aal === 'aal2' &&
    status?.mfa_enabled === true

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <AdminLayout
      profile={profile}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      <div className="av9">

        {/* HEADER */}

        <header className="av9-page-header">

          <div>
            <span className="av9-eyebrow">
              <ShieldCheck size={15} />
              Security Center
            </span>

            <h1>Centre de sécurité</h1>

            <p>
              Protégez votre compte administrateur
              et votre marketplace.
            </p>
          </div>

          <button
            type="button"
            className="av9-btn av9-btn-secondary"
            disabled={loading || busy}
            onClick={reload}
          >
            <RefreshCw
              size={17}
              className={loading ? 'av9-spin' : ''}
            />
            Actualiser
          </button>

        </header>

        {error && (
          <div className="av9-error" role="alert">
            {error}
          </div>
        )}

        {/* BANNIERE */}

        <section className="av9-banner">

          <div>
            <small>BIZINA IPHONE SECURITY</small>

            <h2>Votre sécurité, notre priorité.</h2>

            <p>
              Authentification renforcée,
              protection des sessions et suivi
              des événements de sécurité.
            </p>
          </div>

          <ShieldCheck
            size={105}
            strokeWidth={1}
            className="av9-banner-icon"
          />

        </section>

        {loading ? (
          <div className="av9-panel av9-loading">

            <LoaderCircle
              size={32}
              className="av9-spin"
            />

            <p>Chargement de la sécurité...</p>

          </div>
        ) : !status ? (
          <div className="av9-panel av9-loading">
            <ShieldAlert size={36} />

            <h3>État de sécurité indisponible</h3>

            <button
              className="av9-btn av9-btn-secondary"
              onClick={reload}
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>

            {/* INDICATEURS */}

            <div className="av9-stats-grid">

              <SecurityCard
                icon={ShieldCheck}
                label="Authentification MFA"
                value={
                  status.mfa_enabled
                    ? 'Activée'
                    : 'Non configurée'
                }
                description="Protection TOTP du compte"
                color={
                  status.mfa_enabled
                    ? 'green'
                    : 'orange'
                }
              />

              <SecurityCard
                icon={LockKeyhole}
                label="Niveau de session"
                value={
                  String(status.aal).toUpperCase()
                }
                description={
                  verified
                    ? 'Double authentification vérifiée'
                    : 'Vérification nécessaire'
                }
                color="blue"
              />

              <SecurityCard
                icon={Smartphone}
                label="Facteurs vérifiés"
                value={status.verified_factors}
                description="Applications TOTP associées"
                color="purple"
              />

              <SecurityCard
                icon={Fingerprint}
                label="Identité administrateur"
                value={
                  verified
                    ? 'Vérifiée'
                    : 'À vérifier'
                }
                description="État de la session actuelle"
                color={verified ? 'green' : 'orange'}
              />

            </div>

            {/* MFA */}

            <Panel
              title="Authentification à deux facteurs"
              subtitle="Gérez vos applications d’authentification."
              icon={ShieldCheck}
            >

              {!factors.length && (
                <p className="av9-footnote">
                  Aucun facteur TOTP vérifié.
                </p>
              )}

              <div className="av9-factor-list">

                {factors.map(factor => (
                  <div
                    className="av9-factor"
                    key={factor.id}
                  >

                    <div className="av9-device-icon">
                      <Smartphone size={23} />
                    </div>

                    <div className="av9-factor-info">
                      <strong>
                        {factor.friendly_name ||
                          'Application TOTP'}
                      </strong>

                      <small>
                        Configurée le{' '}
                        {formatSecurityDate(
                          factor.created_at
                        )}
                      </small>
                    </div>

                    <span className="av9-status">
                      <CheckCircle2 size={14} />
                      Vérifié
                    </span>

                    <button
                      type="button"
                      className="av9-icon-btn av9-delete-btn"
                      disabled={
                        busy ||
                        !verified ||
                        factors.length <= 1
                      }
                      title={
                        factors.length <= 1
                          ? 'Le dernier facteur doit être conservé'
                          : 'Supprimer ce facteur'
                      }
                      aria-label="Supprimer ce facteur"
                      onClick={() =>
                        setConfirmation({
                          type: 'remove',
                          factorId: factor.id
                        })
                      }
                    >
                      <Trash2 size={18} />
                    </button>

                  </div>
                ))}

              </div>

              <button
                type="button"
                className="av9-btn av9-btn-primary"
                disabled={busy || !verified}
                onClick={() => setShowSetup(true)}
              >
                <Plus size={18} />
                Ajouter un facteur de secours
              </button>

              <p className="av9-footnote">
                Il est recommandé de disposer d’une
                seconde application sur un appareil
                distinct. Le dernier facteur ne peut
                pas être supprimé depuis cette interface.
              </p>

            </Panel>

            {/* SESSIONS */}

            <Panel
              title="Protection des sessions"
              subtitle="Sécurisez l’accès à votre compte."
              icon={Monitor}
            >

              <div className="av9-factor">

                <div className="av9-device-icon">
                  <Monitor size={23} />
                </div>

                <div className="av9-factor-info">
                  <strong>Session actuelle</strong>

                  <small>
                    Niveau : {status.aal.toUpperCase()}
                  </small>
                </div>

                <span className="av9-status">
                  Active
                </span>

              </div>

              <div className="av9-session-actions">

                <button
                  type="button"
                  className="av9-btn av9-btn-danger"
                  disabled={busy || !verified}
                  onClick={() =>
                    setConfirmation({
                      type: 'revoke'
                    })
                  }
                >
                  <LogOut size={17} />
                  Déconnecter les autres sessions
                </button>

              </div>

              <p className="av9-footnote">
                Cette opération révoque les autres
                sessions de votre compte.
                Votre session actuelle est conservée.
                Les anciens jetons peuvent rester
                valides jusqu’à leur expiration.
              </p>

            </Panel>

            {/* HISTORIQUE */}

            <Panel
              title="Événements de sécurité récents"
              subtitle="Déclarations d’activité enregistrées dans Admin V7."
              icon={History}
            >

              {events.length === 0 ? (
                <div className="av9-loading">
                  <History size={32} />
                  <p>Aucun événement enregistré.</p>
                </div>
              ) : (
                <div className="av9-table-wrap">

                  <table className="av9-table">

                    <thead>
                      <tr>
                        <th>Événement</th>
                        <th>Rôle</th>
                        <th>Niveau</th>
                        <th>Source</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>

                      {events.map(event => (
                        <tr key={event.id}>

                          <td>
                            {SECURITY_ACTIONS[event.action]
                              || event.action}
                          </td>

                          <td>{event.actor_role}</td>

                          <td>
                            <span
                              className={
                                `av9-severity ${event.severity}`
                              }
                            >
                              {event.severity}
                            </span>
                          </td>

                          <td>{event.source}</td>

                          <td>
                            {formatSecurityDate(
                              event.created_at
                            )}
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              )}

              <Link
                to="/admin/logs"
                className="av9-link"
              >
                Ouvrir le journal d’activité
                <ArrowUpRight size={15} />
              </Link>

            </Panel>

            <div className="av9-data-note">
              <ShieldCheck size={24} />

              <div>
                <strong>
                  Protection Supabase Auth
                </strong>
                <p>
                  Les facteurs MFA sont gérés par
                  Supabase. Aucun code temporaire
                  ni secret TOTP n’est enregistré
                  dans le journal Bizina Iphone.
                </p>
              </div>
            </div>

          </>
        )}

        {/* CONFIGURATION MFA */}

        {showSetup && (
          <div className="av9-modal-overlay">

            <div
              className="av9-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Ajouter un facteur MFA"
            >
              <MFASetup
                onSuccess={() => {
                  setShowSetup(false)
                  setSuccess(
                    'Facteur de secours ajouté.'
                  )
                  reload()
                }}
                onCancel={() =>
                  setShowSetup(false)
                }
              />
            </div>

          </div>
        )}

        {/* CONFIRMATION */}

        {confirmation && (
          <div className="av9-modal-overlay">

            <div
              className="av9-modal av9-confirmation"
              role="dialog"
              aria-modal="true"
              aria-label="Confirmation de sécurité"
            >

              <div className="av9-warning-icon">
                <ShieldAlert size={34} />
              </div>

              <h2>
                {confirmation.type === 'remove'
                  ? 'Supprimer le facteur ?'
                  : 'Révoquer les autres sessions ?'}
              </h2>

              <p>
                {confirmation.type === 'remove'
                  ? 'Cette application ne pourra plus servir à vérifier votre identité.'
                  : 'Vos autres appareils devront se reconnecter. Votre session actuelle restera active.'}
              </p>

              <div className="av9-confirmation-actions">

                <button
                  type="button"
                  className="av9-btn av9-btn-secondary"
                  disabled={busy}
                  onClick={() =>
                    setConfirmation(null)
                  }
                >
                  Annuler
                </button>

                <button
                  type="button"
                  className="av9-btn av9-btn-danger"
                  disabled={busy}
                  onClick={handleConfirm}
                >
                  {busy && (
                    <LoaderCircle
                      size={17}
                      className="av9-spin"
                    />
                  )}

                  Confirmer
                </button>

              </div>

            </div>

          </div>
        )}

        {/* TOAST */}

        {success && (
          <div className="av9-toast" role="status">

            <CheckCircle2 size={22} />

            <span>{success}</span>

            <button
              type="button"
              className="av9-icon-btn"
              onClick={() => setSuccess('')}
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

          </div>
        )}

      </div>
    </AdminLayout>
  )
}
