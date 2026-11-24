
import { supabase } from './supabase'

// ==========================================
// BIZINA IPHONE - ADMIN V10
// SETTINGS SERVICE
// ==========================================

export const DEFAULT_SETTINGS = Object.freeze({

  platform_name: 'Bizina Iphone',

  platform_description:
    'La marketplace dédiée aux produits Apple à Madagascar.',

  contact_email: '',

  contact_phone: '',

  currency: 'MGA',

  timezone: 'Indian/Antananarivo',

  registration_enabled: true,

  maintenance_enabled: false,

  maintenance_message:
    'Bizina Iphone est temporairement en maintenance.',

  moderation_required: true,

  max_products_per_user: 20,

  min_product_price: 1000,

  max_product_price: 1000000000,

  product_notifications_enabled: true

})

// ==========================================
// CHAMPS MODIFIABLES
// ==========================================

export const EDITABLE_SETTINGS = [

  'platform_name',
  'platform_description',
  'contact_email',
  'contact_phone',
  'registration_enabled',
  'maintenance_enabled',
  'maintenance_message',
  'max_products_per_user',
  'min_product_price',
  'max_product_price',
  'product_notifications_enabled'

]

export const SETTINGS_LABELS = {

  platform_name: 'Nom de la plateforme',

  platform_description: 'Description',

  contact_email: 'E-mail de contact',

  contact_phone: 'Téléphone de contact',

  registration_enabled: 'Inscriptions',

  maintenance_enabled: 'Mode maintenance',

  maintenance_message: 'Message de maintenance',

  max_products_per_user: 'Limite d’annonces',

  min_product_price: 'Prix minimum',

  max_product_price: 'Prix maximum',

  product_notifications_enabled:
    'Notifications de publication'

}

// ==========================================
// PARAMETRES PUBLICS
// ==========================================

export async function getPublicSettings() {

  const { data, error } = await supabase.rpc(
    'get_platform_settings'
  )

  if (error) throw error

  if (!data) {
    throw new Error(
      'Configuration de la plateforme indisponible.'
    )
  }

  return data

}

// ==========================================
// PARAMETRES ADMINISTRATEUR
// ==========================================

export async function getAdminSettings() {

  const { data, error } = await supabase.rpc(
    'admin_get_settings'
  )

  if (error) throw error

  if (!data) {
    throw new Error(
      'Configuration administrateur introuvable.'
    )
  }

  return data

}

// ==========================================
// NORMALISATION DES VALEURS
// ==========================================

export function normalizeSettings(settings) {

  return {

    platform_name:
      String(settings.platform_name ?? '').trim(),

    platform_description:
      String(
        settings.platform_description ?? ''
      ).trim(),

    contact_email:
      String(
        settings.contact_email ?? ''
      ).trim().toLowerCase(),

    contact_phone:
      String(
        settings.contact_phone ?? ''
      ).trim(),

    registration_enabled:
      settings.registration_enabled,

    maintenance_enabled:
      settings.maintenance_enabled,

    maintenance_message:
      String(
        settings.maintenance_message ?? ''
      ).trim(),

    max_products_per_user:
      settings.max_products_per_user === ''
        ? NaN
        : Number(settings.max_products_per_user),

    min_product_price:
      settings.min_product_price === ''
        ? NaN
        : Number(settings.min_product_price),

    max_product_price:
      settings.max_product_price === ''
        ? NaN
        : Number(settings.max_product_price),

    product_notifications_enabled:
      settings.product_notifications_enabled

  }

}

// ==========================================
// VALIDATION DU FORMULAIRE
// ==========================================

