
import {
  useEffect,
  useState
} from 'react'

import {
  LoaderCircle,
  ShieldAlert,
  RefreshCw,
  LogOut
} from 'lucide-react'

import MFASetup from './MFASetup'
import MFAVerification from './MFAVerification'

import {
  getAssuranceLevel,
  getMFAFactors,
  getSecurityStatus
} from '../../services/securityService'

import '../../pages/admin/AdminV9.css'

export default function AdminMFAGate({
  session,
  profile,
  onLogout,
  children
}) {
  const token = session?.access_token || ''

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true

    setError('')

    async function checkSecurity() {
      try {
        const [
          assurance,
          factors,
          server
        ] = await Promise.all([
          getAssuranceLevel(),
          getMFAFactors(),
          getSecurityStatus()
        ])

        if (!active) return

        const verified = factors.filter(
          item => item.status === 'verified'
        )

        let mode

        if (
          assurance.currentLevel === 'aal2' &&
          server.aal === 'aal2' &&
          server.mfa_enabled &&
          server.role === 'admin' &&
          verified.length > 0
        ) {
          mode = 'allowed'
        } else if (verified.length > 0) {
          mode = 'verify'
        } else {
          mode = 'setup'
        }

        setResult({
          token,
          refresh,
          mode,
          factors: verified
        })

      } catch (err) {
        if (!active) return

        setResult({
          token,
          refresh,
          mode: 'error'
        })

        setError(
          err.message ||
          'Impossible de vérifier la sécurité.'
        )
      }
    }

    if (token) {
      checkSecurity()
    }

    return () => {
      active = false
    }

  }, [token, refresh])

  function recheck() {
    setRefresh(value => value + 1)
  }

  // Le résultat doit correspondre au jeton courant.
  // Une ancienne session vérifiée ne peut pas être réutilisée.

  const validResult =
    result &&
    result.token === token &&
    result.refresh === refresh

  if (
    profile?.role === 'admin' &&
    validResult &&
    result.mode === 'allowed'
  ) {
    return children
  }

  return (
    <div className="av9-gate">
      <main className="av9-gate-card">

        {!validResult ? (
          <div className="av9-loading">

            <LoaderCircle
              size={36}
              className="av9-spin"
            />

            <h2>Bizina Iphone</h2>

            <p>
              Vérification de votre niveau de sécurité...
            </p>

          </div>
        ) : result.mode === 'error' ? (
          <div className="av9-loading">

            <ShieldAlert size={40} />

            <h2>Vérification indisponible</h2>

            <div className="av9-error" role="alert">
              {error}
            </div>

            <button
              type="button"
              className="av9-btn av9-btn-primary av9-full"
              onClick={recheck}
            >
              <RefreshCw size={17} />
              Réessayer
            </button>

            <button
              type="button"
              className="av9-btn av9-btn-secondary av9-full"
              onClick={onLogout}
            >
              <LogOut size={17} />
              Se déconnecter
            </button>

          </div>
        ) : result.mode === 'setup' ? (
          <MFASetup
            onSuccess={recheck}
            onCancel={onLogout}
          />
        ) : (
          <MFAVerification
            factors={result.factors}
            onSuccess={recheck}
            onLogout={onLogout}
          />
        )}

      </main>

      <span className="av9-gate-footer">
        Bizina Iphone · Accès administrateur sécurisé
      </span>
    </div>
  )
}
