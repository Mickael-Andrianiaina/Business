
import { useEffect, useState } from 'react'

import {
  Layers,
  Smartphone,
  Tag,
  Palette,
  HardDrive,
  ShieldCheck,
  Package,
  CheckCircle2,
  Search,
  Plus,
  Pencil,
  Power,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ListChecks
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import {
  getCatalogItems,
  getCatalogStats,
  getCategories,
  createCatalogItem,
  updateCatalogItem,
  toggleCatalogItem
} from '../../services/catalogService'

import './AdminV2.css'
import './AdminV4.css'

const PAGE_SIZE = 12

const TABS = [
  {
    value: 'category',
    label: 'Catégories',
    icon: Layers
  },
  {
    value: 'brand',
    label: 'Marques',
    icon: Tag
  },
  {
    value: 'model',
    label: 'Modèles',
    icon: Smartphone
  },
  {
    value: 'color',
    label: 'Couleurs',
    icon: Palette
  },
  {
    value: 'storage',
    label: 'Capacités',
    icon: HardDrive
  },
  {
    value: 'condition',
    label: 'États',
    icon: ShieldCheck
  }
]

const INITIAL_STATS = {
  total: 0,
  categories: 0,
  models: 0,
  active: 0,
  inactive: 0
}

function createEmptyForm(type) {
  return {
    type,
    name: '',
    parent_id: '',
    color_hex: '#000000',
    description: '',
    sort_order: 0,
    is_active: true
  }
}

export default function CategoriesManagement({
  profile,
  onLogout,
  logoutLoading
}) {
  const [type, setType] = useState('category')
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState(INITIAL_STATS)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [parentId, setParentId] = useState('')

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [refresh, setRefresh] = useState(0)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [metaError, setMetaError] = useState('')
  const [success, setSuccess] = useState('')

  const [modal, setModal] = useState(null)
  const [modalError, setModalError] = useState('')
  const [form, setForm] = useState(
    createEmptyForm('category')
  )

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  )

  const currentTab = TABS.find(
    item => item.value === type
  )

  // ======================================
  // CHARGEMENT DU CATALOGUE
  // ======================================

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    const timer = setTimeout(async () => {
      try {
        const result = await getCatalogItems({
          type,
          search,
          status,
          parentId,
          page,
          pageSize: PAGE_SIZE
        })

        if (!active) return

        setItems(result.items)
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
            'Impossible de charger le catalogue.'
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

  }, [type, search, status, parentId, page, refresh])

  // ======================================
  // STATISTIQUES ET CATEGORIES
  // ======================================

  useEffect(() => {
    let active = true

    setMetaError('')

    Promise.all([
      getCatalogStats(),
      getCategories()
    ])
      .then(([statsData, categoriesData]) => {
        if (!active) return

        setStats(statsData)
        setCategories(categoriesData)
      })
      .catch(err => {
        if (active) {
          setMetaError(err.message)
        }
      })

    return () => {
      active = false
    }

  }, [refresh])

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
  // MODALES
  // ======================================

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

    return () => window.removeEventListener(
      'keydown',
      handleEscape
    )

  }, [modal, busy])

  function changeTab(nextType) {
    setType(nextType)
    setSearch('')
    setStatus('all')
    setParentId('')
    setPage(1)
  }

  function updateField(field, value) {
    setForm(current => ({
      ...current,
      [field]: value
    }))
  }

  function openCreate() {
    setForm(createEmptyForm(type))
    setModalError('')
    setModal({ action: 'create' })
  }

  function openEdit(item) {
    setForm({
      ...item,
      parent_id: item.parent_id || '',
      color_hex: item.color_hex || '#000000',
      description: item.description || ''
    })

    setModalError('')
    setModal({
      action: 'edit',
      item
    })
  }

  function openToggle(item) {
    setModalError('')
    setModal({
      action: 'toggle',
      item
    })
  }

  function closeModal() {
    if (!busy) {
      setModal(null)
      setModalError('')
    }
  }

  // ======================================
  // ENREGISTREMENT
  // ======================================

  async function handleSave(event) {
    event.preventDefault()

    if (busy || !modal) return

    try {
      setBusy(true)
      setModalError('')

      if (modal.action === 'create') {
        await createCatalogItem(form)

        setSuccess(
          'Référence ajoutée avec succès.'
        )

      } else if (modal.action === 'edit') {
        await updateCatalogItem(
          modal.item.id,
          form
        )

        setSuccess(
          'Référence modifiée avec succès.'
        )
      }

      setModal(null)
      setRefresh(value => value + 1)

    } catch (err) {
      setModalError(
        err.message ||
        'Impossible d’enregistrer la référence.'
      )
    } finally {
      setBusy(false)
    }
  }

  // ======================================
  // CHANGER LE STATUT
  // ======================================

  async function handleToggle() {
    if (!modal?.item || busy) return

    try {
      setBusy(true)
      setModalError('')

      const nextStatus = !modal.item.is_active

      await toggleCatalogItem(
        modal.item.id,
        nextStatus
      )

      setSuccess(
        nextStatus
          ? 'Référence activée.'
          : 'Référence désactivée.'
      )

      setModal(null)
      setRefresh(value => value + 1)

    } catch (err) {
      setModalError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const cards = [
    {
      label: 'Total références',
      value: stats.total,
      icon: Package,
      color: 'blue'
    },
    {
      label: 'Catégories',
      value: stats.categories,
      icon: Layers,
      color: 'purple'
    },
    {
      label: 'Modèles',
      value: stats.models,
      icon: Smartphone,
      color: 'indigo'
    },
    {
      label: 'Références actives',
      value: stats.active,
      icon: CheckCircle2,
      color: 'green'
    }
  ]

  return (
    <AdminLayout
      profile={profile}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      <div className="av2 av4">

        {/* EN-TETE */}

        <header className="av2-page-header">
          <div>
            <div className="av2-eyebrow">
              <Layers size={15} />
              Marketplace
            </div>

            <h1>Catalogue Apple</h1>

            <p>
              Gérez les références disponibles
              sur Bizina Iphone.
            </p>
          </div>

          <div className="av4-header-actions">
            <button
              className="av2-btn av2-btn-secondary"
              onClick={() => setRefresh(v => v + 1)}
              disabled={loading}
            >
              <RefreshCw
                size={17}
                className={loading ? 'av2-spin' : ''}
              />
              Actualiser
            </button>

            <button
              className="av2-btn av4-btn-primary"
              onClick={openCreate}
            >
              <Plus size={18} />
              Ajouter
            </button>
          </div>
        </header>

        {(error || metaError) && (
          <div className="av2-alert av2-alert-error">
            {error || metaError}
          </div>
        )}

        {/* STATISTIQUES */}

        <div className="av4-stats-grid">
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

        {/* ONGLETS */}

        <div className="av4-tabs">
          {TABS.map(tab => {
            const Icon = tab.icon

            return (
              <button
                key={tab.value}
                className={`av4-tab ${
                  type === tab.value ? 'active' : ''
                }`}
                aria-pressed={type === tab.value}
                onClick={() => changeTab(tab.value)}
              >
                <Icon size={19} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* CATALOGUE */}

        <section className="av2-panel">

          <div className="av2-panel-heading">
            <div>
              <h3>{currentTab.label}</h3>
              <p>{total} référence(s) trouvée(s)</p>
            </div>

            <ListChecks size={22} />
          </div>

          {/* RECHERCHE */}

          <div className="av2-toolbar">

            <div className="av2-search">
              <Search size={18} />

              <input
                type="search"
                aria-label="Rechercher une référence"
                placeholder="Rechercher une référence..."
                value={search}
                onChange={event => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            </div>

            <select
              className="av4-select"
              aria-label="Filtrer par statut"
              value={status}
              onChange={event => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">
                Tous les statuts
              </option>

              <option value="active">
                Actifs
              </option>

              <option value="inactive">
                Désactivés
              </option>
            </select>

            {type === 'model' && (
              <select
                className="av4-select"
                aria-label="Filtrer par catégorie"
                value={parentId}
                onChange={event => {
                  setParentId(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">
                  Toutes les catégories
                </option>

                {categories.map(category => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            )}

          </div>

          {/* LISTE */}

          {loading ? (
            <div className="av2-empty">
              <RefreshCw
                size={32}
                className="av2-spin"
              />
              <p>Chargement du catalogue...</p>
            </div>

          ) : error ? (
            <div className="av2-empty">
              Impossible de charger le catalogue.
            </div>

          ) : items.length === 0 ? (
            <div className="av2-empty">
              <Package size={45} strokeWidth={1.2} />

              <h3>Aucune référence trouvée</h3>

              <p>
                Ajoutez une référence ou modifiez
                vos filtres.
              </p>

              <button
                className="av2-btn av4-btn-primary"
                onClick={openCreate}
              >
                <Plus size={17} />
                Ajouter une référence
              </button>
            </div>

          ) : (
            <div className="av4-catalog-grid">

              {items.map(item => {
                const ItemIcon = currentTab.icon

                const parent = categories.find(
                  category => category.id === item.parent_id
                )

                return (
                  <article
                    className={`av4-item ${
                      item.is_active ? '' : 'inactive'
                    }`}
                    key={item.id}
                  >
                    <div className="av4-item-top">

                      {type === 'color' ? (
                        <div
                          className="av4-color-preview"
                          style={{
                            backgroundColor: item.color_hex
                          }}
                        />
                      ) : (
                        <div className="av4-item-icon">
                          <ItemIcon size={25} />
                        </div>
                      )}

                      <span
                        className={`av2-status ${
                          item.is_active
                            ? 'approved'
                            : 'av4-inactive'
                        }`}
                      >
                        {item.is_active
                          ? 'Actif'
                          : 'Désactivé'}
                      </span>

                    </div>

                    <h3>{item.name}</h3>

                    {type === 'model' && (
                      <small>
                        {parent?.name ||
                          'Catégorie indisponible'}

                        {parent && !parent.is_active
                          ? ' · Catégorie désactivée'
                          : ''}
                      </small>
                    )}

                    {type === 'color' && (
                      <small>{item.color_hex}</small>
                    )}

                    {item.description && (
                      <p>{item.description}</p>
                    )}

                    <div className="av4-item-footer">

                      <small>
                        Ordre : {item.sort_order}
                      </small>

                      <div className="av2-actions">

                        <button
                          className="av2-icon-btn"
                          title="Modifier"
                          aria-label={`Modifier ${item.name}`}
                          onClick={() => openEdit(item)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className={`av2-icon-btn ${
                            item.is_active ? 'red' : 'green'
                          }`}
                          title={
                            item.is_active
                              ? 'Désactiver'
                              : 'Activer'
                          }
                          aria-label={
                            `${item.is_active
                              ? 'Désactiver'
                              : 'Activer'} ${item.name}`
                          }
                          onClick={() => openToggle(item)}
                        >
                          <Power size={17} />
                        </button>

                      </div>
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

        {/* NOTIFICATION */}

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

        {/* MODALE */}

        {modal && (
          <div
            className="av2-modal-overlay"
            onClick={closeModal}
          >
            <section
              className="av2-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="av4-modal-title"
              onClick={event => event.stopPropagation()}
            >

              <div className="av2-modal-header">
                <h2 id="av4-modal-title">

                  {modal.action === 'create' &&
                    'Nouvelle référence'}

                  {modal.action === 'edit' &&
                    'Modifier la référence'}

                  {modal.action === 'toggle' &&
                    (modal.item.is_active
                      ? 'Désactiver la référence'
                      : 'Activer la référence')}

                </h2>

                <button
                  className="av2-icon-btn"
                  aria-label="Fermer"
                  onClick={closeModal}
                  disabled={busy}
                >
                  <X size={20} />
                </button>
              </div>

              {modalError && (
                <div className="av2-alert av2-alert-error">
                  {modalError}
                </div>
              )}

              {modal.action === 'toggle' ? (
                <>
                  <p>
                    Référence :{' '}
                    <strong>{modal.item.name}</strong>
                  </p>

                  <div className="av4-notice">

                    {modal.item.is_active
                      ? 'Cette référence ne sera plus proposée dans le catalogue actif. Les annonces existantes seront conservées.'
                      : 'Cette référence sera de nouveau disponible dans le catalogue actif.'}

                    {modal.item.type === 'category' && (
                      <p>
                        Les modèles associés conserveront
                        leur propre statut.
                      </p>
                    )}

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
                        modal.item.is_active
                          ? 'av2-btn-danger'
                          : 'av2-btn-success'
                      }`}
                      disabled={busy}
                      onClick={handleToggle}
                    >
                      {busy
                        ? 'Traitement...'
                        : 'Confirmer'}
                    </button>

                  </div>
                </>

              ) : (
                <form onSubmit={handleSave}>

                  <fieldset
                    className="av4-fieldset"
                    disabled={busy}
                  >

                    <div className="av2-field">
                      <label htmlFor="av4-name">
                        Nom de la référence *
                      </label>

                      <input
                        id="av4-name"
                        className="av4-input"
                        type="text"
                        required
                        maxLength={120}
                        autoFocus
                        placeholder="Ex : iPhone 16 Pro Max"
                        value={form.name}
                        onChange={event =>
                          updateField(
                            'name',
                            event.target.value
                          )
                        }
                      />
                    </div>

                    {form.type === 'model' && (
                      <div className="av2-field">
                        <label htmlFor="av4-parent">
                          Catégorie *
                        </label>

                        <select
                          id="av4-parent"
                          className="av4-select"
                          required
                          value={form.parent_id}
                          onChange={event =>
                            updateField(
                              'parent_id',
                              event.target.value
                            )
                          }
                        >
                          <option value="">
                            Sélectionnez une catégorie
                          </option>

                          {categories.map(category => (
                            <option
                              key={category.id}
                              value={category.id}
                            >
                              {category.name}

                              {!category.is_active
                                ? ' (désactivée)'
                                : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {form.type === 'color' && (
                      <div className="av2-field">
                        <label htmlFor="av4-color">
                          Code couleur *
                        </label>

                        <div className="av4-color-field">

                          <input
                            id="av4-color"
                            type="color"
                            value={
                              /^#[0-9a-f]{6}$/i.test(form.color_hex)
                                ? form.color_hex
                                : '#000000'
                            }
                            onChange={event =>
                              updateField(
                                'color_hex',
                                event.target.value
                              )
                            }
                          />

                          <input
                            className="av4-input"
                            aria-label="Code HEX"
                            maxLength={7}
                            pattern="#[0-9A-Fa-f]{6}"
                            required
                            value={form.color_hex}
                            onChange={event =>
                              updateField(
                                'color_hex',
                                event.target.value
                              )
                            }
                          />

                        </div>
                      </div>
                    )}

                    <div className="av2-field">
                      <label htmlFor="av4-description">
                        Description
                      </label>

                      <textarea
                        id="av4-description"
                        rows={4}
                        maxLength={1000}
                        placeholder="Description facultative..."
                        value={form.description}
                        onChange={event =>
                          updateField(
                            'description',
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div className="av2-field">
                      <label htmlFor="av4-order">
                        Ordre d'affichage
                      </label>

                      <input
                        id="av4-order"
                        type="number"
                        className="av4-input"
                        min={0}
                        step={1}
                        value={form.sort_order}
                        onChange={event =>
                          updateField(
                            'sort_order',
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <label className="av4-switch-row">

                      <div>
                        <strong>Référence active</strong>

                        <small>
                          Disponible dans le catalogue
                        </small>
                      </div>

                      <input
                        type="checkbox"
                        role="switch"
                        checked={form.is_active}
                        onChange={event =>
                          updateField(
                            'is_active',
                            event.target.checked
                          )
                        }
                      />

                    </label>

                  </fieldset>

                  <div className="av2-modal-footer">

                    <button
                      type="button"
                      className="av2-btn av2-btn-secondary"
                      onClick={closeModal}
                      disabled={busy}
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      className="av2-btn av4-btn-primary"
                      disabled={busy || !form.name.trim()}
                    >
                      {busy
                        ? 'Enregistrement...'
                        : 'Enregistrer'}
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
