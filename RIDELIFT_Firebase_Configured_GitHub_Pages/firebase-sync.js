/* RIDELIFT Firebase v2: individual per-day Firestore docs and explicit migration. */
import firebaseConfig from './firebase-config.js';

const appUI = window.RideLiftApp;
const cloud = (window.RideLiftCloud = {
  state: {mode: 'loading', text: '檢查 Firebase 設定中…'}
});
let fb = null, auth = null, db = null, currentUser = null;
let unsubscribeEntries = null, unsubscribeSettings = null;
let entriesLoaded = false, settingsLoaded = false, ready = false;
let remoteEntries = {}, remoteSettings = null;
let localShadow = null;
const pendingDays = new Map();
const timers = new Map();
let pendingSettings = null;
let settingsTimer = null;
let revision = 0;

const clone = v => JSON.parse(JSON.stringify(v));
const eq = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const hasSetup = config => ['apiKey','authDomain','projectId','appId'].every(k =>
  typeof config[k] === 'string' && config[k].trim() && !config[k].includes('YOUR_'));
function status(mode,text,rerender = true){
  const changedMode = cloud.state.mode !== mode;
  cloud.state = { mode, text };
  if(rerender && ready && changedMode) appUI.render();
  if(!ready){const chip=document.getElementById('cloud-status');if(chip){chip.textContent=mode==='error'?'⚠ 連線錯誤':mode==='loading'?'☁ 連線中':'◯ 本機紀錄';chip.title=text;}}
}
function readableError(e){
  const code = String(e?.code||'');
  if(code==='auth/unauthorized-domain')return '網域未授權：請將你的 GitHub Pages 主機名稱加入 Firebase Authentication → Settings → Authorized domains。';
  if(code==='auth/popup-blocked')return '瀏覽器封鎖登入視窗，請用 Safari／Chrome 開啟網站並允許彈出式視窗。';
  if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request')return '已取消 Google 登入。';
  if(code==='permission-denied')return 'Firestore 權限不足，請確認已發布 firestore.rules 並登入正確的 Google 帳號。';
  if(code==='unavailable')return 'Firestore 目前無法連線，請檢查網路後重試。';
  return `${code||'未知錯誤'}：${String(e?.message||'請檢查 Firebase 設定').slice(0,130)}`;
}
function stopListeners(){
  unsubscribeEntries?.();unsubscribeSettings?.();
  unsubscribeEntries=unsubscribeSettings=null;
  for(const t of timers.values())clearTimeout(t);
  timers.clear();clearTimeout(settingsTimer);settingsTimer=null;
  pendingDays.clear();pendingSettings=null;
  entriesLoaded=settingsLoaded=ready=false;
  remoteEntries={};remoteSettings=null;localShadow=null;
}
function dayRef(day){return fb.doc(db,'users',currentUser.uid,'entries',day)}
function settingsRef(){return fb.doc(db,'users',currentUser.uid,'profile','settings')}
function entriesRef(){return fb.collection(db,'users',currentUser.uid,'entries')}
function mergeIncoming(){
  if(!entriesLoaded||!settingsLoaded||!currentUser)return;
  ready=true;
  const current=appUI.getActiveStore();
  const records={...remoteEntries};
  // 尚在等待 Firestore 確認的本機編輯不應被較舊的 snapshot 蓋掉。
  for(const [day,item] of pendingDays){if(item.value===null)delete records[day];else records[day]=clone(item.value)}
  const merged={version:1,settings:pendingSettings?clone(pendingSettings.value):remoteSettings||appUI.getLocalStore().settings,entries:records,lastExport:null};
  // 狀態先更新，再渲染，避免頁面在已登入時仍顯示「正在載入」。
  const fromCache = !navigator.onLine;
  cloud.state={mode:'signed-in',text:`已登入 ${currentUser.email||'Google 帳號'} · ${Object.keys(records).length} 天紀錄${fromCache?' · 離線快取':''}`};
  if(!eq(localShadow,merged)){
    localShadow=clone(merged);
    if(!eq(current,merged))appUI.setCloudStore(merged);
  }
  status('signed-in',cloud.state.text,false);
  // 注意：讀取快取時不宣稱已完成伺服器同步。
  const chip=document.getElementById('cloud-status');if(chip){chip.textContent='☁ 已登入';chip.title=cloud.state.text;}
}
function attachListeners(user){
  stopListeners();currentUser=user;
  appUI.setCloudLoading();
  status('loading',`正在取得 ${user.email||'目前帳號'} 的雲端日誌…`,false);
  unsubscribeSettings=fb.onSnapshot(settingsRef(),{includeMetadataChanges:true},snap=>{
    remoteSettings=snap.exists()?(snap.data()?.settings||null):null;
    settingsLoaded=true;
    mergeIncoming();
    if(!snap.metadata.fromCache&&ready&&currentUser)
      status('signed-in',`已登入 ${currentUser.email||'Google 帳號'} · Firestore 已連線`);
  },err=>{status('error',readableError(err),false);appUI.setCloudStore({version:1,settings:remoteSettings,entries:remoteEntries});appUI.render();appUI.notify('雲端讀取失敗：'+readableError(err));});
  unsubscribeEntries=fb.onSnapshot(entriesRef(),{includeMetadataChanges:true},snap=>{
    const fresh={};
    for(const d of snap.docs){if(/^\d{4}-\d{2}-\d{2}$/.test(d.id))fresh[d.id]=d.data()?.value||{};}
    remoteEntries=fresh;entriesLoaded=true;
    mergeIncoming();
    if(!snap.metadata.fromCache&&ready&&currentUser)
      status('signed-in',`已登入 ${currentUser.email||'Google 帳號'} · Firestore 已連線`);
  },err=>{status('error',readableError(err),false);appUI.setCloudStore({version:1,settings:remoteSettings,entries:remoteEntries});appUI.render();appUI.notify('雲端讀取失敗：'+readableError(err));});
}
async function commitDay(day){
  timers.delete(day);
  if(!ready||!currentUser)return;
  const id=currentUser.uid;
  const item=pendingDays.get(day);
  if(!item)return;
  try{
    if(item.value===null)await fb.deleteDoc(fb.doc(db,'users',id,'entries',day));
    else await fb.setDoc(fb.doc(db,'users',id,'entries',day),{value:item.value,updatedAt:fb.serverTimestamp()});
    if(currentUser?.uid===id&&pendingDays.get(day)?.revision===item.revision){pendingDays.delete(day);mergeIncoming();}
  }catch(err){status('error',`日期 ${day} 上傳失敗：${readableError(err)}`);appUI.notify('同步失敗；請先匯出 JSON 備份。');}
}
async function commitSettings(){
  settingsTimer=null;
  if(!ready||!currentUser||!pendingSettings)return;
  const id=currentUser.uid,item=pendingSettings;
  try{
    await fb.setDoc(fb.doc(db,'users',id,'profile','settings'),{settings:item.value,updatedAt:fb.serverTimestamp()});
    if(currentUser?.uid===id&&pendingSettings?.revision===item.revision){pendingSettings=null;mergeIncoming();}
  }catch(err){status('error',`設定上傳失敗：${readableError(err)}`);appUI.notify('設定同步失敗，請匯出 JSON 備份。');}
}
window.addEventListener('ridelift:cloud-change',ev=>{
  if(!ready||!currentUser){appUI.notify('正在載入雲端，請稍候再編輯。');return;}
  const next=clone(ev.detail.store),before=localShadow||{settings:{},entries:{}};
  const oldDays=before.entries||{},newDays=next.entries||{};
  for(const day of new Set([...Object.keys(oldDays),...Object.keys(newDays)])){
    if(eq(oldDays[day],newDays[day]))continue;
    const value=Object.prototype.hasOwnProperty.call(newDays,day)?clone(newDays[day]):null;
    pendingDays.set(day,{revision:++revision,value});
    clearTimeout(timers.get(day));
    timers.set(day,setTimeout(()=>commitDay(day),700));
  }
  if(!eq(before.settings,next.settings)){
    pendingSettings={revision:++revision,value:clone(next.settings)};
    clearTimeout(settingsTimer);settingsTimer=setTimeout(commitSettings,400);
  }
  localShadow=next;
});
async function login(){
  if(!auth){appUI.notify('尚未設定 Firebase，請先編輯 firebase-config.js。');return;}
  try{await fb.signInWithPopup(auth,new fb.GoogleAuthProvider())}
  catch(err){status('signed-out',readableError(err));appUI.notify(readableError(err));}
}
async function logout(){
  if(!auth)return;
  if(pendingDays.size||pendingSettings){
    if(!confirm('目前有尚未確認上傳的變更，現在登出可能延遲同步。建議先確認網路正常並等待同步完成。仍要登出嗎？'))return;
  }
  try{await fb.signOut(auth)}catch(err){appUI.notify(readableError(err))}
}
async function uploadLocal(){
  if(!currentUser||!ready){appUI.notify('請先登入並完成雲端資料載入。');return;}
  if(!navigator.onLine){appUI.notify('合併舊資料需要連上網路，請稍後重試。');return;}
  const saved=appUI.getLocalStore();
  const source=Object.entries(saved.entries||{});
  if(!source.length){appUI.notify('這個瀏覽器沒有需要匯入的舊版本機紀錄。');return;}
  const userId=currentUser.uid;
  if(!confirm(`確定要把這個瀏覽器原本的 ${source.length} 天紀錄合併到目前 Google 帳號？\n同日期已存在的雲端紀錄會保留，不覆蓋。`))return;
  try{
    const [serverDays,serverProfile]=await Promise.all([
      fb.getDocsFromServer(entriesRef()),fb.getDocFromServer(settingsRef())
    ]);
    if(currentUser?.uid!==userId)throw Error('登入帳號已切換，已取消');
    const existing=new Set(serverDays.docs.map(d=>d.id));
    const missing=source.filter(([date])=>!existing.has(date));
    let written=0;
    for(let i=0;i<missing.length;i+=350){
      const part=missing.slice(i,i+350),batch=fb.writeBatch(db);
      for(const [day,value] of part)batch.set(fb.doc(db,'users',userId,'entries',day),{value,updatedAt:fb.serverTimestamp()});
      await batch.commit();written+=part.length;
    }
    if(!serverProfile.exists())await fb.setDoc(fb.doc(db,'users',userId,'profile','settings'),{settings:saved.settings,updatedAt:fb.serverTimestamp()});
    appUI.notify(`已新增 ${written} 天到雲端；保留 ${source.length-written} 天原有雲端紀錄。`);
  }catch(err){status('error','合併舊資料失敗：'+readableError(err));appUI.notify('本機資料沒有刪除，請確認網路與 Firestore 規則。')}
}
window.addEventListener('ridelift:cloud-action',ev=>{
  const a=ev.detail.action;
  if(a==='cloud-login')login();
  if(a==='cloud-signout')logout();
  if(a==='cloud-upload')uploadLocal();
  if(a==='cloud-retry')currentUser?attachListeners(currentUser):login();
});

