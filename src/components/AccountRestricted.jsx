
import { useState } from 'react'
import { ShieldAlert, LogOut } from 'lucide-react'
import { supabase } from '../services/supabase'

export default function AccountRestricted({ profile }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const banned = profile?.account_status === 'banned'

  async function handleLogout() {
    try {
      setLoading(true)
      setError('')

      const { error } = await supabase.auth.signOut()

      if (error) throw error

      window.location.replace('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.container}>
      <section style={styles.card}>

        <div style={styles.icon}>
          <ShieldAlert size={42} />
        </div>

        <h1 style={styles.title}>
          {banned
            ? 'Compte banni'
            : 'Compte suspendu'}
        </h1>

        <p style={styles.description}>
          Votre accès à Bizina Iphone est actuellement
          restreint par l'administration.
        </p>

        <div style={styles.details}>

          <small>Motif de la restriction</small>

          <p>
            {profile?.suspension_reason ||
              'Contactez l’administration.'}
          </p>

          {!banned && profile?.suspended_until && (
            <>
              <small>Fin de la suspension</small>

              <p>
                {new Date(
                  profile.suspended_until
                ).toLocaleString('fr-FR')}
              </p>
            </>
          )}

        </div>

        {error && (
          <p style={{ color: '#d92d25' }}>
            {error}
          </p>
        )}

        <button
          style={styles.button}
          disabled={loading}
          onClick={handleLogout}
        >
          <LogOut size={18} />

          {loading
            ? 'Déconnexion...'
            : 'Se déconnecter'}
        </button>

        <small style={{ color: '#86868b' }}>
          Bizina Iphone · Sécurité des comptes
        </small>

      </section>
    </main>
  )
}

const styles = {
  container: {
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    background: '#f5f5f7',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },

  card: {
    width: '100%',
    maxWidth: 440,
    background: '#fff',
    padding: 30,
    borderRadius: 25,
    textAlign: 'center',
    boxShadow: '0 20px 70px #00000008',
    boxSizing: 'border-box'
  },

  icon: {
    width: 85,
    height: 85,
    display: 'grid',
    placeItems: 'center',
    color: '#ff3b30',
    background: '#fff0ef',
    borderRadius: '50%',
    margin: '0 auto 20px'
  },

  title: {
    fontSize: 27,
    letterSpacing: '-1px',
    color: '#1d1d1f'
  },

  description: {
    color: '#86868b',
    fontSize: 14,
    lineHeight: 1.7
  },

  details: {
    textAlign: 'left',
    padding: 18,
    margin: '24px 0',
    borderRadius: 14,
    background: '#f5f5f7',
    color: '#1d1d1f',
    overflowWrap: 'anywhere'
  },

  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    width: '100%',
    border: 0,
    borderRadius: 12,
    background: '#1d1d1f',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 20
  }
}
