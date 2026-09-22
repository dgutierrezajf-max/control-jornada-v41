import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import '../App.css'

function Jornada() {
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
  const [estadoGps, setEstadoGps] = useState('')
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

    const loteActualExiste = filtrados.some(
      lote => String(lote.id) === String(loteId)
    )

    if (!loteActualExiste) {
      if (filtrados.length > 0) {
        setLoteId(String(filtrados[0].id))
      } else {
        setLoteId('')
      }
    }
  }, [establecimientoId, lotes, loteId])

  async function cargarDatos() {
    const [
      empleadosResultado,
      tareasResultado,
      establecimientosResultado,
      lotesResultado,
      marcacionesResultado,
    ] = await Promise.all([
      supabase
        .from('empleados')
        .select('*')
        .eq('activo', true)
        .order('nombre'),

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

      supabase
        .from('marcaciones')
        .select('*')
        .order('id', { ascending: false }),
    ])

    const resultados = [
      empleadosResultado,
      tareasResultado,
      establecimientosResultado,
      lotesResultado,
      marcacionesResultado,
    ]

    const resultadoConError = resultados.find(
      resultado => resultado.error
    )

    if (resultadoConError) {
      setMensaje(
        'No se pudieron cargar los datos: ' +
          resultadoConError.error.message
      )
      return
    }

    const empleadosData = empleadosResultado.data || []
    const tareasData = tareasResultado.data || []
    const establecimientosData =
      establecimientosResultado.data || []
    const lotesData = lotesResultado.data || []
    const marcacionesData =
      marcacionesResultado.data || []

    setEmpleados(empleadosData)
    setTareas(tareasData)
    setEstablecimientos(establecimientosData)
    setLotes(lotesData)
    setMarcaciones(marcacionesData)

    if (!empleadoId && empleadosData.length > 0) {
      setEmpleadoId(empleadosData[0].legajo)
    }

    if (!tareaId && tareasData.length > 0) {
      setTareaId(tareasData[0].nombre)
    }

    if (
      !establecimientoId &&
      establecimientosData.length > 0
    ) {
      setEstablecimientoId(
        String(establecimientosData[0].id)
      )
    }
  }

  function fechaActual() {
    const ahora = new Date()
    const anio = ahora.getFullYear()
    const mes = String(
      ahora.getMonth() + 1
    ).padStart(2, '0')
    const dia = String(
      ahora.getDate()
    ).padStart(2, '0')

    return `${anio}-${mes}-${dia}`
  }

  function horaActual() {
    return new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  function obtenerUbicacion() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            'Este dispositivo no tiene disponible la ubicación.'
          )
        )
        return
      }

      let finalizado = false

      const temporizador = window.setTimeout(() => {
        if (finalizado) {
          return
        }

        finalizado = true

        reject(
          new Error(
            'No se pudo obtener la ubicación en 12 segundos. Revise el GPS o pruebe desde el celular.'
          )
        )
      }, 12000)

      navigator.geolocation.getCurrentPosition(
        posicion => {
          if (finalizado) {
            return
          }

          finalizado = true
          window.clearTimeout(temporizador)

          resolve({
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
            precision: posicion.coords.accuracy,
          })
        },
        error => {
          if (finalizado) {
            return
          }

          finalizado = true
          window.clearTimeout(temporizador)

          if (error.code === 1) {
            reject(
              new Error(
                'El permiso de ubicación fue rechazado.'
              )
            )
            return
          }

      