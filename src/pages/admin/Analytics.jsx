
import {
  useEffect,
  useMemo,
  useState,
  useId
} from 'react'

import { Link } from 'react-router-dom'

import {
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Package,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Store,
  Flag,
  Layers,
  RefreshCw,
  Download,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserX,
  ArrowUpRight,
  X
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import {
  ANALYTICS_PERIODS,
  getAnalytics,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDay,
  formatDateTime,
  calculateGrowth,
  groupTimeline,
  exportAnalyticsCSV
} from '../../services/analyticsService'

import './AdminV2.css'
import './AdminV8.css'

// ==========================================
// BIZINA IPHONE - ADMIN V8
// ANALYTICS DASHBOARD
// ==========================================

const COLORS = {
  blue: '#0071e3',
  purple: '#af52de',
  green: '#34c759',
  orange: '#ff9500',
  red: '#ff3b30',
  gray: '#d1d1d6'
}

const GROWTH_SERIES = [
  {
    key: 'users',
    label: 'Inscriptions',
    color: COLORS.blue
  },
  {
    key: 'products',
    label: 'Publications',
    color: COLORS.purple
  }
]

const MODERATION_SERIES = [
  {
    key: 'approved',
    label: 'Approbations',
    color: COLORS.green
  },
  {
    key: 'rejected',
    label: 'Refus',
    color: COLORS.red
  }
]

const REPORT_SERIES = [
  {
    key: 'reports',
    label: 'Signalements',
    color: COLORS.orange
  }
]

// ==========================================
// BADGE DE CROISSANCE
// ==========================================

function GrowthBadge({
  current,
  previous,
  inverse = false
}) {

  const growth = calculateGrowth(
    current,
    previous
  )

  const Icon =
    growth.direction === 'up'

      ? TrendingUp

      : growth.direction === 'down'

        ? TrendingDown

        : Minus

  const favorable = inverse

    ? growth.direction === 'down'

    : growth.direction === 'up'

  const color =
    growth.direction === 'stable'

      ? 'neutral'

      : favorable

        ? 'positive'

        : 'negative'

  return (

    <div className={`av8-growth ${color}`}>

      <Icon size={15} />

      <span>

        {growth.isNew

          ? 'Nouveau'

          : `${growth.value > 0 ? '+' : ''}${formatPercent(growth.value)}`}

      </span>

      <small>vs période précédente</small>

    </div>

  )

}

// ==========================================
// CARTE STATISTIQUE
// ==========================================

function StatCard({

  label,

  value,

  icon: Icon,

  color = 'blue',

  subtitle,

  current,

  previous,

  inverse = false,

  scope = 'Actuel'

}) {

  return (

    <article className="av8-stat-card">

      <div className="av8-stat-top">

        <div className={`av8-stat-icon ${color}`}>

          <Icon size={23} />

        </div>

        <span className="av8-scope">

          {scope}

        </span>

      </div>

      <span className="av8-stat-label">

        {label}

      </span>

      <strong className="av8-stat-value">

        {value}

      </strong>

      {current !== undefined &&
       previous !== undefined ? (

        <GrowthBadge

          current={current}

          previous={previous}

          inverse={inverse}

        />

      ) : (

        <small className="av8-stat-subtitle">

          {subtitle}

        </small>

      )}

    </article>

  )

}

// ==========================================
// PANNEAU
// ==========================================

function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
  className = ''
}) {

  return (

    <section className={`av8-panel ${className}`}>

      <div className="av8-panel-heading">

        <div>

          <h3>{title}</h3>

          {subtitle && (

            <p>{subtitle}</p>

          )}

        </div>

        {Icon && <Icon size={21} />}

      </div>

      {children}

    </section>

  )

}

// ==========================================
// ETAT VIDE
// ==========================================

function EmptyState({
  text = 'Aucune donnée disponible.'
}) {

  return (

    <div className="av8-empty">

      <BarChart3 size={38} strokeWidth={1.3} />

      <strong>Aucune donnée</strong>

      <p>{text}</p>

    </div>

  )

}

// ==========================================
// GRAPHIQUE SVG NATIF
// ==========================================

