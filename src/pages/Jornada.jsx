import { useEffect, useMemo, useState } from 'react'
import {
  Camera,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '../services/supabase'

function obtenerFechaActual() {
  const fecha = new Date()
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function obtenerHoraActual() {
  return new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

async function convertirFotoEnArchivo(imagenBase64) {
  const respuesta = await fetch(imagenBase64)
  return await respuesta.blob()
}

function Jornada({ perfil }) {
  const [empleados, setEmpleados] = useState([])
  const [tareas, setTareas] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [lotes, setLotes] = useState([])
  const [marcaciones, setMarcaciones] = useState([])

  const [empleadoId, setEmpleadoId] = useState('')
  const [tarea, setTarea] = useState('')
  const [establecimientoId, setEstablecimientoId] = useState('')
  const [loteId, setLoteId] = useState('')
  const [foto, setFoto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mensajeGps, setMensajeGps] = useState('')
  const [procesando, setProcesando] = useState(false)

  const esSupervisor = perfil?.rol === 'supervisor'

  useEffect(() => {
    cargarDatos()
  }, [perfil])

  const lotesFiltrados = useMemo(
    () =>
      lotes.filter(
        (lote) =>
          String(lote.establecimiento_id) ===
          String(establecimientoId)
      ),
    [lotes, establecimientoId]
  )

  useEffect(() => {
    const loteExiste = lotesFiltrados.some(
      (lote) => String(lote.id) === String(loteId)
    )

    if (!loteExiste) {
      setLoteId(
        lotesFiltrados.length > 0
          ? String(lotesFiltrados[0].id)
          : ''
      )
    }
  }, [lotesFiltrados, loteId])

  async function cargarDatos() {
    setMensaje('Cargando información...')

    try {
      const [
        resultadoTareas,
        resultadoEstablecimientos,
        resultadoLotes,
      ] = await Promise.all([
        supabase
          .from('tareas')
          .select('*')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('establecimientos')
          .select('*')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('lotes')
          .select('*')
          .eq('activo', true)
          .order('nombre'),
      ])

      if (resultadoTareas.error) throw resultadoTareas.error
      if (resultadoEstablecimientos.error) {
        throw resultadoEstablecimientos.error
      }
      if (resultadoLotes.error) throw resultadoLotes.error

      const tareasData = resultadoTareas.data || []
      const establecimientosData =
        resultadoEstablecimientos.data || []
      const lotesData = resultadoLotes.data || []

      setTareas(tareasData)
      setEstablecimientos(establecimientosData)
      setLotes(lotesData)

      if (!tarea && tareasData.length > 0) {
        setTarea(tareasData[0].nombre)
      }

      if (!establecimientoId && establecimientosData.length > 0) {
        setEstablecimientoId(String(establecimientosData[0].id))
      }

      if (esSupervisor) {
        await cargarDatosSupervisor()
      } else {
        await cargarDatosEmpleado()
      }

      setMensaje('')
    } catch (error) {
      setMensaje(
        error?.message || 'No se pudieron cargar los datos.'
      )
    }
  }

  async function cargarDatosSupervisor() {
    const [resultadoEmpleados, resultadoMarcaciones] =
      await Promise.all([
        supabase
          .from('empleados')
          .select('*')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('marcaciones')
          .select('*')
          .order('id', { ascending: false })
          .limit(100),
      ])

    if (resultadoEmpleados.error) throw resultadoEmpleados.error
    if (resultadoMarcaciones.error) throw resultadoMarcaciones.error

    const empleadosData = resultadoEmpleados.data || []
    setEmpleados(empleadosData)
    setMarcaciones(resultadoMarcaciones.data || [])

    const seleccionadoExiste = empleadosData.some(
      (empleado) => empleado.legajo === empleadoId
    )

    if (!seleccionadoExiste && empleadosData.length > 0) {
      setEmpleadoId(empleadosData[0].legajo)
    }
  }

  async function cargarDatosEmpleado() {
    if (!perfil?.empleado_id) {
      throw new Error('El perfil no está asociado a un empleado.')
    }

    const { data: empleado, error: errorEmpleado } =
      await supabase
        .from('empleados')
        .select('*')
        .eq('id', perfil.empleado_id)
        .eq('activo', true)
        .single()

    if (errorEmpleado) throw errorEmpleado

    const { data: registros, error: errorRegistros } =
      await supabase
        .from('marcaciones')
        .select('*')
        .eq('empleado_id', empleado.legajo)
        .order('id', { ascending: false })
        .limit(100)

    if (errorRegistros) throw errorRegistros

    setEmpleados([empleado])
    setEmpleadoId(empleado.legajo)
    setMarcaciones(registros || [])
  }

  const empleadoSeleccionado = empleados.find(
    (empleado) => empleado.legajo === empleadoId
  )

  const jornadaAbierta = marcaciones.find(
    (marcacion) =>
      marcacion.empleado_id === empleadoId &&
      marcacion.fecha === obtenerFechaActual() &&
      !marcacion.hora_salida
  )

  function obtenerUbicacion() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error('El dispositivo no permite obtener la ubicación.')
        )
        return
      }

      let finalizado = false

      const temporizador = window.setTimeout(() => {
        if (finalizado) return
        finalizado = true
        reject(new Error('No se pudo obtener el GPS en 15 segundos.'))
      }, 15000)

      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          if (finalizado) return
          finalizado = true
          window.clearTimeout(temporizador)

          resolve({
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
            precision: posicion.coords.accuracy,
          })
        },
        (error) => {
          if (finalizado) return
          finalizado = true
          window.clearTimeout(temporizador)

          if (error.code === 1) {
            reject(new Error('Debe permitir el acceso a la ubicación.'))
            return
          }
          if (error.code === 2) {
            reject(new Error('La ubicación no está disponible.'))
            return
          }
          if (error.code === 3) {
            reject(
              new Error('Se agotó el tiempo para obtener la ubicación.')
            )
            return
          }

          reject(new Error('No se pudo obtener la ubicación.'))
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      )
    })
  }

  async function subirFoto(tipo) {
    if (!foto) {
      throw new Error('Debe tomar una foto de validación.')
    }

    const archivo = await convertirFotoEnArchivo(foto)
    const ruta = `${empleadoId}/${obtenerFechaActual()}/${tipo}-${Date.now()}.jpg`

    const { error } = await supabase.storage
      .from('evidencias')
      .upload(ruta, archivo, {
        contentType: archivo.type || 'image/jpeg',
        upsert: false,
      })

    if (error) throw error
    return ruta
  }

  async function registrarIngreso() {
    if (!empleadoSeleccionado) {
      setMensaje('No se pudo identificar al empleado.')
      return
    }
    if (jornadaAbierta) {
      setMensaje('El empleado ya tiene una jornada abierta.')
      return
    }
    if (!tarea || !establecimientoId || !loteId) {
      setMensaje('Complete la tarea, el establecimiento y el lote.')
      return
    }

    setProcesando(true)
    setMensaje('Validando foto y ubicación...')
    setMensajeGps('Buscando ubicación GPS...')

    try {
      const ubicacion = await obtenerUbicacion()
      const rutaFoto = await subirFoto('ingreso')
      const establecimiento = establecimientos.find(
        (item) => String(item.id) === String(establecimientoId)
      )
      const lote = lotes.find(
        (item) => String(item.id) === String(loteId)
      )

      if (!establecimiento || !lote) {
        throw new Error(
          'No se pudieron validar el establecimiento y el lote.'
        )
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const horaIngreso = obtenerHoraActual()

      const { error } = await supabase.from('marcaciones').insert({
        usuario_id: user?.id || null,
        empleado_id: empleadoSeleccionado.legajo,
        empleado_nombre: empleadoSeleccionado.nombre,
        fecha: obtenerFechaActual(),
        tarea,
        establecimiento: establecimiento.nombre,
        lote: lote.nombre,
        hora_ingreso: horaIngreso,
        hora_salida: null,
        lat_ingreso: ubicacion.latitud,
        lng_ingreso: ubicacion.longitud,
        precision_ingreso: ubicacion.precision,
        foto_ingreso: rutaFoto,
      })

      if (error) throw error

      setFoto('')
      setMensaje(
        `Ingreso registrado correctamente a las ${horaIngreso}.`
      )
      setMensajeGps(
        `GPS registrado. Precisión aproximada: ${Math.round(
          ubicacion.precision
        )} metros.`
      )

      if (esSupervisor) {
        await cargarDatosSupervisor()
      } else {
        await cargarDatosEmpleado()
      }
    } catch (error) {
      setMensaje(error?.message || 'No se pudo registrar el ingreso.')
      setMensajeGps('GPS o evidencia no registrados.')
    } finally {
      setProcesando(false)
    }
  }

  async function registrarSalida() {
    if (!jornadaAbierta) {
      setMensaje('No existe una jornada abierta.')
      return
    }

    setProcesando(true)
    setMensaje('Validando foto y ubicación de salida...')
    setMensajeGps('Buscando ubicación GPS...')

    try {
      const ubicacion = await obtenerUbicacion()
      const rutaFoto = await subirFoto('salida')
      const horaSalida = obtenerHoraActual()

      const { error } = await supabase
        .from('marcaciones')
        .update({
          hora_salida: horaSalida,
          lat_salida: ubicacion.latitud,
          lng_salida: ubicacion.longitud,
          precision_salida: ubicacion.precision,
          foto_salida: rutaFoto,
        })
        .eq('id', jornadaAbierta.id)

      if (error) throw error

      setFoto('')
      setMensaje(
        `Salida registrada correctamente a las ${horaSalida}.`
      )
      setMensajeGps(
        `GPS registrado. Precisión aproximada: ${Math.round(
          ubicacion.precision
        )} metros.`
      )

      if (esSupervisor) {
        await cargarDatosSupervisor()
      } else {
        await cargarDatosEmpleado()
      }
    } catch (error) {
      setMensaje(error?.message || 'No se pudo registrar la salida.')
      setMensajeGps('GPS o evidencia no registrados.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <header>
        <p>CONTROL OPERATIVO MÓVIL</p>
        <h1>Control de Jornada V4.4</h1>
        <span>GPS, fotografía y acceso individual</span>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Registrar jornada</h2>

          {jornadaAbierta && (
            <div className="open">
              <b>Jornada abierta</b>
              <span>Empleado: {jornadaAbierta.empleado_nombre}</span>
              <span>Ingreso: {jornadaAbierta.hora_ingreso}</span>
              <span>
                {jornadaAbierta.establecimiento} · {jornadaAbierta.lote}
              </span>
              <span>{jornadaAbierta.tarea}</span>
            </div>
          )}

          <label>
            Empleado

            {esSupervisor ? (
              <select
                value={empleadoId}
                onChange={(evento) => {
                  setEmpleadoId(evento.target.value)
                  setMensaje('')
                  setMensajeGps('')
                  setFoto('')
                }}
                disabled={procesando}
              >
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={empleado.legajo}>
                    {empleado.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={
                  empleadoSeleccionado?.nombre || perfil?.nombre || ''
                }
                disabled
                readOnly
              />
            )}
          </label>

          <label>
            Tarea
            <select
              value={tarea}
              onChange={(evento) => setTarea(evento.target.value)}
              disabled={procesando || Boolean(jornadaAbierta)}
            >
              {tareas.map((item) => (
                <option key={item.id} value={item.nombre}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Establecimiento
            <select
              value={establecimientoId}
              onChange={(evento) =>
                setEstablecimientoId(evento.target.value)
              }
              disabled={procesando || Boolean(jornadaAbierta)}
            >
              {establecimientos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Lote
            <select
              value={loteId}
              onChange={(evento) => setLoteId(evento.target.value)}
              disabled={
                procesando ||
                Boolean(jornadaAbierta) ||
                lotesFiltrados.length === 0
              }
            >
              {lotesFiltrados.length === 0 && (
                <option value="">No hay lotes cargados</option>
              )}

              {lotesFiltrados.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="camera">
            <Camera size={20} />
            {foto
              ? 'Foto de validación lista'
              : 'Tomar foto de validación'}

            <input
              hidden
              type="file"
              accept="image/*"
              capture="user"
              onChange={(evento) => {
                const archivo = evento.target.files?.[0]
                if (!archivo) return

                const lector = new FileReader()
                lector.onload = () => setFoto(lector.result)
                lector.readAsDataURL(archivo)
              }}
            />
          </label>

          {foto && (
            <img
              className="preview"
              src={foto}
              alt="Vista previa de validación"
            />
          )}

          <div className="info">
            <MapPin size={18} />
            El GPS se obtiene automáticamente al registrar ingreso o salida.
          </div>

          <div className="actions">
            <button
              type="button"
              onClick={registrarIngreso}
              disabled={
                procesando || Boolean(jornadaAbierta) || !loteId
              }
            >
              <LogIn size={18} />
              {procesando && !jornadaAbierta
                ? 'Procesando...'
                : 'Ingreso'}
            </button>

            <button
              type="button"
              className="danger"
              onClick={registrarSalida}
              disabled={procesando || !jornadaAbierta}
            >
              <LogOut size={18} />
              {procesando && jornadaAbierta
                ? 'Procesando...'
                : 'Salida'}
            </button>
          </div>

          {mensaje && <div className="message">{mensaje}</div>}

          {mensajeGps && (
            <div className="gps">
              <ShieldCheck size={18} />
              {mensajeGps}
            </div>
          )}
        </section>

        <section className="card">
          <h2>{esSupervisor ? 'Marcaciones' : 'Mis marcaciones'}</h2>

          {marcaciones.length === 0 && (
            <p>No existen marcaciones disponibles.</p>
          )}

          <div className="list">
            {marcaciones.map((marcacion) => (
              <article key={marcacion.id}>
                <b>{marcacion.empleado_nombre}</b>
                <span>
                  {marcacion.fecha} · {marcacion.hora_ingreso} a{' '}
                  {marcacion.hora_salida || 'Pendiente'}
                </span>
                <span>
                  {marcacion.establecimiento} · {marcacion.lote}
                </span>
                <small>{marcacion.tarea}</small>
                <small>
                  GPS ingreso:{' '}
                  {marcacion.lat_ingreso ? 'Registrado' : 'No registrado'}
                </small>
                <small>
                  Foto ingreso:{' '}
                  {marcacion.foto_ingreso ? 'Registrada' : 'No registrada'}
                </small>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

export default Jornada
