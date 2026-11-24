
import { supabase } from './supabase'

// ==========================================
// BIZINA IPHONE - ADMIN V8
// ANALYTICS SERVICE
// ==========================================

export const ANALYTICS_PERIODS = [
  { value: 7, label: '7 derniers jours' },
  { value: 30, label: '30 derniers jours' },
  { value: 90, label: '90 derniers jours' },
  { value: 365, label: '365 derniers jours' }
]

// ==========================================
// RECUPERATION DES STATISTIQUES
// ==========================================

export async function getAnalytics(days = 30) {

  const period = Number(days)

  if (![7, 30, 90, 365].includes(period)) {
    throw new Error('Période invalide.')
  }

  const { data, error } = await supabase.rpc(
    'admin_get_analytics',
    {
      p_days: period
    }
  )

  if (error) throw error

  if (!data || typeof data !== 'object') {
    throw new Error(
      'Les données statistiques sont indisponibles.'
    )
  }

  return data
}

// ==========================================
// FORMATAGE DES NOMBRES
// ==========================================

export function formatNumber(value) {

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0
  }).format(Number(value) || 0)

}

// ==========================================
// FORMATAGE ARIARY
// ==========================================

export function formatCurrency(value) {

  return `${formatNumber(value)} Ar`

}

// ==========================================
// FORMATAGE DES POURCENTAGES
// ==========================================

export function formatPercent(value) {

  if (value === null || value === undefined) {
    return '—'
  }

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1
  }).format(Number(value)) + ' %'

}

// ==========================================
// CALCUL DE LA CROISSANCE
// ==========================================

export function calculateGrowth(current, previous) {

  const currentValue = Number(current) || 0

  const previousValue = Number(previous) || 0

  if (previousValue === 0) {

    return {
      value: currentValue === 0 ? 0 : null,

      direction:
        currentValue === 0 ? 'stable' : 'up',

      isNew: currentValue > 0
    }

  }

  const growth = (

    (currentValue - previousValue)

    / previousValue

  ) * 100

  return {

    value: Math.round(growth * 10) / 10,

    direction:
      growth > 0
        ? 'up'
        : growth < 0
          ? 'down'
          : 'stable',

    isNew: false

  }
}

// ==========================================
// FORMATAGE DES DATES
// ==========================================

export function formatDay(value) {

  if (!value) return '—'

  return new Date(
    `${value}T12:00:00Z`
  ).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Indian/Antananarivo'
  })

}

export function formatDateTime(value) {

  if (!value) return '—'

  return new Date(value).toLocaleString(
    'fr-FR',
    {
      timeZone: 'Indian/Antananarivo'
    }
  )

}

// ==========================================
// REGROUPEMENT DES DONNEES
// ==========================================

// 7 et 30 jours : données quotidiennes.
// 90 jours : groupes de 7 jours.
// 365 jours : groupes mensuels.

export function groupTimeline(timeline = [], days = 30) {

  if (days <= 30) {

    return timeline.map(item => ({
      ...item,
      label: formatDay(item.day)
    }))

  }

  const groups = new Map()

  timeline.forEach((item, index) => {

    const key = days === 365

      ? item.day.slice(0, 7)

      : String(Math.floor(index / 7))

    if (!groups.has(key)) {

      groups.set(key, {

        day: item.day,

        endDay: item.day,

        label: days === 365

          ? new Date(
              `${item.day.slice(0, 7)}-01T12:00:00Z`
            ).toLocaleDateString('fr-FR', {
              month: 'short',
              year: '2-digit',
              timeZone: 'Indian/Antananarivo'
            })

          : formatDay(item.day),

        users: 0,

        products: 0,

        reports: 0,

        approved: 0,

        rejected: 0

      })

    }

    const group = groups.get(key)

    group.endDay = item.day

    group.users += Number(item.users) || 0

    group.products += Number(item.products) || 0

    group.reports += Number(item.reports) || 0

    group.approved += Number(item.approved) || 0

    group.rejected += Number(item.rejected) || 0

  })

  return [...groups.values()]

}

// ==========================================
// PROTECTION DES EXPORTS CSV
// ==========================================

function escapeCSV(value) {

  let text = String(value ?? '')

  if (

    /^\s*[=+\-@]/.test(text)

    || /^[\t\r\n]/.test(text)

  ) {

    text = "'" + text

  }

  return `"${text.replace(/"/g, '""')}"`

}

// ==========================================
// EXPORT ANALYTICS CSV
// ==========================================