function LineChart({

  data = [],

  series = [],

  accessibleTitle = 'Graphique statistique'

}) {

  const gradientId = useId().replace(/:/g, '')

  const [hoveredIndex, setHoveredIndex] =
    useState(null)

  const [hidden, setHidden] = useState([])

  const width = 760

  const height = 285

  const margin = {
    top: 18,
    right: 24,
    bottom: 42,
    left: 58
  }

  const plotWidth =
    width - margin.left - margin.right

  const plotHeight =
    height - margin.top - margin.bottom

  const activeSeries = series.filter(
    item => !hidden.includes(item.key)
  )

  const maxValue = Math.max(

    0,

    ...data.flatMap(item =>

      activeSeries.map(s =>

        Number(item[s.key]) || 0

      )

    )

  )

  const rawStep = Math.max(
    1,
    maxValue / 4
  )

  const magnitude = 10 ** Math.floor(
    Math.log10(rawStep)
  )

  const step = Math.ceil(
    rawStep / magnitude
  ) * magnitude

  const maxY = step * 4

  const x = index =>

    data.length <= 1

      ? margin.left + plotWidth / 2

      : margin.left
        + index * plotWidth / (data.length - 1)

  const y = value =>

    margin.top

    + plotHeight

    - (Number(value) || 0) / maxY * plotHeight

  const labelIndices = [...new Set(

    Array.from(

      { length: Math.min(6, data.length) },

      (_, index) => Math.round(

        index * (data.length - 1)

        / Math.max(
            1,
            Math.min(6, data.length) - 1
          )

      )

    )

  )]

  const selectedIndex =

    hoveredIndex !== null &&
    hoveredIndex < data.length

      ? hoveredIndex

      : null

  const selected =

    selectedIndex !== null

      ? data[selectedIndex]

      : null

  function toggleSeries(key) {

    setHidden(current => {

      if (current.includes(key)) {

        return current.filter(
          item => item !== key
        )

      }

      if (current.length === series.length - 1) {

        return current

      }

      return [...current, key]

    })

  }

  function handlePointer(event) {

    if (!data.length) return

    const rect =
      event.currentTarget.getBoundingClientRect()

    if (!rect.width) return

    const position =

      (event.clientX - rect.left)

      / rect.width * width

    const ratio = Math.max(

      0,

      Math.min(

        1,

        (position - margin.left) / plotWidth

      )

    )

    setHoveredIndex(

      Math.round(
        ratio * (data.length - 1)
      )

    )

  }

  if (!data.length) {

    return <EmptyState />

  }

  return (

    <div className="av8-chart">

      <div className="av8-chart-scroll">

        <svg

          viewBox={`0 0 ${width} ${height}`}

          role="img"

          aria-label={accessibleTitle}

          onPointerMove={handlePointer}

          onPointerLeave={() =>
            setHoveredIndex(null)
          }

        >

          <defs>

            {series.map(item => (

              <linearGradient

                key={item.key}

                id={`${gradientId}-${item.key}`}

                x1="0"

                y1="0"

                x2="0"

                y2="1"

              >

                <stop

                  offset="0%"

                  stopColor={item.color}

                  stopOpacity="0.15"

                />

                <stop

                  offset="100%"

                  stopColor={item.color}

                  stopOpacity="0.01"

                />

              </linearGradient>

            ))}

          </defs>

          {/* GRILLE HORIZONTALE */}

          {Array.from(
            { length: 5 },
            (_, index) => {

              const value = index * step

              const posY = y(value)

              return (

                <g key={index}>

                  <line

                    x1={margin.left}

                    y1={posY}

                    x2={width - margin.right}

                    y2={posY}

                    stroke="#e8e8ed"

                    strokeDasharray="4 4"

                  />

                  <text

                    x={margin.left - 12}

                    y={posY + 4}

                    textAnchor="end"

                    className="av8-axis-label"

                  >

                    {formatNumber(value)}

                  </text>

                </g>

              )

            }
          )}

          {/* COURBES */}

          {activeSeries.map(item => {

            const points = data.map(

              (row, index) =>

                `${x(index)},${y(row[item.key])}`

            )

            const linePath =

              `M ${points.join(' L ')}`

            const areaPath =

              `${linePath}
               L ${x(data.length - 1)},${y(0)}
               L ${x(0)},${y(0)}
               Z`

            return (

              <g key={item.key}>

                <path

                  d={areaPath}

                  fill={`url(#${gradientId}-${item.key})`}

                />

                <path

                  d={linePath}

                  fill="none"

                  stroke={item.color}

                  strokeWidth="2.8"

                  strokeLinecap="round"

                  strokeLinejoin="round"

                />

                {data.length <= 31 &&

                  data.map((row, index) => (

                    <circle

                      key={index}

                      cx={x(index)}

                      cy={y(row[item.key])}

                      r="3"

                      fill={item.color}

                    />

                  ))

                }

              </g>

            )

          })}

          {/* AXE HORIZONTAL */}

          {labelIndices.map(index => (

            <text

              key={index}

              x={x(index)}

              y={height - 12}

              textAnchor="middle"

              className="av8-axis-label"

            >

              {data[index]?.label}

            </text>

          ))}

          {/* SURVOL */}

          {selectedIndex !== null && (

            <g>

              <line

                x1={x(selectedIndex)}

                y1={margin.top}

                x2={x(selectedIndex)}

                y2={height - margin.bottom}

                stroke="#8e8e93"

                strokeDasharray="5 5"

              />

              {activeSeries.map(item => (

                <circle

                  key={item.key}

                  cx={x(selectedIndex)}

                  cy={y(selected[item.key])}

                  r="5"

                  fill={item.color}

                  stroke="#ffffff"

                  strokeWidth="2"

                />

              ))}

            </g>

          )}

        </svg>

      </div>

      {/* SELECTION ACCESSIBLE */}

      <div className="av8-chart-inspector">

        <label htmlFor={`${gradientId}-point`}>

          Explorer les données

        </label>

        <select

          id={`${gradientId}-point`}

          value={selectedIndex ?? ''}

          onChange={event =>

            setHoveredIndex(

              event.target.value === ''

                ? null

                : Number(event.target.value)

            )

          }

        >

          <option value="">

            Sélectionner une date

          </option>

          {data.map((item, index) => (

            <option key={index} value={index}>

              {item.endDay &&
               item.endDay !== item.day

                ? `${formatDay(item.day)} – ${formatDay(item.endDay)}`

                : item.label}

            </option>

          ))}

        </select>

      </div>

      {selected && (

        <div className="av8-chart-tooltip">

          <strong>

            {formatDay(selected.day)}

            {selected.endDay &&
             selected.endDay !== selected.day && (

              ` – ${formatDay(selected.endDay)}`

            )}

          </strong>

          {activeSeries.map(item => (

            <span key={item.key}>

              <i style={{
                background: item.color
              }} />

              {item.label} :

              <b>
                {formatNumber(selected[item.key])}
              </b>

            </span>

          ))}

        </div>

      )}

      {/* LEGENDE INTERACTIVE */}

      <div className="av8-chart-legend">

        {series.map(item => (

          <button

            key={item.key}

            type="button"

            className={

              hidden.includes(item.key)

                ? 'disabled-series'

                : ''

            }

            aria-pressed={
              !hidden.includes(item.key)
            }

            onClick={() =>
              toggleSeries(item.key)
            }

          >

            <span style={{
              background: item.color
            }} />

            {item.label}

          </button>

        ))}

      </div>

    </div>

  )

}

