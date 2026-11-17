import {useEffect,useState} from 'react'
import {post,STATES} from '../api'
const Mat=({title,M,rows,cols,diff})=><div className="glass p-4 overflow-x-auto"><div className="font-semibold mb-2 text-sm">{title}</div>
  <table className="text-sm"><thead><tr><th/>{cols.map(c=><th key={c} className="px-2 text-slate-400 font-normal">{c}</th>)}</tr></thead>
  <tbody>{M.map((r,i)=><tr key={i}><td className="pr-2 text-slate-400">{rows[i]}</td>{r.map((v,j)=><td key={j} className="px-2 py-1 text-center" style={{background:diff?`rgba(244,114,182,${Math.min(1,v*6)})`:`rgba(34,211,238,${Math.min(1,v)*.8})`}}>{v.toFixed(3)}</td>)}</tr>)}</tbody></table></div>
export default function MLE(){
  const [k,setK]=useState(20),[len,setLen]=useState(100),[sm,setSm]=useState(1),[r,setR]=useState(null),[err,setErr]=useState(''),[busy,setBusy]=useState(false)
  const go=async()=>{setBusy(true);setErr('');try{setR(await post('hmm/estimate-parameters',{sequences:k,length:len,smoothing:sm}))}catch(e){setErr(e.message)}setBusy(false)}
  useEffect(()=>{go()},[])
  const E=r&&r.estimated,diffA=r&&E.A.map((row,i)=>row.map((v,j)=>Math.abs(v-r.true_A[i][j])))
  return <div className="space-y-3">
    <div className="glass p-4"><h2 className="text-xl font-semibold">Maximum Likelihood Estimation (supervised)</h2>
      <p className="text-sm text-slate-300 mt-1">Training sequences are simulated, so the true hidden states are known. We simply count and normalise. This is <b>not</b> Baum-Welch: Baum-Welch (EM) estimates parameters from <i>unlabeled</i> observations and is not implemented here.</p>
      <div className="font-mono text-cyan-300 text-sm mt-2 space-y-1"><div>πᵢ = (starts in i + s) / (sequences + N·s)</div><div>Aᵢⱼ = (count i→j + s) / (transitions from i + N·s)</div><div>Bᵢₖ = (count i emits k + s) / (emissions from i + K·s)</div><div className="text-slate-400">s = Laplace smoothing (avoids zero probabilities)</div></div>
      <div className="flex flex-wrap gap-4 items-end mt-3 text-sm">
        <label>Training sequences<input type="number" min="1" max="200" value={k} onChange={e=>setK(+e.target.value)} className="block w-28 bg-white/10 rounded p-1"/></label>
        <label>Length each<input type="number" min="5" max="1000" value={len} onChange={e=>setLen(+e.target.value)} className="block w-28 bg-white/10 rounded p-1"/></label>
        <label>Laplace smoothing<input type="number" step="0.1" min="0" value={sm} onChange={e=>setSm(+e.target.value)} className="block w-28 bg-white/10 rounded p-1"/></label>
        <button className="btn" disabled={busy} onClick={go}>{busy?'Estimating…':'Generate & Estimate'}</button></div></div>
    {err&&<div className="glass p-3 text-red-300 text-sm">{err}</div>}
    {r&&<>
      <div className="glass p-4 text-sm">Initial probabilities π — estimated: {E.pi.map(v=>v.toFixed(3)).join(', ')} · simulation: {r.true_pi.map(v=>v.toFixed(3)).join(', ')}<br/>Mean absolute error of A vs simulation: <b>{r.mean_abs_error_A.toFixed(4)}</b> <span className="text-slate-400">(more/longer sequences usually lower this)</span></div>
      <div className="grid lg:grid-cols-3 gap-3"><Mat title="Estimated A" M={E.A} rows={STATES} cols={STATES}/><Mat title="Simulation (true) A" M={r.true_A.map(x=>x)} rows={STATES} cols={STATES}/><Mat title="|Estimated − True| (A)" M={diffA} rows={STATES} cols={STATES} diff/></div>
      <Mat title="Estimated emission matrix B (rows = hidden state, columns = observation symbol)" M={E.B} rows={STATES} cols={E.symbols}/></>}
  </div>
}
