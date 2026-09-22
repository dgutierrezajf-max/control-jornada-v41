import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function Empleados() {

  const [empleados, setEmpleados] = useState([])

  const [legajo, setLegajo] = useState('')
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    cargarEmpleados()
  }, [])

  async function cargarEmpleados() {

    const { data } = await supabase
      .from('empleados')
      .select('*')
      .order('nombre')

    setEmpleados(data || [])
  }

  async function guardarEmpleado() {

    if (!legajo || !nombre)
      return

    await supabase
      .from('empleados')
      .insert([
        {
          legajo,
          nombre,
          activo: true,
        },
      ])

    setLegajo('')
    setNombre('')

    cargarEmpleados()
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
    alert(
      'No se pudo cambiar el estado: ' +
        error.message
    )
    return
  }

  cargarEmpleados()
}
  return (
    <div className="tarjeta">

      <h2>Empleados</h2>

      <input
        placeholder="Legajo"
        value={legajo}
        onChange={(e) =>
          setLegajo(e.target.value)
        }
      />

      <input
        placeholder="Nombre"
        value={nombre}
        onChange={(e) =>
          setNombre(e.target.value)
        }
      />

      <button
        onClick={guardarEmpleado}
      >
        Guardar empleado
      </button>

      <hr />

      {empleados.map(emp => (

        <div
          key={emp.id}
          className="registro"
        >
          <strong>
            {emp.nombre}
          </strong>

          <div>
            Legajo: {emp.legajo}
          </div>

          <div>
            Estado:
            {' '}
            {emp.activo
              ? 'Activo'
              : 'Inactivo'}
          </div>
<button
  type="button"
  className={
    emp.activo
      ? 'boton-desactivar'
      : 'boton-activar'
  }
  onClick={() =>
    cambiarEstado(emp)
  }
>
  {emp.activo
    ? 'Desactivar empleado'
    : 'Activar empleado'}
</button>
        </div>

      ))}

    </div>
  )
}

export default Empleados    