// ==========================================
// GRAPHIQUE CIRCULAIRE
// ==========================================

function DonutChart({
  items = [],
  title = 'Total'
}) {

  const total = items.reduce(

    (sum, item) =>

      sum + (Number(item.value) || 0),

    0

  )

  const radius = 65

  const circumference =
    2 * Math.PI * radius

  let offset = 0

  return (

    <div className="av8-donut-layout">

      <div className="av8-donut">

        <svg

          viewBox="0 0 170 170"

          role="img"

          aria-label={`${title} : ${formatNumber(total)}`}

        >

          <circle

            cx="85"

            cy="85"

            r={radius}

            stroke="#f0f0f3"

            strokeWidth="18"

            fill="none"

          />

          {total > 0 && items.map(item => {

            const length =

              Number(item.value) / total

              * circumference

            const currentOffset = offset

            offset += length

            if (length <= 0) return null

            return (

              <circle

                key={item.label}

                cx="85"

                cy="85"

                r={radius}

                stroke={item.color}

                strokeWidth="18"

                fill="none"

                strokeDasharray={
                  `${length} ${circumference - length}`
                }

                strokeDashoffset={-currentOffset}

                transform="rotate(-90 85 85)"

              />

            )

          })}

          <text

            x="85"

            y="82"

            textAnchor="middle"

            className="av8-donut-value"

          >

            {formatNumber(total)}

          </text>

          <text

            x="85"

            y="101"

            textAnchor="middle"

            className="av8-donut-label"

          >

            {title}

          </text>

        </svg>

      </div>

      <div className="av8-donut-legend">

        {items.map(item => (

          <div
            className="av8-donut-row"
            key={item.label}
          >

            <i style={{
              background: item.color
            }} />

            <span>{item.label}</span>

            <strong>
              {formatNumber(item.value)}
            </strong>

            <small>

              {total > 0

                ? formatPercent(
                    Number(item.value) / total * 100
                  )

                : '0 %'}

            </small>

          </div>

        ))}

      </div>

    </div>

  )

}

