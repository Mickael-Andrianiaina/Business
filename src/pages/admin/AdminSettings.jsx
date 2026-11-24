
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useId
} from 'react'

import { Link } from 'react-router-dom'

import {
  Settings,
  Globe,
  ShieldCheck,
  Users,
  Activity,
  Bell,
  Wallet,
  Package,
  Mail,
  Phone,
  LockKeyhole,
  RefreshCw,
  Download,
  Save,
  RotateCcw,
  History,
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  ArrowUpRight,
  ChevronRight,
  X
} from 'lucide-react'

import AdminLayout from '../../components/admin/AdminLayout'

import {
  DEFAULT_SETTINGS,
  SETTINGS_LABELS,
  getAdminSettings,
  saveAdminSettings,
  validateSettings,
  getSettingsChanges,
  getSettingsHistory,
  formatSettingsDate,
  formatSettingValue,
  exportSettingsJSON
} from '../../services/settingsService'

import './AdminV10.css'

// ==========================================
// BIZINA IPHONE - ADMIN V10
// ==========================================

const TABS = [

  {
    id: 'general',
    label: 'Général',
    icon: Globe
  },

  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: Package
  },

  {
    id: 'moderation',
    label: 'Modération',
    icon: ShieldCheck
  },

  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell
  },

  {
    id: 'system',
    label: 'Système',
    icon: Settings
  },

  {
    id: 'history',
    label: 'Historique',
    icon: History
  }

]

// ==========================================
// CARTE STATISTIQUE
// ==========================================

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  color = 'blue'
}) {

  return (

    <article className="av10-stat-card">

      <div className={`av10-stat-icon ${color}`}>
        <Icon size={23} />
      </div>

      <span>{label}</span>

      <strong>{value}</strong>

      <small>{description}</small>

    </article>

  )

}

// ==========================================
// PANNEAU
// ==========================================

function Panel({
  title,
  subtitle,
  icon: Icon,
  children
}) {

  return (

    <section className="av10-panel">

      <div className="av10-panel-header">

        <div>

          <h3>{title}</h3>

          {subtitle && (
            <p>{subtitle}</p>
          )}

        </div>

        {Icon && <Icon size={22} />}

      </div>

      {children}

    </section>

  )

}

// ==========================================
// CHAMP DE FORMULAIRE
// ==========================================

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  description,
  error,
  min,
  max,
  maxLength,
  disabled = false,
  textarea = false
}) {

  const id = useId()

  const props = {

    id,

    value: value ?? '',

    placeholder,

    disabled,

    maxLength,

    'aria-invalid': Boolean(error),

    'aria-describedby':
      error || description
        ? `${id}-help`
        : undefined,

    onChange: event =>
      onChange?.(event.target.value)

  }

  return (

    <div className="av10-field">

      <label htmlFor={id}>
        {label}
      </label>

      {textarea ? (

        <textarea

          {...props}

          rows={4}

          className={
            error
              ? 'av10-invalid'
              : ''
          }

        />

      ) : (

        <input

          {...props}

          type={type}

          min={min}

          max={max}

          step={
            type === 'number'
              ? 1
              : undefined
          }

          className={
            error
              ? 'av10-invalid'
              : ''
          }

        />

      )}

      {(error || description) && (

        <small

          id={`${id}-help`}

          className={
            error
              ? 'av10-field-error'
              : 'av10-field-help'
          }

        >

          {error || description}

        </small>

      )}

    </div>

  )

}

// ==========================================
// INTERRUPTEUR
// ==========================================

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  icon: Icon,
  color = 'blue'
}) {

  const id = useId()

  return (

    <div className="av10-toggle-row">

      {Icon && (

        <div className={`av10-mini-icon ${color}`}>
          <Icon size={20} />
        </div>

      )}

      <div className="av10-toggle-info">

        <strong id={id}>
          {label}
        </strong>

        <p>{description}</p>

      </div>

      <button

        type="button"

        role="switch"

        aria-checked={Boolean(checked)}

        aria-labelledby={id}

        disabled={disabled}

        className={
          `av10-switch${checked ? ' active' : ''}`
        }

        onClick={() =>
          onChange?.(!checked)
        }

      >

        <span />

      </button>

    </div>

  )

}

// ==========================================
// PAGE PRINCIPALE
// ==========================================

