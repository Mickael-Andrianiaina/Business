
import { NavLink } from 'react-router-dom'

import {
  LayoutDashboard,
  Package,
  Users,
  Layers,
  Flag,
  Bell,
  ChartNoAxesCombined,
  ClipboardList,
  Settings,
  Smartphone,
  ShieldCheck
} from 'lucide-react'

// ========================================
// BIZINA IPHONE - ADMIN V9
// NAVIGATION ADMINISTRATEUR
// ========================================

const navigation = [
  {
    title: 'VUE D’ENSEMBLE',
    links: [
      {
        to: '/admin',
        label: 'Tableau de bord',
        icon: LayoutDashboard,
        end: true
      },
      {
        to: '/admin/analytics',
        label: 'Statistiques',
        icon: ChartNoAxesCombined
      }
    ]
  },
  {
    title: 'MARKETPLACE',
    links: [
      {
        to: '/admin/products',
        label: 'Modération produits',
        icon: Package
      },
      {
        to: '/admin/categories',
        label: 'Catalogue Apple',
        icon: Layers
      }
    ]
  },
  {
    title: 'COMMUNAUTÉ',
    links: [
      {
        to: '/admin/users',
        label: 'Utilisateurs',
        icon: Users
      },
      {
        to: '/admin/reports',
        label: 'Signalements',
        icon: Flag
      },
      {
        to: '/admin/notifications',
        label: 'Notifications',
        icon: Bell
      }
    ]
  },
  {
    title: 'SYSTÈME',
    links: [
      {
        to: '/admin/logs',
        label: "Journal d’activité",
        icon: ClipboardList
      },
      {
        to: '/admin/security',
        label: 'Sécurité',
        icon: ShieldCheck
      },
      {
        to: '/admin/settings',
        label: 'Paramètres',
        icon: Settings
      }
    ]
  }
]

// ========================================
// SIDEBAR ADMINISTRATEUR
// ========================================

export default function AdminSidebar() {
  return (
    <aside className="admin-sidebar">

      {/* ==================================
          IDENTITÉ DE LA PLATEFORME
      ================================== */}

      <div className="admin-brand">

        <span className="admin-brand-icon">
          <Smartphone
            size={23}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </span>

        <div>
          <strong>Bizina Iphone</strong>
          <small>Administration</small>
        </div>

      </div>

      {/* ==================================
          NAVIGATION ADMINISTRATEUR
      ================================== */}

      <nav
        className="admin-nav"
        aria-label="Navigation administrateur"
      >
        {navigation.map(section => (
          <div
            className="admin-nav-section"
            key={section.title}
          >

            <small className="admin-nav-heading">
              {section.title}
            </small>

            {section.links.map(
              ({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={label}
                  aria-label={label}
                  className={({ isActive }) =>
                    `admin-nav-link${isActive ? ' active' : ''}`
                  }
                >

                  <Icon
                    size={17}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  <span>{label}</span>

                </NavLink>
              )
            )}

          </div>
        ))}
      </nav>

      {/* ==================================
          PIED DE LA SIDEBAR
      ================================== */}

      <div className="admin-sidebar-bottom">

        <div className="admin-sidebar-footer">

          <span
            className="admin-status-dot"
            aria-hidden="true"
          />

          <span>Espace administrateur</span>

          <ShieldCheck
            className="admin-sidebar-shield"
            size={16}
            strokeWidth={1.8}
            aria-hidden="true"
          />

        </div>

      </div>

    </aside>
  )
}
