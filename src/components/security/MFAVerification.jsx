
import { useId, useRef, useState } from 'react'

import {
  ShieldCheck,
  LockKeyhole,
  Smartphone,
  LoaderCircle,
  LogOut
} from 'lucide-react'

import {
  verifyMFA
} from '../../services/securityService'

import '../../pages/admin/AdminV9.css'

export default function MFAVerification({
  factors = [],
  onSuccess,
  onLogout
}) {
  const inputId = useId()

  const [factorId, setFactorId] = useState(
    factors[0]?.id || ''
  )

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const lock = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (lock.current) return

    lock.current = true
    setLoading(true)
    setError('')

    try {
      await verifyMFA(factorId, code)

      setCode('')

      onSuccess?.()
    } catch (err) {
      setError(
        err.message ||
        'Code incorrect ou expiré.'
      )

      setCode('')
    } finally {
      lock.current = false
      setLoading(false)
    }
  }

  return (
    <div className="av9-verification">

      <div className="av9-auth-icon">
        <LockKeyhole size={34} />
      </div>

      <span className="av9-eyebrow">
        BIZINA IPHONE SECURITY
      </span>

      <h2>Vérification de sécurité</h2>

      <p className="av9-description">
        Saisissez le code affiché dans votre
        application d’authentification pour
        accéder à votre espace administrateur.
      </p>

      {error && (
        <div className="av9-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {factors.length > 1 && (
          <div className="av9-field">
            <label htmlFor={`${inputId}-factor`}>
              Application d’authentification
            </label>

            <select
              id={`${inputId}-factor`}
              className="av9-select"
              value={factorId}
              disabled={loading}
              onChange={event => {
                setFactorId(event.target.value)
                setCode('')
              }}
            >
              {factors.map(factor => (
                <option
                  key={factor.id}
                  value={factor.id}
                >
                  {factor.friendly_name ||
                    'Application TOTP'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="av9-verification-info">
          <Smartphone size={20} />
          <span>
            Utilisez le code temporaire à six chiffres.
          </span>
        </div>

        <label
          htmlFor={inputId}
          className="av9-field-label"
        >
          Code de sécurité
        </label>

        <input
          id={inputId}
          type="text"
          className="av9-code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          disabled={loading}
          onChange={event =>
            setCode(
              event.target.value
                .replace(/\D/g, '')
                .slice(0, 6)
            )
          }
          required
        />

        <button
          type="submit"
          className="av9-btn av9-btn-primary av9-full"
          disabled={
            loading ||
            code.length !== 6 ||
            !factorId
          }
        >
          {loading ? (
            <LoaderCircle
              size={18}
              className="av9-spin"
            />
          ) : (
            <ShieldCheck size={18} />
          )}

          Vérifier mon identité
        </button>
      </form>

      <button
        type="button"
        className="av9-btn av9-btn-secondary av9-full"
        onClick={onLogout}
        disabled={loading}
      >
        <LogOut size={17} />
        Se déconnecter
      </button>

      <p className="av9-footnote">
        L’accès à l’administration nécessite
        une vérification MFA réussie.
      </p>

    </div>
  )
}