export function validateSettings(settings) {

  const values = normalizeSettings(settings)

  const errors = {}

  if (
    values.platform_name.length < 2 ||
    values.platform_name.length > 80
  ) {
    errors.platform_name =
      'Le nom doit contenir entre 2 et 80 caractères.'
  }

  if (values.platform_description.length > 500) {
    errors.platform_description =
      'La description ne doit pas dépasser 500 caractères.'
  }

  if (
    values.contact_email &&
    (
      values.contact_email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(values.contact_email)
    )
  ) {
    errors.contact_email =
      'Adresse e-mail invalide.'
  }

  if (
    values.contact_phone &&
    !/^[+0-9() .-]{5,40}$/
      .test(values.contact_phone)
  ) {
    errors.contact_phone =
      'Numéro de téléphone invalide.'
  }

  if (
    !values.maintenance_message ||
    values.maintenance_message.length > 500
  ) {
    errors.maintenance_message =
      'Le message doit contenir entre 1 et 500 caractères.'
  }

  if (
    !Number.isInteger(
      values.max_products_per_user
    ) ||
    values.max_products_per_user < 1 ||
    values.max_products_per_user > 1000
  ) {
    errors.max_products_per_user =
      'La limite doit être comprise entre 1 et 1000.'
  }

  if (
    !Number.isSafeInteger(
      values.min_product_price
    ) ||
    values.min_product_price < 0 ||
    values.min_product_price > 1000000000000
  ) {
    errors.min_product_price =
      'Le prix minimum doit être un entier valide.'
  }

  if (
    !Number.isSafeInteger(
      values.max_product_price
    ) ||
    values.max_product_price < 0 ||
    values.max_product_price > 1000000000000 ||
    values.max_product_price <
      values.min_product_price
  ) {
    errors.max_product_price =
      'Le prix maximum doit être supérieur ou égal au minimum.'
  }

  for (const key of [
    'registration_enabled',
    'maintenance_enabled',
    'product_notifications_enabled'
  ]) {

    if (typeof values[key] !== 'boolean') {
      errors[key] = 'Valeur invalide.'
    }

  }

  return errors

}

// ==========================================
// DETECTER LES MODIFICATIONS
// ==========================================

export function getSettingsChanges(
  original,
  draft
) {

  if (!original || !draft) return {}

  const before = normalizeSettings(original)
  const after = normalizeSettings(draft)

  return Object.fromEntries(

    EDITABLE_SETTINGS

      .filter(
        key => !Object.is(
          before[key],
          after[key]
        )
      )

      .map(
        key => [key, after[key]]
      )

  )

}

// ==========================================
// ENREGISTREMENT SECURISE
// ==========================================

export async function saveAdminSettings(
  original,
  draft
) {

  if (!original?.version) {
    throw new Error(
      'Actualisez la configuration avant de continuer.'
    )
  }

  const errors = validateSettings(draft)

  if (Object.keys(errors).length > 0) {
    throw new Error(
      Object.values(errors)[0]
    )
  }

  const changes = getSettingsChanges(
    original,
    draft
  )

  if (!Object.keys(changes).length) {
    return original
  }

  const { data, error } = await supabase.rpc(
    'admin_update_settings',
    {

      p_settings: changes,

      p_expected_version:
        original.version

    }
  )

  if (error) throw error

  if (!data) {
    throw new Error(
      'La configuration enregistrée est introuvable.'
    )
  }

  return data

}

// ==========================================
// HISTORIQUE DES MODIFICATIONS
// ==========================================

export async function getSettingsHistory() {

  const { data, error } = await supabase

    .from('activity_logs')

    .select(`
      id,
      actor_id,
      actor_role,
      action,
      severity,
      details,
      created_at
    `)

    .eq('module', 'system')

    .eq(
      'action',
      'platform_settings_updated'
    )

    .order('created_at', {
      ascending: false
    })

    .limit(30)

  if (error) throw error

  return data || []

}

// ==========================================
// FORMATAGE DE LA DATE
// ==========================================

export function formatSettingsDate(value) {

  if (!value) return '—'

  return new Date(value).toLocaleString(
    'fr-FR',
    {

      timeZone: 'Indian/Antananarivo',

      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'

    }
  )

}

// ==========================================
// FORMATAGE DES VALEURS
// ==========================================

export function formatSettingValue(key, value) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—'
  }

  if (typeof value === 'boolean') {

    return value
      ? 'Activé'
      : 'Désactivé'

  }

  if (
    key === 'min_product_price' ||
    key === 'max_product_price'
  ) {

    return new Intl.NumberFormat(
      'fr-FR',
      {
        maximumFractionDigits: 0
      }
    ).format(Number(value)) + ' Ar'

  }

  return String(value)

}

// ==========================================
// EXPORT DE LA CONFIGURATION
// ==========================================

export function exportSettingsJSON(settings) {

  if (!settings) {
    throw new Error(
      'Aucune configuration à exporter.'
    )
  }

  const payload = {

    application: 'Bizina Iphone',

    module: 'Admin V10',

    exported_at: new Date().toISOString(),

    version: settings.version,

    settings: {

      ...normalizeSettings(settings),

      currency: settings.currency,

      timezone: settings.timezone,

      moderation_required: true

    }

  }

  const blob = new Blob(

    [JSON.stringify(payload, null, 2)],

    {
      type: 'application/json;charset=utf-8'
    }

  )

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  const date = new Date()
    .toISOString()
    .slice(0, 10)

  link.href = url

  link.download =
    `Bizina-Iphone-Settings-${date}.json`

  document.body.appendChild(link)

  link.click()

  link.remove()

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  )

}