// ==========================================
// GRAPHIQUE A BARRES
// ==========================================

function RankingBars({

  items = [],

  total = 0,

  color = COLORS.blue,

  showValue = false

}) {

  if (!items.length) {

    return (

      <EmptyState text="Aucune annonce approuvée." />

    )

  }

  return (

    <div className="av8-ranking">

      {items.map((item, index) => {

        const percentage =

          total > 0

            ? Number(item.amount) / total * 100

            : 0

        return (

          <div
            className="av8-ranking-row"
            key={`${item.name}-${index}`}
          >

            <div className="av8-ranking-heading">

              <span>

                <b>{index + 1}.</b>

                {item.name}

              </span>

              <strong>
                {formatNumber(item.amount)}
              </strong>

            </div>

            <div className="av8-progress">

              <div

                className="av8-progress-fill"

                style={{

                  width:
                    `${Math.min(100, percentage)}%`,

                  background: color

                }}

              />

            </div>

            <div className="av8-ranking-meta">

              <span>
                {formatPercent(percentage)}
              </span>

              {showValue && (

                <span>
                  {formatCurrency(item.value)}
                </span>

              )}

            </div>

          </div>

        )

      })}

    </div>

  )

}

// ==========================================
// LIGNE INDICATEUR
// ==========================================

function MetricRow({

  label,

  value,

  icon: Icon,

  color = 'blue'

}) {

  return (

    <div className="av8-metric-row">

      <div className={`av8-mini-icon ${color}`}>

        <Icon size={18} />

      </div>

      <span>{label}</span>

      <strong>{value}</strong>

    </div>

  )

}

// ==========================================
// PAGE PRINCIPALE ANALYTICS
// ==========================================

