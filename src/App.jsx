import { useState } from 'react'
import { Clock3, Users, Settings, BarChart3 } from 'lucide-react'
import Jornada from './pages/Jornada'
import Empleados from './pages/Empleados'
import Catalogos from './pages/Catalogos'
import Supervisor from './pages/Supervisor'
import './App.css'

export default function App(){
 const [page,setPage]=useState('jornada')
 const pages=[['jornada','Jornada',Clock3],['empleados','Empleados',Users],['catalogos','Ajustes',Settings],['supervisor','Supervisor',BarChart3]]
 return <div className="shell">
   <nav>{pages.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={18}/>{label}</button>)}</nav>
   {page==='jornada'&&<Jornada/>}{page==='empleados'&&<Empleados/>}{page==='catalogos'&&<Catalogos/>}{page==='supervisor'&&<Supervisor/>}
 </div>
}
