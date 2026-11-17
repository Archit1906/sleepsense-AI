import {useContext,useEffect,useState} from 'react'
import {Ctx} from '../App'
import {STATES,COL} from '../api'
export default function Explorer(){
  const {res,setA,run,loading}=useContext(Ctx),[E,setE]=useState(null),[s,setS]=useState(0)
  useEffect(()=>{if(res)setE(res.A.map(r=>[...r]))},[res])
  if(!res||!E)return <div className="glass p-4">Loading model…</div>
  const pos=STATES.map((_,i)=>[200+120*Math.cos(i*Math.PI/2-Math.PI/2),160+110*Math.sin(i*Math.PI/2-Math.PI/2)])
  const apply=()=>{const N=E.map(r=>{const t=r.reduce((a,b)=>a+Math.max(0,b),0)||1;return r.map(v=>Math.max(0,v)/t)});setA(N);run({A:N})}
  const nxt=res.A[s].reduce((b,v,j)=>v>res.A[s][b]?j:b,0)
  return <div className="grid lg:grid-cols-2 gap-3">
    <div className="glass p-4"><div className="font-semibold">State transition diagram (arrow thickness = probability)</div>
      <svg viewBox="0 0 400 320" className="w-full">{res.A.flatMap((r,i)=>r.map((p,j)=>{if(i===j)return null;const [x1,y1]=pos[i],[x2,y2]=pos[j],mx=(x1+x2)/2,my=(y1+y2)/2,dx=y2-y1,dy=x1-x2,l=Math.hypot(dx,dy)||1
        return <path key={i+'-'+j} d={`M${x1} ${y1}Q${mx+dx/l*25} ${my+dy/l*25} ${x2} ${y2}`} fill="none" stroke={COL[i]} strokeWidth={.5+p*14} opacity={.65}/>}))}
        {pos.map(([x,y],i)=><g key={i} onClick={()=>setS(i)} className="cursor-pointer"><circle cx={x} cy={y} r={30} fill={COL[i]} stroke={i===s?'#fff':'none'} strokeWidth="3"/><text x={x} y={y+4} textAnchor="middle" fontSize="10" fill="#000">{STATES[i].split(' ')[0]}</text></g>)}</svg></div>
    <div className="glass p-4 text-sm space-y-1"><div className="font-semibold text-lg" style={{color:COL[s]}}>{STATES[s]}</div>
      <div>Initial probability π: {res.pi[s].toFixed(3)}</div><div>Most likely next state: {STATES[nxt]} ({res.A[s][nxt].toFixed(2)}) · self-loop {res.A[s][s].toFixed(2)}</div>
      <div className="font-semibold pt-2">Emission probabilities</div>{res.symbols.map((y,k)=><div key={y} className="flex items-center gap-2"><span className="w-20">{y}</span><div className="h-2 rounded" style={{width:res.B[s][k]*200,background:COL[s]}}/><span>{res.B[s][k].toFixed(3)}</span></div>)}</div>
    <div className="glass p-4 lg:col-span-2"><div className="font-semibold mb-2">Transition matrix A (editable heatmap — rows are re-normalised on apply)</div>
      <table className="text-sm"><thead><tr><th/>{STATES.map(x=><th key={x} className="px-2">{x}</th>)}</tr></thead><tbody>{E.map((r,i)=><tr key={i}><td className="pr-2">{STATES[i]}</td>{r.map((v,j)=><td key={j} className="p-1"><input type="number" step="0.01" min="0" value={+v.toFixed(3)} onChange={e=>{const C=E.map(x=>[...x]);C[i][j]=+e.target.value;setE(C)}} className="w-20 p-1 rounded text-white" style={{background:`rgba(34,211,238,${Math.min(1,v)*.8+.05})`}}/></td>)}</tr>)}</tbody></table>
      <button className="btn mt-3" disabled={loading} onClick={apply}>Apply & re-run analysis</button></div>
  </div>
}
