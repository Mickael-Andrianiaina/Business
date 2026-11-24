
import { supabase } from './supabase'

export const REPORT_REASONS = {
  scam: 'Tentative d’arnaque',
  counterfeit: 'Suspicion de contrefaçon',
  stolen_product: 'Produit potentiellement volé',
  misleading_information: 'Informations trompeuses',
  duplicate: 'Annonce en double',
  inappropriate_content: 'Contenu inapproprié',
  abusive_behavior: 'Comportement abusif',
  other: 'Autre motif'
}

export const REPORT_STATUSES = {
  pending: 'En attente',
  reviewing: 'En cours',
  resolved: 'Résolu',
  dismissed: 'Rejeté'
}

export const REPORT_PRIORITIES = {
  low: 'Faible',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente'
}

// ========================================
// STATISTIQUES
// ========================================

export async function getReportStats() {
  const count = () =>
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })

  const results = await Promise.all([
    count(),
    count().eq('status', 'pending'),
    count().eq('status', 'reviewing'),
    count().eq('status', 'resolved'),
    count().eq('status', 'dismissed'),
    count()
      .eq('priority', 'urgent')
      .in('status', ['pending', 'reviewing'])
  ])

  const failed = results.find(item => item.error)

  if (failed) throw failed.error

  return {
    total: results[0].count || 0,
    pending: results[1].count || 0,
    reviewing: results[2].count || 0,
    resolved: results[3].count || 0,
    dismissed: results[4].count || 0,
    urgent: results[5].count || 0
  }
}

// ========================================
// LISTE DES SIGNALEMENTS
// ========================================

export async function getReports({
  status = 'all',
  priority = 'all',
  search = '',
  page = 1,
  pageSize = 10
} = {}) {
  let query = supabase
    .from('reports')
    .select('*', { count: 'exact' })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (priority !== 'all') {
    query = query.eq('priority', priority)
  }

  if (search.trim()) {
    query = query.ilike(
      'target_label',
      `%${search.trim()}%`
    )
  }

  const from = (page - 1) * pageSize

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) throw error

  return {
    reports: data || [],
    total: count || 0
  }
}

// ========================================
// CREATION D'UN SIGNALEMENT
// ========================================

export async function createReport({
  targetType,
  targetId,
  reason,
  description
}) {
  const { data, error } = await supabase.rpc(
    'create_report',
    {
      p_target_type: targetType,
      p_target_id: targetId,
      p_reason: reason,
      p_description: description.trim()
    }
  )

  if (error) throw error

  return data
}

// ========================================
// TRAITEMENT ADMINISTRATIF
// ========================================

export async function processReport({
  reportId,
  status,
  priority,
  note = ''
}) {
  const { error } = await supabase.rpc(
    'admin_process_report',
    {
      p_report_id: reportId,
      p_status: status,
      p_priority: priority,
      p_note: note.trim()
    }
  )

  if (error) throw error
}

// ========================================
// HISTORIQUE
// ========================================

export async function getReportLogs(reportId) {
  const { data, error } = await supabase
    .from('report_logs')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return data || []
}

// ========================================
// PROFIL D'UN UTILISATEUR
// ========================================

async function getReportUser(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      account_status,
      role
    `)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error

  return data
}

// ========================================
// PRODUIT SIGNALE
// ========================================

async function getReportedProduct(productId) {
  if (!productId) return null

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle()

  if (error) throw error

  return data
}

// ========================================
// DETAILS COMPLETS
// ========================================

export async function getReportDetails(report) {
  const [
    reporter,
    reportedUser,
    product,
    logs
  ] = await Promise.all([
    getReportUser(report.reporter_id),
    getReportUser(report.reported_user_id),
    getReportedProduct(report.product_id),
    getReportLogs(report.id)
  ])

  return {
    reporter,
    reportedUser,
    product,
    logs
  }
}

// ========================================
// SIGNALEMENTS DE L'UTILISATEUR CONNECTE
// ========================================

export async function getMyReports() {
  const { data, error } = await supabase.rpc(
    'get_my_reports'
  )

  if (error) throw error

  return data || []
}
