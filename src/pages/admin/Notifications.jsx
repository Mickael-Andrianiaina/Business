
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Bell,
  BellRing,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Send,
  RefreshCw,
  UserPlus,
  Package,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  AlertTriangle,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpRight
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  getNotifications,
  getNotificationStats,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  sendAdminNotification,
  searchRecipients,
  subscribeToNotifications
} from '../../services/notificationService'

import './AdminV2.css'
import './AdminV6.css'

// ==========================================
// CONFIGURATION
// ==========================================

const PAGE_SIZE = 10

const INITIAL_STATS = {
  total: 0,
  unread: 0,
  read: 0,
  urgent: 0
}

const INITIAL_FORM = {
  audience: 'users',
  recipientId: '',
  title: '',
  message: '',
  priority: 'normal'
}

const FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'read', label: 'Lues' }
]

const ICONS = {
  registration: [UserPlus, 'blue'],
  product_pending: [Package, 'purple'],
  product_approved: [ShieldCheck, 'green'],
  product_rejected: [XCircle, 'red'],
  report_created: [ShieldAlert, 'orange'],
  report_urgent: [AlertTriangle, 'red'],
  report_resolved: [ShieldCheck, 'green'],
  account_suspended: [ShieldAlert, 'orange'],
  account_banned: [XCircle, 'red'],
  account_reactivated: [ShieldCheck, 'green'],
  announcement: [Megaphone, 'purple'],
  system: [Bell, 'blue']
}

const ALLOWED_ROUTES = [
  '/admin',
  '/admin/products',
  '/admin/users',
  '/admin/categories',
  '/admin/reports',
  '/admin/notifications',
  '/admin/analytics',
  '/admin/logs',
  '/admin/settings',
  '/user'
]

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('fr-FR')
    : '—'
}

// ==========================================
// PAGE PRINCIPALE
// ==========================================

