
import { useEffect, useState } from 'react'

import {
  getUnreadCount,
  subscribeToNotifications
} from '../services/notificationService'

// ==========================================
// BIZINA IPHONE - ADMIN V6
// HOOK NOTIFICATIONS REALTIME
// ==========================================

export default function useNotifications(userId) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let running = false
    let queued = false

    setUnreadCount(0)
    setConnected(false)
    setLoading(true)
    setError('')

    if (!userId) {
      setLoading(false)
      return
    }

    // ======================================
    // ACTUALISATION DU COMPTEUR
    // ======================================

    async function refresh() {
      if (!active) return

      if (running) {
        queued = true
        return
      }

      running = true

      try {
        const count = await getUnreadCount()

        if (active) {
          setUnreadCount(count)
          setError('')
        }

      } catch (err) {
        if (active) {
          setError(
            err.message ||
            'Notifications indisponibles.'
          )

          console.error(
            'Erreur notifications :',
            err.message
          )
        }

      } finally {
        running = false

        if (active) {
          setLoading(false)

          if (queued) {
            queued = false
            refresh()
          }
        }
      }
    }

    // Chargement initial

    refresh()

    // ======================================
    // CONNEXION SUPABASE REALTIME
    // ======================================

    const unsubscribe = subscribeToNotifications(
      userId,

      () => refresh(),

      status => {
        if (!active) return

        setConnected(status === 'SUBSCRIBED')

        if (status === 'SUBSCRIBED') {
          refresh()
        }
      }
    )

    // ======================================
    // ACTUALISATION AUTOMATIQUE
    // ======================================

    const interval = setInterval(
      refresh,
      30000
    )

    window.addEventListener(
      'focus',
      refresh
    )

    // ======================================
    // NETTOYAGE
    // ======================================

    return () => {
      active = false

      clearInterval(interval)

      unsubscribe()

      window.removeEventListener(
        'focus',
        refresh
      )
    }

  }, [userId])

  return {
    unreadCount,
    connected,
    loading,
    error
  }
}
