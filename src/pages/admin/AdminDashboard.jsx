
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'

import {
  Package,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowUpRight,
  Settings,
  ChartNoAxesCombined,
  LayoutDashboard
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import {
  getAdminStats,
  getRecentProducts
} from '../../services/adminService'

import './AdminV2.css'

const INITIAL_STATS = {
  totalProducts: 0,
  pendingProducts: 0,
  approvedProducts: 0,
  rejectedProducts: 0,
  totalUsers: 0,
  totalAdmins: 0
}

const STATUS_LABELS = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé'
}

const formatNumber = value =>
  Number(value || 0).toLocaleString('fr-FR')

export default function AdminDashboard({
  profile,
  onLogout,
  logoutLoading
}) {
  const [stats, setStats] = useState(INITIAL_STATS)
  const [recentProducts, setRecentProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [statsData, productsData] = await Promise.all([
        getAdminStats(),
        getRecentProducts()
      ])

      setStats(statsData)
      setRecentProducts(productsData)
      setLastUpdate(new Date())
    } catch (err) {
      setError(
        err.message ||
        'Impossible de charger le tableau de bord.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const cards = [
    {
      label: 'Total des produits',
      value: stats.totalProducts,
      icon: Package,
      color: 'blue'
    },
    {
      label: 'En attente',
      value: stats.pendingProducts,
      icon: Clock,
      color: 'orange'
    },
    {
      label: 'Produits approuvés',
      value: stats.approvedProducts,
      icon: CheckCircle2,
      color: 'green'
    },
    {
      label: 'Produits refusés',
      value: stats.rejectedProducts,
      icon: XCircle,
      color: 'red'
    },
    {
      label: 'Utilisateurs',
      value: stats.totalUsers,
      icon: Users,
      color: 'purple'
    },
    {
      label: 'Administrateurs',
      value: stats.totalAdmins,
      icon: ShieldCheck,
      color: 'indigo'
    }
  ]

  const distribution = [
    {
      label: 'Approuvés',
      value: stats.approvedProducts,
      color: '#34c759'
    },
    {
      label: 'En attente',
      value: stats.pendingProducts,
      color: '#ff9500'
    },
    {
      label: 'Refusés',
      value: stats.rejectedProducts,
      color: '#ff3b30'
    }
  ]

  const quickLinks = [
    {
      to: '/admin/products',
      label: 'Modérer les produits',
      icon: Package
    },
    {
      to: '/admin/users',
      label: 'Gérer les utilisateurs',
      icon: Users
    },
    {
      to: '/admin/analytics',
      label: 'Voir les statistiques',
      icon: ChartNoAxesCombined
    },
    {
      to: '/admin/settings',
      label: 'Paramètres',
      icon: Settings
    }
  ]

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
              <LayoutDashboard size={15} />
              Administration
            </div>

            <h1>Tableau de bord</h1>

            <p>
              Bienvenue, {profile?.full_name || 'Administrateur'}.
              Retrouvez les performances de Bizina Iphone.
            </p>
          </div>

          <button
            className="av2-btn av2-btn-secondary"
            onClick={loadDashboard}
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

        <section className="av2-welcome">
          <div>
            <span>Espace administrateur</span>
            <h2>Votre marketplace, sous contrôle.</h2>
            <p>
              Gérez les publications, les utilisateurs
              et les performances de votre plateforme.
            </p>

            <Link
              to="/admin/products"
              className="av2-btn av2-btn-white"
            >
              Modérer les annonces
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <ShieldCheck
            size={130}
            strokeWidth={0.8}
            className="av2-welcome-icon"
          />
        </section>

        <div className="av2-stats-grid">
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
                  <strong>{formatNumber(card.value)}</strong>
                )}
              </div>
            )
          })}
        </div>

        <div className="av2-dashboard-grid">

          <section className="av2-panel">
            <div className="av2-panel-heading">
              <div>
                <h3>État des publications</h3>
                <p>Répartition des annonces</p>
              </div>

              <ChartNoAxesCombined size={21} />
            </div>

            {distribution.map(item => {
              const percent = stats.totalProducts
                ? Math.round(
                    item.value / stats.totalProducts * 100
                  )
                : 0

              return (
                <div
                  className="av2-progress-item"
                  key={item.label}
                >
                  <div className="av2-progress-label">
                    <span>{item.label}</span>
                    <strong>
                      {item.value} · {percent} %
                    </strong>
                  </div>

                  <div className="av2-progress-track">
                    <div
                      className="av2-progress-fill"
                      style={{
                        width: `${percent}%`,
                        background: item.color
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </section>

          <section className="av2-panel">
            <div className="av2-panel-heading">
              <div>
                <h3>Accès rapides</h3>
                <p>Outils d'administration</p>
              </div>
            </div>

            <div className="av2-quick-links">
              {quickLinks.map(item => {
                const Icon = item.icon

                return (
                  <Link
                    className="av2-quick-link"
                    to={item.to}
                    key={item.to}
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                    <ArrowUpRight size={16} />
                  </Link>
                )
              })}
            </div>
          </section>

        </div>

        <section className="av2-panel">
          <div className="av2-panel-heading">
            <div>
              <h3>Publications récentes</h3>
              <p>Les dernières annonces soumises</p>
            </div>

            <Link to="/admin/products">
              Voir tout
            </Link>
          </div>

          {loading ? (
            <p className="av2-empty">Chargement...</p>
          ) : recentProducts.length === 0 ? (
            <div className="av2-empty">
              <Package size={38} />
              <p>Aucune publication disponible.</p>
            </div>
          ) : (
            <div className="av2-table-wrap">
              <table className="av2-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Prix</th>
                    <th>Date</th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {recentProducts.map(product => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                      </td>

                      <td>
                        {formatNumber(product.price)} Ar
                      </td>

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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {lastUpdate && (
          <p className="av2-last-update">
            Dernière actualisation :{' '}
            {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        )}

      </div>
    </AdminLayout>
  )
}
