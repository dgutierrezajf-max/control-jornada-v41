import { useEffect, useMemo, useState } from 'react'
import { Camera, MapPin, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from '../services/supabase'

const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const localTime=()=>new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false})
const dataUrlToBlob=async dataUrl=>await (await fetch(dataUrl)).blob()

export default function Jornada(){
 const [data,setData]=useState({empleados:[],tareas:[],establecimientos:[],lotes:[],marcaciones:[]})
 const [sel,setSel]=useState({empleado:'',tarea:'',establecimiento:'',lote:''})
 const [photo,setPhoto]=useState(''); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState(''); const [gpsMsg,setGpsMsg]=useState('')
 const load=async()=>{
  const [e,t,es,l,m]=await Promise.all([
   supabase.from('empleados').select('*').eq('activo',true).order('nombre'),
   supabase.from('tareas').select('*').eq('activo',true).order('nombre'),
   supabase.from('establecimientos').select('*').eq('activo',true).order('nombre'),
   supabase.from('lotes').select('*').eq('activo',true).order('nombre'),
   supabase.from('marcaciones').select('*').order('id',{ascending:false}).limit(100)])
  const err=[e,t,es,l,m].find(x=>x.error); if(err){setMsg(err.error.message);return}
  const next={empleados:e.data||[],tareas:t.data||[],establecimientos:es.data||[],lotes:l.data||[],marcaciones:m.data||[]}; setData(next)
  setSel(s=>({empleado:s.empleado||next.empleados[0]?.legajo||'',tarea:s.tarea||next.tareas[0]?.nombre||'',establecimiento:s.establecimiento||String(next.establecimientos[0]?.id||''),lote:s.lote}))
 }
 useEffect(()=>{load()},[])
 const filteredLots=useMemo(()=>data.lotes.filter(x=>String(x.establecimiento_id)===String(sel.establecimiento)),[data.lotes,sel.establecimiento])
 useEffect(()=>{if(!filteredLots.some(x=>String(x.id)===String(sel.lote)))setSel(s=>({...s,lote:String(filteredLots[0]?.id||'')}))},[filteredLots])
 const open=data.marcaciones.find(x=>x.empleado_id===sel.empleado&&x.fecha===localDate()&&!x.hora_salida)
 const gps=()=>new Promise((resolve,reject)=>{
  if(!navigator.geolocation)return reject(new Error('GPS no disponible'))
  let done=false; const timer=setTimeout(()=>{if(!done){done=true;reject(new Error('No se obtuvo la ubicación en 15 segundos'))}},15000)
  navigator.geolocation.getCurrentPosition(p=>{if(done)return;done=true;clearTimeout(timer);resolve({lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy})},e=>{if(done)return;done=true;clearTimeout(timer);reject(new Error(e.code===1?'Debe autorizar la ubicación':'No se pudo obtener la ubicación'))},{enableHighAccuracy:true,timeout:12000,maximumAge:0})
 })
 const uploadPhoto=async(kind)=>{
  if(!photo)throw new Error('Debe tomar una foto de validación')
  const blob=await dataUrlToBlob(photo); const path=`${sel.empleado}/${localDate()}/${kind}-${Date.now()}.jpg`
  const {error}=await supabase.storage.from('evidencias').upload(path,blob,{contentType:'image/jpeg',upsert:false}); if(error)throw error; return path
 }
 const mark=async kind=>{
  if(!sel.empleado||!sel.tarea||!sel.establecimiento||!sel.lote)return setMsg('Complete todos los campos')
  if(kind==='in'&&open)return setMsg('Ya existe una jornada abierta'); if(kind==='out'&&!open)return setMsg('No existe jornada abierta')
  setBusy(true);setMsg('Validando foto y GPS...');setGpsMsg('Buscando ubicación')
  try{
   const position=await gps(); const photoPath=await uploadPhoto(kind==='in'?'ingreso':'salida'); const employee=data.empleados.find(x=>x.legajo===sel.empleado); const farm=data.establecimientos.find(x=>String(x.id)===String(sel.establecimiento)); const lot=data.lotes.find(x=>String(x.id)===String(sel.lote))
   if(kind==='in'){
    const {error}=await supabase.from('marcaciones').insert({empleado_id:employee.legajo,empleado_nombre:employee.nombre,fecha:localDate(),tarea:sel.tarea,establecimiento:farm.nombre,lote:lot.nombre,hora_ingreso:localTime(),lat_ingreso:position.lat,lng_ingreso:position.lng,precision_ingreso:position.acc,foto_ingreso:photoPath}); if(error)throw error
   }else{
    const {error}=await supabase.from('marcaciones').update({hora_salida:localTime(),lat_salida:position.lat,lng_salida:position.lng,precision_salida:position.acc,foto_salida:photoPath}).eq('id',open.id); if(error)throw error
   }
   setPhoto('');setGpsMsg(`GPS registrado, precisión aproximada ${Math.round(position.acc)} m`);setMsg(kind==='in'?'Ingreso registrado':'Salida registrada');await load()
  }catch(e){setGpsMsg('GPS o evidencia no registrados');setMsg(e.message)}finally{setBusy(false)}
 }
 return <><header><p>CONTROL OPERATIVO MÓVIL</p><h1>Control de Jornada V4.3</h1><span>GPS y fotografía obligatorios</span></header><main className="grid">
  <section className="card"><h2>Registrar jornada</h2>{open&&<div className="open"><b>Jornada abierta</b><span>Ingreso: {open.hora_ingreso}</span><span>{open.empleado_nombre} · {open.establecimiento} · {open.lote}</span></div>}
   <label>Empleado<select value={sel.empleado} onChange={e=>setSel({...sel,empleado:e.target.value})}>{data.empleados.map(x=><option key={x.id} value={x.legajo}>{x.nombre}</option>)}</select></label>
   <label>Tarea<select value={sel.tarea} onChange={e=>setSel({...sel,tarea:e.target.value})} disabled={!!open}>{data.tareas.map(x=><option key={x.id} value={x.nombre}>{x.nombre}</option>)}</select></label>
   <label>Establecimiento<select value={sel.establecimiento} onChange={e=>setSel({...sel,establecimiento:e.target.value})} disabled={!!open}>{data.establecimientos.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>
   <label>Lote<select value={sel.lote} onChange={e=>setSel({...sel,lote:e.target.value})} disabled={!!open}>{filteredLots.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>
   <label className="camera"><Camera size={20}/>{photo?'Foto lista':'Tomar foto de validación'}<input hidden type="file" accept="image/*" capture="user" onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=()=>setPhoto(r.result);r.readAsDataURL(f)}}}/></label>
   {photo&&<img className="preview" src={photo}/>}<div className="info"><MapPin size={18}/>El GPS se obtiene automáticamente al marcar.</div>
   <div className="actions"><button disabled={busy||!!open} onClick={()=>mark('in')}><LogIn size={18}/>Ingreso</button><button className="danger" disabled={busy||!open} onClick={()=>mark('out')}><LogOut size={18}/>Salida</button></div>
   {msg&&<div className="message">{msg}</div>}{gpsMsg&&<div className="gps"><ShieldCheck size={18}/>{gpsMsg}</div>}
  </section>
  <section className="card"><h2>Marcaciones</h2><div className="list">{data.marcaciones.map(x=><article key={x.id}><b>{x.empleado_nombre}</b><span>{x.fecha} · {x.hora_ingreso} a {x.hora_salida||'Pendiente'}</span><span>{x.establecimiento} · {x.lote}</span><small>{x.tarea}</small></article>)}</div></section>
 </main></>
}
