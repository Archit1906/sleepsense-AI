import {createContext,useState,useEffect,useCallback} from 'react'
import {NavLink,Route,Routes} from 'react-router-dom'
import {LayoutDashboard,Database,Network,ArrowRight,ArrowLeft,Layers,Calculator,BookOpen,Menu,RotateCcw,Moon} from 'lucide-react'
import {post} from './api'
import Overview from './pages/Overview'
import Dataset from './pages/Dataset'
import Explorer from './pages/Explorer'
import Algo from './pages/Algo'
import MLE from './pages/MLE'
import Learn from './pages/Learn'
export const Ctx=createContext()
const NAV=[['/','Overview & Analysis',LayoutDashboard],['/dataset','Sleep Dataset',Database],['/explorer','HMM State Explorer',Network],['/forward','Forward Algorithm',ArrowRight],['/backward','Backward Algorithm',ArrowLeft],['/sum-product','Sum-Product',Layers],['/mle','Maximum Likelihood',Calculator],['/learn','Learn HMM',BookOpen]]
const ALGOS={forward:['Forward Algorithm','α₁(i)=πᵢBᵢ(O₁);  αₜ(i)=Bᵢ(Oₜ)·Σⱼ αₜ₋₁(j)Aⱼᵢ;  P(O|λ)=Σᵢ αₜ(i)','Probability of the observations so far AND being in state i. Sums over ALL hidden paths.'],
backward:['Backward Algorithm','βₜ(i)=Σⱼ Aᵢⱼ·Bⱼ(Oₜ₊₁)·βₜ₊₁(j);  β_T(i)=1','Probability of the FUTURE observations given state i at time t.'],
'sum-product':['Sum-Product (Forward–Backward)','γₜ(i)=αₜ(i)βₜ(i)/Σⱼ αₜ(j)βₜ(j)','Smoothing uses the whole sequence. Filtering uses only O₁..Oₜ (normalised α).'],
viterbi:['Viterbi Algorithm','δₜ(i)=maxⱼ[δₜ₋₁(j)Aⱼᵢ]·Bᵢ(Oₜ)  (shown in log space)','Finds the single most likely state path. Logs avoid numerical underflow because products of small numbers shrink to 0.'],
scaling:['Scaling Factors','cₜ=1/Σᵢ α̃ₜ(i);  log P(O|λ)=−Σₜ log cₜ','Normalising α at each step stops underflow on long sequences. Table shows scaled α and cₜ.']}
export default function App(){
  const [res,setRes]=useState(null),[loading,setL]=useState(false),[err,setErr]=useState(''),[n,setN]=useState(300),[A,setA]=useState(null),[open,setOpen]=useState(true)
  const run=useCallback(async(over={})=>{setL(true);setErr('');try{setRes(await post('hmm/analyze',{n,...(A?{A}:{}),...over}))}catch(e){setErr(e.message)}setL(false)},[n,A])
  useEffect(()=>{run()},[])
  const reset=()=>{setA(null);run({A:undefined})}
  return <Ctx.Provider value={{res,loading,err,n,setN,A,setA,run}}>
    <div className="flex min-h-screen">
      <aside className={`glass m-3 p-3 shrink-0 transition-all ${open?'w-56':'w-14'}`}>
        <button onClick={()=>setOpen(!open)} className="mb-4 p-1"><Menu size={20}/></button>
        {NAV.map(([to,l,I])=><NavLink key={to} to={to} end className={({isActive})=>`flex items-center gap-3 p-2 rounded-lg text-sm mb-1 ${isActive?'bg-cyan-500/20 text-cyan-300':'hover:bg-white/10'}`}><I size={18} className="shrink-0"/>{open&&l}</NavLink>)}
      </aside>
      <main className="flex-1 p-3 min-w-0">
        <header className="glass flex flex-wrap items-center gap-4 p-3 mb-3">
          <div className="flex items-center gap-2 font-bold text-cyan-300"><Moon size={20}/>SleepSense AI</div>
          <span className="text-xs text-slate-400">Dataset: {res?`${res.observations.length} obs loaded`:'—'}</span>
          <span className="text-xs text-slate-400">Analysis: {loading?'running…':res?'complete':'none'}</span>
          <button onClick={reset} className="ml-auto flex items-center gap-1 text-sm hover:text-cyan-300"><RotateCcw size={16}/>Reset analysis</button>
        </header>
        {err&&<div className="mb-3 p-3 rounded-lg bg-red-500/20 text-red-200 text-sm">{err}</div>}
        <Routes>
          <Route path="/" element={<Overview/>}/><Route path="/dataset" element={<Dataset/>}/><Route path="/explorer" element={<Explorer/>}/>
          <Route path="/mle" element={<MLE/>}/><Route path="/learn" element={<Learn/>}/>
          {Object.entries(ALGOS).map(([ep,[t,f,x]])=><Route key={ep} path={'/'+ep} element={<Algo ep={ep} title={t} formula={f} text={x}/>}/>)}
        </Routes>
        <p className="text-xs text-slate-500 mt-6">Educational simulation using an HMM. Values are estimated from simulated or uploaded data. Not medical advice.</p>
      </main>
    </div></Ctx.Provider>
}
