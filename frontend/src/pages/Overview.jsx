import {useContext,useState} from 'react'
import {LineChart,Line,XAxis,YAxis,Tooltip,PieChart,Pie,Cell,ResponsiveContainer} from 'recharts'
import {Ctx} from '../App'
import {STATES,COL} from '../api'
export default function Overview(){
  const {res,loading,n,setN,run}=useContext(Ctx),[sel,setSel]=useState(0)
  if(!res)return <div className="glass p-6">{loading?'Running HMM…':'No analysis yet.'}</div>
  const T=res.observations.length,s=res.signals.map((x,i)=>({...x,i})),p=res.path[sel]
  const pie=STATES.map((k,i)=>({name:k,value:res.distribution[k],c:COL[i]}))
  return <div className="space-y-3">
    <div className="glass p-4 flex flex-wrap items-end gap-3">
      <label className="text-sm">Sequence length<input type="number" min="5" max="1000" value={n} onChange={e=>setN(+e.target.value)} className="block mt-1 w-28 bg-white/10 rounded p-1"/></label>
      <button className="btn" disabled={loading} onClick={()=>run()}>{loading?'Running…':'Run Sleep Analysis'}</button>
      <span className="text-xs text-slate-400">4 hidden states · 5 observation symbols · Viterbi + forward–backward on the backend</span>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {[['Observations',T],...STATES.map(k=>[k+' (est. min)',res.minutes[k]]),['Log-likelihood',res.loglik.toFixed(2)]].map(([a,b])=><div key={a} className="glass p-3"><div className="text-xs text-slate-400">{a}</div><div className="text-xl font-semibold">{b}</div></div>)}
    </div>
    <div className="glass p-4"><div className="font-semibold mb-2">Estimated sleep timeline (click an interval)</div>
      <div className="flex h-12 rounded overflow-hidden">{res.path.map((q,i)=><div key={i} onClick={()=>setSel(i)} title={`t=${i} ${STATES[q]}`} className="flex-1 cursor-pointer" style={{background:COL[q],outline:i===sel?'2px solid #fff':'none'}}/>)}</div>
      <div className="flex gap-4 mt-2 text-xs">{STATES.map((k,i)=><span key={k}><span className="inline-block w-3 h-3 mr-1 rounded" style={{background:COL[i]}}/>{k}</span>)}</div>
      <div className="mt-3 text-sm grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div>Interval: t={sel}</div><div>Symbol: {res.symbols[res.observations[sel]]}</div><div>Predicted state: <b style={{color:COL[p]}}>{STATES[p]}</b></div>
        <div>Posterior P(state): {(res.gamma[sel][p]*100).toFixed(1)}%</div>
        <div>Movement {res.signals[sel].MovementIntensity} · HR {res.signals[sel].HeartRate} · BR {res.signals[sel].BreathingRate}</div></div></div>
    <div className="grid lg:grid-cols-4 gap-3">
      <div className="glass p-4"><div className="font-semibold">Stage distribution</div><ResponsiveContainer height={220}><PieChart><Pie data={pie} dataKey="value" innerRadius={55} outerRadius={85}>{pie.map(d=><Cell key={d.name} fill={d.c}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
      {['MovementIntensity','HeartRate','BreathingRate'].map((k,j)=><div key={k} className="glass p-4"><div className="font-semibold">{k}</div><ResponsiveContainer height={220}><LineChart data={s}><XAxis dataKey="i" hide/><YAxis domain={['auto','auto']} width={35}/><Tooltip/><Line dot={false} dataKey={k} stroke={['#22d3ee','#f472b6','#a78bfa'][j]}/></LineChart></ResponsiveContainer></div>)}
    </div>
    <div className="glass p-4"><div className="font-semibold mb-1">Analysis summary</div><p className="text-sm text-slate-300">{res.summary}</p>
      {res.reference_accuracy!=null&&<p className="text-xs text-slate-400 mt-2">Agreement with simulated reference labels (evaluation only, never used for prediction): {(res.reference_accuracy*100).toFixed(1)}%</p>}</div>
  </div>
}
