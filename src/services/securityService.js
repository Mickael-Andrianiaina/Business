
import { supabase } from './supabase'

// ==========================================
// BIZINA IPHONE - ADMIN V9
// SECURITY SERVICE
// ==========================================

export async function getAssuranceLevel() {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (error) throw error

  return data
}

// ==========================================
// LISTE DES FACTEURS MFA
// ==========================================

export async function getMFAFactors() {
  const { data, error } =
    await supabase.auth.mfa.listFactors()

  if (error) throw error

  return (data?.all || []).filter(
    factor => factor.factor_type === 'totp'
  )
}

// ==========================================
// ETAT DE SECURITE COTE SERVEUR
// ==========================================

export async function getSecurityStatus() {
  const { data, error } = await supabase.rpc(
    'get_my_security_status'
  )

  if (error) throw error

  return data
}

// ==========================================
// JOURNALISATION
// ==========================================

export async function recordSecurityActivity(action) {
  try {
    const { error } = await supabase.rpc(
      'record_security_activity',
      { p_action: action }
    )

    if (error) throw error
  } catch (error) {
    console.warn(
      'Journal de sécurité indisponible :',
      error.message
    )
  }
}

// ==========================================
// INSCRIPTION MFA
// ==========================================

export async function enrollMFA() {
  const factors = await getMFAFactors()

  // Supprimer les anciennes configurations
  // TOTP qui n'ont jamais été validées.

  for (const factor of factors) {
    if (factor.status === 'unverified') {
      const { error } =
        await supabase.auth.mfa.unenroll({
          factorId: factor.id
        })

      if (error) throw error
    }
  }

  const { data, error } =
    await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Bizina Iphone ${Date.now()}`
    })

  if (error) throw error

  return {
    id: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret
  }
}

// ==========================================
// VERIFICATION DU CODE TOTP
// ==========================================

export async function verifyMFA(
  factorId,
  code,
  enrollment = false
) {
  const cleanCode = String(code).trim()

  if (!factorId) {
    throw new Error(
      'Facteur d’authentification introuvable.'
    )
  }

  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error(
      'Saisissez un code à six chiffres.'
    )
  }

  const { error } =
    await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: cleanCode
    })

  if (error) throw error

  const assurance = await getAssuranceLevel()

  if (assurance.currentLevel !== 'aal2') {
    throw new Error(
      'Le niveau MFA de la session n’a pas pu être confirmé.'
    )
  }

  await recordSecurityActivity(
    enrollment
      ? 'mfa_enrolled'
      : 'mfa_verified'
  )

  return assurance
}

// ==========================================
// ANNULATION D'UNE CONFIGURATION
// ==========================================

export async function cancelMFAEnrollment(factorId) {
  const factors = await getMFAFactors()

  const factor = factors.find(
    item => item.id === factorId
  )

  if (!factor) return

  if (factor.status === 'verified') {
    throw new Error(
      'Ce facteur est déjà vérifié.'
    )
  }

  const { error } =
    await supabase.auth.mfa.unenroll({
      factorId
    })

  if (error) throw error
}

// ==========================================
// SUPPRESSION D'UN FACTEUR VERIFIE
// ==========================================

export async function removeMFAFactor(factorId) {
  const assurance = await getAssuranceLevel()

  if (assurance.currentLevel !== 'aal2') {
    throw new Error(
      'Une session AAL2 est obligatoire.'
    )
  }

  const factors = await getMFAFactors()

  const verified = factors.filter(
    item => item.status === 'verified'
  )

  if (!verified.some(item => item.id === factorId)) {
    throw new Error('Facteur introuvable.')
  }

  // Ne pas autoriser la suppression du dernier
  // facteur vérifié depuis cette interface.

  if (verified.length <= 1) {
    throw new Error(
      'Ajoutez un facteur de secours avant de supprimer celui-ci.'
    )
  }

  const { error } =
    await supabase.auth.mfa.unenroll({
      factorId
    })

  if (error) throw error

  await recordSecurityActivity(
    'mfa_factor_removed'
  )

  const { error: refreshError } =
    await supabase.auth.refreshSession()

  if (refreshError) throw refreshError
}

// ==========================================
// REVOQUER LES AUTRES SESSIONS
// ==========================================

export async function revokeOtherSessions() {
  const assurance = await getAssuranceLevel()

  if (assurance.currentLevel !== 'aal2') {
    throw new Error(
      'Vérification MFA obligatoire.'
    )
  }

  const { error } = await supabase.auth.signOut({
    scope: 'others'
  })

  if (error) throw error

  await recordSecurityActivity(
    'other_sessions_revoked'
  )
}

// ==========================================
// DECONNEXION LOCALE
// ==========================================

export async function logoutCurrentSession() {
  const { error } = await supabase.auth.signOut({
    scope: 'local'
  })

  if (error) throw error
}

// ==========================================
// EVENEMENTS DE SECURITE
// ==========================================

export async function getSecurityEvents() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      id,
      actor_role,
      action,
      severity,
      source,
      created_at
    `)
    .eq('module', 'auth')
    .in('action', [
      'login',
      'logout_requested',
      'mfa_enrolled',
      'mfa_verified',
      'mfa_factor_removed',
      'other_sessions_revoked'
    ])
    .order('created_at', {
      ascending: false
    })
    .limit(20)

  if (error) throw error

  return data || []
}

export const SECURITY_ACTIONS = {
  login: 'Connexion déclarée',
  logout_requested: 'Déconnexion demandée',
  mfa_enrolled: 'Facteur MFA configuré',
  mfa_verified: 'Vérification MFA',
  mfa_factor_removed: 'Facteur MFA supprimé',
  other_sessions_revoked: 'Autres sessions révoquées'
}

export function formatSecurityDate(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString(
    'fr-FR',
    {
      timeZone: 'Indian/Antananarivo'
    }
  )
}