export default function AdminSettings({
  profile,
  onLogout,
  logoutLoading
}) {

  const [original, setOriginal] =
    useState(null)

  const [draft, setDraft] =
    useState(null)

  const [history, setHistory] =
    useState([])

  const [historyError, setHistoryError] =
    useState('')

  const [tab, setTab] =
    useState('general')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [refresh, setRefresh] =
    useState(0)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [showErrors, setShowErrors] =
    useState(false)

  const [confirmation, setConfirmation] =
    useState(null)

  const [expanded, setExpanded] =
    useState(null)

  const saveLock = useRef(false)

  // ========================================
  // CHARGEMENT
  // ========================================

  useEffect(() => {

    let active = true

    async function loadSettings() {

      setLoading(true)

      setError('')

      setHistoryError('')

      try {

        const data = await getAdminSettings()

        if (!active) return

        setOriginal(data)

        setDraft({ ...data })

        try {

          const logs =
            await getSettingsHistory()

          if (active) {
            setHistory(logs)
          }

        } catch (err) {

          if (active) {

            setHistory([])

            setHistoryError(
              err.message
            )

          }

        }

      } catch (err) {

        if (!active) return

        setOriginal(null)

        setDraft(null)

        setError(
          err.message ||
          'Impossible de charger les paramètres.'
        )

      } finally {

        if (active) {
          setLoading(false)
        }

      }

    }

    loadSettings()

    return () => {
      active = false
    }

  }, [refresh])

  // ========================================
  // DETECTION DES MODIFICATIONS
  // ========================================

  const changes = useMemo(

    () => getSettingsChanges(
      original,
      draft
    ),

    [original, draft]

  )

  const changedKeys =
    Object.keys(changes)

  const dirty =
    changedKeys.length > 0

  const validationErrors = useMemo(

    () => draft
      ? validateSettings(draft)
      : {},

    [draft]

  )

  // ========================================
  // ALERTE AVANT ACTUALISATION NAVIGATEUR
  // ========================================

  useEffect(() => {

    if (!dirty) return

    function handleBeforeUnload(event) {

      event.preventDefault()

      event.returnValue = ''

    }

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    )

    return () => {

      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      )

    }

  }, [dirty])

  // ========================================
  // TOAST
  // ========================================

  useEffect(() => {

    if (!success) return

    const timeout = setTimeout(
      () => setSuccess(''),
      4500
    )

    return () => clearTimeout(timeout)

  }, [success])

  // ========================================
  // MODIFIER UN CHAMP
  // ========================================

  function updateField(key, value) {

    if (saving) return

    setDraft(current => ({

      ...current,

      [key]: value

    }))

    setSuccess('')

  }

  function fieldError(key) {

    return showErrors
      ? validationErrors[key]
      : undefined

  }

  // ========================================
  // ACTUALISATION
  // ========================================

  function handleReload() {

    if (saving) return

    if (dirty) {

      setConfirmation('reload')

      return

    }

    setRefresh(value => value + 1)

  }

  // ========================================
  // REINITIALISATION
  // ========================================

  function handleDiscard() {

    if (!original) return

    setDraft({ ...original })

    setShowErrors(false)

    setError('')

    setSuccess(
      'Modifications non enregistrées annulées.'
    )

  }

  function restoreDefaults() {

    setDraft(current => ({

      ...current,

      ...DEFAULT_SETTINGS

    }))

    setConfirmation(null)

    setShowErrors(false)

    setSuccess(
      'Valeurs par défaut préparées. Enregistrez pour les appliquer.'
    )

  }

  // ========================================
  // ENREGISTREMENT
  // ========================================

  function handleSaveRequest() {

    if (!dirty || saving) return

    setShowErrors(true)

    setError('')

    if (
      Object.keys(validationErrors).length > 0
    ) {

      setError(
        Object.values(validationErrors)[0]
      )

      return

    }

    setConfirmation('save')

  }

  async function handleSave() {

    if (saveLock.current) return

    saveLock.current = true

    setSaving(true)

    setError('')

    try {

      const result =
        await saveAdminSettings(
          original,
          draft
        )

      setOriginal(result)

      setDraft({ ...result })

      setShowErrors(false)

      setConfirmation(null)

      setSuccess(
        'Configuration enregistrée avec succès.'
      )

      try {

        setHistory(
          await getSettingsHistory()
        )

        setHistoryError('')

      } catch (err) {

        setHistoryError(err.message)

      }

    } catch (err) {

      setError(

        err.message ||
        'Impossible d’enregistrer les paramètres.'

      )

      setConfirmation(null)

    } finally {

      saveLock.current = false

      setSaving(false)

    }

  }

  // ========================================
  // EXPORT
  // ========================================

  function handleExport() {

    try {

      exportSettingsJSON(original)

      setSuccess(
        'Configuration enregistrée exportée.'
      )

    } catch (err) {

      setError(err.message)

    }

  }

  // ========================================
  // CONFIRMATION
  // ========================================

  function confirmAction() {

    if (confirmation === 'save') {

      handleSave()

    } else if (confirmation === 'reset') {

      restoreDefaults()

    } else if (confirmation === 'reload') {

      setConfirmation(null)

      setRefresh(value => value + 1)

    }

  }

  const confirmationTitle = {

    save: 'Enregistrer la configuration ?',

    reset: 'Restaurer les valeurs par défaut ?',

    reload: 'Abandonner les modifications ?'

  }

  const confirmationMessage = {

    save:
      'Les modifications seront appliquées à la configuration de Bizina Iphone.',

    reset:
      'Les valeurs seront restaurées dans le formulaire. Aucun changement ne sera appliqué avant l’enregistrement.',

    reload:
      'Les modifications non enregistrées seront perdues.'

  }

  // ========================================
  // INTERFACE PRINCIPALE
  // ========================================

  return (

    <AdminLayout

      profile={profile}

      onLogout={onLogout}

      logoutLoading={logoutLoading}

    >

      <div className="av10">

        {/* HEADER */}

        <header className="av10-page-header">

          <div>

            <span className="av10-eyebrow">
              <Settings size={15} />
              Configuration système
            </span>

            <h1>Paramètres généraux</h1>

            <p>
              Personnalisez et contrôlez
              votre marketplace Bizina Iphone.
            </p>

          </div>

          <div className="av10-header-actions">

            <button

              type="button"

              className="av10-btn av10-btn-secondary"

              onClick={handleReload}

              disabled={loading || saving}

            >

              <RefreshCw

                size={17}

                className={
                  loading
                    ? 'av10-spin'
                    : ''
                }

              />

              Actualiser

            </button>

            <button

              type="button"

              className="av10-btn av10-btn-secondary"

              onClick={handleExport}

              disabled={
                loading || saving || !original
              }

            >

              <Download size={17} />

              Exporter

            </button>

            <button

              type="button"

              className="av10-btn av10-btn-primary"

              onClick={handleSaveRequest}

              disabled={
                loading || saving || !dirty
              }

            >

              <Save size={17} />

              Enregistrer

            </button>

          </div>

        </header>

        {/* MESSAGES */}

        {error && (

          <div className="av10-alert error" role="alert">

            <AlertTriangle size={19} />

            <span>{error}</span>

            <button

              type="button"

              className="av10-icon-btn"

              aria-label="Fermer"

              onClick={() => setError('')}

            >

              <X size={17} />

            </button>

          </div>

        )}

        {/* BANNIERE */}

        <section className="av10-banner">

          <div>

            <small>
              BIZINA IPHONE SETTINGS
            </small>

            <h2>
              Votre plateforme, vos règles.
            </h2>

            <p>

              Gérez les paramètres commerciaux,
              les règles de publication et les
              préférences de votre marketplace.

            </p>

            {original && (

              <div className="av10-banner-meta">

                <span>
                  Version {original.version}
                </span>

                <span>

                  Dernière modification :{' '}

                  {formatSettingsDate(
                    original.updated_at
                  )}

                </span>

              </div>

            )}

          </div>

          <Settings

            size={110}

            strokeWidth={0.9}

            className="av10-banner-icon"

          />

        </section>

        {loading ? (

          <div className="av10-panel av10-loading">

            <LoaderCircle

              size={34}

              className="av10-spin"

            />

            <p>
              Chargement de la configuration...
            </p>

          </div>

        ) : !draft || !original ? (

          <div className="av10-panel av10-loading">

            <AlertTriangle size={36} />

            <h3>
              Configuration indisponible
            </h3>

            <p>
              Vérifiez la configuration SQL
              et le niveau MFA de la session.
            </p>

            <button

              type="button"

              className="av10-btn av10-btn-secondary"

              onClick={handleReload}

            >

              Réessayer

            </button>

          </div>

        ) : (

          <>

            {/* INDICATEURS ENREGISTRES */}

            <div className="av10-stats-grid">

              <StatCard

                icon={Activity}

                label="Plateforme"

                value={
                  original.maintenance_enabled
                    ? 'Maintenance'
                    : 'Opérationnelle'
                }

                description="Configuration enregistrée"

                color={
                  original.maintenance_enabled
                    ? 'orange'
                    : 'green'
                }

              />

              <StatCard

                icon={Users}

                label="Inscriptions"

                value={
                  original.registration_enabled &&
                  !original.maintenance_enabled
                    ? 'Ouvertes'
                    : 'Fermées'
                }

                description="Sous réserve du Hook Auth"

                color="blue"

              />

              <StatCard

                icon={ShieldCheck}

                label="Modération"

                value="Obligatoire"

                description="Validation administrateur"

                color="purple"

              />

              <StatCard

                icon={Wallet}

                label="Devise"

                value="MGA"

                description="Ariary malgache"

                color="green"

              />

            </div>

            {/* NAVIGATION PAR ONGLETS */}

            <nav

              className="av10-tabs"

              aria-label="Sections des paramètres"

            >

              {TABS.map(item => {

                const Icon = item.icon

                return (

                  <button

                    key={item.id}

                    type="button"

                    className={
                      `av10-tab${tab === item.id ? ' active' : ''}`
                    }

                    aria-pressed={
                      tab === item.id
                    }

                    onClick={() => setTab(item.id)}

                  >

                    <Icon size={17} />

                    {item.label}

                  </button>

                )

              })}

            </nav>

            {/* =================================
                ONGLET GENERAL
            ================================= */}

            {tab === 'general' && (

              <>

                <Panel

                  title="Identité de la plateforme"

                  subtitle="Informations générales de Bizina Iphone."

                  icon={Globe}

                >

                  <Field

                    label="Nom de la plateforme"

                    value={draft.platform_name}

                    maxLength={80}

                    disabled={saving}

                    error={
                      fieldError('platform_name')
                    }

                    onChange={value =>
                      updateField(
                        'platform_name',
                        value
                      )
                    }

                  />

                  <Field

                    label="Description"

                    value={
                      draft.platform_description
                    }

                    textarea

                    maxLength={500}

                    disabled={saving}

                    error={
                      fieldError(
                        'platform_description'
                      )
                    }

                    onChange={value =>
                      updateField(
                        'platform_description',
                        value
                      )
                    }

                  />

                </Panel>

                <Panel

                  title="Coordonnées de contact"

                  subtitle="Informations publiques de l’assistance."

                  icon={Mail}

                >

                  <div className="av10-form-grid">

                    <Field

                      label="Adresse e-mail"

                      type="email"

                      placeholder="contact@exemple.com"

                      value={draft.contact_email}

                      maxLength={254}

                      disabled={saving}

                      error={
                        fieldError('contact_email')
                      }

                      onChange={value =>
                        updateField(
                          'contact_email',
                          value
                        )
                      }

                    />

                    <Field

                      label="Numéro de téléphone"

                      type="tel"

                      placeholder="+261 XX XX XXX XX"

                      value={draft.contact_phone}

                      maxLength={40}

                      disabled={saving}

                      error={
                        fieldError('contact_phone')
                      }

                      onChange={value =>
                        updateField(
                          'contact_phone',
                          value
                        )
                      }

                    />

                  </div>

                  <p className="av10-note">

                    Ces coordonnées sont publiques
                    via la configuration de la
                    plateforme. Utilisez des
                    coordonnées professionnelles.

                  </p>

                </Panel>

                <Panel

                  title="Localisation et devise"

                  subtitle="Configuration commerciale de Madagascar."

                  icon={Wallet}

                >

                  <div className="av10-form-grid">

                    <Field

                      label="Devise commerciale"

                      value="MGA — Ariary"

                      disabled

                    />

                    <Field

                      label="Fuseau horaire"

                      value="Indian/Antananarivo — UTC+3"

                      disabled

                    />

                  </div>

                </Panel>

              </>

            )}

            {/* =================================
                ONGLET MARKETPLACE
            ================================= */}

            {tab === 'marketplace' && (

              <>

                <Panel

                  title="Gestion des inscriptions"

                  subtitle="Contrôlez l’arrivée des nouveaux membres."

                  icon={Users}

                >

                  <Toggle

                    label="Autoriser les inscriptions"

                    description="Permettre la création de nouveaux comptes."

                    icon={Users}

                    checked={
                      draft.registration_enabled
                    }

                    disabled={saving}

                    onChange={value =>
                      updateField(
                        'registration_enabled',
                        value
                      )
                    }

                  />

                  <div className="av10-info">

                    <AlertTriangle size={19} />

                    <p>

                      La fermeture effective
                      nécessite l’activation du
                      Hook Before User Created
                      dans Supabase Auth.

                    </p>

                  </div>

                </Panel>

                <Panel

                  title="Limites de publication"

                  subtitle="Contrôlez le volume des annonces par membre."

                  icon={Package}

                >

                  <Field

                    label="Nombre maximal d’annonces"

                    type="number"

                    min={1}

                    max={1000}

                    value={
                      draft.max_products_per_user
                    }

                    description="Annonces simultanément en attente ou approuvées."

                    disabled={saving}

                    error={
                      fieldError(
                        'max_products_per_user'
                      )
                    }

                    onChange={value =>
                      updateField(
                        'max_products_per_user',
                        value
                      )
                    }

                  />

                </Panel>

                <Panel

                  title="Paramètres commerciaux"

                  subtitle="Définissez les prix autorisés en Ariary."

                  icon={Wallet}

                >

                  <div className="av10-form-grid">

                    <Field

                      label="Prix minimum (Ar)"

                      type="number"

                      min={0}

                      value={
                        draft.min_product_price
                      }

                      disabled={saving}

                      error={
                        fieldError(
                          'min_product_price'
                        )
                      }

                      onChange={value =>
                        updateField(
                          'min_product_price',
                          value
                        )
                      }

                    />

                    <Field

                      label="Prix maximum (Ar)"

                      type="number"

                      min={0}

                      max={1000000000000}

                      value={
                        draft.max_product_price
                      }

                      disabled={saving}

                      error={
                        fieldError(
                          'max_product_price'
                        )
                      }

                      onChange={value =>
                        updateField(
                          'max_product_price',
                          value
                        )
                      }

                    />

                  </div>

                  <p className="av10-note">

                    Ces limites s’appliquent aux
                    nouvelles annonces et aux
                    modifications de prix des membres.

                  </p>

                </Panel>

              </>

            )}

            {/* =================================
                ONGLET MODERATION
            ================================= */}

            {tab === 'moderation' && (

              <Panel

                title="Règles de modération"

                subtitle="Préservez la confiance de la communauté."

                icon={ShieldCheck}

              >

                <Toggle

                  label="Validation obligatoire"

                  description="Chaque annonce doit être approuvée par un administrateur avant sa publication."

                  icon={ShieldCheck}

                  color="green"

                  checked={true}

                  disabled

                />

                <div className="av10-secure-note">

                  <LockKeyhole size={21} />

                  <div>

                    <strong>
                      Règle de sécurité verrouillée
                    </strong>

                    <p>

                      La modération obligatoire
                      ne peut pas être désactivée
                      depuis cette interface.

                    </p>

                  </div>

                </div>

                <Link

                  className="av10-link"

                  to="/admin/products"

                >

                  Ouvrir la modération

                  <ArrowUpRight size={15} />

                </Link>

                <Link

                  className="av10-link"

                  to="/admin/reports"

                >

                  Gérer les signalements

                  <ArrowUpRight size={15} />

                </Link>

              </Panel>

            )}

            {/* =================================
                ONGLET NOTIFICATIONS
            ================================= */}

            {tab === 'notifications' && (

              <Panel

                title="Préférences de notification"

                subtitle="Contrôlez les notifications automatiques."

                icon={Bell}

              >

                <Toggle

                  label="Notifications de publication"

                  description="Nouvelles annonces, approbations et refus."

                  icon={Package}

                  checked={
                    draft.product_notifications_enabled
                  }

                  disabled={saving}

                  onChange={value =>
                    updateField(
                      'product_notifications_enabled',
                      value
                    )
                  }

                />

                <Toggle

                  label="Notifications de sécurité"

                  description="Les alertes de comptes et sanctions restent inchangées."

                  icon={ShieldCheck}

                  color="green"

                  checked={true}

                  disabled

                />

                <Toggle

                  label="Notifications de signalement"

                  description="Les alertes de signalements restent inchangées."

                  icon={AlertTriangle}

                  color="orange"

                  checked={true}

                  disabled

                />

                <Link

                  to="/admin/notifications"

                  className="av10-link"

                >

                  Ouvrir les notifications

                  <ArrowUpRight size={15} />

                </Link>

              </Panel>

            )}

            {/* =================================
                ONGLET SYSTEME
            ================================= */}

            {tab === 'system' && (

              <>

                <Panel

                  title="Mode maintenance"

                  subtitle="Restreignez temporairement la marketplace."

                  icon={Settings}

                >

                  <Toggle

                    label="Activer le mode maintenance"

                    description="Bloquer l’accès aux annonces pour les membres standards."

                    icon={Activity}

                    color="orange"

                    checked={
                      draft.maintenance_enabled
                    }

                    disabled={saving}

                    onChange={value =>
                      updateField(
                        'maintenance_enabled',
                        value
                      )
                    }

                  />

                  {draft.maintenance_enabled && (

                    <div className="av10-alert warning">

                      <AlertTriangle size={21} />

                      <span>

                        Après enregistrement,
                        les membres ne pourront
                        plus consulter ni modifier
                        les annonces.

                      </span>

                    </div>

                  )}

                  <Field

                    label="Message de maintenance"

                    textarea

                    maxLength={500}

                    value={
                      draft.maintenance_message
                    }

                    disabled={saving}

                    error={
                      fieldError(
                        'maintenance_message'
                      )
                    }

                    onChange={value =>
                      updateField(
                        'maintenance_message',
                        value
                      )
                    }

                  />

                  <p className="av10-note">

                    L’administration reste
                    accessible aux administrateurs
                    disposant d’une session AAL2.

                  </p>

                </Panel>

                <Panel

                  title="Sécurité administrative"

                  subtitle="Protection des modifications sensibles."

                  icon={LockKeyhole}

                >

                  <Toggle

                    label="Protection MFA AAL2"

                    description="Obligatoire pour les modifications de configuration."

                    icon={ShieldCheck}

                    color="green"

                    checked={true}

                    disabled

                  />

                  <Link

                    to="/admin/security"

                    className="av10-link"

                  >

                    Ouvrir le centre de sécurité

                    <ArrowUpRight size={15} />

                  </Link>

                </Panel>

                <Panel

                  title="Restauration de la configuration"

                  subtitle="Préparez une restauration des paramètres initiaux."

                  icon={RotateCcw}

                >

                  <p className="av10-note">

                    Cette opération ne supprime
                    aucun compte, produit, signalement
                    ni journal d’activité.

                  </p>

                  <button

                    type="button"

                    className="av10-btn av10-btn-danger"

                    disabled={saving}

                    onClick={() =>
                      setConfirmation('reset')
                    }

                  >

                    <RotateCcw size={17} />

                    Restaurer les valeurs par défaut

                  </button>

                </Panel>

              </>

            )}

            {/* =================================
                ONGLET HISTORIQUE
            ================================= */}

            {tab === 'history' && (

              <Panel

                title="Historique des modifications"

                subtitle="Les 30 derniers changements enregistrés."

                icon={History}

              >

                {historyError && (

                  <div className="av10-alert error">

                    {historyError}

                  </div>

                )}

                {history.length === 0 ? (

                  <div className="av10-loading">

                    <History size={32} />

                    <p>

                      Aucun changement enregistré.

                    </p>

                  </div>

                ) : (

                  <div className="av10-history">

                    {history.map(item => (

                      <article

                        className="av10-history-item"

                        key={item.id}

                      >

                        <button

                          type="button"

                          className="av10-history-header"

                          aria-expanded={
                            expanded === item.id
                          }

                          onClick={() =>

                            setExpanded(current =>
                              current === item.id
                                ? null
                                : item.id
                            )

                          }

                        >

                          <div className="av10-mini-icon blue">

                            <History size={19} />

                          </div>

                          <div>

                            <strong>

                              Configuration modifiée

                            </strong>

                            <small>

                              {formatSettingsDate(
                                item.created_at
                              )}

                              {' · '}

                              {item.actor_role}

                            </small>

                          </div>

                          <ChevronRight

                            size={18}

                            className={
                              expanded === item.id
                                ? 'expanded'
                                : ''
                            }

                          />

                        </button>

                        {expanded === item.id && (

                          <div className="av10-history-details">

                            {Object.entries(
                              item.details || {}
                            ).map(([key, change]) => (

                              <div

                                className="av10-history-change"

                                key={key}

                              >

                                <strong>

                                  {SETTINGS_LABELS[key] || key}

                                </strong>

                                <div>

                                  <span className="av10-before">

                                    {formatSettingValue(
                                      key,
                                      change?.before
                                    )}

                                  </span>

                                  <ArrowUpRight size={15} />

                                  <span className="av10-after">

                                    {formatSettingValue(
                                      key,
                                      change?.after
                                    )}

                                  </span>

                                </div>

                              </div>

                            ))}

                          </div>

                        )}

                      </article>

                    ))}

                  </div>

                )}

                <Link

                  to="/admin/logs"

                  className="av10-link"

                >

                  Consulter le journal complet

                  <ArrowUpRight size={15} />

                </Link>

              </Panel>

            )}

            {/* INFORMATIONS DE SECURITE */}

            <div className="av10-data-note">

              <ShieldCheck size={23} />

              <div>

                <strong>

                  Configuration protégée

                </strong>

                <p>

                  Les modifications sont contrôlées
                  par Supabase, le niveau MFA AAL2
                  et le journal d’activité Admin V7.

                </p>

              </div>

            </div>

            {/* BARRE DE SAUVEGARDE */}

            {dirty && (

              <div className="av10-savebar">

                <div>

                  <strong>

                    Modifications non enregistrées

                  </strong>

                  <small>

                    {changedKeys.length} paramètre(s)
                    modifié(s)

                  </small>

                </div>

                <div className="av10-savebar-actions">

                  <button

                    type="button"

                    className="av10-btn av10-btn-secondary"

                    disabled={saving}

                    onClick={handleDiscard}

                  >

                    Annuler

                  </button>

                  <button

                    type="button"

                    className="av10-btn av10-btn-primary"

                    disabled={saving}

                    onClick={handleSaveRequest}

                  >

                    <Save size={17} />

                    Enregistrer

                  </button>

                </div>

              </div>

            )}

          </>

        )}

        {/* MODALE DE CONFIRMATION */}

        {confirmation && (

          <div className="av10-modal-overlay">

            <section

              className="av10-modal"

              role="dialog"

              aria-modal="true"

              aria-label={
                confirmationTitle[confirmation]
              }

            >

              <div className="av10-confirm-icon">

                {confirmation === 'save'

                  ? <ShieldCheck size={32} />

                  : <AlertTriangle size={32} />

                }

              </div>

              <h2>

                {confirmationTitle[confirmation]}

              </h2>

              <p>

                {confirmationMessage[confirmation]}

              </p>

              {confirmation === 'save' && (

                <div className="av10-change-list">

                  {changedKeys.map(key => (

                    <div key={key}>

                      <strong>

                        {SETTINGS_LABELS[key] || key}

                      </strong>

                      <span>

                        {formatSettingValue(
                          key,
                          changes[key]
                        )}

                      </span>

                    </div>

                  ))}

                </div>

              )}

              <div className="av10-modal-actions">

                <button

                  type="button"

                  className="av10-btn av10-btn-secondary"

                  disabled={saving}

                  onClick={() =>
                    setConfirmation(null)
                  }

                >

                  Annuler

                </button>

                <button

                  type="button"

                  className={
                    confirmation === 'save'
                      ? 'av10-btn av10-btn-primary'
                      : 'av10-btn av10-btn-danger'
                  }

                  disabled={saving}

                  onClick={confirmAction}

                >

                  {saving && (

                    <LoaderCircle

                      size={17}

                      className="av10-spin"

                    />

                  )}

                  {saving

                    ? 'Enregistrement...'

                    : 'Confirmer'

                  }

                </button>

              </div>

            </section>

          </div>

        )}

        {/* TOAST */}

        {success && (

          <div className="av10-toast" role="status">

            <CheckCircle2 size={22} />

            <span>{success}</span>

            <button

              type="button"

              className="av10-icon-btn"

              aria-label="Fermer"

              onClick={() => setSuccess('')}

            >

              <X size={18} />

            </button>

          </div>

        )}

      </div>

    </AdminLayout>

  )

}
