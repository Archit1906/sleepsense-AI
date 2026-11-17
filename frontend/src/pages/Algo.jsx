import {useContext,useEffect,useState} from 'react'
import {LineChart,Line,BarChart,Bar,XAxis,YAxis,Tooltip,Legend,ResponsiveContainer} from 'recharts'
import {Ctx} from '../App'
import {post,fmt,STATES,COL} from '../api'
const KEY={forward:'alpha',backward:'beta','sum-product':'gamma',viterbi:'delta_log',scaling:'scaled_alpha'}
export default function Algo({ep,title,formula,text}){
  const {A}=useContext(Ctx),[d,setD]=useState(null),[err,setErr]=useState(''),[len,setLen]=useState(20),[step,setStep]=useState(20)
  useEffect(()=>{setErr('');post('hmm/'+ep,{n:len,...(A?{A}:{})}).then(r=>{setD(r);setStep(len)}).catch(e=>setErr(e.message))},[ep,len,A])
  if(err)return <div className="glass p-4 text-red-300">{err}</div>
  if(!d)return <div className="glass p-4">Calculating…</div>
  const M=d[KEY[ep]].slice(0,step),data=M.map((r,t)=>({t,...Object.fromEntries(STATES.map((s,i)=>[s,r[i]]))}))
  const info=[d.likelihood!=null&&['P(O|λ)',d.likelihood.toExponential(4)],d.loglik!=null&&['log P(O|λ)',d.loglik.toFixed(4)],d.direct_likelihood!=null&&['Direct (unscaled) P(O|λ)',d.direct_likelihood.toExponential(4)],d.log_prob!=null&&['Best path log-prob',d.log_prob.toFixed(4)]].filter(Boolean)
  const C=ep==='sum-product'?BarChart:LineChart
  return <div className="space-y-3">
    <div className="glass p-4"><h2 className="text-xl font-semibold">{title}</h2><p className="font-mono text-cyan-300 text-sm my-2">{formula}</p><p className="text-sm text-slate-300">{text}</p>
      <div className="flex flex-wrap gap-6 mt-3 items-center text-sm">
        <label>Sequence length: {len}<input type="range" min="3" max="60" value={len} onChange={e=>setLen(+e.target.value)} className="block"/></label>
        <label>Step through: t ≤ {step-1}<input type="range" min="1" max={len} value={step} onChange={e=>setStep(+e.target.value)} className="block"/></label>
        {info.map(([a,b])=><div key={a}><span className="text-slate-400">{a}: </span><b>{b}</b></div>)}</div>
      <p className="text-xs text-slate-500 mt-2">Uses the current transition matrix (edit it in the State Explorer).</p></div>
    {ep==='viterbi'&&<div className="glass p-4 text-sm"><div className="mb-1 font-semibold">Most likely path</div><div className="flex flex-wrap gap-1">{d.path.slice(0,step).map((q,t)=><span key={t} className="px-2 py-1 rounded text-xs text-black" style={{background:COL[q]}}>{t}:{STATES[q]}</span>)}</div></div>}
    <div className="glass p-4"><ResponsiveContainer height={260}><C data={data}><XAxis dataKey="t"/><YAxis tickFormatter={v=>Math.abs(v)<.01&&v!==0?v.toExponential(0):v}/><Tooltip formatter={v=>fmt(v)}/><Legend/>
      {STATES.map((s,i)=>ep==='sum-product'?<Bar key={s} dataKey={s} stackId="a" fill={COL[i]}/>:<Line key={s} dataKey={s} stroke={COL[i]} dot={false}/>)}</C></ResponsiveContainer></div>
    <div className="glass p-4 overflow-x-auto"><table className="text-sm w-full"><thead><tr className="text-left text-slate-400"><th>Time</th><th>Observation</th>{STATES.map(s=><th key={s}>{s}</th>)}{ep==='viterbi'&&<th>Backpointers</th>}{ep==='scaling'&&<th>c_t</th>}{ep==='scaling'&&<th>Unscaled α</th>}</tr></thead>
      <tbody>{M.map((r,t)=><tr key={t} className="border-t border-white/10"><td>{t}</td><td>{d.symbols[d.observations[t]]}</td>{r.map((v,i)=><td key={i}>{fmt(v)}</td>)}
        {ep==='viterbi'&&<td>{t?d.backpointers[t].map(b=>STATES[b][0]).join(' '):'—'}</td>}{ep==='scaling'&&<td>{fmt(d.scaling_factors[t])}</td>}{ep==='scaling'&&<td className="text-xs">{d.unscaled_alpha[t].map(v=>v.toExponential(1)).join(' | ')}</td>}</tr>)}</tbody></table></div>
  </div>
}
