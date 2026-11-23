import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import './Login.css'

import {
  ShieldCheck,
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Headphones,
  Package,
  Boxes,
  Truck,
  ShoppingBag,
  Receipt,
  Wallet,
  CreditCard,
  Banknote,
  TrendingUp,
  BarChart3
} from 'lucide-react'

/* true  = panneau sombre arrondi avec logo Apple blanc (comme l'image de référence)
   false = logo Apple sombre directement sur le fond blanc de la page */
const DARK_LOGO_PANEL = false

/* Dégradé autour du cercle : position (0 = haut, sens horaire) -> couleur */
const COLOR_STOPS = [
  [0.0, '#9CCFC4'],
  [0.1, '#6EC6F2'],
  [0.22, '#3F9BF2'],
  [0.36, '#8C7BF2'],
  [0.5, '#C45BF0'],
  [0.62, '#EE4FCB'],
  [0.74, '#FF5A8E'],
  [0.85, '#FF8A5E'],
  [0.93, '#F6BE8C'],
  [1.0, '#9CCFC4'],
]

const RING_CONFIGS = [
  { radius: 33, count: 14, dotSize: 1.6, delay: 0.08 },
  { radius: 42, count: 18, dotSize: 2.1, delay: 0.16 },
  { radius: 52, count: 23, dotSize: 2.7, delay: 0.24 },
  { radius: 62, count: 28, dotSize: 3.3, delay: 0.32 },
  { radius: 72, count: 34, dotSize: 3.9, delay: 0.4 },
]

