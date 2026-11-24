
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  Activity,
  ClipboardList,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  RefreshCw,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Package,
  Layers,
  Flag,
  Bell,
  LogIn,
  Settings,
  AlertTriangle,
  CheckCircle2,
  FilterX
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import {
  ACTIVITY_MODULES,
  ACTIVITY_SEVERITIES,
  ACTIVITY_ACTIONS,
  ACTOR_ROLES,
  getActivityStats,
  getActivityLogs,
  getActivityActor,
  exportActivityCSV
} from '../../services/activityService'

import './AdminV2.css'
import './AdminV7.css'

// ==========================================
// CONFIGURATION
// ==========================================

const PAGE_SIZE = 15

const INITIAL_STATS = {
  total: 0,
  today: 0,
  adminActions: 0,
  sensitive: 0
}

const INITIAL_FILTERS = {
  search: '',
  module: 'all',
  severity: 'all',
  actorRole: 'all',
  fromDate: '',
  toDate: ''
}

const MODULE_ICONS = {
  auth: LogIn,
  users: UserRound,
  products: Package,
  catalog: Layers,
  reports: Flag,
  notifications: Bell,
  system: Settings
}

const MODULE_ROUTES = {
  users: '/admin/users',
  products: '/admin/products',
  catalog: '/admin/categories',
  reports: '/admin/reports',
  notifications: '/admin/notifications'
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('fr-FR')
    : '—'
}

function SeverityBadge({ severity }) {
  return (
    <span className={`av7-severity ${severity}`}>
      <span className="av7-severity-dot" />

      {ACTIVITY_SEVERITIES[severity] || severity}
    </span>
  )
}

// ==========================================
// PAGE PRINCIPALE
// ==========================================

