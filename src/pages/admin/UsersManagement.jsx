
import { useEffect, useState } from 'react'

import {
  Users,
  UserCheck,
  UserMinus,
  UserX,
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  Ban,
  Clock,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import {
  getUsers,
  getUserStats,
  changeUserStatus,
  getEffectiveStatus,
  getUserSanctions,
  getUserProductStats
} from '../../services/userService'

import './AdminV2.css'
import './AdminV3.css'

const PAGE_SIZE = 10

const INITIAL_STATS = {
  total: 0,
  active: 0,
  suspended: 0,
  banned: 0,
  admins: 0
}

const STATUS_LABELS = {
  active: 'Actif',
  suspended: 'Suspendu',
  banned: 'Banni'
}

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'suspended', label: 'Suspendus' },
  { value: 'banned', label: 'Bannis' }
]

const DURATIONS = [
  { value: '1', label: '24 heures' },
  { value: '3', label: '3 jours' },
  { value: '7', label: '7 jours' },
  { value: '15', label: '15 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' }
]

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('fr-FR')
    : 'Non renseigné'
}

function getInitials(name) {
  return (name || 'Utilisateur')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0] || '')
    .join('')
    .toUpperCase()
}

function UserAvatar({ user }) {
  const [failed, setFailed] = useState(false)

  const validAvatar =
    typeof user.avatar_url === 'string' &&
    /^https:\/\//i.test(user.avatar_url)

  return (
    <div className="av3-avatar">
      {validAvatar && !failed ? (
        <img
          src={user.avatar_url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(user.full_name)
      )}
    </div>
  )
}

export default function UsersManagement({
  profile,
  onLogout,
  logoutLoading
}) {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(INITIAL_STATS)

  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [role, setRole] = useState('all')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [modal, setModal] = useState(null)
  const [modalError, setModalError] = useState('')
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('7')

  const [history, setHistory] = useState([])
  const [productStats, setProductStats] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  )

  // CHARGEMENT DES UTILISATEURS

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    const timer = setTimeout(async () => {
      try {
        const result = await getUsers({
          search,
          status,
          role,
          page,
          pageSize: PAGE_SIZE
        })

        if (!active) return

        setUsers(result.users)
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
            'Impossible de charger les utilisateurs.'
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
  }, [search, status, role, page, refresh])

  // STATISTIQUES

  useEffect(() => {
    let active = true

    getUserStats()
      .then(data => {
        if (active) setStats(data)
      })
      .catch(err => {
        if (active) {
          setError(err.message)
        }
      })

    return () => {
      active = false
    }
  }, [refresh])

  // NOTIFICATION DE SUCCES

  useEffect(() => {
    if (!success) return

    const timer = setTimeout(
      () => setSuccess(''),
      4000
    )

    return () => clearTimeout(timer)
  }, [success])

  // DETAILS UTILISATEUR

  const selectedUserId =
    modal?.type === 'details'
      ? modal.user.id
      : null

  useEffect(() => {
    if (!selectedUserId) return

    let active = true

    setHistory([])
    setProductStats(null)
    setDetailsLoading(true)

    Promise.all([
      getUserSanctions(selectedUserId),
      getUserProductStats(selectedUserId)
    ])
      .then(([historyData, statsData]) => {
        if (active) {
          setHistory(historyData)
          setProductStats(statsData)
        }
      })
      .catch(err => {
        if (active) {
          setModalError(err.message)
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
  }, [selectedUserId])

  // FERMETURE AVEC ECHAP

  useEffect(() => {
    if (!modal) return

    function handleEscape(event) {
      if (event.key === 'Escape' && !busy) {
        setModal(null)
      }
    }

    window.addEventListener(
      'keydown',
      handleEscape
    )

    return () =>
      window.removeEventListener(
        'keydown',
        handleEscape
      )
  }, [modal, busy])

  function openModal(type, user) {
    setReason('')
    setDuration('7')
    setModalError('')
    setModal({ type, user })
  }

  function closeModal() {
    if (!busy) {
      setModal(null)
    }
  }

  // CONFIRMATION DE SANCTION

  async function confirmAction() {
    if (!modal || busy) return

    if (modal.user.role === 'admin') {
      setModalError(
        'Ce compte administrateur est protégé.'
      )
      return
    }

    if (
      modal.type !== 'active' &&
      !reason.trim()
    ) {
      setModalError('Le motif est obligatoire.')
      return
    }

    try {
      setBusy(true)
      setModalError('')

      const until =
        modal.type === 'suspended'
          ? new Date(
              Date.now() +
              Number(duration) * 86400000
            ).toISOString()
          : null

      await changeUserStatus(
        modal.user.id,
        modal.type,
        reason,
        until
      )

      const messages = {
        active: 'Compte réactivé avec succès.',
        suspended: 'Compte suspendu avec succès.',
        banned: 'Compte banni avec succès.'
      }

      setSuccess(messages[modal.type])
      setModal(null)
      setRefresh(value => value + 1)
    } catch (err) {
      setModalError(
        err.message ||
        'Impossible de modifier le compte.'
      )
    } finally {
      setBusy(false)
    }
  }

  const cards = [
    {
      label: 'Total des comptes',
      value: stats.total,
      icon: Users,
      color: 'blue'
    },
    {
      label: 'Comptes actifs',
      value: stats.active,
      icon: UserCheck,
      color: 'green'
    },
    {
      label: 'Comptes suspendus',
      value: stats.suspended,
      icon: UserMinus,
      color: 'orange'
    },
    {
      label: 'Comptes bannis',
      value: stats.banned,
      icon: UserX,
      color: 'red'
    }
  ]

  return (
    <AdminLayout
      profile={profile}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      <div className="av2 av3">

        <header className="av2-page-header">
          <div>
            <div className="av2-eyebrow">
              <Users size={15} />
              Communauté
            </div>

            <h1>Gestion des utilisateurs</h1>

            <p>
              Administrez et sécurisez les comptes
              de Bizina Iphone.
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

        {error && (
          <div className="av2-alert av2-alert-error">
            {error}
          </div>
        )}

        <div className="av3-stats-grid">
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
                  <strong>{card.value}</strong>
                )}
              </div>
            )
          })}
        </div>

        <div className="av3-security-banner">
          <ShieldCheck size={25} />

          <div>
            <strong>Protection des comptes administrateurs</strong>
            <p>
              {stats.admins} compte(s) administrateur(s)
              protégé(s) contre les sanctions.
            </p>
          </div>
        </div>

        <section className="av2-panel">

          <div className="av2-panel-heading">
            <div>
              <h3>Liste des utilisateurs</h3>
              <p>{total} compte(s) trouvé(s)</p>
            </div>
          </div>

          <div className="av2-toolbar">

            <div className="av2-search">
              <Search size={19} />

              <input
                type="search"
                aria-label="Rechercher un utilisateur"
                placeholder="Nom ou adresse e-mail..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <select
              className="av3-select"
              aria-label="Filtrer par rôle"
              value={role}
              onChange={e => {
                setRole(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">Tous les rôles</option>
              <option value="user">Utilisateurs</option>
              <option value="admin">Administrateurs</option>
            </select>

          </div>

          <div className="av2-filters av3-filters">
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
              <p>Chargement des utilisateurs...</p>
            </div>
          ) : error ? (
            <div className="av2-empty">
              Impossible de charger les données.
            </div>
          ) : users.length === 0 ? (
            <div className="av2-empty">
              <Users size={45} strokeWidth={1.2} />
              <h3>Aucun utilisateur trouvé</h3>
              <p>Essayez de modifier les filtres.</p>
            </div>
          ) : (
            <div className="av2-table-wrap">
              <table className="av2-table">

                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Inscription</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map(user => {
                    const effectiveStatus =
                      getEffectiveStatus(user)

                    const isAdmin =
                      user.role === 'admin'

                    return (
                      <tr key={user.id}>

                        <td>
                          <div className="av3-user-cell">
                            <UserAvatar user={user} />

                            <div>
                              <strong>
                                {user.full_name || 'Sans nom'}
                              </strong>

                              <small>
                                {user.email || 'Sans e-mail'}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`av3-role ${user.role}`}>
                            {isAdmin && (
                              <ShieldCheck size={13} />
                            )}

                            {isAdmin
                              ? 'Admin'
                              : 'Utilisateur'}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`av2-status av3-status-${effectiveStatus}`}
                          >
                            {STATUS_LABELS[effectiveStatus]}
                          </span>
                        </td>

                        <td>
                          {user.created_at
                            ? new Date(
                                user.created_at
                              ).toLocaleDateString('fr-FR')
                            : '-'}
                        </td>

                        <td>
                          <div className="av2-actions">

                            <button
                              className="av2-icon-btn"
                              title="Voir le profil"
                              aria-label="Voir le profil"
                              onClick={() =>
                                openModal('details', user)
                              }
                            >
                              <Eye size={17} />
                            </button>

                            {!isAdmin && (
                              <>
                                {effectiveStatus === 'active' && (
                                  <button
                                    className="av2-icon-btn av3-orange"
                                    title="Suspendre"
                                    aria-label="Suspendre"
                                    onClick={() =>
                                      openModal('suspended', user)
                                    }
                                  >
                                    <Clock size={17} />
                                  </button>
                                )}

                                {effectiveStatus !== 'banned' && (
                                  <button
                                    className="av2-icon-btn red"
                                    title="Bannir"
                                    aria-label="Bannir"
                                    onClick={() =>
                                      openModal('banned', user)
                                    }
                                  >
                                    <Ban size={17} />
                                  </button>
                                )}

                                {user.account_status !== 'active' && (
                                  <button
                                    className="av2-icon-btn green"
                                    title="Réactiver"
                                    aria-label="Réactiver"
                                    onClick={() =>
                                      openModal('active', user)
                                    }
                                  >
                                    <UserCheck size={17} />
                                  </button>
                                )}
                              </>
                            )}

                          </div>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>

              </table>
            </div>
          )}

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

        {modal && (
          <div
            className="av2-modal-overlay"
            onClick={closeModal}
          >
            <section
              className="av2-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="av3-modal-title"
              onClick={e => e.stopPropagation()}
            >

              <div className="av2-modal-header">
                <h2 id="av3-modal-title">
                  {modal.type === 'details' && 'Profil utilisateur'}
                  {modal.type === 'suspended' && 'Suspendre le compte'}
                  {modal.type === 'banned' && 'Bannir le compte'}
                  {modal.type === 'active' && 'Réactiver le compte'}
                </h2>

                <button
                  className="av2-icon-btn"
                  disabled={busy}
                  onClick={closeModal}
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>

              {modalError && (
                <div className="av2-alert av2-alert-error">
                  {modalError}
                </div>
              )}

              <div className="av3-profile-header">
                <UserAvatar user={modal.user} />

                <div>
                  <h3>
                    {modal.user.full_name || 'Utilisateur'}
                  </h3>

                  <p>{modal.user.email}</p>
                </div>
              </div>

              {modal.type === 'details' ? (
                <>
                  <div className="av2-detail-grid">

                    <div>
                      <small>Téléphone</small>
                      <strong>
                        {modal.user.phone || '-'}
                      </strong>
                    </div>

                    <div>
                      <small>Rôle</small>
                      <strong>{modal.user.role}</strong>
                    </div>

                    <div>
                      <small>Statut</small>
                      <strong>
                        {STATUS_LABELS[
                          getEffectiveStatus(modal.user)
                        ]}
                      </strong>
                    </div>

                    <div>
                      <small>Inscription</small>
                      <strong>
                        {formatDate(modal.user.created_at)}
                      </strong>
                    </div>

                  </div>

                  {modal.user.suspension_reason && (
                    <div className="av3-warning">
                      <strong>Motif de la dernière sanction</strong>

                      <p>
                        {modal.user.suspension_reason}
                      </p>

                      {modal.user.suspended_until && (
                        <p>
                          Expiration :{' '}
                          {formatDate(
                            modal.user.suspended_until
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <h3>Activité commerciale</h3>

                  {detailsLoading ? (
                    <p>Chargement des informations...</p>
                  ) : productStats && (
                    <div className="av3-product-stats">

                      {[
                        ['Total', productStats.total],
                        ['En attente', productStats.pending],
                        ['Approuvés', productStats.approved],
                        ['Refusés', productStats.rejected]
                      ].map(([label, value]) => (
                        <div key={label}>
                          <strong>{value}</strong>
                          <small>{label}</small>
                        </div>
                      ))}

                    </div>
                  )}

                  <h3>Historique des sanctions</h3>

                  {detailsLoading ? (
                    <p>Chargement...</p>
                  ) : history.length === 0 ? (
                    <p>Aucune sanction enregistrée.</p>
                  ) : (
                    <div className="av3-history">
                      {history.map(item => (
                        <div
                          className="av3-history-item"
                          key={item.id}
                        >
                          <Clock size={17} />

                          <div>
                            <strong>
                              {STATUS_LABELS[item.previous_status]}
                              {' → '}
                              {STATUS_LABELS[item.new_status]}
                            </strong>

                            <p>
                              {item.reason || 'Réactivation'}
                            </p>

                            <small>
                              {formatDate(item.created_at)}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="av2-modal-footer">
                    <button
                      className="av2-btn av2-btn-secondary"
                      onClick={closeModal}
                    >
                      Fermer
                    </button>
                  </div>

                </>
              ) : (
                <>
                  {modal.type === 'suspended' && (
                    <div className="av3-warning">
                      Le compte sera temporairement privé
                      d'accès aux fonctionnalités protégées.
                    </div>
                  )}

                  {modal.type === 'banned' && (
                    <div className="av2-alert av2-alert-error">
                      Le compte sera bloqué sans date
                      d'expiration, jusqu'à sa réactivation.
                    </div>
                  )}

                  {modal.type === 'active' && (
                    <div className="av3-success">
                      L'utilisateur retrouvera ses
                      permissions sur la marketplace.
                    </div>
                  )}

                  {modal.type === 'suspended' && (
                    <div className="av2-field">
                      <label htmlFor="av3-duration">
                        Durée de suspension
                      </label>

                      <select
                        id="av3-duration"
                        className="av3-select"
                        value={duration}
                        disabled={busy}
                        onChange={e =>
                          setDuration(e.target.value)
                        }
                      >
                        {DURATIONS.map(item => (
                          <option
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="av2-field">
                    <label htmlFor="av3-reason">
                      Motif
                      {modal.type !== 'active'
                        ? ' *'
                        : ' (facultatif)'}
                    </label>

                    <textarea
                      id="av3-reason"
                      rows={5}
                      maxLength={1000}
                      placeholder="Indiquez le motif de cette action..."
                      value={reason}
                      disabled={busy}
                      onChange={e =>
                        setReason(e.target.value)
                      }
                    />
                  </div>

                  <div className="av2-modal-footer">
                    <button
                      className="av2-btn av2-btn-secondary"
                      disabled={busy}
                      onClick={closeModal}
                    >
                      Annuler
                    </button>

                    <button
                      className={`av2-btn ${
                        modal.type === 'active'
                          ? 'av2-btn-success'
                          : 'av2-btn-danger'
                      }`}
                      disabled={
                        busy ||
                        (
                          modal.type !== 'active' &&
                          !reason.trim()
                        )
                      }
                      onClick={confirmAction}
                    >
                      {busy
                        ? 'Traitement...'
                        : 'Confirmer'}
                    </button>
                  </div>
                </>
              )}

            </section>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