export function exportAnalyticsCSV(data) {

  if (!data) {
    throw new Error('Aucune donnée à exporter.')
  }

  const rows = [

    ['BIZINA IPHONE - RAPPORT ANALYTICS V8'],

    ['Date de génération', formatDateTime(data.generated_at)],

    ['Début de période', data.period.from],

    ['Fin de période', data.period.to],

    ['Fuseau horaire', data.period.timezone],

    [],

    ['UTILISATEURS', 'VALEUR', 'PERIMETRE'],

    ['Total utilisateurs', data.users.total_users, 'Actuel'],

    ['Administrateurs', data.users.total_admins, 'Actuel'],

    ['Utilisateurs actifs', data.users.active_users, 'Actuel'],

    ['Utilisateurs suspendus', data.users.suspended_users, 'Actuel'],

    ['Utilisateurs bannis', data.users.banned_users, 'Actuel'],

    ['Nouvelles inscriptions', data.users.new_users, 'Période'],

    ['Inscriptions précédentes', data.users.previous_users, 'Période précédente'],

    [],

    ['ANNONCES', 'VALEUR', 'PERIMETRE'],

    ['Total annonces', data.products.total_products, 'Actuel'],

    ['Annonces approuvées', data.products.approved_products, 'Actuel'],

    ['Annonces refusées', data.products.rejected_products, 'Actuel'],

    ['Annonces en attente', data.products.pending_products, 'Actuel'],

    ['Nouvelles annonces', data.products.new_products, 'Période'],

    ['Annonces période précédente', data.products.previous_products, 'Période précédente'],

    ['Taux approbation (%)', data.products.approval_rate, 'Actuel'],

    ['Taux refus (%)', data.products.rejection_rate, 'Actuel'],

    ['Valeur annonces approuvées (MGA)', data.products.listing_value, 'Actuel'],

    ['Prix moyen (MGA)', data.products.average_price, 'Actuel'],

    ['Vendeurs avec annonces approuvées', data.products.active_sellers, 'Actuel'],

    [],

    ['SECURITE', 'VALEUR', 'PERIMETRE'],

    ['Total signalements', data.reports.total_reports, 'Actuel'],

    ['Signalements ouverts', data.reports.open_reports, 'Actuel'],

    ['Signalements urgents ouverts', data.reports.urgent_reports, 'Actuel'],

    ['Nouveaux signalements', data.reports.new_reports, 'Période'],

    ['Signalements précédents', data.reports.previous_reports, 'Période précédente'],

    ['Suspensions', data.sanctions.suspensions, 'Période'],

    ['Bannissements', data.sanctions.bans, 'Période'],

    ['Réactivations', data.sanctions.reactivations, 'Période'],

    ['Actions administratives auditées', data.audit.admin_actions, 'Période'],

    ['Événements critiques audités', data.audit.critical_events, 'Période'],

    ['Approbations auditées', data.audit.approval_events, 'Période'],

    ['Refus audités', data.audit.rejection_events, 'Période'],

    [],

    ['CATALOGUE', 'VALEUR'],

    ['Total éléments', data.catalog.total_catalog_items],

    ['Éléments actifs', data.catalog.active_catalog_items],

    ['Catégories actives', data.catalog.active_categories],

    [],

    ['TOP CATEGORIES', 'ANNONCES', 'VALEUR MGA'],

    ...data.categories.map(item => [

      item.name,

      item.amount,

      item.value

    ]),

    [],

    ['TOP MODELES', 'ANNONCES'],

    ...data.models.map(item => [

      item.name,

      item.amount

    ]),

    [],

    ['TOP VENDEURS', 'ANNONCES', 'VALEUR MGA'],

    ...data.sellers.map(item => [

      item.name,

      item.amount,

      item.value

    ]),

    [],

    [
      'DATE',
      'INSCRIPTIONS',
      'ANNONCES',
      'SIGNALEMENTS',
      'APPROBATIONS AUDITEES',
      'REFUS AUDITES'
    ],

    ...data.timeline.map(item => [

      item.day,

      item.users,

      item.products,

      item.reports,

      item.approved,

      item.rejected

    ])

  ]

  const csv = rows.map(row =>

    row.map(escapeCSV).join(';')

  ).join('\r\n')

  const blob = new Blob(

    ['\uFEFF', csv],

    {
      type: 'text/csv;charset=utf-8;'
    }

  )

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  link.href = url

  link.download =

    `Bizina-Iphone-Analytics-${data.period.days}j-${data.period.to}.csv`

  document.body.appendChild(link)

  link.click()

  link.remove()

  setTimeout(

    () => URL.revokeObjectURL(url),

    1000

  )

}
