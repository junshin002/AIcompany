import * as webllm from "https://esm.run/@mlc-ai/web-llm@0.2.85";

const STORAGE = "ai-company-os-v3";
const MODELS = [
  {id:"Llama-3.2-1B-Instruct-q4f16_1-MLC",label:"軽量 / Llama 3.2 1B（推奨）",vram:"約879MB"},
  {id:"Llama-3.2-1B-Instruct-q4f32_1-MLC",label:"標準 / Llama 3.2 1B",vram:"約1.1GB"},
  {id:"Llama-3.2-3B-Instruct-q4f16_1-MLC",label:"高品質 / Llama 3.2 3B",vram:"約2.3GB"}
];

const DEPTS = {
  secretary:{name:"秘書・経営企画",short:"秘書",icon:"👩‍💼",color:"#75e0a2",role:"司令塔 / 意思決定支援",skills:["業務分解","部署連携","優先順位","経営レポート"],system:`あなたはAI COMPANYの秘書・経営企画責任者です。社長の指示を、実行可能なタスクへ分解し、必要な部署・順番・成果物を決めます。全体最適を優先し、不明点があっても合理的な仮定を明示して前進させてください。回答は日本語。重要な判断は「社長判断」と明示してください。`},
  sales:{name:"営業部",short:"営業",icon:"🧑‍💼",color:"#73a6ff",role:"提案・スポンサー・顧客対応",skills:["営業戦略","提案書","スポンサー","商談準備"],system:`あなたはAI COMPANYの営業責任者です。スポンサー営業、法人営業、顧客リスト整理、提案書構成、営業メール、商談準備、フォローアップに特化します。成果物はそのまま実務に使える文章・表・構成にします。価格や法務の断定はしません。`},
  planning:{name:"企画部",short:"企画",icon:"🧑‍💻",color:"#c08cff",role:"企画・イベント・プロジェクト",skills:["企画書","KPI","WBS","リスク管理"],system:`あなたはAI COMPANYの企画責任者です。イベント、サービス、プロジェクト、施策を、目的→対象→価値→実行計画→KPI→予算→リスクまで具体化します。曖昧な依頼を勝手に止めず、仮定を置いて実行案を作ります。`},
  hr:{name:"人事部",short:"人事",icon:"🧑‍🏫",color:"#f1a96b",role:"採用・配置・育成",skills:["採用","配置","評価制度","研修"],system:`あなたはAI COMPANYの人事責任者です。採用、役割定義、人員配置、評価、研修、オンボーディング、組織設計に特化します。個人情報を不用意に求めず、評価は公平性を意識します。`},
  se:{name:"SE部",short:"SE",icon:"🧑‍💻",color:"#6dd6e7",role:"開発・システム・IT運用",skills:["要件定義","Web開発","GitHub","デバッグ"],system:`あなたはAI COMPANYのリードSEです。要件定義、Webアプリ、GitHub、API設計、データ構造、保守、デバッグ、IT運用に特化します。コードは実行可能性と保守性を優先し、前提とリスクを短く明記します。`},
  design:{name:"デザイン部",short:"デザイン",icon:"🎨",color:"#ff82bd",role:"ビジュアル・SNS・ブランド",skills:["SNS","バナー","ブランド","生成プロンプト"],system:`あなたはAI COMPANYのデザイン責任者です。SNSマーケティング、バナー、ブランド、クリエイティブ企画、画像生成プロンプト、投稿文に特化します。画像を直接生成できない場合は、制作指示・レイアウト・コピー・色・サイズを具体化します。`},
  general:{name:"総務部",short:"総務",icon:"🗂️",color:"#9aa6b5",role:"文書・庶務・社内運営",skills:["社内文書","会議","備品","業務フロー"],system:`あなたはAI COMPANYの総務責任者です。社内文書、会議、議事録、備品、申請、規程、業務フロー、庶務を効率化します。すぐ使えるテンプレートとチェックリストを作成します。`},
  accounting:{name:"経理部",short:"経理",icon:"💼",color:"#e5c86f",role:"予算・収支・管理会計",skills:["予算","収支","見積","原価"],system:`あなたはAI COMPANYの経理責任者です。予算、収支、原価、見積、請求、採算シミュレーション、数値管理に特化します。計算過程を示し、税務・法務の断定は避けます。`}
};
const ORDER=["secretary","sales","planning","hr","se","design","general","accounting"];

let state = loadState();
let engine = null;
let currentView = "home";
let processing = false;

