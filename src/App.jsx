import { useEffect, useState } from 'react'
import { supabase } from './services/supabase'
import './App.css'

const empleados = [
  { id: 'E001', nombre: 'Roque Toledo' },
  { id: 'E002', nombre: 'Sergio Mamaní' },
  { id: 'E003', nombre: 'Brian Díaz' },
]

const tareas = [
  'Administración de campo',
  'Carga en Synagro',
  'Control de stock',
  'Trabajo ganadero',
]

const establecimientos = [
  'Juan Bautista Alberdi',
  'Tafí del Valle',
  'San Pedro de Guasayán',
  'La Ponderosa',
]

const lotes = [
  'Lote 01',
  'Lote 02',
  'Cámara frigorífica',
  'Corrales',
]

function App() {
  const [empleadoId, setEmpleadoId] = useState('E001')
  const [tarea, setTarea] = useState(tareas[0])
  const [establecimiento, setEstablecimiento] = useState(
    establecimientos[0]
  )
  const [lote, setLote] = useState(lotes[0])
  const [marcaciones, setMarcaciones] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  const empleadoSeleccionado = empleados.find(
    empleado => empleado.id === empleadoId
  )

  const jornadaAbierta = marcaciones.find(
    marcacion =>
      marcacion.empleado_id === empleadoId &&
      marcacion.fecha === obtenerFechaActual() &&
      !marcacion.hora_salida
  )

  useEffect(() => {
    cargarMarcaciones()
  }, [])

  function obtenerFechaActual() {
    const ahora = new Date()
    const anio = ahora.getFullYear()
    const mes = String(ahora.getMonth() + 1).padStart(2, '0')
    const dia = String(ahora.getDate()).padStart(2, '0')

    return `${anio}-${mes}-${dia}`
  }

  function obtenerHoraActual() {
    return new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  async function cargarMarcaciones() {
    const { data, error } = await supabase
      .from('marcaciones')
      .select('*')
      .order('creado', { ascending: false })

    if (error) {
      setMensaje(
        'No se pudieron consultar las marcaciones: ' +
          error.message
      )
      return
    }

    setMarcaciones(data || [])
  }

  async function registrarIngreso() {
    if (jornadaAbierta) {
      setMensaje(
        'Este empleado ya tiene una jornada abierta.'
      )
      return
    }

    setProcesando(true)
    setMensaje('Registrando ingreso...')

    const horaIngreso = obtenerHoraActual()

    const registro = {
      empleado_id: empleadoSeleccionado.id,
      empleado_nombre: empleadoSeleccionado.nombre,
      fecha: obtenerFechaActual(),
      tarea,
      establecimiento,
      lote,
      hora_ingreso: horaIngreso,
      hora_salida: null,
    }

    const { error } = await supabase
      .from('marcaciones')
      .insert([registro])

    if (error) {
      setMensaje(
        'No se pudo registrar el ingreso: ' +
          error.message
      )
      setProcesando(false)
      return
    }

    await cargarMarcaciones()

    setMensaje(
      `Ingreso registrado correctamente a las ${horaIngreso}.`
    )
    setProcesando(false)
  }

  async function registrarSalida() {
    if (!jornadaAbierta) {
      setMensaje(
        'No existe una jornada abierta para este empleado.'
      )
      return
    }

    setProcesando(true)
    setMensaje('Registrando salida...')

    const horaSalida = obtenerHoraActual()

    const { error } = await supabase
      .from('marcaciones')
      .update({
        hora_salida: horaSalida,
      })
      .eq('id', jornadaAbierta.id)

    if (error) {
      setMensaje(
        'No se pudo registrar la salida: ' +
          error.message
      )
      setProcesando(false)
      return
    }

    await cargarMarcaciones()

    setMensaje(
      `Salida registrada correctamente a las ${horaSalida}.`
    )
    setProcesando(false)
  }

  return (
    <main className="app">
      <header className="encabezado">
        <p>CONTROL OPERATIVO MÓVIL</p>

        <h1>Control de Jornada V4.1</h1>

        <span>
          Registro de ingreso y salida conectado con Supabase
        </span>
      </header>

      <section className="contenido">
        <div className="tarjeta">
          <h2>Registrar jornada</h2>

          {jornadaAbierta && (
            <div className="jornada-abierta">
              <strong>Jornada abierta</strong>

              <span>
                Ingreso registrado: {
                  jornadaAbierta.hora_ingreso
                }
              </span>

              <span>
                Empleado: {
                  jornadaAbierta.empleado_nombre
                }
              </span>

              <span>
                Establecimiento: {
                  jornadaAbierta.establecimiento
                }
              </span>

              <span>
                Lote: {jornadaAbierta.lote}
              </span>

              <span>
                Tarea: {jornadaAbierta.tarea}
              </span>
            </div>
          )}

          <label>
            Empleado

            <select
              value={empleadoId}
              onChange={evento =>
                setEmpleadoId(evento.target.value)
              }
              disabled={procesando}
            >
              {empleados.map(empleado => (
                <option
                  key={empleado.id}
                  value={empleado.id}
                >
                  {empleado.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tarea

            <select
              value={tarea}
              onChange={evento =>
                setTarea(evento.target.value)
              }
              disabled={procesando || Boolean(jornadaAbierta)}
            >
              {tareas.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Establecimiento

            <select
              value={establecimiento}
              onChange={evento =>
                setEstablecimiento(evento.target.value)
              }
              disabled={procesando || Boolean(jornadaAbierta)}
            >
              {establecimientos.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Lote

            <select
              value={lote}
              onChange={evento =>
                setLote(evento.target.value)
              }
              disabled={procesando || Boolean(jornadaAbierta)}
            >
              {lotes.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="botones-jornada">
            <button
              type="button"
              className="boton-ingreso"
              onClick={registrarIngreso}
              disabled={
                procesando || Boolean(jornadaAbierta)
              }
            >
              {procesando && !jornadaAbierta
                ? 'Registrando...'
                : 'Registrar ingreso'}
            </button>

            <button
              type="button"
              className="boton-salida"
              onClick={registrarSalida}
              disabled={
                procesando || !jornadaAbierta
              }
            >
              {procesando && jornadaAbierta
                ? 'Registrando...'
                : 'Registrar salida'}
            </button>
          </div>

          {mensaje && (
            <div className="mensaje">
              {mensaje}
            </div>
          )}
        </div>

        <div className="tarjeta">
          <h2>Marcaciones registradas</h2>

          {marcaciones.length === 0 && (
            <p className="sin-datos">
              Todavía no existen marcaciones.
            </p>
          )}

          <div className="lista">
            {marcaciones.map(marcacion => (
              <article
                key={marcacion.id}
                className="registro"
              >
                <strong>
                  {marcacion.empleado_nombre}
                </strong>

                <span>
                  Fecha: {marcacion.fecha}
                </span>

                <span>
                  Ingreso: {
                    marcacion.hora_ingreso || 'Sin registrar'
                  }
                </span>

                <span>
                  Salida: {
                    marcacion.hora_salida || 'Pendiente'
                  }
                </span>

                <span>
                  Establecimiento: {
                    marcacion.establecimiento
                  }
                </span>

                <span>
                  Lote: {marcacion.lote}
                </span>

                <small>
                  Tarea: {marcacion.tarea}
                </small>

                <div
                  className={
                    marcacion.hora_salida
                      ? 'estado-finalizada'
                      : 'estado-abierta'
                  }
                >
                  {marcacion.hora_salida
                    ? 'Jornada finalizada'
                    : 'Jornada abierta'}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
