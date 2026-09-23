import { useEffect, useState } from 'react'
import {
  BarChart3,
  Clock3,
  LogOut,
  Settings,
  Users,
} from 'lucide-react'

import { supabase } from './services/supabase'

import Login from './pages/Login'
import Jornada from './pages/Jornada'
import Empleados from './pages/Empleados'
import Catalogos from './pages/Catalogos'
import Supervisor from './pages/Supervisor'

import './App.css'

function App() {
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [pagina, setPagina] = useState('jornada')
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    comprobarSesion()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_evento, nuevaSesion) => {
        setSesion(nuevaSesion)

        if (nuevaSesion?.user) {
          await cargarPerfil(
            nuevaSesion.user.id
          )
        } else {
          setPerfil(null)
          setPagina('jornada')
          setMensaje('')
        }

        setCargando(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function comprobarSesion() {
    setCargando(true)
    setMensaje('')

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      setMensaje(
        'No se pudo comprobar la sesión.'
      )

      setCargando(false)
      return
    }

    setSesion(session)

    if (session?.user) {
      await cargarPerfil(session.user.id)
    }

    setCargando(false)
  }

  async function cargarPerfil(usuarioId) {
    setMensaje('')

    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', usuarioId)
      .eq('activo', true)
      .single()

    if (error) {
      setPerfil(null)

      setMensaje(
        'La cuenta existe, pero no tiene un perfil activo asignado.'
      )

      return
    }

    setPerfil(data)
  }

  async function cerrarSesion() {
    setMensaje('Cerrando sesión...')

    const { error } =
      await supabase.auth.signOut()

    if (error) {
      setMensaje(
        'No se pudo cerrar la sesión.'
      )

      return
    }

    setSesion(null)
    setPerfil(null)
    setPagina('jornada')
    setMensaje('')
  }

  if (cargando) {
    return (
      <main className="pantalla-cargando">
        <section className="login-card">
          <p className="login-label">
            CONTROL OPERATIVO MÓVIL
          </p>

          <h1>Cargando aplicación...</h1>

          <p>
            Verificando la sesión del usuario.
          </p>
        </section>
      </main>
    )
  }

  if (!sesion) {
    return <Login />
  }

  if (!perfil) {
    return (
      <main className="pantalla-cargando">
        <section className="login-card">
          <p className="login-label">
            ACCESO RESTRINGIDO
          </p>

          <h1>Perfil no disponible</h1>

          <p>
            {mensaje ||
              'La cuenta no tiene un perfil activo asignado.'}
          </p>

          <button
            type="button"
            onClick={cerrarSesion}
          >
            <LogOut size={18} />

            Cerrar sesión
          </button>
        </section>
      </main>
    )
  }

  const esSupervisor =
    perfil.rol === 'supervisor'

  return (
    <div className="shell">
      <nav>
        <button
          type="button"
          className={
            pagina === 'jornada'
              ? 'active'
              : ''
          }
          onClick={() =>
            setPagina('jornada')
          }
        >
          <Clock3 size={18} />

          Jornada
        </button>

        {esSupervisor && (
          <>
            <button
              type="button"
              className={
                pagina === 'empleados'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setPagina('empleados')
              }
            >
              <Users size={18} />

              Empleados
            </button>

            <button
              type="button"
              className={
                pagina === 'ajustes'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setPagina('ajustes')
              }
            >
              <Settings size={18} />

              Ajustes
            </button>

            <button
              type="button"
              className={
                pagina === 'supervisor'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setPagina('supervisor')
              }
            >
              <BarChart3 size={18} />

              Supervisor
            </button>
          </>
        )}

        <div className="usuario-sesion">
          <div>
            <strong>
              {perfil.nombre}
            </strong>

            <span>
              {esSupervisor
                ? 'Supervisor'
                : 'Empleado'}
            </span>
          </div>

          <button
            type="button"
            className="boton-cerrar-sesion"
            onClick={cerrarSesion}
          >
            <LogOut size={17} />

            Salir
          </button>
        </div>
      </nav>

      {mensaje && (
        <div className="global-message">
          {mensaje}
        </div>
      )}

      {pagina === 'jornada' && (
        <Jornada perfil={perfil} />
      )}

      {esSupervisor &&
        pagina === 'empleados' && (
          <Empleados />
        )}

      {esSupervisor &&
        pagina === 'ajustes' && (
          <Catalogos />
        )}

      {esSupervisor &&
        pagina === 'supervisor' && (
          <Supervisor />
        )}
    </div>
  )
}

export default App