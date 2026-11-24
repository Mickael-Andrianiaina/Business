
import { supabase } from './supabase'

// ==========================================
// BIZINA IPHONE - ADMIN V7
// ACTIVITY SERVICE
// ==========================================

export const ACTIVITY_MODULES = {
  auth: 'Authentification',
  users: 'Utilisateurs',
  products: 'Produits',
  catalog: 'Catalogue Apple',
  reports: 'Signalements',
  notifications: 'Notifications',
  system: 'Système'
}

export const ACTIVITY_SEVERITIES = {
  info: 'Information',
  success: 'Succès',
  warning: 'Avertissement',
  critical: 'Critique'
}

export const ACTIVITY_ACTIONS = {
  login: 'Connexion déclarée',
  logout_requested: 'Déconnexion demandée',

  user_registered: 'Nouvelle inscription',
  user_role_changed: 'Rôle modifié',
  user_suspended: 'Compte suspendu',
  user_banned: 'Compte banni',
  user_reactivated: 'Compte réactivé',
  user_status_changed: 'Statut du compte modifié',
  user_deleted: 'Compte supprimé',
  profile_updated: 'Profil modifié',

  product_created: 'Nouvelle annonce',
  product_updated: 'Annonce modifiée',
  product_approved: 'Annonce approuvée',
  product_rejected: 'Annonce refusée',
  product_deleted: 'Annonce supprimée',
  product_status_changed: 'Statut de l’annonce modifié',

  catalog_created: 'Élément du catalogue créé',
  catalog_updated: 'Catalogue modifié',
  catalog_disabled: 'Élément désactivé',
  catalog_enabled: 'Élément réactivé',
  catalog_deleted: 'Élément supprimé',

  report_created: 'Nouveau signalement',
  report_updated: 'Signalement modifié',
  report_resolved: 'Signalement résolu',
  report_dismissed: 'Signalement rejeté',

  notification_sent: 'Notification administrative envoyée',

  audit_initialized: 'Installation du système d’audit'
}

export const ACTOR_ROLES = {
  admin: 'Administrateur',
  user: 'Utilisateur',
  system: 'Système'
}

// ==========================================
// FILTRES
// ==========================================