export default function Notifications({
  profile,
  onLogout,
  logoutLoading
}) {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState(INITIAL_STATS)

  const [filter, setFilter] = useState('all')
  const [type, setType] = useState('all')

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [refresh, setRefresh] = useState(0)

  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showCompose, setShowCompose] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [formError, setFormError] = useState('')

  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipients, setRecipients] = useState([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  )

  // ======================================
  // CHARGEMENT DES NOTIFICATIONS
  // ======================================

  useEffect(() => {
    let active = true

    if (!profile?.id) return

    setLoading(true)
    setError('')

    async function load() {
      try {
        const [result, statsData] = await Promise.all([
          getNotifications({
            filter,
            type,
            page,
            pageSize: PAGE_SIZE
          }),
          getNotificationStats()
        ])

        if (!active) return

        setNotifications(result.notifications)
        setTotal(result.total)
        setStats(statsData)

        const maxPage = Math.max(
          1,
          Math.ceil(result.total / PAGE_SIZE)
        )

        if (page > maxPage) {
          setPage(maxPage)
        }

      } catch (err) {
        if (active) {
          setError(
            err.message ||
            'Impossible de charger les notifications.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }

  }, [profile?.id, filter, type, page, refresh])

  // ======================================
  // SUPABASE REALTIME
  // ======================================

  useEffect(() => {
    if (!profile?.id) return

    let active = true
    let timer

    setConnected(false)

    function requestRefresh() {
      clearTimeout(timer)

      timer = setTimeout(() => {
        if (active) {
          setRefresh(value => value + 1)
        }
      }, 200)
    }

    const unsubscribe = subscribeToNotifications(
      profile.id,
      requestRefresh,
      status => {
        if (!active) return

        setConnected(status === 'SUBSCRIBED')

        if (status === 'SUBSCRIBED') {
          requestRefresh()
        }
      }
    )

    const interval = setInterval(
      requestRefresh,
      30000
    )

    window.addEventListener(
      'focus',
      requestRefresh
    )

    return () => {
      active = false

      clearTimeout(timer)
      clearInterval(interval)

      unsubscribe()

      window.removeEventListener(
        'focus',
        requestRefresh
      )
    }

  }, [profile?.id])

  // ======================================
  // RECHERCHE DES DESTINATAIRES
  // ======================================

  useEffect(() => {
    if (
      !showCompose ||
      form.audience !== 'individual'
    ) {
      return
    }

    let active = true

    setRecipientsLoading(true)

    const timer = setTimeout(async () => {
      try {
        const data = await searchRecipients(
          recipientSearch
        )

        if (active) {
          setRecipients(data)
        }

      } catch (err) {
        if (active) {
          setFormError(err.message)
        }
      } finally {
        if (active) {
          setRecipientsLoading(false)
        }
      }
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }

  }, [showCompose, form.audience, recipientSearch])

  // ======================================
  // NOTIFICATION DE SUCCES
  // ======================================

  useEffect(() => {
    if (!success) return

    const timer = setTimeout(
      () => setSuccess(''),
      4000
    )

    return () => clearTimeout(timer)
  }, [success])

  // ======================================
  // FERMETURE AVEC ECHAP
  // ======================================

  useEffect(() => {
    if (!showCompose) return

    function handleEscape(event) {
      if (event.key === 'Escape' && !busy) {
        setShowCompose(false)
      }
    }

    window.addEventListener(
      'keydown',
      handleEscape
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape
      )
    }

  }, [showCompose, busy])

  // ======================================
  // ACTIONS
  // ======================================

  async function runAction(action) {
    if (busy) return false

    try {
      setBusy(true)
      setError('')

      await action()

      setRefresh(value => value + 1)

      return true

    } catch (err) {
      setError(err.message)
      return false

    } finally {
      setBusy(false)
    }
  }

  async function openNotification(item) {
    if (busy) return

    if (!item.read_at) {
      const ok = await runAction(
        () => markNotificationRead(item.id)
      )

      if (!ok) return
    }

    if (
      item.action_url &&
      ALLOWED_ROUTES.includes(item.action_url)
    ) {
      navigate(item.action_url)
    }
  }

  async function handleReadAll() {
    const ok = await runAction(
      markAllNotificationsRead
    )

    if (ok) {
      setSuccess(
        'Toutes les notifications sont marquées comme lues.'
      )
    }
  }

  async function handleDelete(id) {
    if (
      !window.confirm(
        'Supprimer cette notification ?'
      )
    ) return

    const ok = await runAction(
      () => deleteNotification(id)
    )

    if (ok) {
      setSuccess('Notification supprimée.')
    }
  }

  // ======================================
  // FORMULAIRE D'ENVOI
  // ======================================

  function openCompose() {
    setForm({ ...INITIAL_FORM })
    setFormError('')
    setRecipientSearch('')
    setRecipients([])
    setShowCompose(true)
  }

  function updateForm(field, value) {
    setForm(current => ({
      ...current,
      [field]: value
    }))
  }

  async function handleSend(event) {
    event.preventDefault()

    if (busy) return

    setFormError('')

    if (!form.title.trim() || !form.message.trim()) {
      setFormError(
        'Le titre et le message sont obligatoires.'
      )
      return
    }

    if (
      form.audience === 'individual' &&
      !form.recipientId
    ) {
      setFormError(
        'Sélectionnez un destinataire.'
      )
      return
    }

    if (
      form.audience !== 'individual' &&
      !window.confirm(
        'Confirmer cet envoi collectif ?'
      )
    ) {
      return
    }

    try {
      setBusy(true)

      const count = await sendAdminNotification({
        ...form,
        recipientId:
          form.audience === 'individual'
            ? form.recipientId
            : null
      })

      if (count === 0) {
        setFormError(
          'Aucun destinataire actif trouvé.'
        )
        return
      }

      setSuccess(
        `Notification envoyée à ${count} compte(s).`
      )

      setShowCompose(false)
      setRefresh(value => value + 1)

    } catch (err) {
      setFormError(
        err.message ||
        'Impossible d’envoyer la notification.'
      )
    } finally {
      setBusy(false)
    }
  }

  const cards = [
    {
      label: 'Total notifications',
      value: stats.total,
      icon: Bell,
      color: 'blue'
    },
    {
      label: 'Non lues',
      value: stats.unread,
      icon: BellRing,
      color: 'orange'
    },
    {
      label: 'Lues',
      value: stats.read,
      icon: CheckCheck,
      color: 'green'
    },
    {
      label: 'Urgentes non lues',
      value: stats.urgent,
      icon: AlertTriangle,
      color: 'red'
    }
  ]

  // ======================================
  // INTERFACE
  // ======================================

  return (
    <AdminLayout
      profile={profile}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      <div className="av2 av6">

        <header className="av2-page-header">

          <div>
            <div className="av2-eyebrow">
              <BellRing size={15} />
              Centre de communication
            </div>

            <h1>Notifications</h1>

            <p>
              Suivez les événements et communiquez
              avec la communauté Bizina Iphone.
            </p>
          </div>

          <div className="av6-header-actions">

            <button
              className="av2-btn av2-btn-secondary"
              disabled={loading}
              onClick={() =>
                setRefresh(value => value + 1)
              }
            >
              <RefreshCw
                size={17}
                className={loading ? 'av2-spin' : ''}
              />
              Actualiser
            </button>

            <button
              className="av2-btn av6-primary"
              onClick={openCompose}
              disabled={busy}
            >
              <Send size={17} />
              Nouvelle notification
            </button>

          </div>

        </header>

        {error && (
          <div
            className="av2-alert av2-alert-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* BANNIERE */}

        <section className="av6-banner">

          <div>
            <div className="av6-live-label">
              <span
                className={
                  connected
                    ? 'av6-live-dot online'
                    : 'av6-live-dot'
                }
              />

              {connected
                ? 'REALTIME CONNECTÉ'
                : 'ACTUALISATION PÉRIODIQUE'}
            </div>

            <h2>Restez informé.</h2>

            <p>
              Retrouvez les événements importants
              de votre marketplace au même endroit.
            </p>
          </div>

          <BellRing
            size={105}
            strokeWidth={0.9}
            className="av6-banner-icon"
          />

        </section>

        {/* STATISTIQUES */}

        <div className="av6-stats-grid">

          {cards.map(card => {
            const Icon = card.icon

            return (
              <div
                className="av2-stat-card"
                key={card.label}
              >
                <div className={`av2-stat-icon ${card.color}`}>
                  <Icon size={23} />
                </div>

                <span>{card.label}</span>

                {loading ? (
                  <div className="av2-skeleton" />
                ) : (
                  <strong>
                    {error ? '—' : card.value}
                  </strong>
                )}
              </div>
            )
          })}

        </div>

        {/* CENTRE DE NOTIFICATIONS */}

        <section className="av2-panel">

          <div className="av2-panel-heading">

            <div>
              <h3>Boîte de réception</h3>
              <p>{total} notification(s)</p>
            </div>

            <button
              className="av2-btn av2-btn-secondary"
              disabled={
                busy || loading || stats.unread === 0
              }
              onClick={handleReadAll}
            >
              <CheckCheck size={17} />
              Tout marquer comme lu
            </button>

          </div>

          <div className="av6-toolbar">

            <div className="av2-filters">

              {FILTERS.map(item => (
                <button
                  key={item.value}
                  aria-pressed={filter === item.value}
                  className={
                    filter === item.value
                      ? 'av2-filter active'
                      : 'av2-filter'
                  }
                  onClick={() => {
                    setFilter(item.value)
                    setPage(1)
                  }}
                >
                  {item.label}
                </button>
              ))}

            </div>

            <select
              className="av6-input"
              aria-label="Type de notification"
              value={type}
              onChange={event => {
                setType(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">
                Tous les types
              </option>

              {Object.entries(NOTIFICATION_TYPES).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>

          </div>

          {/* LISTE */}

          {loading ? (

            <div className="av2-empty">
              <RefreshCw
                size={30}
                className="av2-spin"
              />
              <p>Chargement des notifications...</p>
            </div>

          ) : error ? (

            <div className="av2-empty">
              <AlertTriangle size={35} />
              <h3>Une erreur est survenue</h3>
              <button
                className="av2-btn av2-btn-secondary"
                onClick={() =>
                  setRefresh(value => value + 1)
                }
              >
                Réessayer
              </button>
            </div>

          ) : notifications.length === 0 ? (

            <div className="av2-empty">
              <BellOff size={48} strokeWidth={1.2} />
              <h3>Aucune notification</h3>
              <p>
                Vous êtes à jour pour cette sélection.
              </p>
            </div>

          ) : (

            <div className="av6-list">

              {notifications.map(item => {
                const [Icon, color] =
                  ICONS[item.type] || ICONS.system

                return (
                  <article
                    key={item.id}
                    className={`av6-notification ${
                      item.read_at ? '' : 'unread'
                    }`}
                  >

                    <div className={`av6-icon ${color}`}>
                      <Icon size={23} />
                    </div>

                    <div className="av6-message">

                      <div className="av6-title">

                        {!item.read_at && (
                          <span className="av6-unread-dot" />
                        )}

                        <h4>{item.title}</h4>

                        {item.priority === 'urgent' && (
                          <span className="av6-urgent">
                            Urgent
                          </span>
                        )}

                      </div>

                      <p>{item.message}</p>

                      <div className="av6-meta">

                        <small>
                          {formatDate(item.created_at)}
                        </small>

                        <span>·</span>

                        <small>
                          {NOTIFICATION_TYPES[item.type]}
                        </small>

                      </div>

                    </div>

                    <div className="av6-item-actions">

                      {!item.read_at && (
                        <button
                          className="av2-icon-btn"
                          title="Marquer comme lu"
                          aria-label="Marquer comme lu"
                          disabled={busy}
                          onClick={() =>
                            runAction(
                              () => markNotificationRead(item.id)
                            )
                          }
                        >
                          <Check size={18} />
                        </button>
                      )}

                      {item.action_url &&
                       ALLOWED_ROUTES.includes(item.action_url) && (
                        <button
                          className="av2-icon-btn"
                          title="Ouvrir"
                          aria-label="Ouvrir la notification"
                          disabled={busy}
                          onClick={() =>
                            openNotification(item)
                          }
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      )}

                      <button
                        className="av2-icon-btn red"
                        title="Supprimer"
                        aria-label="Supprimer la notification"
                        disabled={busy}
                        onClick={() =>
                          handleDelete(item.id)
                        }
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>

                  </article>
                )
              })}

            </div>
          )}

          {/* PAGINATION */}

          <div className="av2-pagination">

            <span>
              Page {page} sur {totalPages}
            </span>

            <div>

              <button
                className="av2-icon-btn"
                disabled={page <= 1 || loading}
                aria-label="Page précédente"
                onClick={() =>
                  setPage(value => value - 1)
                }
              >
                <ChevronLeft size={20} />
              </button>

              <button
                className="av2-icon-btn"
                disabled={
                  page >= totalPages || loading
                }
                aria-label="Page suivante"
                onClick={() =>
                  setPage(value => value + 1)
                }
              >
                <ChevronRight size={20} />
              </button>

            </div>

          </div>

        </section>

        {/* TOAST */}

        {success && (
          <div className="av2-toast" role="status">

            <ShieldCheck size={22} />
            <span>{success}</span>

            <button
              aria-label="Fermer"
              onClick={() => setSuccess('')}
            >
              <X size={18} />
            </button>

          </div>
        )}

        {/* MODALE DE COMPOSITION */}

        {showCompose && (
          <div
            className="av2-modal-overlay"
            onClick={() =>
              !busy && setShowCompose(false)
            }
          >

            <section
              className="av2-modal av6-compose"
              role="dialog"
              aria-modal="true"
              aria-labelledby="av6-compose-title"
              onClick={event =>
                event.stopPropagation()
              }
            >

              <div className="av2-modal-header">

                <h2 id="av6-compose-title">
                  Nouvelle notification
                </h2>

                <button
                  className="av2-icon-btn"
                  disabled={busy}
                  aria-label="Fermer"
                  onClick={() =>
                    setShowCompose(false)
                  }
                >
                  <X size={20} />
                </button>

              </div>

              {formError && (
                <div
                  className="av2-alert av2-alert-error"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <form onSubmit={handleSend}>

                <fieldset
                  className="av6-fieldset"
                  disabled={busy}
                >

                  <div className="av2-field">

                    <label htmlFor="av6-audience">
                      Destinataires
                    </label>

                    <select
                      id="av6-audience"
                      className="av6-input"
                      value={form.audience}
                      onChange={event => {
                        setForm(current => ({
                          ...current,
                          audience: event.target.value,
                          recipientId: ''
                        }))
                      }}
                    >
                      <option value="individual">
                        Un utilisateur
                      </option>

                      <option value="users">
                        Tous les utilisateurs actifs
                      </option>

                      <option value="admins">
                        Tous les administrateurs actifs
                      </option>

                      <option value="all">
                        Tous les comptes actifs
                      </option>

                    </select>

                  </div>

                  {form.audience === 'individual' && (
                    <div className="av2-field">

                      <label htmlFor="av6-search-user">
                        Rechercher un destinataire
                      </label>

                      <input
                        id="av6-search-user"
                        className="av6-input"
                        placeholder="Nom ou e-mail..."
                        value={recipientSearch}
                        onChange={event => {
                          setRecipientSearch(
                            event.target.value
                          )
                          updateForm('recipientId', '')
                        }}
                      />

                      <select
                        className="av6-input"
                        aria-label="Destinataire"
                        required
                        value={form.recipientId}
                        disabled={recipientsLoading}
                        onChange={event =>
                          updateForm(
                            'recipientId',
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          {recipientsLoading
                            ? 'Chargement...'
                            : 'Sélectionner un compte'}
                        </option>

                        {recipients.map(user => (
                          <option
                            key={user.id}
                            value={user.id}
                          >
                            {user.full_name || 'Sans nom'}
                            {' — '}
                            {user.email || 'Sans e-mail'}
                          </option>
                        ))}

                      </select>

                    </div>
                  )}

                  <div className="av2-field">

                    <label htmlFor="av6-title">
                      Titre *
                    </label>

                    <input
                      id="av6-title"
                      className="av6-input"
                      required
                      maxLength={150}
                      placeholder="Ex : Maintenance prévue"
                      value={form.title}
                      onChange={event =>
                        updateForm(
                          'title',
                          event.target.value
                        )
                      }
                    />

                  </div>

                  <div className="av2-field">

                    <label htmlFor="av6-message">
                      Message *
                    </label>

                    <textarea
                      id="av6-message"
                      rows={6}
                      required
                      maxLength={2000}
                      placeholder="Rédigez votre notification..."
                      value={form.message}
                      onChange={event =>
                        updateForm(
                          'message',
                          event.target.value
                        )
                      }
                    />

                    <small>
                      {form.message.length}/2000 caractères
                    </small>

                  </div>

                  <div className="av2-field">

                    <label htmlFor="av6-priority">
                      Priorité
                    </label>

                    <select
                      id="av6-priority"
                      className="av6-input"
                      value={form.priority}
                      onChange={event =>
                        updateForm(
                          'priority',
                          event.target.value
                        )
                      }
                    >

                      {Object.entries(
                        NOTIFICATION_PRIORITIES
                      ).map(([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ))}

                    </select>

                  </div>

                  {/* APERCU */}

                  <div className="av6-preview">

                    <small>APERÇU DE LA NOTIFICATION</small>

                    <div className="av6-preview-content">

                      <div className="av6-icon blue">
                        <Megaphone size={23} />
                      </div>

                      <div>
                        <strong>
                          {form.title || 'Titre'}
                        </strong>

                        <p>
                          {form.message ||
                            'Votre message apparaîtra ici.'}
                        </p>
                      </div>

                    </div>

                  </div>

                </fieldset>

                <div className="av2-modal-footer">

                  <button
                    type="button"
                    className="av2-btn av2-btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      setShowCompose(false)
                    }
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="av2-btn av6-primary"
                    disabled={
                      busy ||
                      !form.title.trim() ||
                      !form.message.trim()
                    }
                  >
                    <Send size={17} />

                    {busy
                      ? 'Envoi en cours...'
                      : 'Envoyer'}
                  </button>

                </div>

              </form>

            </section>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
