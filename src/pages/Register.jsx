
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import './Register.css'

function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    setMessage('')
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim()
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      })

      if (error) throw error

      if (data.user) {
        setMessage(
          'Inscription réussie ! Consulte ta boîte mail pour confirmer ton adresse email.'
        )

        setFullName('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      console.error('Erreur Supabase:', err)
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">

        <h1>Créer un compte</h1>

        <p>Inscris-toi pour accéder à Bizina Iphone.</p>

        {error && (
          <div className="register-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="register-success" role="status">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <label htmlFor="fullName">
            Nom complet
          </label>

          <input
            id="fullName"
            type="text"
            placeholder="Ton nom complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
            disabled={loading}
          />

          <label htmlFor="email">
            Adresse e-mail
          </label>

          <input
            id="email"
            type="email"
            placeholder="exemple@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={loading}
          />

          <label htmlFor="password">
            Mot de passe
          </label>

          <input
            id="password"
            type="password"
            placeholder="Créer un mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={loading}
          />

          <label htmlFor="confirmPassword">
            Confirmer le mot de passe
          </label>

          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </button>

        </form>

        <p className="login-link">
          Déjà un compte ? <Link to="/">Se connecter</Link>
        </p>

      </div>
    </div>
  )
}

export default Register
