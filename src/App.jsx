import { useEffect, useState } from 'react'
import { supabase } from './services/supabase'
import './App.css'

function App() {
  const [empleados, setEmpleados] = useState([])
  const [empleadoId, setEmpleadoId] = useState('')

  useEffect(() => {
    cargarEmpleados()
  }, [])

  async function cargarEmpleados() {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.log(error)
      return
    }

    setEmpleados(data)

    if (data.length > 0) {
      setEmpleadoId(data[0].legajo)
    }
  }

  return (
    <main className="app">
      <header className="encabezado">
        <p>CONTROL OPERATIVO MÓVIL</p>
        <h1>Control de Jornada V4.2</h1>
      </header>

      <section className="contenido">
        <div className="tarjeta">
          <h2>Prueba de empleados desde Supabase</h2>

          <label>
            Empleado

            <select
              value={empleadoId}
              onChange={(e) =>
                setEmpleadoId(e.target.value)
              }
            >
              {empleados.map((empleado) => (
                <option
                  key={empleado.id}
                  value={empleado.legajo}
                >
                  {empleado.nombre}
                </option>
              ))}
            </select>
          </label>

          <p>
            Total empleados: {empleados.length}
          </p>
        </div>
      </section>
    </main>
  )
}

export default App