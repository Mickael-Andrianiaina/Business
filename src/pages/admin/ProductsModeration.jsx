
import { useEffect, useState } from 'react'

import {
  Package,
  Search,
  RefreshCw,
  Eye,
  Check,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import {
  getAdminProducts,
  moderateProduct,
  deleteProduct,
  getProductSeller
} from '../../services/adminService'

import './AdminV2.css'

const PAGE_SIZE = 10

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvés' },
  { value: 'rejected', label: 'Refusés' }
]

const STATUS_LABELS = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé'
}

const formatPrice = value =>
  `${Number(value || 0).toLocaleString('fr-FR')} Ar`

function getImages(product) {
  return [...new Set([
    ...(Array.isArray(product.images) ? product.images : []),
    product.image_url
  ].filter(url =>
    typeof url === 'string' && /^https:\/\//i.test(url)
  ))]
}

export default function ProductsModeration({
  profile,
  onLogout,
  logoutLoading
}) {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [modal, setModal] = useState(null)
  const [modalError, setModalError] = useState('')
  const [reason, setReason] = useState('')
  const [seller, setSeller] = useState(null)
  const [sellerLoading, setSellerLoading] = useState(false)

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  )

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    const timer = setTimeout(async () => {
      try {
        const result = await getAdminProducts({
          status,
          search,
          page,
          pageSize: PAGE_SIZE
        })

        if (!active) return

        setProducts(result.products)
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
          setError(err.message || 'Erreur de chargement.')
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
  }, [status, search, page, refresh])

  useEffect(() => {
    if (!success) return

    const timer = setTimeout(() => {
      setSuccess('')
    }, 3500)

    return () => clearTimeout(timer)
  }, [success])

  const sellerId =
    modal?.type === 'details'
      ? modal.product.user_id
      : null

  useEffect(() => {
    if (!sellerId) return

    let active = true

    setSeller(null)
    setSellerLoading(true)

    getProductSeller(sellerId)
      .then(data => {
        if (active) setSeller(data)
      })
      .catch(err => {
        if (active) {
          setModalError(
            err.message || 'Vendeur indisponible.'
          )
        }
      })
      .finally(() => {
        if (active) setSellerLoading(false)
      })

    return () => {
      active = false
    }
  }, [sellerId])

  function openModal(type, product) {
    setReason('')
    setModalError('')
    setSeller(null)
    setModal({ type, product })
  }

  function closeModal() {
    if (!busy) {
      setModal(null)
      setReason('')
      setModalError('')
    }
  }

  useEffect(() => {
    if (!modal) return

    function handleEscape(event) {
      if (event.key === 'Escape' && !busy) {
        setModal(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () =>
      window.removeEventListener('keydown', handleEscape)
  }, [modal, busy])

  async function confirmAction() {
    if (!modal || busy) return

    if (modal.type === 'rejected' && !reason.trim()) {
      setModalError('Le motif du refus est obligatoire.')
      return
    }

    try {
      setBusy(true)
      setModalError('')
      setError('')

      if (modal.type === 'delete') {
        await deleteProduct(modal.product.id)
        setSuccess('Annonce supprimée avec succès.')
      } else {
        await moderateProduct(
          modal.product.id,
          modal.type,
          reason
        )

        setSuccess(
          modal.type === 'approved'
            ? 'Annonce approuvée avec succès.'
            : 'Annonce refusée avec succès.'
        )
      }

      setModal(null)
      setReason('')
      setRefresh(current => current + 1)

    } catch (err) {
      setModalError(
        err.message || 'Impossible de traiter cette annonce.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminLayout
      profile={profile}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      <div className="av2">

        <div className="av2-page-header">
          <div>
            <div className="av2-eyebrow">
              <Package size={15} />
              Marketplace
            </div>

            <h1>Modération des produits</h1>

            <p>
              Contrôlez les annonces publiées par les membres
              de Bizina Iphone.
            </p>
          </div>

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
        </div>

        {error && (
          <div className="av2-alert av2-alert-error">
            {error}
          </div>
        )}

        <section className="av2-panel">

          <div className="av2-panel-heading">
            <div>
              <h3>Gestion des publications</h3>
              <p>{total} annonce(s) trouvée(s)</p>
            </div>
          </div>

          <div className="av2-toolbar">

            <div className="av2-search">
              <Search size={19} />

              <input
                type="search"
                placeholder="Rechercher un produit..."
                aria-label="Rechercher un produit"
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="av2-filters">
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

          </div>

          {loading ? (
            <div className="av2-empty">
              <RefreshCw
                className="av2-spin"
                size={30}
              />
              <p>Chargement des annonces...</p>
            </div>
          ) : error ? (
            <div className="av2-empty">
              Impossible de charger les annonces.
            </div>
          ) : products.length === 0 ? (
            <div className="av2-empty">
              <Package size={48} strokeWidth={1.2} />
              <h3>Aucun produit trouvé</h3>
              <p>Modifiez vos filtres de recherche.</p>
            </div>
          ) : (
            <div className="av2-table-wrap">

              <table className="av2-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Prix</th>
                    <th>Quantité</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map(product => {
                    const images = getImages(product)

                    return (
                      <tr key={product.id}>

                        <td>
                          <div className="av2-product-cell">

                            <div className="av2-product-image">
                              {images[0] ? (
                                <img
                                  src={images[0]}
                                  alt={product.name}
                                  loading="lazy"
                                />
                              ) : (
                                <ImageIcon size={23} />
                              )}
                            </div>

                            <div>
                              <strong>{product.name}</strong>
                              <small>
                                {product.category || 'Apple'}
                                {product.model
                                  ? ` · ${product.model}`
                                  : ''}
                              </small>
                            </div>

                          </div>
                        </td>

                        <td>{formatPrice(product.price)}</td>

                        <td>{product.quantity}</td>

                        <td>
                          {new Date(
                            product.created_at
                          ).toLocaleDateString('fr-FR')}
                        </td>

                        <td>
                          <span
                            className={`av2-status ${product.status}`}
                          >
                            {STATUS_LABELS[product.status] ||
                              product.status}
                          </span>
                        </td>

                        <td>
                          <div className="av2-actions">

                            <button
                              className="av2-icon-btn"
                              title="Voir les détails"
                              aria-label="Voir les détails"
                              onClick={() =>
                                openModal('details', product)
                              }
                            >
                              <Eye size={17} />
                            </button>

                            {product.status === 'pending' && (
                              <>
                                <button
                                  className="av2-icon-btn green"
                                  title="Approuver"
                                  aria-label="Approuver"
                                  onClick={() =>
                                    openModal('approved', product)
                                  }
                                >
                                  <Check size={18} />
                                </button>

                                <button
                                  className="av2-icon-btn red"
                                  title="Refuser"
                                  aria-label="Refuser"
                                  onClick={() =>
                                    openModal('rejected', product)
                                  }
                                >
                                  <X size={18} />
                                </button>
                              </>
                            )}

                            <button
                              className="av2-icon-btn red"
                              title="Supprimer"
                              aria-label="Supprimer"
                              onClick={() =>
                                openModal('delete', product)
                              }
                            >
                              <Trash2 size={17} />
                            </button>

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
            <span>Page {page} sur {totalPages}</span>

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
              onClick={() => setSuccess('')}
              aria-label="Fermer la notification"
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
              aria-labelledby="av2-modal-title"
              onClick={e => e.stopPropagation()}
            >
              <div className="av2-modal-header">
                <h2 id="av2-modal-title">
                  {modal.type === 'details' && 'Détails du produit'}
                  {modal.type === 'approved' && 'Approuver le produit'}
                  {modal.type === 'rejected' && 'Refuser le produit'}
                  {modal.type === 'delete' && 'Supprimer le produit'}
                </h2>

                <button
                  className="av2-icon-btn"
                  onClick={closeModal}
                  disabled={busy}
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

              {modal.type === 'details' ? (
                <div className="av2-details">

                  <div className="av2-gallery">
                    {getImages(modal.product).map(url => (
                      <a
                        href={url}
                        key={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={url}
                          alt={modal.product.name}
                        />
                      </a>
                    ))}
                  </div>

                  <h3>{modal.product.name}</h3>

                  <strong className="av2-detail-price">
                    {formatPrice(modal.product.price)}
                  </strong>

                  <p>
                    {modal.product.description ||
                      'Aucune description.'}
                  </p>

                  <div className="av2-detail-grid">
                    <div>
                      <small>Marque</small>
                      <strong>
                        {modal.product.brand || '-'}
                      </strong>
                    </div>

                    <div>
                      <small>Modèle</small>
                      <strong>
                        {modal.product.model || '-'}
                      </strong>
                    </div>

                    <div>
                      <small>Catégorie</small>
                      <strong>
                        {modal.product.category || '-'}
                      </strong>
                    </div>

                    <div>
                      <small>Quantité</small>
                      <strong>
                        {modal.product.quantity}
                      </strong>
                    </div>

                    <div>
                      <small>État</small>
                      <strong>
                        {modal.product.condition || '-'}
                      </strong>
                    </div>

                    <div>
                      <small>Statut</small>
                      <strong>
                        {STATUS_LABELS[modal.product.status] ||
                          modal.product.status}
                      </strong>
                    </div>
                  </div>

                  {modal.product.rejection_reason && (
                    <div className="av2-alert av2-alert-error">
                      Motif : {modal.product.rejection_reason}
                    </div>
                  )}

                  <div className="av2-seller">
                    <h3>Informations du vendeur</h3>

                    {sellerLoading ? (
                      <p>Chargement...</p>
                    ) : seller ? (
                      <>
                        <strong>
                          {seller.full_name || 'Sans nom'}
                        </strong>
                        <p>{seller.email || 'Email non renseigné'}</p>
                        <p>{seller.phone || 'Téléphone non renseigné'}</p>
                      </>
                    ) : (
                      <p>Informations indisponibles.</p>
                    )}
                  </div>

                  {modal.product.status === 'pending' && (
                    <div className="av2-modal-footer">
                      <button
                        className="av2-btn av2-btn-danger"
                        onClick={() =>
                          openModal('rejected', modal.product)
                        }
                      >
                        Refuser
                      </button>

                      <button
                        className="av2-btn av2-btn-success"
                        onClick={() =>
                          openModal('approved', modal.product)
                        }
                      >
                        Approuver
                      </button>
                    </div>
                  )}

                </div>
              ) : (
                <>
                  <p>
                    Produit : <strong>{modal.product.name}</strong>
                  </p>

                  {modal.type === 'approved' && (
                    <p>
                      Cette annonce deviendra visible par
                      les membres de la marketplace.
                    </p>
                  )}

                  {modal.type === 'delete' && (
                    <div className="av2-alert av2-alert-error">
                      Cette action est définitive.
                      L'annonce sera supprimée de la base.
                    </div>
                  )}

                  {modal.type === 'rejected' && (
                    <div className="av2-field">
                      <label htmlFor="rejection-reason">
                        Motif du refus *
                      </label>

                      <textarea
                        id="rejection-reason"
                        rows={5}
                        maxLength={1000}
                        placeholder="Expliquez pourquoi cette annonce est refusée..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                  )}

                  <div className="av2-modal-footer">

                    <button
                      className="av2-btn av2-btn-secondary"
                      onClick={closeModal}
                      disabled={busy}
                    >
                      Annuler
                    </button>

                    <button
                      className={`av2-btn ${
                        modal.type === 'approved'
                          ? 'av2-btn-success'
                          : 'av2-btn-danger'
                      }`}
                      onClick={confirmAction}
                      disabled={
                        busy ||
                        (
                          modal.type === 'rejected' &&
                          !reason.trim()
                        )
                      }
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