const HERO_SCENES = [
  // Scène 1 : produits Apple
  {
    type: 'cluster',
    avatarGradient: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
    avatarColor: '#15803D',
    avatarRing: 'rgba(34, 197, 94, 0.35)',
    AvatarIcon: Smartphone,
    satellites: [
      { Icon: Tablet, gradient: 'linear-gradient(135deg, #16A34A, #22C55E)', color: '#FFFFFF', glow: 'rgba(34, 197, 94, 0.35)', x: -12, y: -86, size: 48 },
      { Icon: Laptop, gradient: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', glow: 'rgba(56, 189, 248, 0.38)', x: 68, y: -38, size: 44 },
      { Icon: Watch, gradient: 'linear-gradient(135deg, #EAB308, #FACC15)', color: '#18181B', glow: 'rgba(250, 204, 21, 0.42)', x: 74, y: 12, size: 62 },
      { Icon: Headphones, gradient: 'linear-gradient(135deg, #E11D48, #FB7185)', color: '#FFFFFF', glow: 'rgba(251, 113, 133, 0.35)', x: 16, y: 82, size: 48 },
      { Icon: Package, gradient: 'linear-gradient(135deg, #C026D3, #E879F9)', color: '#FFFFFF', glow: 'rgba(232, 121, 249, 0.35)', x: -58, y: 48, size: 44 },
      { Icon: ShoppingBag, gradient: 'linear-gradient(135deg, #EA580C, #FB923C)', color: '#FFFFFF', glow: 'rgba(251, 146, 60, 0.38)', x: -72, y: -18, size: 58 },
    ],
  },
  // Scène 2 : stock, achats et ventes
  {
    type: 'cluster',
    avatarGradient: 'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)',
    avatarColor: '#BE185D',
    avatarRing: 'rgba(236, 72, 153, 0.35)',
    AvatarIcon: Boxes,
    satellites: [
      { Icon: Package, gradient: 'linear-gradient(135deg, #DC2626, #F87171)', color: '#FFFFFF', glow: 'rgba(248, 113, 113, 0.35)', x: -66, y: -44, size: 48 },
      { Icon: Truck, gradient: 'linear-gradient(135deg, #059669, #34D399)', color: '#FFFFFF', glow: 'rgba(52, 211, 153, 0.35)', x: 14, y: -82, size: 46 },
      { Icon: ShoppingBag, gradient: 'linear-gradient(135deg, #2563EB, #60A5FA)', color: '#FFFFFF', glow: 'rgba(96, 165, 250, 0.38)', x: 74, y: 18, size: 58 },
      { Icon: Receipt, gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#FFFFFF', glow: 'rgba(167, 139, 250, 0.38)', x: -14, y: 82, size: 48 },
      { Icon: Smartphone, gradient: 'linear-gradient(135deg, #0891B2, #22D3EE)', color: '#FFFFFF', glow: 'rgba(34, 211, 238, 0.38)', x: -74, y: 24, size: 44 },
    ],
  },
  // Scène 3 : paiements, finances et bénéfices
  {
    type: 'cluster',
    avatarGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
    avatarColor: '#B45309',
    avatarRing: 'rgba(245, 158, 11, 0.38)',
    AvatarIcon: Wallet,
    satellites: [
      { Icon: CreditCard, gradient: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', glow: 'rgba(56, 189, 248, 0.38)', x: -64, y: -42, size: 52 },
      { Icon: BarChart3, gradient: 'linear-gradient(135deg, #2563EB, #6366F1)', color: '#FFFFFF', glow: 'rgba(99, 102, 241, 0.38)', x: 64, y: -22, size: 52 },
      { Icon: TrendingUp, gradient: 'linear-gradient(135deg, #DB2777, #F472B6)', color: '#FFFFFF', glow: 'rgba(244, 114, 182, 0.35)', x: 46, y: 66, size: 48 },
      { Icon: Banknote, gradient: 'linear-gradient(135deg, #16A34A, #4ADE80)', color: '#FFFFFF', glow: 'rgba(74, 222, 128, 0.35)', x: -18, y: 82, size: 46 },
      { Icon: Receipt, gradient: 'linear-gradient(135deg, #EA580C, #FACC15)', color: '#FFFFFF', glow: 'rgba(251, 146, 60, 0.4)', x: -78, y: 18, size: 56 },
    ],
  },
  {
    type: 'brand',
  },
]

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function getGradientColor(t) {
  const position = ((t % 1) + 1) % 1

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const [startPos, startColor] = COLOR_STOPS[i]
    const [endPos, endColor] = COLOR_STOPS[i + 1]

    if (position >= startPos && position <= endPos) {
      const ratio = (position - startPos) / (endPos - startPos)
      const from = hexToRgb(startColor)
      const to = hexToRgb(endColor)
      const mixed = from.map((channel, idx) =>
        Math.round(channel + (to[idx] - channel) * ratio)
      )
      return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`
    }
  }

  return COLOR_STOPS[0][1]
}

/* Filet de sécurité : si le contenu dépasse encore de l'écran
   (très petit appareil, zoom, texte agrandi), il est réduit pour tout afficher. */
function FitToScreen({ children }) {
  const viewportRef = useRef(null)
  const contentRef = useRef(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return undefined

    const update = () => {
      const availableHeight = viewport.clientHeight
      const availableWidth = viewport.clientWidth
      const naturalHeight = content.offsetHeight
      const naturalWidth = content.scrollWidth

      if (!naturalHeight || !naturalWidth) return

      const next = Math.max(
        0.4,
        Math.min(1, availableHeight / naturalHeight, availableWidth / naturalWidth)
      )

      setScale((prev) => (Math.abs(prev - next) < 0.005 ? prev : next))
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    observer.observe(content)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return (
    <div className="fit-viewport" ref={viewportRef}>
      <div
        className="fit-content"
        ref={contentRef}
        style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

function AppleLogoIcon({ size = 30 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function AppleDotRingLogo() {
  const rings = useMemo(() => {
    return RING_CONFIGS.map((ring, ringIndex) => {
      const offset = (ringIndex * 0.37) / ring.count

      const dots = Array.from({ length: ring.count }).map((_, i) => {
        const t = i / ring.count + offset
        const phi = t * Math.PI * 2

        // 0 = haut, sens horaire
        const cx = 80 + ring.radius * Math.sin(phi)
        const cy = 80 - ring.radius * Math.cos(phi)

        // Points plus gros et plus opaques vers le bas à droite
        const weight = (1 - Math.cos(phi - Math.PI * 2 * 0.4)) / 2

        return {
          cx,
          cy,
          r: ring.dotSize * (0.72 + 0.5 * weight),
          fill: getGradientColor(t),
          opacity: 0.55 + 0.45 * weight,
        }
      })

      return { ...ring, ringIndex, dots }
    })
  }, [])

  // La taille du logo est gérée par le CSS (responsive)
  const logoStyle = DARK_LOGO_PANEL
    ? { background: '#1c1c1e', borderRadius: '2rem' }
    : undefined

  const badgeStyle = {
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    color: DARK_LOGO_PANEL ? '#ffffff' : '#18181b',
  }

  return (
    <div className="apple-logo" style={logoStyle}>
      <svg
        viewBox="0 0 160 160"
        className="apple-logo-svg"
        aria-hidden="true"
      >
        <g className="sn-wheel-rotate">
          {rings.map((ring) => (
            <g
              key={ring.ringIndex}
              className="sn-ring-enter"
              style={{ animationDelay: `${ring.delay}s` }}
            >
              {ring.dots.map((dot, idx) => (
                <circle
                  key={idx}
                  cx={dot.cx}
                  cy={dot.cy}
                  r={dot.r}
                  fill={dot.fill}
                  opacity={dot.opacity}
                />
              ))}
            </g>
          ))}
        </g>
      </svg>

      <div className="apple-logo-halo" />

      <div className="apple-logo-badge" style={badgeStyle}>
        <AppleLogoIcon size={32} />
      </div>
    </div>
  )
}

function ICloudStyleHeroAnimation() {
  const [sceneIndex, setSceneIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSceneIndex((prev) => (prev + 1) % HERO_SCENES.length)
    }, 2200)

    return () => clearInterval(timer)
  }, [])

  const currentScene = HERO_SCENES[sceneIndex]

  return (
    <div className="icloud-hero-stage" aria-hidden="true">
      {currentScene.type === 'cluster' ? (
        <div key={sceneIndex} className="icloud-scene-group">
          {currentScene.satellites.map(
            ({ Icon, gradient, color, glow, x, y, size }, idx) => (
              <div
                key={idx}
                className="icloud-pop-icon"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  marginLeft: `-${size / 2}px`,
                  marginTop: `-${size / 2}px`,
                  background: gradient,
                  color: color,
                  boxShadow: `0 12px 26px ${glow}`,
                  '--tx': `${x}px`,
                  '--ty': `${y}px`,
                  animationDelay: `${idx * 0.045}s`,
                }}
              >
                <Icon size={Math.round(size * 0.48)} />
              </div>
            )
          )}

          <div
            className="icloud-pop-center"
            style={{
              background: currentScene.avatarGradient,
              color: currentScene.avatarColor,
              boxShadow: `0 16px 36px ${currentScene.avatarRing}`,
            }}
          >
            <currentScene.AvatarIcon size={50} strokeWidth={2.2} />
          </div>
        </div>
      ) : (
        <div key="brand-final" className="icloud-scene-group">
          <div className="icloud-brand-final">
            <ShieldCheck size={100} strokeWidth={1.8} />
          </div>
        </div>
      )}
    </div>
  )
}

function Login() {
  const [step, setStep] = useState('welcome')
  const [isLeavingWelcome, setIsLeavingWelcome] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  const handleGoToLogin = () => {
    if (isLeavingWelcome) return
    setIsLeavingWelcome(true)

    setTimeout(() => {
      setStep('login')
      setIsLeavingWelcome(false)
    }, 360)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    console.log({
      email,
      password,
      remember,
    })

    alert('Interface prête. Authentification à connecter à l’API.')
  }

  return (
    <main className="login-page">
      <FitToScreen>
        {step === 'welcome' ? (
          <section
            className={`welcome-screen screen-fade-in ${
              isLeavingWelcome ? 'welcome-leaving' : ''
            }`}
            aria-label="Accueil"
          >
            <ICloudStyleHeroAnimation />

            <h1 className="welcome-title">
              iPhone <span>Business</span>
            </h1>

            <button
              type="button"
              className="welcome-cta"
              onClick={handleGoToLogin}
            >
              Se connecter
            </button>

            <p className="welcome-subtitle">
              Gérez facilement vos produits Apple, vos ventes, votre stock et vos finances.
            </p>
          </section>
        ) : (
          <div className="login-wrapper">
            <div className="login-card stagger-2">
              <div className="login-header stagger-1">
                <AppleDotRingLogo />

                <h1>
                  iPhone <span>Business</span>
                </h1>

                <p>Votre espace de gestion commerciale sécurisé</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label htmlFor="email">Adresse e-mail</label>

                  <div className="login-input-wrapper">
                    <Mail className="input-icon icon-mail" size={18} />

                    <input
                      id="email"
                      type="email"
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <div className="password-label">
                    <label htmlFor="password">Mot de passe</label>

                    <Link to="/forgot-password">Mot de passe oublié ?</Link>
                  </div>

                  <div className="login-input-wrapper">
                    <LockKeyhole className="input-icon icon-lock" size={18} />

                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword
                          ? 'Masquer le mot de passe'
                          : 'Afficher le mot de passe'
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <label className="remember-label">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />

                  <span>Se souvenir de moi</span>
                </label>

                <button type="submit" className="login-submit">
                  <span>Se connecter</span>
                  <ArrowRight size={18} />
                </button>
              </form>

              <div className="login-register">
                Vous n&apos;avez pas de compte ?
                <Link to="/register">Créer un compte</Link>
              </div>
            </div>

            <div className="login-security stagger-3">
              <Shield size={14} className="security-icon" />
              <span>Protection de votre espace de gestion</span>
            </div>
          </div>
        )}
      </FitToScreen>
    </main>
  )
}

export default Login