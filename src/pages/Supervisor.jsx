import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Download,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../services/supabase'

function fechaActual() {
  const fecha = new Date()
  const anio = fecha.getFullYear()
  const mes = String(
    fecha.getMonth() + 1
  ).padStart(2, '0')
  const dia = String(
    fecha.getDate()
  ).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function calcularMinutos(marcacion) {
  if (
    !marcacion.hora_ingreso ||
    !marcacion.hora_salida
  ) {
    return 0
  }

  const [horaIngreso, minutoIngreso] =
    marcacion.hora_ingreso
      .split(':')
      .map(Number)

  const [horaSalida, minutoSalida] =
    marcacion.hora_salida
      .split(':')
      .map(Number)

  return Math.max(
    0,
    horaSalida * 60 +
      minutoSalida -
      (horaIngreso * 60 + minutoIngreso)
  )
}

function Supervisor() {
  const [marcaciones, setMarcaciones] =
    useState([])

  const [empleados, setEmpleados] =
    useState([])

  const [fecha, setFecha] =
    useState(fechaActual())

  const [mensaje, setMensaje] =
    useState('')

  useEffect(() => {
    cargarDatos()
  }, [fecha])

  async function cargarDatos() {
    setMensaje('Cargando información...')

    const resultadoMarcaciones =
      await supabase
        .from('marcaciones')
        .select('*')
        .eq('fecha', fecha)
        .order('id', {
          ascending: false,
        })

    const resultadoEmpleados =
      await supabase
        .from('empleados')
        .select('*')
        .eq('activo', true)
        .order('nombre')

    if (resultadoMarcaciones.error) {
      setMensaje(
        resultadoMarcaciones.error.message
      )
      return
    }

    if (resultadoEmpleados.error) {
      setMensaje(
        resultadoEmpleados.error.message
      )
      return
    }

    setMarcaciones(
      resultadoMarcaciones.data || []
    )

    setEmpleados(
      resultadoEmpleados.data || []
    )

    setMensaje('')
  }

  const ausentes = useMemo(() => {
    return empleados.filter(empleado => {
      return !marcaciones.some(
        marcacion =>
          marcacion.empleado_id ===
          empleado.legajo
      )
    })
  }, [empleados, marcaciones])

  const presentes =
    empleados.length - ausentes.length

  const jornadasAbiertas =
    marcaciones.filter(
      marcacion => !marcacion.hora_salida
    ).length

  const minutosExtras = useMemo(() => {
    return marcaciones.reduce(
      (total, marcacion) => {
        const trabajados =
          calcularMinutos(marcacion)

        return (
          total +
          Math.max(0, trabajados - 480)
        )
      },
      0
    )
  }, [marcaciones])

  function escaparCsv(valor) {
    const texto = String(valor ?? '')

    return (
      '"' +
      texto.replaceAll('"', '""') +
      '"'
    )
  }

  function exportarExcel() {
    const encabezados = [
      'Fecha',
      'Legajo',
      'Empleado',
      'Ingreso',
      'Salida',
      'Horas trabajadas',
      'Horas extra',
      'Tarea',
      'Establecimiento',
      'Lote',
      'Latitud ingreso',
      'Longitud ingreso',
      'Latitud salida',
      'Longitud salida',
      'Foto ingreso',
      'Foto salida',
    ]

    const filas = marcaciones.map(
      marcacion => {
        const minutos =
          calcularMinutos(marcacion)

        const extras =
          Math.max(0, minutos - 480)

        return [
          marcacion.fecha,
          marcacion.empleado_id,
          marcacion.empleado_nombre,
          marcacion.hora_ingreso,
          marcacion.hora_salida || '',
          (minutos / 60).toFixed(2),
          (extras / 60).toFixed(2),
          marcacion.tarea,
          marcacion.establecimiento,
          marcacion.lote,
          marcacion.lat_ingreso,
          marcacion.lng_ingreso,
          marcacion.lat_salida,
          marcacion.lng_salida,
          marcacion.foto_ingreso,
          marcacion.foto_salida,
        ]
      }
    )

    const saltoDeLinea =
      String.fromCharCode(13, 10)

    const contenido = [
      encabezados,
      ...filas,
    ]
      .map(fila =>
        fila
          .map(escaparCsv)
          .join(';')
      )
      .join(saltoDeLinea)

    const archivo = new Blob(
      ['\ufeff' + contenido],
      {
        type: 'text/csv;charset=utf-8',
      }
    )

    const url =
      URL.createObjectURL(archivo)

    const enlace =
      document.createElement('a')

    enlace.href = url
    enlace.download =
      `jornada-${fecha}.csv`

    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()

    URL.revokeObjectURL(url)
  }

  return (
    <>
      <header>
        <p>SUPERVISIÓN</p>

        <h1>Panel diario</h1>

        <span>
          Ausentismo, jornadas y horas extras
        </span>
      </header>

      <main className="dashboard">
        <div className="toolbar">
          <input
            type="date"
            value={fecha}
            onChange={evento =>
              setFecha(evento.target.value)
            }
          />

          <button
            type="button"
            className="small"
            onClick={cargarDatos}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>

          <button
            type="button"
            className="small"
            onClick={exportarExcel}
          >
            <Download size={16} />
            Descargar Excel
          </button>
        </div>

        {mensaje && (
          <div className="message">
            {mensaje}
          </div>
        )}

        <div className="stats big">
          <span>
            Empleados: {empleados.length}
          </span>

          <span>
            Presentes: {presentes}
          </span>

          <span>
            Ausentes: {ausentes.length}
          </span>

          <span>
            Abiertas: {jornadasAbiertas}
          </span>

          <span>
            Horas extra:{' '}
            {(minutosExtras / 60).toFixed(2)}
          </span>
        </div>

        {ausentes.length > 0 && (
          <div className="alert">
            <AlertTriangle size={20} />

            Sin ingreso:{' '}
            {ausentes
              .map(empleado =>
                empleado.nombre
              )
              .join(', ')}
          </div>
        )}

        <section className="card">
          <h2>Detalle de jornadas</h2>

          {marcaciones.length === 0 && (
            <p>
              No existen marcaciones para la
              fecha seleccionada.
            </p>
          )}

          <div className="list">
            {marcaciones.map(marcacion => {
              const minutos =
                calcularMinutos(marcacion)

              const horas =
                minutos / 60

              const horasExtra =
                Math.max(
                  0,
                  minutos - 480
                ) / 60

              return (
                <article key={marcacion.id}>
                  <b>
                    {marcacion.empleado_nombre}
                  </b>

                  <span>
                    Legajo:{' '}
                    {marcacion.empleado_id}
                  </span>

                  <span>
                    {marcacion.hora_ingreso}
                    {' a '}
                    {marcacion.hora_salida ||
                      'Pendiente'}
                  </span>

                  <span>
                    Horas: {horas.toFixed(2)}
                  </span>

                  <span>
                    Horas extra:{' '}
                    {horasExtra.toFixed(2)}
                  </span>

                  <span>
                    {marcacion.establecimiento}
                    {' · '}
                    {marcacion.lote}
                  </span>

                  <small>
                    {marcacion.tarea}
                  </small>

                  <small>
                    GPS ingreso:{' '}
                    {marcacion.lat_ingreso
                      ? 'Registrado'
                      : 'No registrado'}
                  </small>

                  <small>
                    GPS salida:{' '}
                    {marcacion.lat_salida
                      ? 'Registrado'
                      : 'No registrado'}
                  </small>

                  <small>
                    Foto ingreso:{' '}
                    {marcacion.foto_ingreso
                      ? 'Registrada'
                      : 'No registrada'}
                  </small>

                  <small>
                    Foto salida:{' '}
                    {marcacion.foto_salida
                      ? 'Registrada'
                      : 'No registrada'}
                  </small>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </>
  )
}

export default Supervisor