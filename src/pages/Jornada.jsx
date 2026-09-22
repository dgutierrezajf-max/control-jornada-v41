import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import '../App.css'
function Jornada()  {   
  const [empleados, setEmpleados] = useState([])
  const [tareas, setTareas] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [lotes, setLotes] = useState([])
  const [lotesFiltrados, setLotesFiltrados] = useState([])
  const [marcaciones, setMarcaciones] = useState([])

  const [empleadoId, setEmpleadoId] = useState('')
  const [tareaId, setTareaId] = useState('')
  const [establecimientoId, setEstablecimientoId] = useState('')
  const [loteId, setLoteId] = useState('')

  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    const filtrados = lotes.filter(
      lote =>
        String(lote.establecimiento_id) ===
        String(establecimientoId)
    )

    setLotesFiltrados(filtrados)

    if (filtrados.length > 0) {
      setLoteId(filtrados[0].id)
    }
  }, [establecimientoId, lotes])

  async function cargarDatos() {
    const empleadosRes = await supabase
      .from('empleados')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    const tareasRes = await supabase
      .from('tareas')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    const establecimientosRes = await supabase
      .from('establecimientos')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    const lotesRes = await supabase
      .from('lotes')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    const marcacionesRes = await supabase
      .from('marcaciones')
      .select('*')
      .order('id', { ascending: false })

    setEmpleados(empleadosRes.data || [])
    setTareas(tareasRes.data || [])
    setEstablecimientos(
      establecimientosRes.data || []
    )
    setLotes(lotesRes.data || [])
    setMarcaciones(marcacionesRes.data || [])

    if (empleadosRes.data?.length) {
      setEmpleadoId(empleadosRes.data[0].legajo)
    }

    if (tareasRes.data?.length) {
      setTareaId(tareasRes.data[0].nombre)
    }

    if (establecimientosRes.data?.length) {
      setEstablecimientoId(
        establecimientosRes.data[0].id
      )
    }
  }

  function fechaActual() {
    return new Date().toISOString().split('T')[0]
  }

  function horaActual() {
    return new Date().toLocaleTimeString(
      'es-AR',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
    )
  }

  function empleadoSeleccionado() {
    return empleados.find(
      e => e.legajo === empleadoId
    )
  }

  const jornadaAbierta = marcaciones.find(
    m =>
      m.empleado_id === empleadoId &&
      m.fecha === fechaActual() &&
      !m.hora_salida
  )

  async function registrarIngreso() {
    if (jornadaAbierta) {
      setMensaje(
        'Este empleado ya tiene una jornada abierta.'
      )
      return
    }

    setProcesando(true)

    const empleado = empleadoSeleccionado()

    const establecimiento =
      establecimientos.find(
        e =>
          String(e.id) ===
          String(establecimientoId)
      )

    const lote = lotes.find(
      l => String(l.id) === String(loteId)
    )

    const { error } = await supabase
      .from('marcaciones')
      .insert([
        {
          empleado_id: empleado.legajo,
          empleado_nombre: empleado.nombre,
          fecha: fechaActual(),
          tarea: tareaId,
          establecimiento:
            establecimiento?.nombre,
          lote: lote?.nombre,
          hora_ingreso: horaActual(),
        },
      ])

    if (error) {
      setMensaje(error.message)
      setProcesando(false)
      return
    }

    setMensaje('Ingreso registrado')

    await cargarDatos()

    setProcesando(false)
  }

  async function registrarSalida() {
    if (!jornadaAbierta) {
      setMensaje(
        'No existe una jornada abierta.'
      )
      return
    }

    setProcesando(true)

    const { error } = await supabase
      .from('marcaciones')
      .update({
        hora_salida: horaActual(),
      })
      .eq('id', jornadaAbierta.id)

    if (error) {
      setMensaje(error.message)
      setProcesando(false)
      return
    }

    setMensaje('Salida registrada')

    await cargarDatos()

    setProcesando(false)
  }

  return (
    <main className="app">
      <header className="encabezado">
        <p>CONTROL OPERATIVO MÓVIL</p>
        <h1>Control de Jornada V4.2</h1>
      </header>

      <section className="contenido">
        <div className="tarjeta">
          <h2>Registrar jornada</h2>

          <label>
            Empleado

            <select
              value={empleadoId}
              onChange={e =>
                setEmpleadoId(
                  e.target.value
                )
              }
            >
              {empleados.map(e => (
                <option
                  key={e.id}
                  value={e.legajo}
                >
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tarea

            <select
              value={tareaId}
              onChange={e =>
                setTareaId(
                  e.target.value
                )
              }
            >
              {tareas.map(t => (
                <option
                  key={t.id}
                  value={t.nombre}
                >
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Establecimiento

            <select
              value={establecimientoId}
              onChange={e =>
                setEstablecimientoId(
                  e.target.value
                )
              }
            >
              {establecimientos.map(e => (
                <option
                  key={e.id}
                  value={e.id}
                >
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Lote

            <select
              value={loteId}
              onChange={e =>
                setLoteId(
                  e.target.value
                )
              }
            >
              {lotesFiltrados.map(l => (
                <option
                  key={l.id}
                  value={l.id}
                >
                  {l.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="botones-jornada">
            <button
              className="boton-ingreso"
              onClick={registrarIngreso}
              disabled={
                procesando ||
                Boolean(jornadaAbierta)
              }
            >
              Registrar ingreso
            </button>

            <button
              className="boton-salida"
              onClick={registrarSalida}
              disabled={
                procesando ||
                !jornadaAbierta
              }
            >
              Registrar salida
            </button>
          </div>

          {mensaje && (
            <div className="mensaje">
              {mensaje}
            </div>
          )}
        </div>

        <div className="tarjeta">
          <h2>Marcaciones</h2>

          {marcaciones.map(m => (
            <div
              key={m.id}
              className="registro"
            >
              <strong>
                {m.empleado_nombre}
              </strong>

              <div>
                Fecha: {m.fecha}
              </div>

              <div>
                Ingreso: {m.hora_ingreso}
              </div>

              <div>
                Salida:{' '}
                {m.hora_salida ||
                  'Pendiente'}
              </div>

              <div>
                {m.establecimiento}
              </div>

              <div>{m.lote}</div>

              <div>{m.tarea}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default Jornada  