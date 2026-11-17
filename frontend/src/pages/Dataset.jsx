import {useContext,useEffect,useState} from 'react'
import {Ctx} from '../App'
import {get,post,upload} from '../api'
export default function Dataset(){
  const {run}=useContext(Ctx),[d,setD]=useState(null),[q,setQ]=useState(''),[sort,setSort]=useState(null),[msg,setMsg]=useState(''),[miss,setMiss]=useState('mean'),[busy,setBusy]=useState(false)
  const load=()=>get('dataset/sample').then(setD).catch(e=>setMsg(e.message))
  useEffect(()=>{load()},[])
  const act=async f=>{setBusy(true);setMsg('');try{const r=await f();setMsg(JSON.stringify(r));await load();await run()}catch(e){setMsg(e.message)}setBusy(false)}
  const dl=()=>{const c=Object.keys(d.records[0]),t=[c.join(','),...d.records.map(r=>c.map(k=>r[k]).join(','))].join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t]));a.download='sleep_sample.csv';a.click()}
  if(!d)return <div className="glass p-4">{msg||'Loading…'}</div>
  let rows=d.records.filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));if(sort)rows=[...rows].sort((a,b)=>a[sort]>b[sort]?1:-1)
  const cols=Object.keys(d.records[0])
  return <div className="space-y-3">
    <div className="glass p-4 flex flex-wrap gap-3 items-end text-sm">
      <input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} className="bg-white/10 rounded p-2"/>
      <button className="btn" onClick={dl}>Download CSV</button>
      <button className="btn" disabled={busy} onClick={()=>act(()=>post('sleep/generate',{n:400,seed:Math.floor(Math.random()*9999)}))}>Generate new sequence</button>
      <button className="btn" disabled={busy} onClick={()=>act(()=>post('dataset/reset'))}>Reset to default</button>
      <label>Missing values<select value={miss} onChange={e=>setMiss(e.target.value)} className="block bg-slate-800 rounded p-2"><option value="mean">Mean imputation</option><option value="median">Median imputation</option><option value="drop">Remove invalid rows</option></select></label>
      <label>Upload CSV<input type="file" accept=".csv" disabled={busy} onChange={e=>e.target.files[0]&&act(()=>upload(e.target.files[0],miss))} className="block"/></label>
      {msg&&<div className="w-full text-xs text-cyan-200 break-all">{msg}</div>}</div>
    <div className="glass p-4 overflow-auto max-h-[28rem]"><table className="text-sm w-full"><thead className="text-left text-slate-400"><tr>{cols.map(c=><th key={c} className="cursor-pointer" onClick={()=>setSort(c)}>{c}{sort===c&&' ▲'}</th>)}</tr></thead>
      <tbody>{rows.slice(0,200).map((r,i)=><tr key={i} className="border-t border-white/10">{cols.map(c=><td key={c}>{r[c]}</td>)}</tr>)}</tbody></table><div className="text-xs text-slate-400 mt-2">Showing {Math.min(200,rows.length)} of {rows.length} rows (simulated data)</div></div>
    <div className="glass p-4 text-xs overflow-auto"><div className="font-semibold text-sm mb-1">Basic statistics</div><pre>{JSON.stringify(d.stats,null,1)}</pre></div>
  </div>
}
