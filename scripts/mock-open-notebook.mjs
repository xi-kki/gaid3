#!/usr/bin/env node
import http from 'node:http';
const PORT = Number(process.env.MOCK_ONB_PORT || 5055);
const PASSWORD = process.env.OPEN_NOTEBOOK_PASSWORD || 'test';
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const notebooks = new Map();
const sources = new Map();
const sessions = new Map();
let nid = 1, sid = 1, sessId = 1;
function stripThink(s) { return s.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '').trim(); }
function json(res, code, obj) { res.writeHead(code, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'}); res.end(JSON.stringify(obj)); }
async function groqChat(prompt, system) {
  if (!GROQ_KEY) return `[mock — set GROQ_API_KEY] ${prompt.slice(0,120)}`;
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST', headers:{Authorization:`Bearer ${GROQ_KEY}`,'Content-Type':'application/json'},
    body: JSON.stringify({model:'qwen/qwen3.6-27b', messages:[{role:'system', content: system},{role:'user', content: prompt}], temperature:0.7, max_tokens: 900})
  });
  if (!r.ok) return `[groq ${r.status}] ${prompt.slice(0,80)}`;
  const j = await r.json();
  return stripThink(j.choices?.[0]?.message?.content || '');
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'}); return res.end(); }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let body=''; for await (const c of req) body+=c;
  let j=null; try { j= body? JSON.parse(body): null; } catch {}
  if (url.pathname === '/' && req.method==='GET') return json(res,200,{message:'Mock Open Notebook API is running'});
  if (url.pathname === '/health' && req.method==='GET') return json(res,200,{status:'healthy'});
  if (url.pathname.startsWith('/api/')) {
    const h = req.headers.authorization || '';
    if (h !== `Bearer ${PASSWORD}`) return json(res,401,{detail:'Unauthorized'});
  }
  if (url.pathname === '/api/notebooks' && req.method==='POST') {
    const id = `notebook:${nid++}`;
    const nb = {id, name: j?.name||'Untitled', description: j?.description||'', created: new Date().toISOString(), updated: new Date().toISOString()};
    notebooks.set(id, nb); return json(res,200,nb);
  }
  if (url.pathname === '/api/notebooks' && req.method==='GET') return json(res,200, [...notebooks.values()]);
  if (url.pathname === '/api/sources/json' && req.method==='POST') {
    const id = `source:${sid++}`;
    const s = {id, type: j?.type||'text', title: j?.title||'Untitled', content: j?.content||'', notebooks: j?.notebooks||[], created:new Date().toISOString(), updated:new Date().toISOString(), embedded:true, embedded_chunks:1};
    sources.set(id, s); return json(res,200,s);
  }
  if (url.pathname === '/api/sources' && req.method==='POST') {
    const id = `source:${sid++}`;
    const s = {id, type:'text', title: j?.title||j?.name||'Untitled', content: j?.content||'', notebooks:[], created:new Date().toISOString(), updated:new Date().toISOString(), embedded:true, embedded_chunks:1};
    sources.set(id, s); return json(res,200,s);
  }
  if (url.pathname === '/api/sources' && req.method==='GET') return json(res,200,[...sources.values()]);
  let m = url.pathname.match(/^\/api\/sources\/([^/]+)\/chat\/sessions$/);
  if (m && req.method==='POST') {
    const sourceId = decodeURIComponent(m[1]);
    if (!sources.has(sourceId)) return json(res,404,{detail:'Source not found'});
    const id = `session:${sessId++}`;
    const sess = {id, source_id: sourceId, title: j?.title||'Chat', model_override: j?.model_override||null, created:new Date().toISOString(), updated:new Date().toISOString()};
    sessions.set(id, sess); return json(res,200,sess);
  }
  m = url.pathname.match(/^\/api\/sources\/([^/]+)\/chat\/sessions\/([^/]+)\/messages$/);
  if (m && req.method==='POST') {
    const sourceId = decodeURIComponent(m[1]); const sId = decodeURIComponent(m[2]);
    const src = sources.get(sourceId);
    if (!src) return json(res,404,{detail:'Source not found'});
    if (!sessions.has(sId)) return json(res,404,{detail:'Session not found'});
    const userMsg = j?.message || '';
    const answer = await groqChat(`Source content:\n${(src.content||'').slice(0,6000)}\n\nUser question: ${userMsg}\n\nAnswer concisely using the source. If Web3 jargon, explain simply.`, 'You are a helpful Web3 tutor. Use the provided source. Never output <think> tags.');
    return json(res,200,{content: answer, role:'assistant', id: `msg:${Date.now()}`});
  }
  if (url.pathname === '/api/transformations' && req.method==='GET') {
    return json(res,200,[
      {id:'tf-mindmap', name:'mind map', title:'Mind Map', description:'Generate a mind map'},
      {id:'tf-flashcards', name:'flashcards', title:'Flashcards', description:'Generate flashcards'},
      {id:'tf-quiz', name:'quiz', title:'Quiz', description:'Generate a quiz'},
      {id:'tf-podcast', name:'podcast', title:'Podcast', description:'Generate podcast'},
      {id:'tf-summary', name:'summary', title:'Summary', description:'Summarize'},
    ]);
  }
  if (url.pathname === '/api/transformations/execute' && req.method==='POST') {
    const tf = j?.transformation_id||'';
    const input = j?.input_text||'';
    let system='You are a helpful assistant. Output JSON only.';
    let prompt=input;
    if (tf.includes('mindmap')) { system='You output JSON with {nodes:[{id,label}], edges:[{source,target}]}. 12-22 nodes. JSON only, no thinking.'; prompt=`Create a mind map JSON from:\n${input.slice(0,5000)}`; }
    else if (tf.includes('flashcards')) { system='Output JSON {cards:[{question,answer,hint,tags}]} 5-12 cards. JSON only.'; prompt=`Create flashcards JSON from:\n${input.slice(0,5000)}`; }
    else if (tf.includes('quiz')) { system='Output JSON {questions:[{question,options,correct,explanation}]}. JSON only.'; prompt=`Create a quiz JSON from:\n${input.slice(0,5000)}`; }
    else if (tf.includes('podcast')) { system='Write a 2-speaker podcast script.'; prompt=`Write a podcast script from:\n${input.slice(0,5000)}`; }
    const out = await groqChat(prompt, system);
    return json(res,200,{output: out, transformation_id: tf});
  }
  json(res,404,{detail:`Not found: ${req.method} ${url.pathname}`});
});
server.listen(PORT, ()=> console.log(`Mock Open Notebook listening on http://localhost:${PORT}  (password: ${PASSWORD})`));