if(!hasSetup(firebaseConfig)){
  status('unconfigured','尚未設定 Firebase，現在使用本機模式。');
  appUI.render();
}else{
  try{
    // SDK 以官方 CDN 固定版本載入，不需要 npm / 打包工具。
    const base='https://www.gstatic.com/firebasejs/13.1.0/';
    const [core,authSdk,firestoreSdk]=await Promise.all([
      import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')
    ]);
    fb={...core,...authSdk,...firestoreSdk};
    const app=fb.initializeApp(firebaseConfig);
    auth=fb.getAuth(app);
    // 只有在個人、可信任的裝置使用。快取本身不提供獨立於瀏覽器的加密。
    try{db=fb.initializeFirestore(app,{localCache:fb.persistentLocalCache({tabManager:fb.persistentMultipleTabManager()})});}
    catch(e){db=fb.getFirestore(app)}
    fb.onAuthStateChanged(auth,user=>{
      if(!user){stopListeners();currentUser=null;appUI.useLocalStore();status('signed-out','尚未登入 · 目前是本機紀錄');appUI.render();}
      else{attachListeners(user)}
    },err=>{status('error',readableError(err));appUI.notify('Firebase 登入驗證失敗');});
  }catch(err){console.error(err);status('error','Firebase SDK 無法載入，請檢查網路、SDK 版本或 firebase-config.js');appUI.render();}
}
