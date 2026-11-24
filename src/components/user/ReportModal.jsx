
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  Flag,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Search,
  RefreshCw,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Package
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_PRIORITIES,
  getReports,
  getReportStats,
  getReportDetails,
  processReport
} from '../../services/reportService'

import './AdminV2.css'
import './AdminV5.css'

const PAGE_SIZE = 10

const INITIAL_STATS = {
  total: 0,
  pending: 0,
  reviewing: 0,
  resolved: 0,
  dismissed: 0,
  urgent: 0
}

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'reviewing', label: 'En cours' },
  { value: 'resolved', label: 'Résolus' },
  { value: 'dismissed', label: 'Rejetés' }
]

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('fr-FR')
    : 'Non renseigné'
}

function StatusBadge({ status }) {
  return (
    <span className={`av2-status av5-status-${status}`}>
      {REPORT_STATUSES[status] || status}
    </span>
  )
}

function PriorityBadge({ priority }) {
  return (
    <span className={`av5-priority av5-priority-${priority}`}>
      {priority === 'urgent' && (
        <AlertTriangle size={13} />
      )}

      {REPORT_PRIORITIES[priority] || priority}
    </span>
  )
}

export default function ReportsManagement({
  profile,
  onLogout,
  logoutLoading
}) {
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState(INITIAL_STATS)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [refresh, setRefresh] = useState(0)

  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [error, setError] = useState('')
  const [statsError, setStatsError] = useState('')
  const [success, setSuccess] = useState('')

  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [modalError, setModalError] = useState('')
  const [decision, setDecision] = useState('reviewing')
  const [decisionPriority, setDecisionPriority] = useState('normal')
  const [note, setNote] = useState('')

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  )

  const isClosed =
    selected &&
    ['resolved', 'dismissed'].includes(selected.status)

  // ======================================
  // CHARGEMENT DES SIGNALEMENTS
  // ======================================

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    const timer = setTimeout(async () => {
      try {
        const result = await getReports({
          status,
          priority,
          search,
          page,
          pageSize: PAGE_SIZE
        })

        if (!active) return

        setReports(result.reports)
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
            'Impossible de charger les signalements.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }

  }, [search, status, priority, page, refresh])

  // ======================================
  // STATISTIQUES
  // ======================================

  useEffect(() => {
    let active = true

    setStatsLoading(true)
    setStatsError('')

    getReportStats()
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

  // ======================================
  // DETAILS DU DOSSIER
  // ======================================

  useEffect(() => {
    if (!selected) return

    let active = true

    setDetails(null)
    setDetailsLoading(true)

    getReportDetails(selected)
      .then(data => {
        if (active) setDetails(data)
      })
      .catch(err => {
        if (active) {
          setModalError(
            err.message ||
            'Impossible de charger les détails.'
          )
        }
      })
      .finally(() => {
        if (active) {
          setDetailsLoading(false)
        }
      })

    return () => {
      active = false
    }

  }, [selected])

  // ======================================
  // NOTIFICATIONS
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
    if (!selected) return

    function handleEscape(event) {
      if (event.key === 'Escape' && !busy) {
        setSelected(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape
      )
    }

  }, [selected, busy])

  function openReport(report) {
    setModalError('')
    setDetails(null)
    setDecision('reviewing')
    setDecisionPriority(report.priority)
    setNote(report.admin_note || '')
    setSelected(report)
  }

  function closeReport() {
    if (!busy) {
      setSelected(null)
      setModalError('')
    }
  }

  // ======================================
  // ENREGISTRER UNE DECISION
  // ======================================

  async function handleDecision(event) {
    event.preventDefault()

    if (!selected || busy || isClosed) return

    if (
      ['resolved', 'dismissed'].includes(decision)
      && !note.trim()
    ) {
      setModalError(
        'La justification est obligatoire.'
      )
      return
    }

    try {
      setBusy(true)
      setModalError('')

      await processReport({
        reportId: selected.id,
        status: decision,
        priority: decisionPriority,
        note
      })

      setSuccess(
        'Décision enregistrée avec succès.'
      )

      setSelected(null)
      setRefresh(value => value + 1)

    } catch (err) {
      setModalError(
        err.message ||
        'Impossible de traiter le dossier.'
      )
    } finally {
      setBusy(false)
    }
  }

  const cards = [
    {
      label: 'Total signalements',
      value: stats.total,
      icon: Flag,
      color: 'blue'
    },
    {
      label: 'En attente',
      value: stats.pending,
      icon: Clock,
      color: 'orange'
    },
    {
      label: 'En cours',
      value: stats.reviewing,
      icon: Search,
      color: 'purple'
    },
    {
      label: 'Résolus',
      value: stats.resolved,
      icon: ShieldCheck,
      color: 'green'
    },
    {
      label: 'Rejetés',
      value: stats.dismissed,
      icon: XCircle,
      color: 'indigo'
    },
    {
      label: 'Dossiers urgents ouverts',
      value: stats.urgent,
      icon: AlertTriangle,
      color: 'red'
    }
  ]

  return (
    <AdminLayout
      profile={profile}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      <div className="av2 av5">

        {/* EN-TETE */}

        <header className="av2-page-header">
          <div>
            <div className="av2-eyebrow">
              <ShieldAlert size={15} />
              Sécurité de la marketplace
            </div>

            <h1>Signalements</h1>

            <p>
              Traitez les plaintes et protégez
              la communauté Bizina Iphone.
            </p>
          </div>

          <button
            className="av2-btn av2-btn-secondary"
            disabled={loading}
            onClick={() => setRefresh(v => v + 1)}
          >
            <RefreshCw
              size={17}
              className={loading ? 'av2-spin' : ''}
            />
            Actualiser
          </button>
        </header>

        {/* ERREURS */}

        {(error || statsError) && (
          <div className="av2-alert av2-alert-error">
            {error || statsError}
          </div>
        )}

        {/* BANNIERE */}

        <section className="av5-banner">
          <div>
            <small>CENTRE DE CONFIANCE</small>

            <h2>Une marketplace plus sûre.</h2>

            <p>
              Vérifiez les signalements,
              analysez les annonces suspectes
              et prenez les décisions appropriées.
            </p>
          </div>

          <ShieldCheck
            size={110}
            strokeWidth={0.9}
            className="av5-banner-icon"
          />
        </section>

        {/* STATISTIQUES */}

        <div className="av5-stats-grid">
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

        {/* ALERTE URGENCE */}

        {!statsError && stats.urgent > 0 && (
          <div className="av5-urgent-alert">
            <AlertTriangle size={23} />

            <div>
              <strong>
                {stats.urgent} dossier(s) urgent(s)
              </strong>

              <p>
                Ces dossiers nécessitent
                une attention prioritaire.
              </p>
            </div>

            <button
              className="av2-btn av2-btn-secondary"
              onClick={() => {
                setPriority('urgent')
                setStatus('all')
                setSearch('')
                setPage(1)
              }}
            >
              Voir les dossiers
            </button>
          </div>
        )}

        {/* LISTE */}

        <section className="av2-panel">
          <div className="av2-panel-heading">
            <div>
              <h3>Gestion des signalements</h3>
              <p>{total} dossier(s) trouvé(s)</p>
            </div>

            <Flag size={21} />
          </div>

          <div className="av2-toolbar">

            <div className="av2-search">
              <Search size={18} />

              <input
                type="search"
                placeholder="Rechercher une annonce ou un vendeur..."
                aria-label="Rechercher une cible"
                value={search}
                onChange={event => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            </div>

            <select
              className="av5-select"
              aria-label="Filtrer par priorité"
              value={priority}
              onChange={event => {
                setPriority(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">
                Toutes les priorités
              </option>

              {Object.entries(REPORT_PRIORITIES).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>

          </div>

          <div className="av2-filters av5-filters">
            {FILTERS.map(filter => (
              <button
                key={filter.value}
                className={
                  status === filter.value
                    ? 'av2-filter active'
                    : 'av2-filter'
                }
                onClick={() => {
                  setStatus(filter.value)
                  setPage(1)
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="av2-empty">
              <RefreshCw
                size={30}
                className="av2-spin"
              />

              <p>Chargement des dossiers...</p>
            </div>

          ) : error ? (
            <div className="av2-empty">
              Impossible de charger les dossiers.
            </div>

          ) : reports.length === 0 ? (
            <div className="av2-empty">
              <ShieldCheck size={48} strokeWidth={1.2} />

              <h3>Aucun signalement trouvé</h3>

              <p>
                Aucun dossier ne correspond aux filtres.
              </p>
            </div>

          ) : (
            <div className="av2-table-wrap">

              <table className="av2-table">
                <thead>
                  <tr>
                    <th>Signalement</th>
                    <th>Motif</th>
                    <th>Priorité</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.map(report => (
                    <tr key={report.id}>

                      <td>
                        <div className="av5-target-cell">
                          <div className="av5-target-icon">

                            {report.target_type === 'product'
                              ? <Package size={20} />
                              : <UserRound size={20} />}

                          </div>

                          <div>
                            <strong>
                              {report.target_label}
                            </strong>

                            <small>
                              {report.target_type === 'product'
                                ? 'Annonce'
                                : 'Vendeur'}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {REPORT_REASONS[report.reason]}
                      </td>

                      <td>
                        <PriorityBadge
                          priority={report.priority}
                        />
                      </td>

                      <td>
                        <StatusBadge status={report.status} />
                      </td>

                      <td>
                        {formatDate(report.created_at)}
                      </td>

                      <td>
                        <button
                          className="av2-icon-btn"
                          title="Consulter le dossier"
                          aria-label="Consulter le dossier"
                          onClick={() => openReport(report)}
                        >
                          <Eye size={18} />
                        </button>
                      </td>

                    </tr>
                  ))}
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
                onClick={() => setPage(v => v - 1)}
              >
                <ChevronLeft size={20} />
              </button>

              <button
                className="av2-icon-btn"
                disabled={page >= totalPages || loading}
                aria-label="Page suivante"
                onClick={() => setPage(v => v + 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>

          </div>
        </section>

        {/* TOAST */}

        {success && (
          <div className="av2-toast" role="status">
            <CheckCircle2 size={23} />

            <span>{success}</span>

            <button
              aria-label="Fermer la notification"
              onClick={() => setSuccess('')}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* DETAILS ET TRAITEMENT */}

        {selected && (
          <div
            className="av2-modal-overlay"
            onClick={closeReport}
          >
            <section
              className="av2-modal av5-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="av5-modal-title"
              onClick={event => event.stopPropagation()}
            >

              <div className="av2-modal-header">
                <h2 id="av5-modal-title">
                  Dossier de signalement
                </h2>

                <button
                  className="av2-icon-btn"
                  aria-label="Fermer"
                  disabled={busy}
                  onClick={closeReport}
                >
                  <X size={20} />
                </button>
              </div>

              {modalError && (
                <div className="av2-alert av2-alert-error">
                  {modalError}
                </div>
              )}

              <div className="av5-report-summary">

                <small>Référence du dossier</small>

                <strong className="av5-report-id">
                  {selected.id}
                </strong>

                <h3>{selected.target_label}</h3>

                <div className="av5-badges">
                  <StatusBadge status={selected.status} />

                  <PriorityBadge
                    priority={selected.priority}
                  />
                </div>

              </div>

              <div className="av5-detail-section">
                <h3>Motif du signalement</h3>

                <strong>
                  {REPORT_REASONS[selected.reason]}
                </strong>

                <p>{selected.description}</p>

                <small>
                  Signalé le {formatDate(selected.created_at)}
                </small>
              </div>

              {detailsLoading ? (
                <div className="av2-empty">
                  <RefreshCw
                    size={25}
                    className="av2-spin"
                  />

                  <p>Chargement des informations...</p>
                </div>

              ) : details && (
                <>
                  <div className="av5-person-grid">

                    <div className="av5-person-card">
                      <UserRound size={21} />

                      <small>Auteur du signalement</small>

                      <strong>
                        {details.reporter?.full_name ||
                          'Utilisateur indisponible'}
                      </strong>

                      <p>{details.reporter?.email || '—'}</p>
                    </div>

                    <div className="av5-person-card">
                      <ShieldAlert size={21} />

                      <small>Utilisateur signalé</small>

                      <strong>
                        {details.reportedUser?.full_name ||
                          'Utilisateur indisponible'}
                      </strong>

                      <p>
                        {details.reportedUser?.email || '—'}
                      </p>

                      {details.reportedUser && (
                        <Link
                          to="/admin/users"
                          className="av5-link"
                        >
                          Gestion des utilisateurs
                        </Link>
                      )}
                    </div>

                  </div>

                  {selected.target_type === 'product' && (
                    <div className="av5-detail-section">
                      <h3>Annonce signalée</h3>

                      {details.product ? (
                        <>
                          <strong>{details.product.name}</strong>

                          <p>
                            {Number(
                              details.product.price
                            ).toLocaleString('fr-FR')} Ar
                          </p>

                          <p>
                            {details.product.description ||
                              'Aucune description.'}
                          </p>

                          <Link
                            className="av5-link"
                            to="/admin/products"
                          >
                            Ouvrir la modération des produits
                          </Link>
                        </>
                      ) : (
                        <p>
                          Annonce supprimée ou indisponible.
                        </p>
                      )}

                    </div>
                  )}

                  {/* HISTORIQUE */}

                  <div className="av5-detail-section">
                    <h3>Historique des décisions</h3>

                    {details.logs.length === 0 ? (
                      <p>Aucune décision enregistrée.</p>
                    ) : (
                      <div className="av5-history">

                        {details.logs.map(log => (
                          <div
                            className="av5-history-item"
                            key={log.id}
                          >
                            <Clock size={17} />

                            <div>
                              <strong>
                                {REPORT_STATUSES[
                                  log.previous_status
                                ]}

                                {' → '}

                                {REPORT_STATUSES[
                                  log.new_status
                                ]}
                              </strong>

                              <p>
                                Priorité :{' '}
                                {REPORT_PRIORITIES[
                                  log.previous_priority
                                ]}

                                {' → '}

                                {REPORT_PRIORITIES[
                                  log.new_priority
                                ]}
                              </p>

                              <p>
                                {log.note || 'Sans commentaire'}
                              </p>

                              <small>
                                {formatDate(log.created_at)}
                              </small>
                            </div>
                          </div>
                        ))}

                      </div>
                    )}
                  </div>
                </>
              )}

              {/* DECISION ADMINISTRATIVE */}

              {isClosed ? (
                <div className="av5-closed">
                  <ShieldCheck size={22} />

                  <div>
                    <strong>Dossier clôturé</strong>
                    <p>{selected.admin_note}</p>
                  </div>
                </div>

              ) : (
                <form onSubmit={handleDecision}>

                  <div className="av5-decision">

                    <h3>Décision administrative</h3>

                    <div className="av5-form-grid">

                      <div className="av2-field">
                        <label htmlFor="av5-decision">
                          Statut
                        </label>

                        <select
                          id="av5-decision"
                          className="av5-select"
                          value={decision}
                          disabled={busy}
                          onChange={event =>
                            setDecision(event.target.value)
                          }
                        >
                          {Object.entries(REPORT_STATUSES).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="av2-field">
                        <label htmlFor="av5-priority">
                          Priorité
                        </label>

                        <select
                          id="av5-priority"
                          className="av5-select"
                          value={decisionPriority}
                          disabled={busy}
                          onChange={event =>
                            setDecisionPriority(event.target.value)
                          }
                        >
                          {Object.entries(REPORT_PRIORITIES).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                    </div>

                    <div className="av2-field">
                      <label htmlFor="av5-note">
                        Justification administrative
                      </label>

                      <textarea
                        id="av5-note"
                        rows={5}
                        maxLength={2000}
                        required={
                          ['resolved', 'dismissed']
                            .includes(decision)
                        }
                        disabled={busy}
                        value={note}
                        placeholder="Décrivez les vérifications et votre décision..."
                        onChange={event =>
                          setNote(event.target.value)
                        }
                      />
                    </div>

                    <div className="av5-notice">
                      <AlertTriangle size={18} />

                      <span>
                        Clôturer ce dossier ne suspend pas
                        automatiquement le vendeur et
                        ne supprime pas son annonce.
                      </span>
                    </div>

                    {['resolved', 'dismissed'].includes(decision) && (
                      <p>
                        La clôture du dossier sera définitive.
                      </p>
                    )}

                  </div>

                  <div className="av2-modal-footer">

                    <button
                      type="button"
                      className="av2-btn av2-btn-secondary"
                      disabled={busy}
                      onClick={closeReport}
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      className="av2-btn av5-btn-primary"
                      disabled={
                        busy ||
                        detailsLoading ||
                        !details ||
                        (
                          ['resolved', 'dismissed']
                            .includes(decision)
                          && !note.trim()
                        )
                      }
                    >
                      <ShieldCheck size={17} />

                      {busy
                        ? 'Enregistrement...'
                        : 'Enregistrer la décision'}
                    </button>

                  </div>

                </form>
              )}

            </section>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
