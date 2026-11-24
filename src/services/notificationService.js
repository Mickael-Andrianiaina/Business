
import { supabase } from './supabase'

export const NOTIFICATION_TYPES = {
  registration: 'Inscription',
  product_pending: 'Nouvelle annonce',
  product_approved: 'Annonce approuvée',
  product_rejected: 'Annonce refusée',
  report_created: 'Signalement',
  report_urgent: 'Signalement urgent',
  report_resolved: 'Signalement traité',
  account_suspended: 'Suspension',
  account_banned: 'Bannissement',
  account_reactivated: 'Réactivation',
  announcement: 'Annonce administrative',
  system: 'Système'
}

export const NOTIFICATION_PRIORITIES = {
  low: 'Faible',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente'
}

// ========================================
// LISTE DES NOTIFICATIONS
// ========================================

export async function getNotifications({
  filter = 'all',
  type = 'all',
  page = 1,
  pageSize = 10
} = {}) {
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)

  if (filter === 'unread') {
    query = query.is('read_at', null)
  }

  if (filter === 'read') {
    query = query.not('read_at', 'is', null)
  }

  if (type !== 'all') {
    query = query.eq('type', type)
  }

  const from = (page - 1) * pageSize

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) throw error

  return {
    notifications: data || [],
    total: count || 0
  }
}

// ========================================
// COMPTEUR NON LU
// ========================================

export async function getUnreadCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', {
      count: 'exact',
      head: true
    })
    .is('read_at', null)
    .is('deleted_at', null)

  if (error) throw error

  return count || 0
}

// ========================================
// STATISTIQUES
// ========================================

export async function getNotificationStats() {
  const base = () =>
    supabase
      .from('notifications')
      .select('id', {
        count: 'exact',
        head: true
      })
      .is('deleted_at', null)

  const results = await Promise.all([
    base(),
    base().is('read_at', null),
    base().not('read_at', 'is', null),
    base()
      .eq('priority', 'urgent')
      .is('read_at', null)
  ])

  const failed = results.find(item => item.error)

  if (failed) throw failed.error

  return {
    total: results[0].count || 0,
    unread: results[1].count || 0,
    read: results[2].count || 0,
    urgent: results[3].count || 0
  }
}

// ========================================
// MARQUER COMME LU
// ========================================

export async function markNotificationRead(id) {
  const { error } = await supabase.rpc(
    'mark_notification_read',
    { p_id: id }
  )

  if (error) throw error
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.rpc(
    'mark_all_notifications_read'
  )

  if (error) throw error
}

// ========================================
// SUPPRESSION
// ========================================

export async function deleteNotification(id) {
  const { error } = await supabase.rpc(
    'delete_notification',
    { p_id: id }
  )

  if (error) throw error
}

// ========================================
// ENVOI ADMINISTRATIF
// ========================================

export async function sendAdminNotification({
  recipientId = null,
  audience = 'individual',
  title,
  message,
  priority = 'normal'
}) {
  const { data, error } = await supabase.rpc(
    'admin_send_notification',
    {
      p_recipient: recipientId,
      p_audience: audience,
      p_title: title.trim(),
      p_message: message.trim(),
      p_priority: priority
    }
  )

  if (error) throw error

  return data || 0
}

// ========================================
// RECHERCHE DES DESTINATAIRES
// ========================================

export async function searchRecipients(search = '') {
  let query = supabase
    .from('profiles')
    .select('id, full_name, email, role, account_status')

  const term = search
    .trim()
    .replace(/[(),."\\%_*]/g, '')
    .slice(0, 100)

  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%`
    )
  }

  const { data, error } = await query
    .order('full_name', { ascending: true })
    .limit(30)

  if (error) throw error

  return data || []
}

// ========================================
// ABONNEMENT REALTIME
// ========================================

let subscriptionSequence = 0

export function subscribeToNotifications(
  userId,
  onChange,
  onStatus
) {
  if (!userId) return () => {}

  const filter = {
    schema: 'public',
    table: 'notifications',
    filter: `recipient_id=eq.${userId}`
  }

  const channel = supabase
    .channel(
      `notifications-${userId}-${++subscriptionSequence}`
    )
    .on(
      'postgres_changes',
      { ...filter, event: 'INSERT' },
      onChange
    )
    .on(
      'postgres_changes',
      { ...filter, event: 'UPDATE' },
      onChange
    )
    .subscribe(status => {
      onStatus?.(status)
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}
