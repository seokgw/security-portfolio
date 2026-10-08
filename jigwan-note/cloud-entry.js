(() => {
  'use strict';

  const KEY = 'jigwan-note-records-v1';
  const BUCKET = 'watch-photos';
  const gate = document.getElementById('accountGate');
  const appShell = document.querySelector('.app-shell');
  const authForm = document.getElementById('authForm');
  const authMessage = document.getElementById('authMessage');
  const modeButton = document.getElementById('authModeButton');
  const submitButton = document.getElementById('authSubmit');
  const nativeStorage = window.localStorage;
  const memory = new Map();
  let client, user=null, signUpMode=false, runtimeStarted=false, lastUserId=null, mutation=0;
  let writeQueue=Promise.resolve(), refreshQueue=Promise.resolve();

  function showMessage(text,isError=false){authMessage.textContent=text;authMessage.classList.toggle('is-error',isError);authMessage.hidden=!text;}
  function showGate(text,isError=false){gate.hidden=false;appShell.hidden=true;showMessage(text,isError);}
  function enterApp(){gate.hidden=true;appShell.hidden=false;document.getElementById('accountEmail').textContent=user.email||'내 계정';}
  function errorText(error){const raw=error?.message||'요청을 완료하지 못했습니다.';if(/Invalid login credentials/i.test(raw))return'이메일 또는 비밀번호를 확인해 주세요.';if(/Email not confirmed/i.test(raw))return'이메일 인증을 완료한 뒤 로그인해 주세요.';if(/already registered/i.test(raw))return'이미 가입된 이메일입니다. 로그인해 주세요.';return raw;}
  function mapRow(row){return{id:row.id,gameDate:row.game_date,stadium:row.stadium,favoriteTeam:row.favorite_team||'',opponentTeam:row.opponent_team,favoriteScore:row.favorite_score??'',opponentScore:row.opponent_score??'',result:row.result,seat:row.seat||'',review:row.review||'',photos:row.photos||[],createdAt:row.created_at,updatedAt:row.updated_at};}
  async function signPhotoUrls(rows){return Promise.all(rows.map(async row=>{const record=mapRow(row);record.photos=await Promise.all(record.photos.map(async photo=>{if(!photo.path)return photo;const{data,error}=await client.storage.from(BUCKET).createSignedUrl(photo.path,3600);if(error)throw error;return{...photo,src:data.signedUrl,urlExpiresAt:Date.now()+3600000};}));return record;}));}
  async function loadRecords(){const{data,error}=await client.from('watch_records').select('*').order('game_date',{ascending:false}).order('created_at',{ascending:false});if(error)throw error;const records=await signPhotoUrls(data||[]);memory.set(KEY,JSON.stringify(records));return records;}
  function databaseRow(record,photos,ownerId){return{id:record.id,user_id:ownerId,game_date:record.gameDate,stadium:record.stadium,favorite_team:record.favoriteTeam||'',opponent_team:record.opponentTeam,favorite_score:record.favoriteScore===''||record.favoriteScore==null?null:Number(record.favoriteScore),opponent_score:record.opponentScore===''||record.opponentScore==null?null:Number(record.opponentScore),result:record.result,seat:record.seat||'',review:record.review||'',photos,created_at:record.createdAt,updated_at:record.updatedAt};}
  async function uploadPhoto(record,photo,ownerId){if(photo.path)return{id:photo.id,path:photo.path};if(!photo.src?.startsWith('data:image/'))throw Error('사진 데이터를 확인할 수 없습니다. 다시 첨부해 주세요.');const blob=await(await fetch(photo.src)).blob(),photoId=photo.id||crypto.randomUUID(),path=`${ownerId}/${record.id}/${photoId}.jpg`,{error}=await client.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',upsert:true});if(error)throw error;return{id:photoId,path};}
  async function persistSnapshot(snapshot,ownerId){const records=JSON.parse(snapshot);if(!Array.isArray(records))throw Error('기록 형식이 올바르지 않습니다.');const thisMutation=++mutation,{data:oldRows,error:readError}=await client.from('watch_records').select('id,photos');if(readError)throw readError;const existing=new Map((oldRows||[]).map(row=>[row.id,row])),incomingIds=new Set(records.map(record=>record.id)),saved=[];
    for(const record of records){const previous=existing.get(record.id),photos=await Promise.all((record.photos||[]).map(photo=>uploadPhoto(record,photo,ownerId))),{error}=await client.from('watch_records').upsert(databaseRow(record,photos,ownerId),{onConflict:'id'});if(error)throw error;if(previous){const keep=new Set(photos.map(photo=>photo.path)),removed=(previous.photos||[]).map(photo=>photo.path).filter(path=>path&&!keep.has(path));if(removed.length){const{error:removeError}=await client.storage.from(BUCKET).remove(removed);if(removeError)throw removeError;}}
      const photoUrls=await Promise.all(photos.map(async photo=>{const{data,error:urlError}=await client.storage.from(BUCKET).createSignedUrl(photo.path,3600);if(urlError)throw urlError;return{...photo,src:data.signedUrl,urlExpiresAt:Date.now()+3600000};}));saved.push({...record,photos:photoUrls});}
    for(const[id,previous]of existing){if(incomingIds.has(id))continue;const{error}=await client.from('watch_records').delete().eq('id',id);if(error)throw error;const paths=(previous.photos||[]).map(photo=>photo.path).filter(Boolean);if(paths.length){const{error:removeError}=await client.storage.from(BUCKET).remove(paths);if(removeError)throw removeError;}}
    if(thisMutation===mutation)memory.set(KEY,JSON.stringify(saved));}
  async function startSession(session){const sessionUser=session?.user;if(!sessionUser){user=null;showGate('이메일과 비밀번호로 로그인하거나 계정을 만드세요.');return;}user=sessionUser;try{const records=await loadRecords();if(user?.id!==sessionUser.id)return;enterApp();if(!runtimeStarted){runtimeStarted=true;const script=document.createElement('script');script.src='app.js';script.onload=()=>document.dispatchEvent(new CustomEvent('jigwan-records-loaded',{detail:records}));document.body.appendChild(script);}else document.dispatchEvent(new CustomEvent('jigwan-records-loaded',{detail:records}));}catch(error){if(user?.id===sessionUser.id){user=null;showGate(`데이터베이스 연결에 실패했습니다: ${errorText(error)}`,true);}}}

  // 직관 기록은 메모리에만 저장하고, 레코드는 Supabase DB에 저장합니다.
  Object.defineProperty(window,'localStorage',{configurable:true,value:{
    getItem(key){return key===KEY?(memory.get(key)??null):nativeStorage.getItem(key);},
    setItem(key,value){if(key!==KEY)return nativeStorage.setItem(key,value);memory.set(key,String(value));if(user){const ownerId=user.id,snapshot=String(value);writeQueue=writeQueue.then(()=>persistSnapshot(snapshot,ownerId)).then(()=>document.dispatchEvent(new Event('jigwan-cloud-saved'))).catch(error=>{console.error('클라우드 기록 저장 실패:',error);document.dispatchEvent(new CustomEvent('jigwan-cloud-error',{detail:errorText(error)}));});}},
    removeItem(key){if(key===KEY)memory.delete(KEY);else nativeStorage.removeItem(key);},clear(){memory.delete(KEY);nativeStorage.clear();}
  }});

  const config=window.JIGWAN_SUPABASE_CONFIG||{};if(!config.url||!config.anonKey||!window.supabase?.createClient){showGate('Supabase 연결 설정이 필요합니다. supabase-config.js와 README를 확인해 주세요.',true);submitButton.disabled=true;modeButton.disabled=true;return;}
  client=window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  modeButton.addEventListener('click',()=>{signUpMode=!signUpMode;document.getElementById('authTitle').textContent=signUpMode?'새 계정 만들기':'직관노트 로그인';document.getElementById('authIntro').textContent=signUpMode?'이메일과 비밀번호로 개인 계정을 등록하세요.':'계정에 로그인해 나의 기록을 확인하세요.';submitButton.textContent=signUpMode?'회원가입':'로그인';modeButton.textContent=signUpMode?'이미 계정이 있어요':'처음이신가요? 회원가입';showMessage('');});
  authForm.addEventListener('submit',async event=>{event.preventDefault();const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value;if(password.length<8)return showMessage('비밀번호는 8자 이상 입력해 주세요.',true);submitButton.disabled=true;showMessage(signUpMode?'계정을 만들고 있습니다…':'로그인 중…');try{const result=signUpMode?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(signUpMode&&!result.data.session){showMessage('가입 확인 이메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.');return;}showMessage('');await startSession(result.data.session);}catch(error){showMessage(errorText(error),true);}finally{submitButton.disabled=false;}});
  document.getElementById('signOutButton').addEventListener('click',async()=>{try{await writeQueue;const{error}=await client.auth.signOut();if(error)throw error;}catch(error){document.dispatchEvent(new CustomEvent('jigwan-cloud-error',{detail:errorText(error)}));}});
  async function refresh(){const records=await loadRecords();document.dispatchEvent(new CustomEvent('jigwan-records-loaded',{detail:records}));}
  for(const name of ['jigwan-refresh-records','jigwan-photo-urls-expired'])document.addEventListener(name,()=>{refreshQueue=refreshQueue.then(refresh).catch(error=>document.dispatchEvent(new CustomEvent('jigwan-cloud-error',{detail:errorText(error)})));});
  document.addEventListener('jigwan-cloud-error',event=>{const toast=document.getElementById('toast');toast.textContent=`서버 저장에 실패했습니다: ${event.detail}`;toast.classList.add('is-visible');setTimeout(()=>toast.classList.remove('is-visible'),5000);});
  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){user=null;lastUserId=null;memory.delete(KEY);document.dispatchEvent(new CustomEvent('jigwan-records-loaded',{detail:[]}));document.getElementById('editorDialog').close();document.getElementById('detailDialog').close();showGate('로그아웃했습니다. 다시 로그인해 기록을 확인하세요.');}else if(event==='SIGNED_IN'&&session?.user&&lastUserId!==session.user.id){lastUserId=session.user.id;setTimeout(()=>startSession(session),0);}});
  client.auth.getSession().then(({data,error})=>{if(error)return showGate(`인증 상태를 확인하지 못했습니다: ${errorText(error)}`,true);if(data.session?.user)lastUserId=data.session.user.id;startSession(data.session);});
})();