export default function ActivityLogs({
  profile,
  onLogout,
  logoutLoading
}) {

  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(INITIAL_STATS)

  const [filters, setFilters] = useState(
    INITIAL_FILTERS
  )

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [refresh, setRefresh] = useState(0)

  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const [error, setError] = useState('')
  const [statsError, setStatsError] = useState('')
  const [exportError, setExportError] = useState('')
  const [success, setSuccess] = useState('')

  const [selected, setSelected] = useState(null)
  const [actor, setActor] = useState(null)
  const [actorLoading, setActorLoading] = useState(false)
  const [actorError, setActorError] = useState('')

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  )

  const invalidDateRange = Boolean(
    filters.fromDate &&
    filters.toDate &&
    filters.fromDate > filters.toDate
  )

  // ========================================
  // CHARGEMENT DES ACTIVITES
  // ========================================

  useEffect(() => {

    let active = true

    if (invalidDateRange) {
      setLoading(false)
      setLogs([])
      setTotal(0)
      return
    }

    setLoading(true)
    setError('')

    const timer = setTimeout(async () => {

      try {

        const result = await getActivityLogs({
          ...filters,
          page,
          pageSize: PAGE_SIZE
        })

        if (!active) return

        setLogs(result.logs)
        setTotal(result.total)

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
            'Impossible de charger les activités.'
          )
        }

      } finally {

        if (active) {
          setLoading(false)
        }

      }

    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }

  }, [filters, page, refresh, invalidDateRange])

  // ========================================
  // STATISTIQUES
  // ========================================

  useEffect(() => {

    let active = true

    setStatsLoading(true)
    setStatsError('')

    getActivityStats()
      .then(data => {
        if (active) setStats(data)
      })
      .catch(err => {
        if (active) {
          setStatsError(
            err.message ||
            'Statistiques indisponibles.'
          )
        }
      })
      .finally(() => {
        if (active) setStatsLoading(false)
      })

    return () => {
      active = false
    }

  }, [refresh])

  // ========================================
  // IDENTITE DE L'AUTEUR
  // ========================================

  useEffect(() => {

    let active = true

    setActor(null)
    setActorError('')

    if (!selected?.actor_id) {
      setActorLoading(false)
      return
    }

    setActorLoading(true)

    getActivityActor(selected.actor_id)
      .then(data => {
        if (active) setActor(data)
      })
      .catch(err => {
        if (active) {
          setActorError(err.message)
        }
      })
      .finally(() => {
        if (active) {
          setActorLoading(false)
        }
      })

    return () => {
      active = false
    }

  }, [selected])

  // ========================================
  // ACTUALISATION AUTOMATIQUE
  // ========================================

  useEffect(() => {

    const interval = setInterval(() => {
      setRefresh(value => value + 1)
    }, 30000)

    return () => clearInterval(interval)

  }, [])

  // ========================================
  // TOAST
  // ========================================

  useEffect(() => {

    if (!success) return

    const timer = setTimeout(
      () => setSuccess(''),
      5000
    )

    return () => clearTimeout(timer)

  }, [success])

  // ========================================
  // FERMETURE MODALE
  // ========================================

  useEffect(() => {

    if (!selected) return

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setSelected(null)
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

  }, [selected])

  // ========================================
  // FILTRES
  // ========================================

  function updateFilter(field, value) {
    setFilters(current => ({
      ...current,
      [field]: value
    }))

    setPage(1)
  }

  function resetFilters() {
    setFilters({ ...INITIAL_FILTERS })
    setPage(1)
  }

  // ========================================
  // EXPORTATION CSV
  // ========================================

  async function handleExport() {

    if (exporting || invalidDateRange) return

    try {

      setExporting(true)
      setExportError('')

      const result = await exportActivityCSV(
        filters
      )

      setSuccess(
        result.limitReached
          ? `${result.count} événements exportés. Limite atteinte.`
          : `${result.count} événement(s) exporté(s).`
      )

    } catch (err) {

      setExportError(
        err.message ||
        'Impossible d’exporter le journal.'
      )

    } finally {

      setExporting(false)

    }
  }

  const cards = [
    {
      label: 'Total événements',
      value: stats.total,
      icon: Activity,
      color: 'blue'
    },
    {
      label: 'Activités sur 24 h',
      value: stats.today,
      icon: Clock,
      color: 'purple'
    },
    {
      label: 'Actions administratives',
      value: stats.adminActions,
      icon: ShieldCheck,
      color: 'green'
    },
    {
      label: 'Événements sensibles',
      value: stats.sensitive,
      icon: ShieldAlert,
      color: 'red'
    }
  ]

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <AdminLayout
      profile={profile}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >

      <div className="av2 av7">

        {/* HEADER */}

        <header className="av2-page-header">

          <div>

            <div className="av2-eyebrow">
              <ClipboardList size={15} />

              Audit et traçabilité
            </div>

            <h1>Journal d’activité</h1>

            <p>
              Consultez l’historique des événements
              de Bizina Iphone.
            </p>

          </div>

          <div className="av7-header-actions">

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
              className="av2-btn av7-primary"
              disabled={exporting || invalidDateRange}
              onClick={handleExport}
            >
              <Download size={17} />

              {exporting
                ? 'Exportation...'
                : 'Exporter CSV'}
            </button>

          </div>

        </header>

        {(error || statsError || exportError) && (
          <div
            className="av2-alert av2-alert-error"
            role="alert"
          >
            {error || statsError || exportError}
          </div>
        )}

        {/* BANNIERE */}

        <section className="av7-banner">

          <div>

            <small>CENTRE D’AUDIT</small>

            <h2>Une traçabilité complète.</h2>

            <p>
              Surveillez les modifications importantes,
              les décisions administratives et les
              activités de la marketplace.
            </p>

            <div className="av7-banner-status">

              <ShieldCheck size={16} />

              Journal protégé en écriture

            </div>

          </div>

          <ClipboardList
            size={115}
            strokeWidth={0.9}
            className="av7-banner-icon"
          />

        </section>

        {/* STATISTIQUES */}

        <div className="av7-stats-grid">

          {cards.map(card => {

            const Icon = card.icon

            return (
              <div
                key={card.label}
                className="av2-stat-card"
              >

                <div className={`av2-stat-icon ${card.color}`}>
                  <Icon size={23} />
                </div>

                <span>{card.label}</span>

                {statsLoading ? (

                  <div className="av2-skeleton" />

                ) : (

                  <strong>
                    {statsError ? '—' : card.value}
                  </strong>

                )}

              </div>
            )

          })}

        </div>

        {/* JOURNAL */}

        <section className="av2-panel">

          <div className="av2-panel-heading">

            <div>
              <h3>Historique des activités</h3>
              <p>{total} événement(s) trouvé(s)</p>
            </div>

            <Activity size={22} />

          </div>

          {/* RECHERCHE */}

          <div className="av2-toolbar">

            <div className="av2-search">

              <Search size={18} />

              <input
                type="search"
                value={filters.search}
                aria-label="Rechercher une activité"
                placeholder="Rechercher une action ou une cible..."
                onChange={event =>
                  updateFilter(
                    'search',
                    event.target.value
                  )
                }
              />

            </div>

            <button
              className="av2-btn av2-btn-secondary"
              onClick={resetFilters}
            >

              <FilterX size={17} />
              Réinitialiser

            </button>

          </div>

          {/* FILTRES AVANCES */}

          <div className="av7-filter-grid">

            <div className="av7-field">

              <label htmlFor="av7-module">
                Module
              </label>

              <select
                id="av7-module"
                value={filters.module}
                onChange={event =>
                  updateFilter(
                    'module',
                    event.target.value
                  )
                }
              >

                <option value="all">
                  Tous les modules
                </option>

                {Object.entries(ACTIVITY_MODULES).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="av7-field">

              <label htmlFor="av7-severity">
                Gravité
              </label>

              <select
                id="av7-severity"
                value={filters.severity}
                onChange={event =>
                  updateFilter(
                    'severity',
                    event.target.value
                  )
                }
              >

                <option value="all">
                  Toutes les gravités
                </option>

                {Object.entries(ACTIVITY_SEVERITIES).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="av7-field">

              <label htmlFor="av7-actor">
                Auteur
              </label>

              <select
                id="av7-actor"
                value={filters.actorRole}
                onChange={event =>
                  updateFilter(
                    'actorRole',
                    event.target.value
                  )
                }
              >

                <option value="all">
                  Tous les auteurs
                </option>

                {Object.entries(ACTOR_ROLES).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="av7-field">

              <label htmlFor="av7-start">
                Date de début
              </label>

              <input
                id="av7-start"
                type="date"
                value={filters.fromDate}
                max={filters.toDate || undefined}
                onChange={event =>
                  updateFilter(
                    'fromDate',
                    event.target.value
                  )
                }
              />

            </div>

            <div className="av7-field">

              <label htmlFor="av7-end">
                Date de fin
              </label>

              <input
                id="av7-end"
                type="date"
                value={filters.toDate}
                min={filters.fromDate || undefined}
                onChange={event =>
                  updateFilter(
                    'toDate',
                    event.target.value
                  )
                }
              />

            </div>

          </div>

          {invalidDateRange ? (

            <div className="av2-alert av2-alert-error">
              La date de fin doit être postérieure
              ou égale à la date de début.
            </div>

          ) : loading ? (

            <div className="av2-empty">

              <RefreshCw
                size={30}
                className="av2-spin"
              />

              <p>Chargement du journal...</p>

            </div>

          ) : error ? (

            <div className="av2-empty">

              <AlertTriangle size={36} />

              <h3>Chargement impossible</h3>

              <p>{error}</p>

            </div>

          ) : logs.length === 0 ? (

            <div className="av2-empty">

              <ClipboardList
                size={48}
                strokeWidth={1.2}
              />

              <h3>Aucune activité trouvée</h3>

              <p>
                Aucun événement ne correspond aux filtres.
              </p>

            </div>

          ) : (

            <div className="av2-table-wrap">

              <table className="av2-table av7-table">

                <thead>
                  <tr>
                    <th>Activité</th>
                    <th>Module</th>
                    <th>Auteur</th>
                    <th>Gravité</th>
                    <th>Date et heure</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {logs.map(log => {

                    const Icon =
                      MODULE_ICONS[log.module] ||
                      Activity

                    return (

                      <tr key={log.id}>

                        <td>

                          <div className="av7-event">

                            <div className={`av7-event-icon ${log.severity}`}>
                              <Icon size={20} />
                            </div>

                            <div>

                              <strong>
                                {ACTIVITY_ACTIONS[log.action] ||
                                  log.action}
                              </strong>

                              <small>
                                {log.entity_label || '—'}
                              </small>

                            </div>

                          </div>

                        </td>

                        <td>
                          {ACTIVITY_MODULES[log.module] ||
                            log.module}
                        </td>

                        <td>

                          <span className="av7-actor">

                            <UserRound size={14} />

                            {ACTOR_ROLES[log.actor_role] ||
                              log.actor_role}

                          </span>

                        </td>

                        <td>

                          <SeverityBadge
                            severity={log.severity}
                          />

                        </td>

                        <td>
                          {formatDate(log.created_at)}
                        </td>

                        <td>

                          <button
                            className="av2-icon-btn"
                            aria-label="Consulter l’activité"
                            title="Consulter les détails"
                            onClick={() => {
                              setActor(null)
                              setActorError('')
                              setActorLoading(Boolean(log.actor_id))
                              setSelected(log)
                            }}
                          >
                            <Eye size={18} />
                          </button>

                        </td>

                      </tr>

                    )

                  })}

                </tbody>

              </table>

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

        {/* INFORMATIONS SECURITE */}

        <div className="av7-security-note">

          <ShieldCheck size={22} />

          <div>

            <strong>Journal protégé</strong>

            <p>
              Les événements ne peuvent pas être modifiés
              ni supprimés depuis l’interface administrateur.
              Actualisation automatique toutes les 30 secondes.
            </p>

          </div>

        </div>

        {/* TOAST */}

        {success && (

          <div className="av2-toast" role="status">

            <CheckCircle2 size={22} />

            <span>{success}</span>

            <button
              aria-label="Fermer"
              onClick={() => setSuccess('')}
            >
              <X size={18} />
            </button>

          </div>

        )}

        {/* MODALE DETAILS */}

        {selected && (

          <div
            className="av2-modal-overlay"
            onClick={() => setSelected(null)}
          >

            <section
              className="av2-modal av7-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="av7-modal-title"
              onClick={event =>
                event.stopPropagation()
              }
            >

              <div className="av2-modal-header">

                <h2 id="av7-modal-title">
                  Détails de l’activité
                </h2>

                <button
                  className="av2-icon-btn"
                  aria-label="Fermer"
                  onClick={() => setSelected(null)}
                >
                  <X size={20} />
                </button>

              </div>

              <div className="av7-detail-banner">

                <ClipboardList size={28} />

                <h3>
                  {ACTIVITY_ACTIONS[selected.action] ||
                    selected.action}
                </h3>

                <SeverityBadge
                  severity={selected.severity}
                />

              </div>

              <div className="av7-detail-grid">

                <div className="av7-detail-item">
                  <small>Module</small>
                  <strong>
                    {ACTIVITY_MODULES[selected.module]}
                  </strong>
                </div>

                <div className="av7-detail-item">
                  <small>Date et heure</small>
                  <strong>
                    {formatDate(selected.created_at)}
                  </strong>
                </div>

                <div className="av7-detail-item">

                  <small>Auteur actuel</small>

                  <strong>
                    {actorLoading
                      ? 'Chargement...'
                      : actorError
                        ? 'Indisponible'
                        : actor?.full_name ||
                          (
                            selected.actor_id
                              ? 'Compte indisponible'
                              : 'Système'
                          )}
                  </strong>

                </div>

                <div className="av7-detail-item">

                  <small>Rôle au moment de l’action</small>

                  <strong>
                    {ACTOR_ROLES[selected.actor_role] ||
                      selected.actor_role}
                  </strong>

                </div>

                <div className="av7-detail-item">

                  <small>Cible</small>

                  <strong>
                    {selected.entity_label || '—'}
                  </strong>

                </div>

                <div className="av7-detail-item">

                  <small>Source</small>

                  <strong>
                    {selected.source === 'database'
                      ? 'Base de données'
                      : 'Événement déclaré par React'}
                  </strong>

                </div>

              </div>

              <div className="av7-identifiers">

                <small>Identifiant de l’événement</small>
                <code>{selected.id}</code>

                <small>Identifiant de l’auteur</small>
                <code>{selected.actor_id || '—'}</code>

                <small>Identifiant de la cible</small>
                <code>{selected.entity_id || '—'}</code>

              </div>

              <div className="av7-json-section">

                <h3>Données enregistrées</h3>

                <pre>
                  {JSON.stringify(
                    selected.details || {},
                    null,
                    2
                  )}
                </pre>

              </div>

              <div className="av2-modal-footer">

                {MODULE_ROUTES[selected.module] && (

                  <Link
                    className="av2-btn av2-btn-secondary"
                    to={MODULE_ROUTES[selected.module]}
                  >
                    Ouvrir le module
                  </Link>

                )}

                <button
                  className="av2-btn av7-primary"
                  onClick={() => setSelected(null)}
                >
                  Fermer
                </button>

              </div>

            </section>

          </div>

        )}

      </div>

    </AdminLayout>
  )
}