function applyFilters(query, {
  module = 'all',
  severity = 'all',
  actorRole = 'all',
  search = '',
  fromDate = '',
  toDate = ''
} = {}) {

  if (module !== 'all') {
    query = query.eq('module', module)
  }

  if (severity !== 'all') {
    query = query.eq('severity', severity)
  }

  if (actorRole !== 'all') {
    query = query.eq('actor_role', actorRole)
  }

  if (fromDate) {
    const start = new Date(`${fromDate}T00:00:00`)

    query = query.gte(
      'created_at',
      start.toISOString()
    )
  }

  if (toDate) {
    const end = new Date(`${toDate}T00:00:00`)
    end.setDate(end.getDate() + 1)

    query = query.lt(
      'created_at',
      end.toISOString()
    )
  }

  const term = search
    .trim()
    .replace(/[(),."\\%_*]/g, '')
    .slice(0, 100)

  if (term) {

    const matchingActions = Object.entries(
      ACTIVITY_ACTIONS
    )
      .filter(([key, label]) =>
        key.toLowerCase().includes(term.toLowerCase()) ||
        label.toLowerCase().includes(term.toLowerCase())
      )
      .map(([key]) => key)

    const conditions = [
      `entity_label.ilike.%${term}%`,
      `action.ilike.%${term}%`
    ]

    if (matchingActions.length > 0) {
      conditions.push(
        `action.in.(${matchingActions.join(',')})`
      )
    }

    query = query.or(conditions.join(','))
  }

  return query
}

// ==========================================
// STATISTIQUES
// ==========================================

export async function getActivityStats() {
  const count = () =>
    supabase
      .from('activity_logs')
      .select('id', {
        count: 'exact',
        head: true
      })

  const last24Hours = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString()

  const results = await Promise.all([
    count(),

    count().gte(
      'created_at',
      last24Hours
    ),

    count().eq(
      'actor_role',
      'admin'
    ),

    count().in(
      'severity',
      ['warning', 'critical']
    )
  ])

  const failed = results.find(
    result => result.error
  )

  if (failed) throw failed.error

  return {
    total: results[0].count || 0,
    today: results[1].count || 0,
    adminActions: results[2].count || 0,
    sensitive: results[3].count || 0
  }
}

// ==========================================
// LISTE PAGINEE
// ==========================================

export async function getActivityLogs({
  page = 1,
  pageSize = 15,
  ...filters
} = {}) {

  let query = supabase
    .from('activity_logs')
    .select('*', {
      count: 'exact'
    })

  query = applyFilters(query, filters)

  const from = (page - 1) * pageSize

  const { data, error, count } = await query
    .order('created_at', {
      ascending: false
    })
    .order('id', {
      ascending: false
    })
    .range(
      from,
      from + pageSize - 1
    )

  if (error) throw error

  return {
    logs: data || [],
    total: count || 0
  }
}

// ==========================================
// IDENTITE DE L'AUTEUR
// ==========================================

export async function getActivityActor(actorId) {
  if (!actorId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role
    `)
    .eq('id', actorId)
    .maybeSingle()

  if (error) throw error

  return data
}

// ==========================================
// AUTHENTIFICATION
// ==========================================

export async function recordAuthActivity(action) {
  const { error } = await supabase.rpc(
    'record_auth_activity',
    {
      p_action: action
    }
  )

  if (error) throw error
}

// ==========================================
// PROTECTION CSV
// ==========================================

function escapeCSV(value) {
  let text = String(value ?? '')

  // Protection contre les formules malveillantes
  // lors de l'ouverture dans Excel.

  if (
    /^\s*[=+\-@]/.test(text) ||
    /^[\t\r\n]/.test(text)
  ) {
    text = "'" + text
  }

  return `"${text.replace(/"/g, '""')}"`
}

// ==========================================
// EXPORT CSV
// ==========================================

export async function exportActivityCSV(filters = {}) {

  const batchSize = 500
  const maxRows = 10000

  const logs = []

  // Limite temporelle fixe pour éviter d'inclure
  // les nouveaux événements pendant l'export.

  const snapshot = new Date().toISOString()

  for (
    let offset = 0;
    offset < maxRows;
    offset += batchSize
  ) {

    let query = supabase
      .from('activity_logs')
      .select('*')
      .lte('created_at', snapshot)

    query = applyFilters(query, filters)

    const { data, error } = await query
      .order('created_at', {
        ascending: false
      })
      .order('id', {
        ascending: false
      })
      .range(
        offset,
        offset + batchSize - 1
      )

    if (error) throw error

    logs.push(...(data || []))

    if (!data || data.length < batchSize) {
      break
    }
  }

  const headers = [
    'ID',
    'Date',
    'Module',
    'Action',
    'Auteur',
    'Rôle',
    'Cible',
    'Identifiant cible',
    'Gravité',
    'Source',
    'Détails'
  ]

  const rows = logs.map(log => [
    log.id,
    log.created_at,
    ACTIVITY_MODULES[log.module] || log.module,
    ACTIVITY_ACTIONS[log.action] || log.action,
    log.actor_id || 'Système',
    ACTOR_ROLES[log.actor_role] || log.actor_role,
    log.entity_label,
    log.entity_id,
    ACTIVITY_SEVERITIES[log.severity],
    log.source,
    JSON.stringify(log.details || {})
  ])

  const csv = [
    headers,
    ...rows
  ]
    .map(row =>
      row.map(escapeCSV).join(';')
    )
    .join('\r\n')

  const blob = new Blob(
    ['\uFEFF', csv],
    {
      type: 'text/csv;charset=utf-8;'
    }
  )

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  const date = new Date()
    .toISOString()
    .slice(0, 10)

  link.href = url
  link.download = `Bizina-Iphone-Audit-${date}.csv`

  document.body.appendChild(link)

  link.click()
  link.remove()

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  )

  return {
    count: logs.length,
    limitReached: logs.length >= maxRows
  }
}
