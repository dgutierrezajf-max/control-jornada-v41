import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  Download,
  RefreshCw,
  Users,
  Clock3,
  TrendingUp,
  Building2,
  ClipboardList,
} from 'lucide-react'
import { supabase } from '../services/supabase'

const pad = (value) => String(value).padStart(2, '0')

function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`
}

function inicioQuincena() {
  const hoy = new Date()
  const dia = hoy.getDate() <= 15 ? 1 : 16
  return fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), dia))
}

function finQuincena() {
  const hoy = new Date()
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const dia = hoy.getDate() <= 15 ? 15 : ultimoDia
  return fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), dia))
}

function minutosEntre(inicio, fin) {
  if (!inicio || !fin) return 0

  const [horaInicio, minutoInicio] = inicio.split(':').map(Number)
  const [horaFin, minutoFin] = fin.split(':').map(Number)

  return Math.max(
    0,
    horaFin * 60 + minutoFin - (horaInicio * 60 + minutoInicio)
  )
}

function horasDecimales(minutos) {
  return Number((minutos / 60).toFixed(2))
}

function formatoHoras(minutos) {
  const horas = Math.floor(minutos / 60)
  const resto = Math.round(minutos % 60)
  return `${horas} h ${pad(resto)} min`
}

function sumarPor(cadena, clave, minutos) {
  if (!clave) return
  cadena[clave] = (cadena[clave] || 0) + minutos
}

function Supervisor() {
  const [fechaDesde, setFechaDesde] = useState(inicioQuincena())
  const [fechaHasta, setFechaHasta] = useState(finQuincena())
  const [empleadoFiltro, setEmpleadoFiltro] = useState('todos')
  const [establecimientoFiltro, setEstablecimientoFiltro] = useState('todos')
  const [marcaciones, setMarcaciones] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarInforme()
  }, [])

  async function cargarInforme() {
    if (!fechaDesde || !fechaHasta) {
      setMensaje('Seleccione las fechas desde y hasta.')
      return
    }

    if (fechaDesde > fechaHasta) {
      setMensaje('La fecha desde no puede ser posterior a la fecha hasta.')
      return
    }

    setCargando(true)
    setMensaje('Cargando informe...')

    const [resultadoMarcaciones, resultadoEmpleados] = await Promise.all([
      supabase
        .from('marcaciones')
        .select('*')
        .gte('fecha', fechaDesde)
        .lte('fecha', fechaHasta)
        .order('fecha', { ascending: true })
        .order('empleado_nombre', { ascending: true }),
      supabase
        .from('empleados')
        .select('*')
        .eq('activo', true)
        .order('nombre'),
    ])

    if (resultadoMarcaciones.error) {
      setMensaje(resultadoMarcaciones.error.message)
      setCargando(false)
      return
    }

    if (resultadoEmpleados.error) {
      setMensaje(resultadoEmpleados.error.message)
      setCargando(false)
      return
    }

    setMarcaciones(resultadoMarcaciones.data || [])
    setEmpleados(resultadoEmpleados.data || [])
    setMensaje('')
    setCargando(false)
  }

  const establecimientos = useMemo(() => {
    return [...new Set(marcaciones.map((item) => item.establecimiento).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
  }, [marcaciones])

  const registrosFiltrados = useMemo(() => {
    return marcaciones.filter((item) => {
      const cumpleEmpleado =
        empleadoFiltro === 'todos' || item.empleado_id === empleadoFiltro
      const cumpleEstablecimiento =
        establecimientoFiltro === 'todos' ||
        item.establecimiento === establecimientoFiltro
      return cumpleEmpleado && cumpleEstablecimiento
    })
  }, [marcaciones, empleadoFiltro, establecimientoFiltro])

  const analisis = useMemo(() => {
    const porEmpleado = {}
    const porEstablecimiento = {}
    const porTarea = {}
    const diasConIngreso = new Set()
    let minutosTotales = 0
    let minutosExtra = 0
    let abiertas = 0

    registrosFiltrados.forEach((item) => {
      const minutos = minutosEntre(item.hora_ingreso, item.hora_salida)
      const extra = Math.max(0, minutos - 480)
      minutosTotales += minutos
      minutosExtra += extra
      if (!item.hora_salida) abiertas += 1
      if (item.empleado_id && item.fecha) {
        diasConIngreso.add(`${item.empleado_id}-${item.fecha}`)
      }

      if (!porEmpleado[item.empleado_id]) {
        porEmpleado[item.empleado_id] = {
          legajo: item.empleado_id,
          empleado: item.empleado_nombre,
          minutos: 0,
          extra: 0,
          jornadas: 0,
          abiertas: 0,
        }
      }

      porEmpleado[item.empleado_id].minutos += minutos
      porEmpleado[item.empleado_id].extra += extra
      porEmpleado[item.empleado_id].jornadas += 1
      if (!item.hora_salida) porEmpleado[item.empleado_id].abiertas += 1

      sumarPor(porEstablecimiento, item.establecimiento, minutos)
      sumarPor(porTarea, item.tarea, minutos)
    })

    const resumenEmpleados = Object.values(porEmpleado).sort(
      (a, b) => b.minutos - a.minutos
    )

    const resumenEstablecimientos = Object.entries(porEstablecimiento)
      .map(([nombre, minutos]) => ({ nombre, minutos }))
      .sort((a, b) => b.minutos - a.minutos)

    const resumenTareas = Object.entries(porTarea)
      .map(([nombre, minutos]) => ({ nombre, minutos }))
      .sort((a, b) => b.minutos - a.minutos)

    const empleadosConIngreso = new Set(
      registrosFiltrados.map((item) => item.empleado_id)
    ).size

    const cantidadEmpleadosBase =
      empleadoFiltro === 'todos' ? empleados.length : 1

    const presentismo =
      cantidadEmpleadosBase > 0
        ? (empleadosConIngreso / cantidadEmpleadosBase) * 100
        : 0

    return {
      minutosTotales,
      minutosExtra,
      abiertas,
      empleadosConIngreso,
      presentismo,
      promedio:
        empleadosConIngreso > 0 ? minutosTotales / empleadosConIngreso : 0,
      resumenEmpleados,
      resumenEstablecimientos,
      resumenTareas,
      diasConIngreso: diasConIngreso.size,
    }
  }, [registrosFiltrados, empleados.length, empleadoFiltro])

  const maxEstablecimiento = Math.max(
    1,
    ...analisis.resumenEstablecimientos.map((item) => item.minutos)
  )

  const maxTarea = Math.max(
    1,
    ...analisis.resumenTareas.map((item) => item.minutos)
  )

  async function descargarExcelDashboard() {
    if (registrosFiltrados.length === 0) {
      setMensaje('No existen datos para exportar en el rango seleccionado.')
      return
    }

    setMensaje('Generando Excel profesional...')

    try {
      const ExcelJS = await import('exceljs')
      const libro = new ExcelJS.Workbook()
      libro.creator = 'Control de Jornada'
      libro.created = new Date()

      const colorAzul = '0F172A'
      const colorVerde = '059669'
      const colorClaro = 'E2E8F0'
      const colorRojo = 'DC2626'
      const colorBlanco = 'FFFFFF'

      const aplicarTitulo = (celda, texto) => {
        celda.value = texto
        celda.font = { bold: true, size: 18, color: { argb: colorBlanco } }
        celda.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colorAzul },
        }
        celda.alignment = { vertical: 'middle', horizontal: 'left' }
      }

      const aplicarEncabezado = (fila) => {
        fila.font = { bold: true, color: { argb: colorBlanco } }
        fila.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colorVerde },
        }
        fila.alignment = { vertical: 'middle', horizontal: 'center' }
      }

      const dashboard = libro.addWorksheet('Dashboard', {
        views: [{ showGridLines: false }],
      })
      dashboard.mergeCells('A1:H2')
      aplicarTitulo(dashboard.getCell('A1'), 'DASHBOARD DE JORNADAS')
      dashboard.getCell('A3').value = 'Período'
      dashboard.getCell('B3').value = `${fechaDesde} al ${fechaHasta}`
      dashboard.getCell('A4').value = 'Empleado'
      dashboard.getCell('B4').value =
        empleadoFiltro === 'todos'
          ? 'Todos'
          : empleados.find((item) => item.legajo === empleadoFiltro)?.nombre ||
            empleadoFiltro
      dashboard.getCell('D4').value = 'Establecimiento'
      dashboard.getCell('E4').value =
        establecimientoFiltro === 'todos'
          ? 'Todos'
          : establecimientoFiltro

      const kpis = [
        ['Total horas', horasDecimales(analisis.minutosTotales)],
        ['Horas extra', horasDecimales(analisis.minutosExtra)],
        ['Empleados con ingreso', analisis.empleadosConIngreso],
        ['Jornadas abiertas', analisis.abiertas],
        ['Promedio por empleado', horasDecimales(analisis.promedio)],
        ['Presentismo %', Number(analisis.presentismo.toFixed(2))],
      ]

      const posiciones = ['A6', 'C6', 'E6', 'A9', 'C9', 'E9']
      kpis.forEach(([nombre, valor], indice) => {
        const inicio = posiciones[indice]
        const columna = inicio[0]
        const fila = Number(inicio.slice(1))
        dashboard.mergeCells(`${columna}${fila}:${String.fromCharCode(columna.charCodeAt(0) + 1)}${fila}`)
        dashboard.mergeCells(`${columna}${fila + 1}:${String.fromCharCode(columna.charCodeAt(0) + 1)}${fila + 2}`)
        const titulo = dashboard.getCell(`${columna}${fila}`)
        titulo.value = nombre
        titulo.font = { bold: true, color: { argb: colorAzul } }
        titulo.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colorClaro },
        }
        titulo.alignment = { horizontal: 'center' }
        const dato = dashboard.getCell(`${columna}${fila + 1}`)
        dato.value = valor
        dato.font = { bold: true, size: 24, color: { argb: colorVerde } }
        dato.alignment = { horizontal: 'center', vertical: 'middle' }
        dato.border = {
          bottom: { style: 'medium', color: { argb: colorVerde } },
        }
      })

      dashboard.getCell('A13').value = 'Ranking de empleados'
      dashboard.getCell('A13').font = { bold: true, size: 14 }
      dashboard.addRow([])
      const encabezadoRanking = dashboard.addRow([
        'Posición',
        'Legajo',
        'Empleado',
        'Jornadas',
        'Horas',
        'Horas extra',
        'Abiertas',
      ])
      aplicarEncabezado(encabezadoRanking)
      analisis.resumenEmpleados.forEach((item, indice) => {
        dashboard.addRow([
          indice + 1,
          item.legajo,
          item.empleado,
          item.jornadas,
          horasDecimales(item.minutos),
          horasDecimales(item.extra),
          item.abiertas,
        ])
      })

      dashboard.columns = [
        { width: 14 },
        { width: 14 },
        { width: 28 },
        { width: 14 },
        { width: 14 },
        { width: 16 },
        { width: 14 },
        { width: 14 },
      ]
      dashboard.freezePanes = { ySplit: 14 }

      const resumen = libro.addWorksheet('Resumen por empleado', {
        views: [{ state: 'frozen', ySplit: 1 }],
      })
      const encabezadoResumen = resumen.addRow([
        'Legajo',
        'Empleado',
        'Jornadas',
        'Horas trabajadas',
        'Horas extra',
        'Jornadas abiertas',
        'Promedio diario',
      ])
      aplicarEncabezado(encabezadoResumen)
      analisis.resumenEmpleados.forEach((item) => {
        resumen.addRow([
          item.legajo,
          item.empleado,
          item.jornadas,
          horasDecimales(item.minutos),
          horasDecimales(item.extra),
          item.abiertas,
          item.jornadas > 0
            ? Number((item.minutos / 60 / item.jornadas).toFixed(2))
            : 0,
        ])
      })
      resumen.columns = [
        { width: 14 },
        { width: 30 },
        { width: 14 },
        { width: 20 },
        { width: 16 },
        { width: 18 },
        { width: 18 },
      ]
      resumen.autoFilter = { from: 'A1', to: 'G1' }

      const distribucion = libro.addWorksheet('Distribución', {
        views: [{ showGridLines: false }],
      })
      distribucion.getCell('A1').value = 'Horas por establecimiento'
      distribucion.getCell('A1').font = { bold: true, size: 16 }
      const encabezadoEstablecimiento = distribucion.addRow([
        'Establecimiento',
        'Horas',
        'Participación %',
      ])
      aplicarEncabezado(encabezadoEstablecimiento)
      analisis.resumenEstablecimientos.forEach((item) => {
        distribucion.addRow([
          item.nombre,
          horasDecimales(item.minutos),
          analisis.minutosTotales > 0
            ? Number(((item.minutos / analisis.minutosTotales) * 100).toFixed(2))
            : 0,
        ])
      })

      const inicioTareas = analisis.resumenEstablecimientos.length + 5
      distribucion.getCell(`A${inicioTareas}`).value = 'Horas por tarea'
      distribucion.getCell(`A${inicioTareas}`).font = {
        bold: true,
        size: 16,
      }
      const encabezadoTarea = distribucion.getRow(inicioTareas + 1)
      encabezadoTarea.values = ['Tarea', 'Horas', 'Participación %']
      aplicarEncabezado(encabezadoTarea)
      analisis.resumenTareas.forEach((item) => {
        distribucion.addRow([
          item.nombre,
          horasDecimales(item.minutos),
          analisis.minutosTotales > 0
            ? Number(((item.minutos / analisis.minutosTotales) * 100).toFixed(2))
            : 0,
        ])
      })
      distribucion.columns = [
        { width: 34 },
        { width: 16 },
        { width: 18 },
      ]

      const detalle = libro.addWorksheet('Detalle', {
        views: [{ state: 'frozen', ySplit: 1 }],
      })
      const encabezadoDetalle = detalle.addRow([
        'Fecha',
        'Legajo',
        'Empleado',
        'Ingreso',
        'Salida',
        'Horas',
        'Horas extra',
        'Estado',
        'Tarea',
        'Establecimiento',
        'Lote',
        'Latitud ingreso',
        'Longitud ingreso',
        'Precisión ingreso',
        'Latitud salida',
        'Longitud salida',
        'Precisión salida',
        'Foto ingreso',
        'Foto salida',
      ])
      aplicarEncabezado(encabezadoDetalle)

      registrosFiltrados.forEach((item) => {
        const minutos = minutosEntre(item.hora_ingreso, item.hora_salida)
        detalle.addRow([
          item.fecha,
          item.empleado_id,
          item.empleado_nombre,
          item.hora_ingreso,
          item.hora_salida || '',
          horasDecimales(minutos),
          horasDecimales(Math.max(0, minutos - 480)),
          item.hora_salida ? 'Finalizada' : 'Abierta',
          item.tarea,
          item.establecimiento,
          item.lote,
          item.lat_ingreso,
          item.lng_ingreso,
          item.precision_ingreso,
          item.lat_salida,
          item.lng_salida,
          item.precision_salida,
          item.foto_ingreso,
          item.foto_salida,
        ])
      })

      detalle.columns = [
        { width: 13 },
        { width: 12 },
        { width: 28 },
        { width: 11 },
        { width: 11 },
        { width: 12 },
        { width: 14 },
        { width: 13 },
        { width: 28 },
        { width: 28 },
        { width: 24 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 40 },
        { width: 40 },
      ]
      detalle.autoFilter = { from: 'A1', to: 'S1' }

      detalle.eachRow((fila, numero) => {
        if (numero === 1) return
        const estado = fila.getCell(8)
        if (estado.value === 'Abierta') {
          estado.font = { bold: true, color: { argb: colorRojo } }
        }
      })

      const buffer = await libro.xlsx.writeBuffer()
      const archivo = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `dashboard-jornadas-${fechaDesde}-a-${fechaHasta}.xlsx`
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
      setMensaje('Excel profesional descargado correctamente.')
    } catch (error) {
      setMensaje(
        error?.message || 'No se pudo generar el archivo Excel.'
      )
    }
  }

  return (
    <>
      <header>
        <p>SUPERVISIÓN</p>
        <h1>Dashboard de jornadas</h1>
        <span>
          Horas, presentismo, tareas, establecimientos y exportación ejecutiva
        </span>
      </header>

      <main className="dashboard">
        <section className="panel-filtros">
          <div className="campo-filtro">
            <label>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(evento) => setFechaDesde(evento.target.value)}
            />
          </div>

          <div className="campo-filtro">
            <label>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(evento) => setFechaHasta(evento.target.value)}
            />
          </div>

          <div className="campo-filtro">
            <label>Empleado</label>
            <select
              value={empleadoFiltro}
              onChange={(evento) => setEmpleadoFiltro(evento.target.value)}
            >
              <option value="todos">Todos</option>
              {empleados.map((item) => (
                <option key={item.id} value={item.legajo}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="campo-filtro">
            <label>Establecimiento</label>
            <select
              value={establecimientoFiltro}
              onChange={(evento) =>
                setEstablecimientoFiltro(evento.target.value)
              }
            >
              <option value="todos">Todos</option>
              {establecimientos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="boton-filtro"
            onClick={cargarInforme}
            disabled={cargando}
          >
            <RefreshCw size={18} />
            {cargando ? 'Actualizando...' : 'Actualizar informe'}
          </button>

          <button
            type="button"
            className="boton-excel"
            onClick={descargarExcelDashboard}
            disabled={cargando}
          >
            <Download size={18} />
            Descargar Excel profesional
          </button>
        </section>

        {mensaje && <div className="message">{mensaje}</div>}

        <section className="kpi-grid">
          <article className="kpi-card">
            <Clock3 size={24} />
            <span>Total trabajado</span>
            <strong>{formatoHoras(analisis.minutosTotales)}</strong>
          </article>

          <article className="kpi-card">
            <TrendingUp size={24} />
            <span>Horas extra</span>
            <strong>{formatoHoras(analisis.minutosExtra)}</strong>
          </article>

          <article className="kpi-card">
            <Users size={24} />
            <span>Empleados con ingreso</span>
            <strong>{analisis.empleadosConIngreso}</strong>
          </article>

          <article className="kpi-card">
            <BarChart3 size={24} />
            <span>Promedio por empleado</span>
            <strong>{horasDecimales(analisis.promedio)} h</strong>
          </article>

          <article className="kpi-card">
            <CalendarRange size={24} />
            <span>Presentismo del período</span>
            <strong>{analisis.presentismo.toFixed(1)}%</strong>
          </article>

          <article className="kpi-card alerta-kpi">
            <AlertTriangle size={24} />
            <span>Jornadas abiertas</span>
            <strong>{analisis.abiertas}</strong>
          </article>
        </section>

        <section className="dashboard-doble">
          <article className="card panel-ranking">
            <h2>Ranking por empleado</h2>
            <div className="tabla-responsive">
              <table className="tabla-dashboard">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Empleado</th>
                    <th>Jornadas</th>
                    <th>Horas</th>
                    <th>Extra</th>
                  </tr>
                </thead>
                <tbody>
                  {analisis.resumenEmpleados.map((item, indice) => (
                    <tr key={item.legajo}>
                      <td>{indice + 1}</td>
                      <td>
                        <strong>{item.empleado}</strong>
                        <small>{item.legajo}</small>
                      </td>
                      <td>{item.jornadas}</td>
                      <td>{horasDecimales(item.minutos)}</td>
                      <td>{horasDecimales(item.extra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card">
            <h2>Horas por establecimiento</h2>
            <div className="barras-dashboard">
              {analisis.resumenEstablecimientos.map((item) => (
                <div className="barra-item" key={item.nombre}>
                  <div className="barra-etiqueta">
                    <span>{item.nombre}</span>
                    <strong>{horasDecimales(item.minutos)} h</strong>
                  </div>
                  <div className="barra-fondo">
                    <div
                      className="barra-valor"
                      style={{
                        width: `${Math.max(
                          4,
                          (item.minutos / maxEstablecimiento) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="dashboard-doble">
          <article className="card">
            <h2>Horas por tarea</h2>
            <div className="barras-dashboard tareas">
              {analisis.resumenTareas.map((item) => (
                <div className="barra-item" key={item.nombre}>
                  <div className="barra-etiqueta">
                    <span>{item.nombre}</span>
                    <strong>{horasDecimales(item.minutos)} h</strong>
                  </div>
                  <div className="barra-fondo">
                    <div
                      className="barra-valor barra-azul"
                      style={{
                        width: `${Math.max(
                          4,
                          (item.minutos / maxTarea) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <h2>Resumen del período</h2>
            <div className="resumen-periodo">
              <p>
                <span>Desde</span>
                <strong>{fechaDesde}</strong>
              </p>
              <p>
                <span>Hasta</span>
                <strong>{fechaHasta}</strong>
              </p>
              <p>
                <span>Registros analizados</span>
                <strong>{registrosFiltrados.length}</strong>
              </p>
              <p>
                <span>Jornadas completas</span>
                <strong>
                  {registrosFiltrados.filter((item) => item.hora_salida).length}
                </strong>
              </p>
              <p>
                <span>Días-empleado con ingreso</span>
                <strong>{analisis.diasConIngreso}</strong>
              </p>
            </div>
          </article>
        </section>

        <section className="card detalle-dashboard">
          <h2>Detalle de jornadas</h2>
          <div className="tabla-responsive">
            <table className="tabla-dashboard detalle">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empleado</th>
                  <th>Ingreso</th>
                  <th>Salida</th>
                  <th>Horas</th>
                  <th>Extra</th>
                  <th>Establecimiento</th>
                  <th>Tarea</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((item) => {
                  const minutos = minutosEntre(
                    item.hora_ingreso,
                    item.hora_salida
                  )
                  return (
                    <tr key={item.id}>
                      <td>{item.fecha}</td>
                      <td>{item.empleado_nombre}</td>
                      <td>{item.hora_ingreso}</td>
                      <td>{item.hora_salida || 'Pendiente'}</td>
                      <td>{horasDecimales(minutos)}</td>
                      <td>{horasDecimales(Math.max(0, minutos - 480))}</td>
                      <td>{item.establecimiento}</td>
                      <td>{item.tarea}</td>
                      <td>
                        <span
                          className={
                            item.hora_salida
                              ? 'estado-ok'
                              : 'estado-pendiente'
                          }
                        >
                          {item.hora_salida ? 'Finalizada' : 'Abierta'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  )
}

export default Supervisor
