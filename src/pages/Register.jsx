
import { Link } from 'react-router-dom'
import './Register.css'

function Register() {
  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Créer un compte</h1>
        <p>Inscris-toi pour accéder à ton bloc-notes.</p>

        <form>
          <label>Nom complet</label>
          <input
            type="text"
            placeholder="Ton nom complet"
            required
          />

          <label>Adresse e-mail</label>
          <input
            type="email"
            placeholder="exemple@gmail.com"
            required
          />

          <label>Mot de passe</label>
          <input
            type="password"
            placeholder="Créer un mot de passe"
            required
          />

          <label>Confirmer le mot de passe</label>
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            required
          />

          <button type="submit">Créer mon compte</button>
        </form>

        <p className="login-link">
          Déjà un compte ? <Link to="/">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
