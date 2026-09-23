import { useEffect, useState } from 'react'
import { Camera, Pencil, Power } from 'lucide-react'
import { supabase } from '../services/supabase'

async function convertirFotoEnArchivo(imagenBase64) {
  const respuesta = await fetch(imagenBase64)
  return await respuesta.blob()
}

function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [formulario, setFormulario] = useState({
    id: null,
    legajo: '',
    nombre: '',
    pin: '',
    foto: '',
    foto_url: null,
  })
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    cargarEmpleados()
  }, [])

  async function cargarEmpleados() {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .order('nombre')

    if (error) {
      setMensaje('No se pudieron cargar los empleados: ' + error.message)
      return
    }

    setEmpleados(data || [])
  }

  async function subirFoto(legajo) {
    if (!formulario.foto || !formulario.foto.startsWith('data:')) {
      return formulario.foto_url || null
    }

    const archivo = await convertirFotoEnArchivo(formulario.foto)
    const ruta = `empleados/${legajo}-${Date.now()}.jpg`

    const { error } = await supabase.storage
      .from('evidencias')
      .upload(ruta, archivo, {
        contentType: archivo.type || 'image/jpeg',
        upsert: false,
      })

    if (error) throw error
    return ruta
  }

  async function guardarEmpleado() {
    const legajo = formulario.legajo.trim().toUpperCase()
    const nombre = formulario.nombre.trim()
    const pin = formulario.pin.trim()

    if (!legajo || !nombre) {
      setMensaje('Complete el legajo y el nombre.')
      return
    }

    if (!formulario.id && !/^[0-9]{6}$/.test(pin)) {
      setMensaje('El PIN debe tener exactamente 6 numeros.')
      return
    }

    if (formulario.id && pin && !/^[0-9]{6}$/.test(pin)) {
      setMensaje('El nuevo PIN debe tener exactamente 6 numeros.')
      return
    }

    setProcesando(true)
    setMensaje(formulario.id ? 'Actualizando empleado...' : 'Creando empleado y acceso...')

    try {
      const fotoUrl = await subirFoto(legajo)
      const { data, error } = await supabase.functions.invoke('hyper-action', {
        body: {
          empleado_id: formulario.id,
          legajo,
          nombre,
          pin,
          foto_url: fotoUrl,
        },
      })

      if (error) throw error
      if (!data?.correcto) throw new Error(data?.error || 'No se pudo guardar el empleado.')

      setFormulario({
        id: null,
        legajo: '',
        nombre: '',
        pin: '',
        foto: '',
        foto_url: null,
      })
      setMensaje(data.mensaje || 'Empleado guardado correctamente.')
      await cargarEmpleados()
    } catch (error) {
      setMensaje(error?.message || 'No se pudo guardar el empleado.')
    } finally {
      setProcesando(false)
    }
  }

  async function cambiarEstado(empleado) {
    const nuevoEstado = !empleado.activo
    const { error } = await supabase
      .from('empleados')
      .update({ activo: nuevoEstado })
      .eq('id', empleado.id)

    if (error) {
      setMensaje('No se pudo cambiar el estado: ' + error.message)
      return
    }

    setMensaje(nuevoEstado ? 'Empleado activado correctamente.' : 'Empleado desactivado correctamente.')
    await cargarEmpleados()
  }

  function editarEmpleado(empleado) {
    setFormulario({
      id: empleado.id,
      legajo: empleado.legajo,
      nombre: empleado.nombre,
      pin: '',
      foto: '',
      foto_url: empleado.foto_url || null,
    })
    setMensaje('Deje el PIN vacio para conservar el PIN actual.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() {
    setFormulario({
      id: null,
      legajo: '',
      nombre: '',
      pin: '',
      foto: '',
      foto_url: null,
    })
    setMensaje('')
  }

  const empleadosFiltrados = empleados.filter((empleado) => {
    const texto = busqueda.trim().toLowerCase()
    return (
      !texto ||
      empleado.nombre.toLowerCase().includes(texto) ||
      empleado.legajo.toLowerCase().includes(texto)
    )
  })

  const activos = empleados.filter((empleado) => empleado.activo).length
  const inactivos = empleados.filter((empleado) => !empleado.activo).length

  return (
    <>
      <header>
        <p>AJUSTES</p>
        <h1>Empleados</h1>
        <span>Alta, edicion, fotografia, PIN y estado</span>
      </header>

      <main className="grid">
        <section className="card">
          <h2>{formulario.id ? 'Editar empleado' : 'Nuevo empleado'}</h2>

          <label>
            Legajo
            <input
              type="text"
              placeholder="Ejemplo: 005"
              value={formulario.legajo}
              onChange={(evento) =>
                setFormulario({ ...formulario, legajo: evento.target.value })
              }
              disabled={procesando}
            />
          </label>

          <label>
            Nombre y apellido
            <input
              type="text"
              placeholder="Nombre completo"
              value={formulario.nombre}
              onChange={(evento) =>
                setFormulario({ ...formulario, nombre: evento.target.value })
              }
              disabled={procesando}
            />
          </label>

          <label>
            {formulario.id ? 'Nuevo PIN, opcional' : 'PIN de acceso'}
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="new-password"
              placeholder={formulario.id ? 'Vacio para conservar' : '6 numeros'}
              value={formulario.pin}
              onChange={(evento) => {
                const valor = evento.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                setFormulario({ ...formulario, pin: valor })
              }}
              disabled={procesando}
            />
          </label>

          <p className="ayuda-pin">
            El PIN debe tener exactamente seis numeros. No se mostrara despues de guardarlo.
          </p>

          <label className="camera">
            <Camera size={20} />
            {formulario.foto ? 'Foto lista' : 'Cargar foto del empleado'}
            <input
              hidden
              type="file"
              accept="image/*"
              capture="user"
              onChange={(evento) => {
                const archivo = evento.target.files?.[0]
                if (!archivo) return
                const lector = new FileReader()
                lector.onload = () =>
                  setFormulario({ ...formulario, foto: lector.result })
                lector.readAsDataURL(archivo)
              }}
            />
          </label>

          {formulario.foto && (
            <img
              className="preview"
              src={formulario.foto}
              alt="Vista previa del empleado"
            />
          )}

          <button type="button" onClick={guardarEmpleado} disabled={procesando}>
            {procesando
              ? 'Guardando...'
              : formulario.id
                ? 'Guardar cambios'
                : 'Crear empleado y acceso'}
          </button>

          {formulario.id && (
            <button
              type="button"
              className="secondary"
              onClick={cancelarEdicion}
              disabled={procesando}
            >
              Cancelar edicion
            </button>
          )}

          {mensaje && <div className="message">{mensaje}</div>}
        </section>

        <section className="card">
          <h2>Empleados registrados</h2>

          <input
            type="search"
            placeholder="Buscar por nombre o legajo"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />

          <div className="stats">
            <span>Total: {empleados.length}</span>
            <span>Activos: {activos}</span>
            <span>Inactivos: {inactivos}</span>
          </div>

          <div className="list">
            {empleadosFiltrados.map((empleado) => (
              <article key={empleado.id}>
                <b>{empleado.nombre}</b>
                <span>Legajo: {empleado.legajo}</span>
                <span>Estado: {empleado.activo ? 'Activo' : 'Inactivo'}</span>

                <div className="row">
                  <button
                    type="button"
                    className="small"
                    onClick={() => editarEmpleado(empleado)}
                  >
                    <Pencil size={16} />
                    Editar
                  </button>

                  <button
                    type="button"
                    className={empleado.activo ? 'small danger' : 'small'}
                    onClick={() => cambiarEstado(empleado)}
                  >
                    <Power size={16} />
                    {empleado.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </article>
            ))}

            {empleadosFiltrados.length === 0 && (
              <p>No se encontraron empleados.</p>
            )}
          </div>
        </section>
      </main>
    </>
  )
}

export default Empleados
