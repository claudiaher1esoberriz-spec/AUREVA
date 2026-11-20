import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage('')
    setError('')

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: window.location.origin }
        )
        if (error) throw error
        setMessage('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar tu contraseña.')
      } else if (mode === 'signup') {
        if (!name.trim()) throw new Error('Introduce tu nombre.')
        if (password.length < 8) {
          throw new Error('La contraseña debe tener al menos 8 caracteres.')
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() }
          }
        })

        if (error) throw error

        if (data.session) {
          onAuthenticated?.(data.session)
        } else {
          setMessage('Revisa tu correo para confirmar la cuenta. Comprueba también la carpeta de spam.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

        if (error) throw error
        onAuthenticated?.(data.session)
      }
    } catch (err) {
      setError(err.message || 'Ha ocurrido un error.')
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = {
    width: '100%',
    padding: '13px',
    borderRadius: '12px',
    border: '1px solid #d7d2e4',
    background: '#fff',
    color: '#211a32',
    boxSizing: 'border-box',
    fontSize: '15px'
  }

  const buttonStyle = {
    ...fieldStyle,
    background: '#7554d6',
    color: 'white',
    border: 'none',
    cursor: loading ? 'wait' : 'pointer',
    fontWeight: 700
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'linear-gradient(145deg, #f8f5ff, #eee8ff)',
      padding: '24px',
      fontFamily: 'inherit'
    }}>
      <section style={{
        width: '100%',
        maxWidth: '420px',
        background: 'white',
        padding: '32px',
        borderRadius: '24px',
        boxShadow: '0 16px 50px #4b35751c',
        color: '#211a32',
        boxSizing: 'border-box'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#7554d6',
          marginBottom: '6px'
        }}>AUREVA</h1>

        <p style={{ textAlign: 'center', color: '#716782' }}>
          Tu espacio inteligente para aprender
        </p>

        <h2 style={{ marginTop: '30px', fontSize: '21px' }}>
          {mode === 'login' ? 'Iniciar sesión'
            : mode === 'signup' ? 'Crear cuenta'
            : 'Recuperar contraseña'}
        </h2>

        <form onSubmit={handleSubmit}
          style={{ display: 'grid', gap: '14px' }}>

          {mode === 'signup' && (
            <input
              style={fieldStyle}
              placeholder="Tu nombre"
              aria-label="Tu nombre"
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}

          <input
            style={fieldStyle}
            type="email"
            placeholder="Correo electrónico"
            aria-label="Correo electrónico"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          {mode !== 'reset' && (
            <input
              style={fieldStyle}
              type="password"
              placeholder="Contraseña"
              aria-label="Contraseña"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={mode === 'signup' ? 8 : undefined}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          )}

          {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
          {message && <p role="status" style={{ color: '#276749' }}>{message}</p>}

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Espera...'
              : mode === 'login' ? 'Entrar en AUREVA'
              : mode === 'signup' ? 'Crear mi cuenta'
              : 'Enviar instrucciones'}
          </button>
        </form>

        <div style={{
          display: 'grid',
          gap: '12px',
          marginTop: '22px',
          textAlign: 'center'
        }}>
          <button type="button" onClick={() => {
            setMode(mode === 'signup' ? 'login' : 'signup')
            setError('')
            setMessage('')
          }} style={{
            background: 'none',
            border: 'none',
            color: '#7554d6',
            cursor: 'pointer'
          }}>
            {mode === 'signup'
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate'}
          </button>

          {mode !== 'reset' && (
            <button type="button" onClick={() => {
              setMode('reset')
              setError('')
              setMessage('')
            }} style={{
              background: 'none',
              border: 'none',
              color: '#716782',
              cursor: 'pointer'
            }}>
              ¿Has olvidado tu contraseña?
            </button>
          )}

          {mode === 'reset' && (
            <button type="button" onClick={() => {
              setMode('login')
              setError('')
              setMessage('')
            }} style={{
              background: 'none',
              border: 'none',
              color: '#7554d6',
              cursor: 'pointer'
            }}>
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
