import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [legajo, setLegajo] = useState('')
  const [nombre, setNombre] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarEmpleados()
  }, [])

  async function cargarEmpleados() {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .order('nombre')

    if (error) {
      setMensaje(
        'No se pudieron cargar los empleados: ' +
          error.message
      )
      return
    }

    setEmpleados(data || [])
  }

  async function guardarEmpleado() {
    const legajoLimpio = legajo
      .trim()
      .toUpperCase()

    const nombreLimpio = nombre.trim()

    if (!legajoLimpio || !nombreLimpio) {
      setMensaje(
        'Complete el legajo y el nombre.'
      )
      return
    }

    setGuardando(true)
    setMensaje('Guardando empleado...')

    const { error } = await supabase
      .from('empleados')
      .insert([
        {
          legajo: legajoLimpio,
          nombre: nombreLimpio,
          activo: true,
        },
      ])

    if (error) {
      if (
        error.code === '23505' ||
        error.message
          .toLowerCase()
          .includes('duplicate')
      ) {
        setMensaje(
          'El legajo ya existe. Ingrese uno diferente.'
        )
      } else {
        setMensaje(
          'No se pudo guardar: ' +
            error.message
        )
      }

      setGuardando(false)
      return
    }

    setLegajo('')
    setNombre('')
    setMensaje(
      'Empleado guardado correctamente.'
    )

    await cargarEmpleados()
    setGuardando(false)
  }

  async function cambiarEstado(empleado) {
    const nuevoEstado = !empleado.activo

    const { error } = await supabase
      .from('empleados')
      .update({
        activo: nuevoEstado,
      })
      .eq('id', empleado.id)

    if (error) {
      setMensaje(
        'No se pudo cambiar el estado: ' +
          error.message
      )
      return
    }

    setMensaje(
      nuevoEstado
        ? 'Empleado activado correctamente.'
        : 'Empleado desactivado correctamente.'
    )

    await cargarEmpleados()
  }

  const empleadosFiltrados = empleados.filter(
    empleado => {
      const texto = busqueda
        .trim()
        .toLowerCase()

      if (!texto) {
        return true
      }

      return (
        empleado.nombre
          .toLowerCase()
          .includes(texto) ||
        empleado.legajo
          .toLowerCase()
          .includes(texto)
      )
    }
  )

  const totalActivos = empleados.filter(
    empleado => empleado.activo
  ).length

  const totalInactivos = empleados.filter(
    empleado => !empleado.activo
  ).length

  return (
    <main className="app">
      <header className="encabezado">
        <p>CONFIGURACIÓN</p>
        <h1>Administración de empleados</h1>
        <span>
          Alta, búsqueda y control de estado
        </span>
      </header>

      <section className="contenido">
        <div className="tarjeta">
          <h2>Nuevo empleado</h2>

          <label>
            Legajo

            <input
              type="text"
              placeholder="Ejemplo: E004"
              value={legajo}
              onChange={evento =>
                setLegajo(evento.target.value)
              }
              disabled={guardando}
            />
          </label>

          <label>
            Nombre y apellido

            <input
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={evento =>
                setNombre(evento.target.value)
              }
              disabled={guardando}
            />
          </label>

          <button
            type="button"
            onClick={guardarEmpleado}
            disabled={guardando}
          >
            {guardando
              ? 'Guardando...'
              : 'Guardar empleado'}
          </button>

          {mensaje && (
            <div className="mensaje">
              {mensaje}
            </div>
          )}
        </div>

        <div className="tarjeta">
          <h2>Empleados registrados</h2>

          <input
            type="search"
            placeholder="Buscar por nombre o legajo"
            value={busqueda}
            onChange={evento =>
              setBusqueda(evento.target.value)
            }
          />

          <div className="resumen-empleados">
            <span>
              Total: {empleados.length}
            </span>

            <span>
              Activos: {totalActivos}
            </span>

            <span>
              Inactivos: {totalInactivos}
            </span>
          </div>

          <div className="lista">
            {empleadosFiltrados.map(
              empleado => (
                <article
                  key={empleado.id}
                  className="registro"
                >
                  <strong>
                    {empleado.nombre}
                  </strong>

                  <span>
                    Legajo: {empleado.legajo}
                  </span>

                  <span>
                    Estado:{' '}
                    {empleado.activo
                      ? 'Activo'
                      : 'Inactivo'}
                  </span>

                  <button
                    type="button"
                    className={
                      empleado.activo
                        ? 'boton-desactivar'
                        : 'boton-activar'
                    }
                    onClick={() =>
                      cambiarEstado(empleado)
                    }
                  >
                    {empleado.activo
                      ? 'Desactivar empleado'
                      : 'Activar empleado'}
                  </button>
                </article>
              )
            )}

            {empleadosFiltrados.length === 0 && (
              <p className="sin-datos">
                No se encontraron empleados.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Empleados