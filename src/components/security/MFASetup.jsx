
import { useRef, useState } from 'react'

import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  Copy,
  CheckCircle2,
  LoaderCircle,
  ArrowRight,
  X
} from 'lucide-react'

import {
  enrollMFA,
  verifyMFA,
  cancelMFAEnrollment
} from '../../services/securityService'

import '../../pages/admin/AdminV9.css'

export default function MFASetup({
  onSuccess,
  onCancel
}) {
  const [factor, setFactor] = useState(null)
  const [code, setCode] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lock = useRef(false)

  async function handleEnroll() {
    if (lock.current) return

    lock.current = true
    setLoading(true)
    setError('')

    try {
      const data = await enrollMFA()
      setFactor(data)
    } catch (err) {
      setError(
        err.message ||
        'Impossible de configurer le MFA.'
      )
    } finally {
      lock.current = false
      setLoading(false)
    }
  }

  async function handleVerify(event) {
    event.preventDefault()

    if (lock.current || !factor) return

    lock.current = true
    setLoading(true)
    setError('')

    try {
      await verifyMFA(
        factor.id,
        code,
        true
      )

      setFactor(null)
      setCode('')
      setShowSecret(false)

      onSuccess?.()
    } catch (err) {
      setError(
        err.message ||
        'Code invalide ou expiré.'
      )
      setCode('')
    } finally {
      lock.current = false
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (lock.current) return

    lock.current = true
    setLoading(true)
    setError('')

    try {
      if (factor) {
        await cancelMFAEnrollment(factor.id)
      }

      setFactor(null)
      setCode('')
      setShowSecret(false)

      onCancel?.()
    } catch (err) {
      setError(err.message)
    } finally {
      lock.current = false
      setLoading(false)
    }
  }

  async function copySecret() {
    if (!factor?.secret) return

    try {
      await navigator.clipboard.writeText(
        factor.secret
      )
      setCopied(true)
    } catch {
      setError(
        'Impossible de copier la clé.'
      )
    }
  }

  return (
    <div className="av9-setup">

      <div className="av9-auth-icon">
        <ShieldCheck size={34} />
      </div>

      <h2>Configurer la double authentification</h2>

      <p className="av9-description">
        Renforcez la protection de votre compte
        avec une application d’authentification.
      </p>

      {error && (
        <div className="av9-error" role="alert">
          {error}
        </div>
      )}

      {!factor ? (
        <>
          <div className="av9-instructions">

            <div className="av9-instruction">
              <Smartphone size={22} />
              <div>
                <strong>Installer une application</strong>
                <p>
                  Google Authenticator, Microsoft
                  Authenticator ou une application
                  TOTP compatible.
                </p>
              </div>
            </div>

            <div className="av9-instruction">
              <KeyRound size={22} />
              <div>
                <strong>Ajouter votre compte</strong>
                <p>
                  Scannez le QR Code avec votre
                  application d’authentification.
                </p>
              </div>
            </div>

            <div className="av9-instruction">
              <CheckCircle2 size={22} />
              <div>
                <strong>Confirmer votre identité</strong>
                <p>
                  Saisissez le code temporaire
                  à six chiffres.
                </p>
              </div>
            </div>

          </div>

          <button
            type="button"
            className="av9-btn av9-btn-primary av9-full"
            disabled={loading}
            onClick={handleEnroll}
          >
            {loading ? (
              <LoaderCircle
                size={18}
                className="av9-spin"
              />
            ) : (
              <ArrowRight size={18} />
            )}
            Commencer la configuration
          </button>
        </>
      ) : (
        <form onSubmit={handleVerify}>

          <div className="av9-qr-container">
            <img
              src={factor.qrCode}
              alt="QR Code de configuration MFA"
              width="200"
              height="200"
            />
          </div>

          <p className="av9-description">
            Scannez ce QR Code avec votre
            application d’authentification.
          </p>

          <button
            type="button"
            className="av9-text-btn"
            onClick={() => {
              setShowSecret(value => !value)
              setCopied(false)
            }}
          >
            {showSecret
              ? 'Masquer la clé secrète'
              : 'Afficher la clé manuelle'}
          </button>

          {showSecret && (
            <div className="av9-secret">
              <code>{factor.secret}</code>

              <button
                type="button"
                className="av9-icon-btn"
                onClick={copySecret}
                aria-label="Copier la clé secrète"
              >
                {copied
                  ? <CheckCircle2 size={18} />
                  : <Copy size={18} />}
              </button>
            </div>
          )}

          <label
            className="av9-field-label"
            htmlFor="mfa-setup-code"
          >
            Code de vérification
          </label>

          <input
            id="mfa-setup-code"
            className="av9-code-input"
            value={code}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
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
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <LoaderCircle
                size={18}
                className="av9-spin"
              />
            ) : (
              <ShieldCheck size={18} />
            )}
            Activer la double authentification
          </button>

          <p className="av9-footnote">
            Ne partagez jamais ce QR Code,
            votre clé secrète ou vos codes.
          </p>
        </form>
      )}

      {onCancel && (
        <button
          type="button"
          className="av9-btn av9-btn-secondary av9-full"
          disabled={loading}
          onClick={handleCancel}
        >
          <X size={16} />
          Annuler
        </button>
      )}

    </div>
  )
}
