
import { supabase } from './supabase'

// ========================================
// STATISTIQUES
// ========================================

export async function getAdminStats() {
  const [
    products,
    pending,
    approved,
    rejected,
    users,
    admins
  ] = await Promise.all([
    supabase.from('products')
      .select('id', { count: 'exact', head: true }),

    supabase.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    supabase.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),

    supabase.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected'),

    supabase.from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user'),

    supabase.from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
  ])

  const error =
    products.error ||
    pending.error ||
    approved.error ||
    rejected.error ||
    users.error ||
    admins.error

  if (error) throw error

  return {
    totalProducts: products.count || 0,
    pendingProducts: pending.count || 0,
    approvedProducts: approved.count || 0,
    rejectedProducts: rejected.count || 0,
    totalUsers: users.count || 0,
    totalAdmins: admins.count || 0
  }
}

// ========================================
// LISTE DES PRODUITS
// ========================================

export async function getAdminProducts({
  status = 'all',
  search = '',
  page = 1,
  pageSize = 10
} = {}) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    products: data || [],
    total: count || 0
  }
}

// ========================================
// PRODUITS EN ATTENTE
// ========================================

export async function getPendingProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

// ========================================
// PRODUITS RECENTS
// ========================================

export async function getRecentProducts(limit = 5) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return data || []
}

// ========================================
// MODERATION
// ========================================

export async function moderateProduct(
  productId,
  status,
  rejectionReason = ''
) {
  if (!productId) {
    throw new Error('Identifiant du produit manquant.')
  }

  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Statut de modération invalide.')
  }

  const reason = rejectionReason.trim()

  if (status === 'rejected' && !reason) {
    throw new Error('Le motif du refus est obligatoire.')
  }

  const { data, error } = await supabase
    .from('products')
    .update({
      status,
      rejection_reason: status === 'rejected' ? reason : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', productId)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (error) throw error

  if (!data) {
    throw new Error('Produit introuvable ou déjà traité.')
  }

  return data
}

// ========================================
// SUPPRESSION
// ========================================

export async function deleteProduct(productId) {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .select('id')
    .maybeSingle()

  if (error) throw error

  if (!data) {
    throw new Error('Produit introuvable ou accès refusé.')
  }

  return data
}

// ========================================
// UTILISATEURS
// ========================================

export async function getAdminUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      avatar_url,
      role,
      created_at
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function getProductSeller(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error

  return data
}