export default function Analytics({

  profile,

  onLogout,

  logoutLoading

}) {

  const [days, setDays] = useState(30)

  const [data, setData] = useState(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [success, setSuccess] = useState('')

  const [refresh, setRefresh] = useState(0)

  // ========================================
  // CHARGEMENT DES STATISTIQUES
  // ========================================

  useEffect(() => {

    let active = true

    setLoading(true)

    setError('')

    getAnalytics(days)

      .then(result => {

        if (active) {

          setData(result)

        }

      })

      .catch(err => {

        if (active) {

          setError(

            err.message ||

            'Impossible de charger les statistiques.'

          )

          setData(null)

        }

      })

      .finally(() => {

        if (active) {

          setLoading(false)

        }

      })

    return () => {

      active = false

    }

  }, [days, refresh])

  // ========================================
  // REGROUPEMENT DES COURBES
  // ========================================

  const timeline = useMemo(() =>

    groupTimeline(
      data?.timeline || [],
      data?.period?.days || days
    ),

    [data, days]

  )

  // ========================================
  // MESSAGE TEMPORAIRE
  // ========================================

  useEffect(() => {

    if (!success) return

    const timer = setTimeout(

      () => setSuccess(''),

      4000

    )

    return () => clearTimeout(timer)

  }, [success])

  // ========================================
  // EXPORT CSV
  // ========================================

  function handleExport() {

    if (!data || loading) return

    try {

      exportAnalyticsCSV(data)

      setSuccess(
        'Rapport statistique exporté.'
      )

    } catch (err) {

      setError(err.message)

    }

  }

  // ========================================
  // DONNEES CALCULEES
  // ========================================

  const users = data?.users || {}

  const products = data?.products || {}

  const reports = data?.reports || {}

  const sanctions = data?.sanctions || {}

  const audit = data?.audit || {}

  const catalog = data?.catalog || {}

  const userDistribution = [

    {
      label: 'Actifs',
      value: users.active_users || 0,
      color: COLORS.green
    },

    {
      label: 'Suspendus',
      value: users.suspended_users || 0,
      color: COLORS.orange
    },

    {
      label: 'Bannis',
      value: users.banned_users || 0,
      color: COLORS.red
    }

  ]

  const productDistribution = [

    {
      label: 'Approuvées',
      value: products.approved_products || 0,
      color: COLORS.green
    },

    {
      label: 'En attente',
      value: products.pending_products || 0,
      color: COLORS.orange
    },

    {
      label: 'Refusées',
      value: products.rejected_products || 0,
      color: COLORS.red
    }

  ]

  const decisionTotal =

    Number(audit.approval_events || 0)

    + Number(audit.rejection_events || 0)

  const periodApprovalRate =

    decisionTotal > 0

      ? Number(audit.approval_events || 0)

        / decisionTotal * 100

      : null

  // ========================================
  // INTERFACE PRINCIPALE
  // ========================================

  return (

    <AdminLayout

      profile={profile}

      onLogout={onLogout}

      logoutLoading={logoutLoading}

    >

      <div className="av2 av8">

        {/* HEADER */}

        <header className="av2-page-header">

          <div>

            <div className="av2-eyebrow">

              <BarChart3 size={15} />

              Business Intelligence

            </div>

            <h1>Statistiques</h1>

            <p>

              Analysez les performances de Bizina Iphone.

            </p>

          </div>

          <div className="av8-header-actions">

            <div className="av8-period-select">

              <CalendarDays size={17} />

              <select

                value={days}

                aria-label="Période statistique"

                onChange={event =>

                  setDays(Number(event.target.value))

                }

              >

                {ANALYTICS_PERIODS.map(item => (

                  <option

                    key={item.value}

                    value={item.value}

                  >

                    {item.label}

                  </option>

                ))}

              </select>

            </div>

            <button

              type="button"

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

              type="button"

              className="av2-btn av8-primary"

              disabled={loading || !data}

              onClick={handleExport}

            >

              <Download size={17} />

              Exporter CSV

            </button>

          </div>

        </header>

        {/* ERREURS */}

        {error && (

          <div

            className="av2-alert av2-alert-error"

            role="alert"

          >

            {error}

          </div>

        )}

        {/* BANNIERE */}

        <section className="av8-banner">

          <div>

            <small>

              BIZINA IPHONE ANALYTICS

            </small>

            <h2>

              Pilotez votre marketplace.

            </h2>

            <p>

              Comprenez votre communauté,

              suivez les performances de vos annonces

              et prenez des décisions éclairées.

            </p>

            {data && !loading && (

              <div className="av8-banner-meta">

                <span>

                  <CalendarDays size={15} />

                  {formatDay(data.period.from)}

                  {' – '}

                  {formatDay(data.period.to)}

                </span>

                <span>

                  <Clock size={15} />

                  {formatDateTime(data.generated_at)}

                </span>

              </div>

            )}

          </div>

          <BarChart3

            size={120}

            strokeWidth={0.9}

            className="av8-banner-icon"

          />

        </section>

        {/* CHARGEMENT */}

        {loading ? (

          <>

            <div className="av8-stats-grid">

              {Array.from(
                { length: 8 },
                (_, index) => (

                  <div

                    key={index}

                    className="av8-stat-card av8-loading-card"

                  >

                    <div className="av8-skeleton av8-skeleton-icon" />

                    <div className="av8-skeleton" />

                    <div className="av8-skeleton av8-skeleton-large" />

                  </div>

                )
              )}

            </div>

            <div className="av8-panel av8-empty">

              <RefreshCw

                size={32}

                className="av2-spin"

              />

              <p>

                Calcul des statistiques Supabase...

              </p>

            </div>

          </>

        ) : !data ? (

          <div className="av8-panel av8-empty">

            <AlertTriangle size={38} />

            <h3>

              Statistiques indisponibles

            </h3>

            <p>

              Vérifiez la fonction RPC Admin V8.

            </p>

            <button

              className="av2-btn av2-btn-secondary"

              onClick={() =>

                setRefresh(value => value + 1)

              }

            >

              Réessayer

            </button>

          </div>

        ) : (

          <>

            {/* CARTES STATISTIQUES */}

            <div className="av8-section-title">

              <div>

                <h2>Vue d’ensemble</h2>

                <p>

                  Indicateurs de croissance et état actuel

                  de la marketplace.

                </p>

              </div>

            </div>

            <div className="av8-stats-grid">

              <StatCard

                label="Total utilisateurs"

                value={formatNumber(users.total_users)}

                icon={Users}

                color="blue"

                subtitle={`${formatNumber(users.active_users)} comptes actifs`}

              />

              <StatCard

                label="Nouveaux utilisateurs"

                value={formatNumber(users.new_users)}

                icon={TrendingUp}

                color="green"

                current={users.new_users}

                previous={users.previous_users}

                scope="Période"

              />

              <StatCard

                label="Total annonces"

                value={formatNumber(products.total_products)}

                icon={Package}

                color="purple"

                subtitle={`${formatNumber(products.pending_products)} en attente`}

              />

              <StatCard

                label="Nouvelles annonces"

                value={formatNumber(products.new_products)}

                icon={Activity}

                color="purple"

                current={products.new_products}

                previous={products.previous_products}

                scope="Période"

              />

              <StatCard

                label="Taux d’approbation"

                value={formatPercent(products.approval_rate)}

                icon={ShieldCheck}

                color="green"

                subtitle="Annonces approuvées ou refusées"

              />

              <StatCard

                label="Valeur des annonces"

                value={formatCurrency(products.listing_value)}

                icon={Wallet}

                color="green"

                subtitle="Annonces approuvées × quantité"

              />

              <StatCard

                label="Vendeurs"

                value={formatNumber(products.active_sellers)}

                icon={Store}

                color="blue"

                subtitle="Avec au moins une annonce approuvée"

              />

              <StatCard

                label="Nouveaux signalements"

                value={formatNumber(reports.new_reports)}

                icon={Flag}

                color="orange"

                current={reports.new_reports}

                previous={reports.previous_reports}

                inverse={true}

                scope="Période"

              />

            </div>

            {/* CROISSANCE */}

            <Panel

              title="Croissance de la marketplace"

              subtitle="Nouvelles inscriptions et annonces encore présentes en base, sur la période."

              icon={TrendingUp}

            >

              <LineChart

                key={`growth-${days}`}

                data={timeline}

                series={GROWTH_SERIES}

                accessibleTitle="Évolution des inscriptions et publications"

              />

            </Panel>

            {/* DISTRIBUTIONS */}

            <div className="av8-grid-two">

              <Panel

                title="Statut des utilisateurs"

                subtitle="Répartition actuelle des comptes membres"

                icon={Users}

              >

                <DonutChart

                  items={userDistribution}

                  title="Membres"

                />

                <Link

                  to="/admin/users"

                  className="av8-panel-link"

                >

                  Gérer les utilisateurs

                  <ArrowUpRight size={15} />

                </Link>

              </Panel>

              <Panel

                title="Statut des annonces"

                subtitle="Répartition actuelle de la modération"

                icon={Package}

              >

                <DonutChart

                  items={productDistribution}

                  title="Annonces"

                />

                <Link

                  to="/admin/products"

                  className="av8-panel-link"

                >

                  Ouvrir la modération

                  <ArrowUpRight size={15} />

                </Link>

              </Panel>

            </div>

            {/* MODERATION */}

            <Panel

              title="Performance de la modération"

              subtitle="Décisions enregistrées par le journal Admin V7 sur la période."

              icon={ShieldCheck}

            >

              <div className="av8-inline-stats">

                <div>

                  <small>Approbations</small>

                  <strong className="av8-green">

                    {formatNumber(audit.approval_events)}

                  </strong>

                </div>

                <div>

                  <small>Refus</small>

                  <strong className="av8-red">

                    {formatNumber(audit.rejection_events)}

                  </strong>

                </div>

                <div>

                  <small>Taux d’approbation sur la période</small>

                  <strong>

                    {formatPercent(periodApprovalRate)}

                  </strong>

                </div>

              </div>

              <LineChart

                key={`moderation-${days}`}

                data={timeline}

                series={MODERATION_SERIES}

                accessibleTitle="Évolution des décisions de modération"

              />

              <p className="av8-footnote">

                Historique disponible à partir de

                l’installation d’Admin V7.

              </p>

            </Panel>

            {/* CATEGORIES ET MODELES */}

            <div className="av8-grid-two">

              <Panel

                title="Catégories les plus populaires"

                subtitle="Top 10 des catégories par annonces approuvées"

                icon={Layers}

              >

                <RankingBars

                  items={data.categories}

                  total={products.approved_products}

                  color={COLORS.blue}

                  showValue={true}

                />

              </Panel>

              <Panel

                title="Modèles les plus populaires"

                subtitle="Top 10 des modèles par annonces approuvées"

                icon={Package}

              >

                <RankingBars

                  items={data.models}

                  total={products.approved_products}

                  color={COLORS.purple}

                />

              </Panel>

            </div>

            {/* TOP VENDEURS */}

            <Panel

              title="Vendeurs les plus actifs"

              subtitle="Classement actuel selon les annonces approuvées"

              icon={Store}

            >

              {!data.sellers.length ? (

                <EmptyState text="Aucun vendeur avec annonce approuvée." />

              ) : (

                <div className="av2-table-wrap">

                  <table className="av2-table av8-sellers-table">

                    <thead>

                      <tr>

                        <th>Rang</th>

                        <th>Vendeur</th>

                        <th>Annonces</th>

                        <th>Valeur des annonces</th>

                      </tr>

                    </thead>

                    <tbody>

                      {data.sellers.map((seller, index) => (

                        <tr key={seller.id}>

                          <td>

                            <span

                              className={`av8-rank rank-${index + 1}`}

                            >

                              {index + 1}

                            </span>

                          </td>

                          <td>

                            <div className="av8-seller">

                              <div className="av8-seller-avatar">

                                {seller.name

                                  .trim()

                                  .split(/\s+/)

                                  .slice(0, 2)

                                  .map(word => word[0])

                                  .join('')

                                  .toUpperCase()}

                              </div>

                              <strong>

                                {seller.name}

                              </strong>

                            </div>

                          </td>

                          <td>

                            {formatNumber(seller.amount)}

                          </td>

                          <td>

                            <strong>

                              {formatCurrency(seller.value)}

                            </strong>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </Panel>

            {/* VALEUR COMMERCIALE */}

            <div className="av8-grid-two">

              <Panel

                title="Valeur commerciale"

                subtitle="Valeur actuelle des annonces approuvées"

                icon={Wallet}

              >

                <div className="av8-finance-value">

                  <small>

                    VALEUR TOTALE ESTIMÉE

                  </small>

                  <strong>

                    {formatCurrency(products.listing_value)}

                  </strong>

                </div>

                <MetricRow

                  label="Prix moyen par annonce"

                  value={formatCurrency(products.average_price)}

                  icon={Wallet}

                  color="green"

                />

                <MetricRow

                  label="Annonces approuvées"

                  value={formatNumber(products.approved_products)}

                  icon={Package}

                  color="blue"

                />

                <p className="av8-footnote">

                  Il s’agit de la valeur des produits

                  proposés à la vente, et non du

                  chiffre d’affaires réalisé.

                </p>

              </Panel>

              <Panel

                title="Catalogue Apple"

                subtitle="État actuel du référentiel produits"

                icon={Layers}

              >

                <MetricRow

                  label="Éléments du catalogue"

                  value={formatNumber(catalog.total_catalog_items)}

                  icon={Layers}

                  color="blue"

                />

                <MetricRow

                  label="Éléments actifs"

                  value={formatNumber(catalog.active_catalog_items)}

                  icon={CheckCircle2}

                  color="green"

                />

                <MetricRow

                  label="Catégories actives"

                  value={formatNumber(catalog.active_categories)}

                  icon={Package}

                  color="purple"

                />

                <Link

                  to="/admin/categories"

                  className="av8-panel-link"

                >

                  Ouvrir le catalogue

                  <ArrowUpRight size={15} />

                </Link>

              </Panel>

            </div>

            {/* SECURITE */}

            <div className="av8-section-title">

              <div>

                <h2>Sécurité et confiance</h2>

                <p>

                  Suivi des signalements,

                  sanctions et événements d’audit.

                </p>

              </div>

            </div>

            <div className="av8-grid-two">

              <Panel

                title="Centre de confiance"

                subtitle="État actuel des signalements"

                icon={ShieldAlert}

              >

                <MetricRow

                  label="Total signalements"

                  value={formatNumber(reports.total_reports)}

                  icon={Flag}

                  color="blue"

                />

                <MetricRow

                  label="Signalements ouverts"

                  value={formatNumber(reports.open_reports)}

                  icon={Clock}

                  color="orange"

                />

                <MetricRow

                  label="Dossiers urgents ouverts"

                  value={formatNumber(reports.urgent_reports)}

                  icon={AlertTriangle}

                  color="red"

                />

                <Link

                  to="/admin/reports"

                  className="av8-panel-link"

                >

                  Gérer les signalements

                  <ArrowUpRight size={15} />

                </Link>

              </Panel>

              <Panel

                title="Sanctions utilisateurs"

                subtitle="Décisions enregistrées sur la période"

                icon={UserX}

              >

                <MetricRow

                  label="Suspensions"

                  value={formatNumber(sanctions.suspensions)}

                  icon={Clock}

                  color="orange"

                />

                <MetricRow

                  label="Bannissements"

                  value={formatNumber(sanctions.bans)}

                  icon={UserX}

                  color="red"

                />

                <MetricRow

                  label="Réactivations"

                  value={formatNumber(sanctions.reactivations)}

                  icon={ShieldCheck}

                  color="green"

                />

              </Panel>

            </div>

            {/* EVOLUTION DES SIGNALEMENTS */}

            <Panel

              title="Évolution des signalements"

              subtitle="Nombre de nouveaux dossiers sur la période"

              icon={Flag}

            >

              <LineChart

                key={`reports-${days}`}

                data={timeline}

                series={REPORT_SERIES}

                accessibleTitle="Évolution des signalements"

              />

            </Panel>

            {/* JOURNAL ADMIN V7 */}

            <Panel

              title="Activité administrative"

              subtitle="Événements enregistrés par Admin V7 sur la période"

              icon={Activity}

            >

              <div className="av8-grid-two av8-audit-grid">

                <MetricRow

                  label="Actions administratives auditées"

                  value={formatNumber(audit.admin_actions)}

                  icon={ShieldCheck}

                  color="blue"

                />

                <MetricRow

                  label="Événements critiques"

                  value={formatNumber(audit.critical_events)}

                  icon={ShieldAlert}

                  color="red"

                />

              </div>

              <Link

                to="/admin/logs"

                className="av8-panel-link"

              >

                Consulter le journal d’activité

                <ArrowUpRight size={15} />

              </Link>

            </Panel>

            {/* PIED DE PAGE */}

            <div className="av8-data-note">

              <ShieldCheck size={22} />

              <div>

                <strong>

                  Statistiques calculées par Supabase

                </strong>

                <p>

                  Données agrégées côté serveur,

                  accès réservé aux administrateurs.

                  Fuseau horaire : Madagascar (UTC+3).

                </p>

              </div>

            </div>

          </>

        )}

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

      </div>

    </AdminLayout>

  )

}
