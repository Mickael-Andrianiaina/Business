
import { supabase } from './supabase'

export function getEffectiveStatus(user) {
  if (
    user.account_status === 'suspended' &&
    user.suspended_until &&
    new Date(user.suspended_until).getTime() <= Date.now()
  ) {
    return 'active'
  }

  return user.account_status || 'active'
}

// STATISTIQUES UTILISATEURS

export async function getUserStats() {
  const now = new Date().toISOString()

  const count = () =>
    supabase.from('profiles')
      .select('id', { count: 'exact', head: true })

  const results = await Promise.all([
    count(),

    count().or(
      `account_status.eq.active,and(account_status.eq.suspended,suspended_until.lte.${now})`
    ),

    count()
      .eq('account_status', 'suspended')
      .or(
        `suspended_until.is.null,suspended_until.gt.${now}`
      ),

    count().eq('account_status', 'banned'),

    count().eq('role', 'admin')
  ])

  const error = results.find(result => result.error)

  if (error) throw error.error

  return {
    total: results[0].count || 0,
    active: results[1].count || 0,
    suspended: results[2].count || 0,
    banned: results[3].count || 0,
    admins: results[4].count || 0
  }
}

// LISTE DES UTILISATEURS

export async function getUsers({
  search = '',
  status = 'all',
  role = 'all',
  page = 1,
  pageSize = 10
} = {}) {
  const now = new Date().toISOString()

  let query = supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      avatar_url,
      role,
      account_status,
      suspension_reason,
      suspended_until,
      status_updated_at,
      created_at
    `, { count: 'exact' })

  const term = search
    .trim()
    .replace(/[(),."\\%_*]/g, '')
    .slice(0, 100)

  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%`
    )
  }

  if (role !== 'all') {
    query = query.eq('role', role)
  }

  if (status === 'active') {
    query = query.or(
      `account_status.eq.active,and(account_status.eq.suspended,suspended_until.lte.${now})`
    )
  } else if (status === 'suspended') {
    query = query
      .eq('account_status', 'suspended')
      .or(
        `suspended_until.is.null,suspended_until.gt.${now}`
      )
  } else if (status === 'banned') {
    query = query.eq('account_status', 'banned')
  }

  const from = (page - 1) * pageSize

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) throw error

  return {
    users: data || [],
    total: count || 0
  }
}

// CHANGEMENT DU STATUT

export async function changeUserStatus(
  userId,
  status,
  reason = '',
  until = null
) {
  const { error } = await supabase.rpc(
    'admin_change_user_status',
    {
      p_user_id: userId,
      p_status: status,
      p_reason: reason.trim(),
      p_until: until
    }
  )

  if (error) throw error
}

// HISTORIQUE DES SANCTIONS

export async function getUserSanctions(userId) {
  const { data, error } = await supabase
    .from('user_sanctions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return data || []
}

// STATISTIQUES D'UN VENDEUR

export async function getUserProductStats(userId) {
  const statuses = [
    'pending',
    'approved',
    'rejected'
  ]

  const results = await Promise.all([
    supabase.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    ...statuses.map(status =>
      supabase.from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', status)
    )
  ])

  const error = results.find(item => item.error)

  if (error) throw error.error

  return {
    total: results[0].count || 0,
    pending: results[1].count || 0,
    approved: results[2].count || 0,
    rejected: results[3].count || 0
  }
}
