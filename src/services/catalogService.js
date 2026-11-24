
import { supabase } from './supabase'

export const CATALOG_TYPES = [
  'category',
  'brand',
  'model',
  'color',
  'storage',
  'condition'
]

// ========================================
// LISTE DU CATALOGUE
// ========================================

export async function getCatalogItems({
  type = 'category',
  search = '',
  status = 'all',
  parentId = '',
  page = 1,
  pageSize = 12
} = {}) {
  let query = supabase
    .from('catalog_items')
    .select('*', { count: 'exact' })
    .eq('type', type)

  if (search.trim()) {
    query = query.ilike(
      'name',
      `%${search.trim()}%`
    )
  }

  if (status === 'active') {
    query = query.eq('is_active', true)
  }

  if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  if (parentId && type === 'model') {
    query = query.eq('parent_id', parentId)
  }

  const from = (page - 1) * pageSize

  const { data, error, count } = await query
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, from + pageSize - 1)

  if (error) throw error

  return {
    items: data || [],
    total: count || 0
  }
}

// ========================================
// CATEGORIES DISPONIBLES
// ========================================

export async function getCategories({
  activeOnly = false
} = {}) {
  const categories = []
  const batchSize = 100
  let offset = 0

  while (true) {
    let query = supabase
      .from('catalog_items')
      .select('id, name, is_active')
      .eq('type', 'category')

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query
      .order('sort_order')
      .order('name')
      .order('id')
      .range(offset, offset + batchSize - 1)

    if (error) throw error

    categories.push(...(data || []))

    if (!data || data.length < batchSize) {
      break
    }

    offset += batchSize
  }

  return categories
}

// ========================================
// STATISTIQUES
// ========================================

export async function getCatalogStats() {
  const count = () =>
    supabase
      .from('catalog_items')
      .select('id', {
        count: 'exact',
        head: true
      })

  const results = await Promise.all([
    count(),
    count().eq('type', 'category'),
    count().eq('type', 'model'),
    count().eq('is_active', true),
    count().eq('is_active', false)
  ])

  const failed = results.find(item => item.error)

  if (failed) throw failed.error

  return {
    total: results[0].count || 0,
    categories: results[1].count || 0,
    models: results[2].count || 0,
    active: results[3].count || 0,
    inactive: results[4].count || 0
  }
}

// ========================================
// VALIDATION
// ========================================

function validateItem(item) {
  const name = item.name?.trim() || ''

  if (!CATALOG_TYPES.includes(item.type)) {
    throw new Error('Type de référence invalide.')
  }

  if (!name || name.length > 120) {
    throw new Error('Le nom doit contenir 1 à 120 caractères.')
  }

  if (item.type === 'model' && !item.parent_id) {
    throw new Error('Sélectionnez une catégorie.')
  }

  if (
    item.type === 'color' &&
    !/^#[0-9a-f]{6}$/i.test(item.color_hex || '')
  ) {
    throw new Error('Code couleur HEX invalide.')
  }

  const order = Number(item.sort_order || 0)

  if (
    !Number.isInteger(order) ||
    order < 0 ||
    order > 2147483647
  ) {
    throw new Error('Ordre d’affichage invalide.')
  }

  return {
    name,
    parent_id:
      item.type === 'model'
        ? item.parent_id
        : null,

    color_hex:
      item.type === 'color'
        ? item.color_hex
        : null,

    description: item.description?.trim() || null,

    is_active: item.is_active !== false,

    sort_order: order
  }
}

// ========================================
// CREATION
// ========================================

export async function createCatalogItem(item) {
  const payload = validateItem(item)

  const { data, error } = await supabase
    .from('catalog_items')
    .insert({
      ...payload,
      type: item.type
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Cette référence existe déjà.')
    }

    throw error
  }

  return data
}

// ========================================
// MODIFICATION
// ========================================

export async function updateCatalogItem(id, item) {
  const payload = validateItem(item)

  const { data, error } = await supabase
    .from('catalog_items')
    .update(payload)
    .eq('id', id)
    .eq('type', item.type)
    .select()
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Cette référence existe déjà.')
    }

    throw error
  }

  if (!data) {
    throw new Error('Référence introuvable ou accès refusé.')
  }

  return data
}

// ========================================
// ACTIVATION / DESACTIVATION
// ========================================

export async function toggleCatalogItem(id, isActive) {
  const { data, error } = await supabase
    .from('catalog_items')
    .update({
      is_active: isActive
    })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw error

  if (!data) {
    throw new Error('Référence introuvable ou accès refusé.')
  }

  return data
}
