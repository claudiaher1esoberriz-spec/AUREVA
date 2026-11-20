import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import AuthScreen from './AuthScreen.jsx'
import { setStorageUser } from '../lib/privateStorage.js'

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setStorageUser(data.session?.user?.id)
        setSession(data.session)
        setLoading(false)
      }
    }).catch(() => {
      if (active) setLoading(false)
    })

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (active) {
          setStorageUser(nextSession?.user?.id)
          setSession(nextSession)
          setLoading(false)
        }
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])


  useEffect(() => {
    const logout = async () => {
      const { error } = await supabase.auth.signOut()
      if (error) {
        alert('No se pudo cerrar sesión: ' + error.message)
        return
      }
      setStorageUser(null)
      setSession(null)
    }

    window.addEventListener('aureva:logout', logout)
    return () => window.removeEventListener('aureva:logout', logout)
  }, [])

  if (loading) {
    return <div style={{ padding: 32 }}>Cargando AUREVA...</div>
  }

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} />
  }

  return (
    <div key={session.user.id} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
