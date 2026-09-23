import { useEffect, useState } from 'react'
import {
  KeyRound,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import { supabase } from '../services/supabase'

function Login() {
  const [modo, setModo] = useState('empleado')
  const [empleados, setEmpleados] = useState([])
  const [legajo, setLegajo] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    cargarEmpleados()
  }, [])

  async function cargarEmpleados() {
    const { data, error } = await supabase
      .from('empleados')
      .select('id, legajo, nombre')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      setMensaje(
        'No se pudo cargar la lista de empleados.'
      )
      return
    }

    setEmpleados(data || [])

    if (data?.length > 0) {
      setLegajo(data[0].legajo)
    }
  }

  async function ingresarEmpleado(evento) {
    evento.preventDefault()

    if (!legajo) {
      setMensaje('Seleccione un empleado.')
      return
    }

    if (!/^[0-9]{6}$/.test(pin)) {
      setMensaje(
        'Ingrese un PIN de exactamente 6 números.'
      )
      return
    }

    setProcesando(true)
    setMensaje('Verificando acceso...')

    const correoInterno =
      `empleado-${legajo.toLowerCase()}@control-jornada.app`

    const { error } =
      await supabase.auth.signInWithPassword({
        email: correoInterno,
        password: pin,
      })

    if (error) {
      setMensaje(
        'El empleado o el PIN son incorrectos.'
      )
      setProcesando(false)
      return
    }

    setMensaje('Acceso correcto.')
    setProcesando(false)
  }

  async function ingresarSupervisor(evento) {
    evento.preventDefault()

    if (!email.trim() || !password) {
      setMensaje(
        'Ingrese el correo y la contraseña.'
      )
      return
    }

    setProcesando(true)
    setMensaje('Iniciando sesión...')

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

    if (error) {
      setMensaje(
        'El correo o la contraseña son incorrectos.'
      )
      setProcesando(false)
      return
    }

    setMensaje('Acceso correcto.')
    setProcesando(false)
  }

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo)
    setMensaje('')
    setPin('')
    setEmail('')
    setPassword('')
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="login-label">
          CONTROL OPERATIVO MÓVIL
        </p>

        <h1>Control de Jornada</h1>

        <p className="login-description">
          Seleccione el tipo de acceso.
        </p>

        <div className="selector-acceso">
          <button
            type="button"
            className={
              modo === 'empleado'
                ? 'active'
                : 'secondary'
            }
            onClick={() =>
              cambiarModo('empleado')
            }
          >
            <UserRound size={18} />
            Empleado
          </button>

          <button
            type="button"
            className={
              modo === 'supervisor'
                ? 'active'
                : 'secondary'
            }
            onClick={() =>
              cambiarModo('supervisor')
            }
          >
            <LockKeyhole size={18} />
            Supervisor
          </button>
        </div>

        {modo === 'empleado' && (
          <form onSubmit={ingresarEmpleado}>
            <label>
              Empleado

              <select
                value={legajo}
                onChange={evento =>
                  setLegajo(evento.target.value)
                }
                disabled={procesando}
              >
                {empleados.length === 0 && (
                  <option value="">
                    No hay empleados disponibles
                  </option>
                )}

                {empleados.map(empleado => (
                  <option
                    key={empleado.id}
                    value={empleado.legajo}
                  >
                    {empleado.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              PIN de acceso

              <div className="campo-con-icono">
                <KeyRound size={19} />

                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="current-password"
                  placeholder="6 números"
                  value={pin}
                  onChange={evento => {
                    const valor =
                      evento.target.value
                        .replace(
                          /[^0-9]/g,
                          ''
                        )
                        .slice(0, 6)

                    setPin(valor)
                  }}
                  disabled={procesando}
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={
                procesando ||
                empleados.length === 0
              }
            >
              <KeyRound size={18} />

              {procesando
                ? 'Ingresando...'
                : 'Ingresar como empleado'}
            </button>
          </form>
        )}

        {modo === 'supervisor' && (
          <form onSubmit={ingresarSupervisor}>
            <label>
              Correo electrónico

              <div className="campo-con-icono">
                <Mail size={19} />

                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Correo del supervisor"
                  value={email}
                  onChange={evento =>
                    setEmail(evento.target.value)
                  }
                  disabled={procesando}
                />
              </div>
            </label>

            <label>
              Contraseña

              <div className="campo-con-icono">
                <LockKeyhole size={19} />

                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={evento =>
                    setPassword(
                      evento.target.value
                    )
                  }
                  disabled={procesando}
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={procesando}
            >
              <LockKeyhole size={18} />

              {procesando
                ? 'Ingresando...'
                : 'Ingresar como supervisor'}
            </button>
          </form>
        )}

        {mensaje && (
          <div className="message">
            {mensaje}
          </div>
        )}
      </section>
    </main>
  )
}

export default Login
