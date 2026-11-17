export const STATES=['Awake','Light Sleep','Deep Sleep','REM Sleep']
export const COL=['#f59e0b','#38bdf8','#6366f1','#e879f9']
const h=async r=>{let j={};try{j=await r.json()}catch{};if(!r.ok)throw new Error(j.error||`Request failed (${r.status}). Is the Flask backend running on port 5000?`);return j}
export const post=(p,b={})=>fetch('/api/'+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(h)
export const get=p=>fetch('/api/'+p).then(h)
export const upload=(f,missing)=>{const fd=new FormData();fd.append('file',f);fd.append('missing',missing);return fetch('/api/dataset/upload',{method:'POST',body:fd}).then(h)}
export const fmt=v=>v==null?'-inf':(v!==0&&Math.abs(v)<1e-3)?v.toExponential(2):Number(v).toFixed(4)
