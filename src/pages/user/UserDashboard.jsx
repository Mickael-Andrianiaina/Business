
import { supabase } from '../../services/supabase'

function UserDashboard({ profile }) {

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Erreur déconnexion :', error.message)
    }
  }

  return (
    <div className="dashboard user-dashboard">

      <header>
        <h1>Bizina Iphone</h1>
        <span>Mon espace</span>

      </header>

      <main>
        <h2>Bienvenue sur Bizina Iphone</h2>

        <p>
          Bonjour {profile?.full_name || profile?.email || 'Utilisateur'}
        </p>

        <div className="dashboard-grid">

          <div className="dashboard-card">
            <h3>Mon profil</h3>
            <p>Consulter mes informations personnelles</p>
          </div>

          <div className="dashboard-card">
            <h3>Mes produits</h3>
            <p>Consulter mes produits iPhone</p>
          </div>

          <div className="dashboard-card">
            <h3>Mes transactions</h3>
            <p>Consulter mes transactions</p>
          </div>

          <div className="dashboard-card">
            <h3>Paramètres</h3>
            <p>Gérer mon compte</p>
          </div>

        </div>
      </main>

    </div>
  )
}

export default UserDashboard
