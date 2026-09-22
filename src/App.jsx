import { useState } from 'react'
import Jornada from './pages/Jornada'
import Empleados from './pages/Empleados'
import './App.css'

function App() {
  const [pagina, setPagina] = useState('jornada')

  return (
    <div>
      <nav className="menu-principal">
        <button
          type="button"
          className={
            pagina === 'jornada'
              ? 'menu-activo'
              : 'menu-inactivo'
          }
          onClick={() => setPagina('jornada')}
        >
          Jornada
        </button>

        <button
          type="button"
          className={
            pagina === 'empleados'
              ? 'menu-activo'
              : 'menu-inactivo'
          }
          onClick={() => setPagina('empleados')}
        >
          Empleados
        </button>
      </nav>

      {pagina === 'jornada' && <Jornada />}

      {pagina === 'empleados' && <Empleados />}
    </div>
  )
}

export default App