function uid(prefix){return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}
function now(){return new Date().toISOString()}
function loadState(){
  const raw=localStorage.getItem(STORAGE);
  if(raw){try{return JSON.parse(raw)}catch{}}
  return {company:{name:"AI COMPANY",owner:"代表",model:MODELS[0].id},projects:[],tasks:[],artifacts:[],activity:[],messages:[],active:new Set?{}:{} };
}
function persist(){localStorage.setItem(STORAGE,JSON.stringify(state))}
function safe(t){return String(t??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\":"&#92;","\"":"&quot;"}[c]))}
function fmtTime(ts){return new Date(ts).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
function toast(msg){const el=document.createElement("div");el.className="toast";el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2800)}
function log(action,detail,actor="システム"){state.activity.unshift({id:uid("log"),time:now(),action,detail,actor});state.activity=state.activity.slice(0,250);persist();renderAll()}

function deptOptions(includeSecretary=true){return ORDER.filter(id=>includeSecretary||id!=="secretary").map(id=>`<option value="${id}">${DEPTS[id].name}</option>`).join("")}
function renderOffice(){
  const el=document.querySelector("#office");
  el.innerHTML=ORDER.map(id=>{const d=DEPTS[id];const active=(state.tasks.some(t=>t.dept===id&&t.status==="doing"));return `<div class="room ${active?"active":""}" style="--dept:${d.color}" data-dept="${id}" title="${d.name}"><div class="room-head"><span>${safe(d.name)}</span><span class="work-dot"></span></div><div class="room-body"><span class="badge">${safe(d.short)}</span><div class="desk"><div class="monitor"></div></div><div class="chair"></div><div class="employee">${d.icon}</div></div></div>`}).join("");
}
function addMsg(actor,text,kind="ai"){
  state.messages.push({actor,text,kind,time:now()});state.messages=state.messages.slice(-80);persist();renderChat();
}
function renderChat(){
  const el=document.querySelector("#chatLog");
  if(!state.messages.length){addMsg("秘書","お疲れさまです。会社の業務を指示してください。全体指示なら必要な部署へ配分します。","ai");return}
  el.innerHTML=state.messages.map(m=>`<div class="message ${m.kind}"><div class="avatar">${safe(String(m.actor).slice(0,1))}</div><div class="bubble"><div class="msg-name">${safe(m.actor)} · ${fmtTime(m.time)}</div><div>${safe(m.text)}</div></div></div>`).join("");
  el.scrollTop=el.scrollHeight;
}
function artifactsByLatest(){return [...state.artifacts].sort((a,b)=>b.time-a.time)}
function artifactType(title,content){if(/^[{[]/.test(content.trim()))return "JSON";if(title.includes("CSV"))return "CSV";if(/<html|<div|<section/i.test(content))return "HTML";return "MD"}
function addArtifact(dept,title,content,taskId=null){const type=artifactType(title,content);const art={id:uid("art"),dept,title,content,type,time:Date.now(),taskId};state.artifacts.unshift(art);state.artifacts=state.artifacts.slice(0,100);persist();log("成果物作成",`${title}（${DEPTS[dept]?.name||dept}）`,DEPTS[dept]?.short||dept)}
function downloadArtifact(a){const ext=a.type.toLowerCase();const mime=ext==="json"?"application/json":ext==="html"?"text/html":ext==="csv"?"text/csv":"text/markdown";const blob=new Blob([a.content],{type:mime+";charset=utf-8"});const u=URL.createObjectURL(blob);const x=document.createElement("a");x.href=u;x.download=(a.title.replace(/[^\wぁ-んァ-ン一-龥ー-]+/g,"_")||"artifact")+`.`+ext;x.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}

function renderArtifacts(){
  const list=document.querySelector("#artifactGrid");const latest=artifactsByLatest();
  list.innerHTML=latest.length?latest.map(a=>`<article class="artifact-card"><h3>${safe(a.title)}</h3><p>${safe(a.content.slice(0,240))}${a.content.length>240?"…":""}</p><div class="art-foot"><span class="art-tag">${safe(a.type)} · ${safe(DEPTS[a.dept]?.name||a.dept)} · ${fmtTime(a.time)}</span><button class="btn btn-ghost" data-art="${a.id}">取得</button></div></article>`).join(""):`<div class="empty">成果物はまだありません。<br>AI社員へ仕事を依頼すると、ここに蓄積されます。</div>`;
  list.querySelectorAll("[data-art]").forEach(b=>b.onclick=()=>downloadArtifact(state.artifacts.find(a=>a.id===b.dataset.art)));
  const side=document.querySelector("#sideArtifacts");side.innerHTML=latest.slice(0,5).map(a=>`<div class="side-artifact"><div class="ico">▣</div><div style="min-width:0"><b>${safe(a.title)}</b><small>${safe(DEPTS[a.dept]?.short||a.dept)} · ${fmtTime(a.time)}</small></div><button class="icon-btn" data-side-art="${a.id}">↓</button></div>`).join("")||`<div class="muted" style="font-size:9px">まだありません。</div>`;
  side.querySelectorAll("[data-side-art]").forEach(b=>b.onclick=()=>downloadArtifact(state.artifacts.find(a=>a.id===b.dataset.sideArt)));
}
function renderPresence(){
  const running=ORDER.filter(id=>state.tasks.some(t=>t.dept===id&&t.status==="doing"));
  document.querySelector("#presenceList").innerHTML=ORDER.map(id=>{const d=DEPTS[id],a=running.includes(id);return `<div class="presence ${a?"active":""}"><div class="picon">${d.icon}</div><div><b>${safe(d.short)}</b><span>${safe(d.role)}</span></div><i></i></div>`}).join("");
  document.querySelector("#officeLoad").textContent=running.length?`${running.length}名が稼働中`:"待機中";
  document.querySelector("#companyState").textContent=running.length?"処理中":"待機中";
  document.querySelector("#kpiEmployees").textContent=`${running.length}/8`;
}
function renderStats(){
  const todo=state.tasks.filter(t=>t.status==="todo").length,doing=state.tasks.filter(t=>t.status==="doing").length,done=state.tasks.filter(t=>t.status==="done").length;
  document.querySelector("#todoStat").textContent=todo;document.querySelector("#doingStat").textContent=doing;document.querySelector("#doneStat").textContent=done;
  document.querySelector("#taskNavCount").textContent=todo+doing;document.querySelector("#artifactNavCount").textContent=state.artifacts.length;document.querySelector("#projectCount").textContent=state.projects.length;
  document.querySelector("#kpiProjects").textContent=state.projects.length;document.querySelector("#kpiTasks").textContent=state.tasks.length;document.querySelector("#kpiArtifacts").textContent=state.artifacts.length;
}
function renderProjects(){
  const el=document.querySelector("#projectBoard");
  el.innerHTML=state.projects.map(p=>{const ts=state.tasks.filter(t=>t.projectId===p.id);const done=ts.filter(t=>t.status==="done").length;return `<article class="project-card"><div class="pc-head"><h3>${safe(p.name)}</h3><span class="status-chip">${safe({active:"進行中",draft:"準備中",done:"完了"}[p.status]||p.status)}</span></div><p>${safe(p.goal||"目的未設定")}</p><div class="project-meta"><span>期限 ${safe(p.due||"未設定")}</span><span>${done}/${ts.length||0} タスク完了</span></div><div style="display:flex;gap:5px;margin-top:10px"><button class="btn btn-ghost" data-project-chat="${p.id}">この案件を指示</button><button class="btn btn-ghost" data-project-delete="${p.id}">削除</button></div></article>`}).join("")||`<div class="empty">案件はまだありません。新規案件を作成してください。</div>`;
  el.querySelectorAll("[data-project-chat]").forEach(b=>{b.onclick=()=>{document.querySelector("#prompt").value=`案件「${state.projects.find(p=>p.id===b.dataset.projectChat).name}」の進捗を整理して、次にやる仕事を提案して`;goView("home");document.querySelector("#prompt").focus()}});
  el.querySelectorAll("[data-project-delete]").forEach(b=>b.onclick=()=>{if(confirm("案件を削除しますか？関連タスクは残ります。")){state.projects=state.projects.filter(p=>p.id!==b.dataset.projectDelete);persist();log("案件削除",b.dataset.projectDelete);}});
}
function renderTasks(){
  const q=(document.querySelector("#taskSearch")?.value||"").toLowerCase();const f=document.querySelector("#taskFilter")?.value||"all";
  const rows=state.tasks.filter(t=>(f==="all"||t.status===f)&&(`${t.title} ${t.projectName||""} ${DEPTS[t.dept]?.name||""}`.toLowerCase().includes(q))).map(t=>`<tr><td><b>${safe(t.title)}</b><div class="muted">${safe(t.projectName||"単発タスク")}</div></td><td>${safe(DEPTS[t.dept]?.name||t.dept)}</td><td>${safe({todo:"未処理",doing:"進行中",done:"完了"}[t.status]||t.status)}</td><td>${safe(t.due||"-")}</td><td><div class="task-actions">${t.status!=="done"?`<button data-task-next="${t.id}">${t.status==="todo"?"開始":"完了"}</button>`:""}<button data-task-delete="${t.id}">削除</button></div></td></tr>`).join("");
  document.querySelector("#taskTable").innerHTML=rows?`<table class="task-table"><thead><tr><th>タスク</th><th>担当</th><th>状態</th><th>期限</th><th></th></tr></thead><tbody>${rows}</tbody></table>`:`<div class="empty">該当タスクはありません。</div>`;
  document.querySelectorAll("[data-task-next]").forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id===b.dataset.taskNext);t.status=t.status==="todo"?"doing":"done";persist();log("タスク更新",`${t.title} → ${t.status}`,DEPTS[t.dept].short)});
  document.querySelectorAll("[data-task-delete]").forEach(b=>b.onclick=()=>{state.tasks=state.tasks.filter(x=>x.id!==b.dataset.taskDelete);persist();log("タスク削除",b.dataset.taskDelete)});
}
function renderEmployees(){document.querySelector("#employeeGrid").innerHTML=ORDER.map(id=>{const d=DEPTS[id];return `<article class="employee-card"><div class="emp-top"><div class="emp-avatar">${d.icon}</div><div><h3>${d.name}</h3><small>${d.role}</small></div></div><p>${d.system.replaceAll("あなたはAI COMPANYの","").replaceAll("です。","").slice(0,120)}…</p><div class="skill-list">${d.skills.map(s=>`<span class="skill">${s}</span>`).join("")}</div></article>`}).join("")}
function renderActivity(){document.querySelector("#activityList").innerHTML=state.activity.length?state.activity.map(x=>`<div class="activity-item"><time>${fmtTime(x.time)}</time><span>${safe(x.actor)}</span><div><b>${safe(x.action)}</b> <span>${safe(x.detail)}</span></div></div>`).join(""):`<div class="empty">活動ログはありません。</div>`}
function renderNav(){document.querySelectorAll(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active-view",v.id===`view-${currentView}`))}
function goView(v){currentView=v;renderNav();if(v==="projects")renderProjects();if(v==="tasks")renderTasks();if(v==="artifacts")renderArtifacts()}
function renderAll(){renderOffice();renderPresence();renderStats();renderProjects();renderTasks();renderArtifacts();renderEmployees();renderActivity();renderNav()}

function chooseDepartments(prompt){
  const p=prompt.toLowerCase();const score={};ORDER.filter(x=>x!=="secretary").forEach(id=>score[id]=0);
  const keys={sales:["営業","スポンサー","企業","顧客","提案","商談","協賛"],planning:["企画","イベント","大会","計画","kpi","スケジュール","戦略"],hr:["採用","人事","研修","メンバー","スタッフ","人材"],se:["web","サイト","github","コード","システム","bot","discord","api","プログラム"],design:["デザイン","画像","sns","バナー","ロゴ","投稿","告知","動画"],general:["文書","申請","会議","総務","備品","規程","運営"],accounting:["経理","予算","収支","請求","見積","原価","費用","採算"]};
  for(const [id,words] of Object.entries(keys)) for(const w of words) if(p.includes(w)) score[id]++;
  return Object.entries(score).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([id])=>id).slice(0,5);
}
function createTask(title,dept,projectId=null){const p=state.projects.find(x=>x.id===projectId);const t={id:uid("task"),title,dept,status:"todo",due:"",projectId,projectName:p?.name||"",createdAt:now()};state.tasks.push(t);persist();log("タスク割当",`${title} → ${DEPTS[dept].name}`,"秘書");return t}
function markTask(id,status){const t=state.tasks.find(x=>x.id===id);if(t){t.status=status;persist();renderAll()}}

async function llm(messages,opts={}){
  if(!engine) throw new Error("AI未起動");
  const r=await engine.chat.completions.create({messages,temperature:opts.temperature??.45,max_tokens:opts.max_tokens??800});
  return r.choices?.[0]?.message?.content?.trim()||"";
}
function promptForArtifact(id){return `${DEPTS[id].system}\n\n実務成果物が適切な依頼なら、回答の最後に必ず「[成果物]」と書き、その下に完成版を出してください。成果物はコピペしてそのまま使える形にしてください。説明だけなら[成果物]は不要です。`}
function extractArtifact(text){const m=text.match(/(?:\[成果物\]|【成果物】)\s*([\s\S]*)/i);return m?m[1].trim():null}

async function runDepartment(deptId,userPrompt,context,taskId){
  const task=state.tasks.find(t=>t.id===taskId);if(task)markTask(taskId,"doing");
  addMsg(DEPTS[deptId].short,`着手：${userPrompt.slice(0,80)}${userPrompt.length>80?"…":""}`,"ai");
  const answer=await llm([{role:"system",content:promptForArtifact(deptId)},{role:"user",content:`社長からの依頼：${userPrompt}\n\n司令塔からの背景：${context||"直接依頼"}\n\n必要なら、担当部署として最優先で作るべき具体的なアウトプットを作成してください。`}],{temperature:deptId==="accounting"?.25:.5,max_tokens:950});
  addMsg(DEPTS[deptId].short,answer,"ai");
  const artifact=extractArtifact(answer);if(artifact){addArtifact(deptId,`${DEPTS[deptId].name} 成果物`,artifact,taskId)}
  if(task)markTask(taskId,"done");
  return answer;
}

async function companyDispatch(userPrompt){
  const selected=chooseDepartments(userPrompt);const deps=selected.length?selected:["planning","sales"];
  const plan=await llm([{role:"system",content:DEPTS.secretary.system+`\nあなたは今から部署を配分します。次の依頼について、実行順を最大5部署で決めます。候補部署：${deps.map(d=>DEPTS[d].name).join("、")}`},{role:"user",content:userPrompt}],{temperature:.35,max_tokens:500});
  addMsg("秘書",`【実行計画】\n${plan}`);
  let projectId=state.projects[0]?.id||null;
  for(const dept of deps){const task=createTask(`${userPrompt.slice(0,62)} / ${DEPTS[dept].short}`,dept,projectId);await runDepartment(dept,userPrompt,plan,task.id)}
  addMsg("秘書",`部署処理が完了しました。成果物 ${artifactsByLatest().length} 件を成果物倉庫へ保存しています。`);
}

async function send(){
  const text=document.querySelector("#prompt").value.trim();if(!text||processing)return;
  if(!engine){addMsg("システム","AIがまだ起動していません。画面上部の設定または再読み込みからAIを起動してください。","system");return}
  processing=true;document.querySelector("#sendBtn").disabled=true;document.querySelector("#processStatus").textContent="処理中…";addMsg("あなた",text,"user");document.querySelector("#prompt").value="";
  try{
    const target=document.querySelector("#targetSelect").value;
    if(target==="company") await companyDispatch(text);
    else {const task=createTask(text,target,null);await runDepartment(target,text,"直接指示",task.id)}
  }catch(e){console.error(e);addMsg("システム",`AI処理でエラーが発生しました。${e.message||e}`,"system");toast("AI処理に失敗しました")}
  processing=false;document.querySelector("#sendBtn").disabled=false;document.querySelector("#processStatus").textContent="待機中";renderAll();
}

async function startAI(){
  document.querySelector("#startBtn").disabled=true;document.querySelector("#bootStatus").textContent="ブラウザのGPUを確認中…";
  try{
    if(!navigator.gpu) throw new Error("WebGPUが利用できません。Chrome / Edgeの最新版を推奨します。");
    const model=state.company.model||MODELS[0].id;
    engine=await webllm.CreateMLCEngine(model,{initProgressCallback:p=>{document.querySelector("#bootStatus").textContent=p.text||"AIを準備中…"}});
    document.querySelector("#boot").classList.add("hidden");document.querySelector("#app").classList.remove("hidden");document.querySelector("#aiBadge").className="badge badge-green";document.querySelector("#aiBadge").textContent="● AI稼働中";document.querySelector("#companyNameInput").value=state.company.name;document.querySelector("#ownerNameInput").value=state.company.owner;addMsg("秘書","AI COMPANYを起動しました。今日の仕事を指示してください。","ai");renderAll();toast("AI社員オフィスが起動しました");
  }catch(e){document.querySelector("#bootStatus").textContent=e.message;document.querySelector("#startBtn").disabled=false;toast("AIを起動できませんでした")}
}
function openDemo(){document.querySelector("#boot").classList.add("hidden");document.querySelector("#app").classList.remove("hidden");document.querySelector("#aiBadge").className="badge badge-warn";document.querySelector("#aiBadge").textContent="● デモモード";addMsg("システム","デモモードです。案件・タスク・成果物管理のUIを確認できます。AIを使う場合はWebGPU環境で再読み込みしてください。","system");renderAll()}

function openProjectDialog(){document.querySelector("#projectName").value="";document.querySelector("#projectGoal").value="";document.querySelector("#projectDue").value="";document.querySelector("#projectDialog").showModal()}
function saveProject(e){e.preventDefault();const p={id:uid("project"),name:document.querySelector("#projectName").value.trim(),goal:document.querySelector("#projectGoal").value.trim(),due:document.querySelector("#projectDue").value,status:document.querySelector("#projectStatus").value,createdAt:now()};if(!p.name)return;state.projects.unshift(p);persist();document.querySelector("#projectDialog").close();log("案件作成",p.name,"社長");renderAll();toast("案件を作成しました")}
function openTaskDialog(){document.querySelector("#taskDept").innerHTML=deptOptions(true);document.querySelector("#taskProject").innerHTML=`<option value="">単発タスク</option>`+state.projects.map(p=>`<option value="${p.id}">${safe(p.name)}</option>`).join("");document.querySelector("#taskDialog").showModal()}
function saveTask(e){e.preventDefault();const dept=document.querySelector("#taskDept").value,pid=document.querySelector("#taskProject").value||null,p=state.projects.find(x=>x.id===pid);state.tasks.push({id:uid("task"),title:document.querySelector("#taskName").value.trim(),dept,status:"todo",due:document.querySelector("#taskDue").value,projectId:pid,projectName:p?.name||"",createdAt:now()});persist();document.querySelector("#taskDialog").close();log("手動タスク作成",document.querySelector("#taskName").value,DEPTS[dept].short);renderAll();toast("タスクを作成しました")}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=`ai-company-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast("バックアップを保存しました")}
function resetAll(){if(!confirm("ローカル保存している案件・タスク・成果物・ログ・会話を初期化します。よろしいですか？"))return;localStorage.removeItem(STORAGE);location.reload()}
function tick(){document.querySelector("#clock").textContent=new Date().toLocaleString("ja-JP",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})}

// Events
document.querySelector("#startBtn").onclick=startAI;document.querySelector("#demoBtn").onclick=openDemo;document.querySelector("#sendBtn").onclick=send;
document.querySelector("#prompt").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
document.querySelectorAll(".nav-item[data-view]").forEach(b=>b.onclick=()=>goView(b.dataset.view));
document.querySelector("#newProjectBtn").onclick=openProjectDialog;document.querySelector("#newProjectBtn2").onclick=openProjectDialog;document.querySelector("#projectForm").onsubmit=saveProject;document.querySelector("#newTaskBtn").onclick=openTaskDialog;document.querySelector("#taskForm").onsubmit=saveTask;
document.querySelector("#taskSearch").addEventListener("input",renderTasks);document.querySelector("#taskFilter").addEventListener("change",renderTasks);
document.querySelector("#settingsBtn").onclick=()=>{document.querySelector("#modelSelect").innerHTML=MODELS.map(m=>`<option value="${m.id}" ${m.id===state.company.model?"selected":""}>${m.label} / ${m.vram}</option>`).join("");document.querySelector("#companyNameInput").value=state.company.name;document.querySelector("#ownerNameInput").value=state.company.owner;document.querySelector("#settingsDialog").showModal()};
document.querySelector("#saveSettingsBtn").onclick=()=>{state.company.name=document.querySelector("#companyNameInput").value.trim()||"AI COMPANY";state.company.owner=document.querySelector("#ownerNameInput").value.trim()||"代表";state.company.model=document.querySelector("#modelSelect").value;persist();toast("設定を保存しました。AIモデル変更は再起動後に反映されます");}
document.querySelector("#quickBriefBtn").onclick=()=>{document.querySelector("#targetSelect").value="secretary";document.querySelector("#prompt").value="今日の会社の活動状況を確認し、タスク・案件・成果物から日報を作成してください。明日の優先事項も3つ挙げてください。";document.querySelector("#prompt").focus()};
document.querySelector("#clearArtifactsBtn").onclick=()=>{if(confirm("成果物をすべて削除しますか？")){state.artifacts=[];persist();log("成果物整理","成果物を全削除","社長")}};
document.querySelector("#clearLogBtn").onclick=()=>{if(confirm("活動ログを消去しますか？")){state.activity=[];persist();renderAll();}};
document.querySelector("#backupBtn").onclick=exportBackup;document.querySelector("#resetDataBtn").onclick=resetAll;

renderAll();setInterval(tick,1000);tick();
