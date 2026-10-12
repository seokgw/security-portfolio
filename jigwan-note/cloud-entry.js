(() => {
  'use strict';

  const KEY = 'jigwan-note-records-v1';
  const BUCKET = 'jigwan-watch-photos';
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
  function authErrorText(error){
    const code=error?.code||'',raw=error?.message||'';
    if(code==='invalid_credentials'||/Invalid login credentials/i.test(raw))return'로그인하지 못했어요. 이메일과 비밀번호를 다시 확인해 주세요. 기존 plan-do-see 계정이 있다면 같은 계정으로 로그인할 수 있어요.';
    if(code==='email_not_confirmed'||/Email not confirmed/i.test(raw))return'아직 이메일 인증이 완료되지 않았어요. 받은편지함과 스팸함에서 가입 확인 메일을 확인해 주세요.';
    if(code==='user_already_exists'||/already registered/i.test(raw))return'이미 가입된 계정이에요. 기존 이메일과 비밀번호로 로그인해 주세요.';
    if(code==='over_email_send_rate_limit'||/email rate limit/i.test(raw))return'이메일 전송 한도에 도달했어요. 잠시 후 다시 시도해 주세요. 이미 가입했다면 로그인해 주세요.';
    if(code==='over_request_rate_limit'||error?.status===429)return'요청이 너무 많아요. 잠시 기다린 뒤 다시 시도해 주세요.';
    if(code==='email_address_not_authorized'||/email address not authorized/i.test(raw))return'현재 메일 발송 설정으로는 이 주소에 인증 메일을 보낼 수 없어요. 서비스 관리자에게 문의해 주세요.';
    if(code==='email_address_invalid'||/invalid email/i.test(raw))return'이메일 주소 형식을 확인해 주세요.';
    if(code==='weak_password'||/password.*(weak|least)/i.test(raw))return'더 안전한 비밀번호가 필요해요. 8자 이상으로 만들고 영문·숫자·기호를 함께 사용해 주세요.';
    if(/fetch|network/i.test(raw)||error?.name==='AuthRetryableFetchError')return'서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
    return signUpMode?'회원가입 요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.':'로그인 요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
  function mapRow(row){return{id:row.id,gameDate:row.game_date,stadium:row.stadium,favoriteTeam:row.favorite_team||'',opponentTeam:row.opponent_team,favoriteScore:row.favorite_score??'',opponentScore:row.opponent_score??'',result:row.result,seat:row.seat||'',review:row.review||'',photos:row.photos||[],createdAt:row.created_at,updatedAt:row.updated_at};}
  async function signPhotoUrls(rows){return Promise.all(rows.map(async row=>{const record=mapRow(row);record.photos=await Promise.all(record.photos.map(async photo=>{if(!photo.path)return photo;const{data,error}=await client.storage.from(BUCKET).createSignedUrl(photo.path,3600);if(error)throw error;return{...photo,src:data.signedUrl,urlExpiresAt:Date.now()+3600000};}));return record;}));}
  async function loadRecords(){const{data,error}=await client.schema('jigwan').from('jigwan_watch_records').select('*').order('game_date',{ascending:false}).order('created_at',{ascending:false});if(error)throw error;const records=await signPhotoUrls(data||[]);memory.set(KEY,JSON.stringify(records));return records;}
  function databaseRow(record,photos,ownerId){return{id:record.id,user_id:ownerId,game_date:record.gameDate,stadium:record.stadium,favorite_team:record.favoriteTeam||'',opponent_team:record.opponentTeam,favorite_score:record.favoriteScore===''||record.favoriteScore==null?null:Number(record.favoriteScore),opponent_score:record.opponentScore===''||record.opponentScore==null?null:Number(record.opponentScore),result:record.result,seat:record.seat||'',review:record.review||'',photos,created_at:record.createdAt,updated_at:record.updatedAt};}
  async function uploadPhoto(record,photo,ownerId){if(photo.path)return{id:photo.id,path:photo.path};if(!photo.src?.startsWith('data:image/'))throw Error('사진 데이터를 확인할 수 없습니다. 다시 첨부해 주세요.');const blob=await(await fetch(photo.src)).blob(),photoId=photo.id||crypto.randomUUID(),path=`${ownerId}/${record.id}/${photoId}.jpg`,{error}=await client.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',upsert:true});if(error)throw error;return{id:photoId,path};}
  async function persistSnapshot(snapshot,ownerId){const records=JSON.parse(snapshot);if(!Array.isArray(records))throw Error('기록 형식이 올바르지 않습니다.');const thisMutation=++mutation,{data:oldRows,error:readError}=await client.schema('jigwan').from('jigwan_watch_records').select('id,photos');if(readError)throw readError;const existing=new Map((oldRows||[]).map(row=>[row.id,row])),incomingIds=new Set(records.map(record=>record.id)),saved=[];
    for(const record of records){const previous=existing.get(record.id),photos=await Promise.all((record.photos||[]).map(photo=>uploadPhoto(record,photo,ownerId))),{error}=await client.schema('jigwan').from('jigwan_watch_records').upsert(databaseRow(record,photos,ownerId),{onConflict:'id'});if(error)throw error;if(previous){const keep=new Set(photos.map(photo=>photo.path)),removed=(previous.photos||[]).map(photo=>photo.path).filter(path=>path&&!keep.has(path));if(removed.length){const{error:removeError}=await client.storage.from(BUCKET).remove(removed);if(removeError)throw removeError;}}
      const photoUrls=await Promise.all(photos.map(async photo=>{const{data,error:urlError}=await client.storage.from(BUCKET).createSignedUrl(photo.path,3600);if(urlError)throw urlError;return{...photo,src:data.signedUrl,urlExpiresAt:Date.now()+3600000};}));saved.push({...record,photos:photoUrls});}
    for(const[id,previous]of existing){if(incomingIds.has(id))continue;const{error}=await client.schema('jigwan').from('jigwan_watch_records').delete().eq('id',id);if(error)throw error;const paths=(previous.photos||[]).map(photo=>photo.path).filter(Boolean);if(paths.length){const{error:removeError}=await client.storage.from(BUCKET).remove(paths);if(removeError)throw removeError;}}
    if(thisMutation===mutation)memory.set(KEY,JSON.stringify(saved));}
  async function startSession(session){const sessionUser=session?.user;if(!sessionUser){user=null;showGate('plan-do-see 계정이 있다면 같은 이메일과 비밀번호로 로그인해 주세요.');return;}user=sessionUser;try{const records=await loadRecords();if(user?.id!==sessionUser.id)return;enterApp();if(!runtimeStarted){runtimeStarted=true;const script=document.createElement('script');script.src='app.js';script.onload=()=>document.dispatchEvent(new CustomEvent('jigwan-records-loaded',{detail:records}));document.body.appendChild(script);}else document.dispatchEvent(new CustomEvent('jigwan-records-loaded',{detail:records}));}catch(error){if(user?.id===sessionUser.id){user=null;showGate('로그인은 완료됐지만 기록을 불러오지 못했어요. 잠시 후 다시 로그인해 주세요.',true);console.error('직관 기록 조회 실패:',error);}}}

  // 직관 기록은 메모리에만 저장하고, 레코드는 Supabase DB에 저장합니다.
  Object.defineProperty(window,'localStorage',{configurable:true,value:{
    getItem(key){return key===KEY?(memory.get(key)??null):nativeStorage.getItem(key);},
    setItem(key,value){if(key!==KEY)return nativeStorage.setItem(key,value);memory.set(key,String(value));if(user){const ownerId=user.id,snapshot=String(value);writeQueue=writeQueue.then(()=>persistSnapshot(snapshot,ownerId)).then(()=>document.dispatchEvent(new Event('jigwan-cloud-saved'))).catch(error=>{console.error('클라우드 기록 저장 실패:',error);document.dispatchEvent(new CustomEvent('jigwan-cloud-error',{detail:errorText(error)}));});}},
    removeItem(key){if(key===KEY)memory.delete(KEY);else nativeStorage.removeItem(key);},clear(){memory.delete(KEY);nativeStorage.clear();}
  }});

  const config=window.JIGWAN_SUPABASE_CONFIG||{};if(!config.url||!config.anonKey||!window.supabase?.createClient){showGate('Supabase 연결 설정이 필요합니다. supabase-config.js와 README를 확인해 주세요.',true);submitButton.disabled=true;modeButton.disabled=true;return;}
  client=window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  modeButton.addEventListener('click',()=>{signUpMode=!signUpMode;document.getElementById('authTitle').textContent=signUpMode?'직관노트 회원가입':'직관노트 로그인';document.getElementById('authIntro').textContent=signUpMode?'처음 이용한다면 새 계정을 만들어 주세요. plan-do-see 계정이 있다면 바로 로그인할 수 있어요.':'나의 직관 기록을 확인해 보세요. plan-do-see 계정도 사용할 수 있어요.';submitButton.textContent=signUpMode?'회원가입':'로그인';modeButton.textContent=signUpMode?'이미 계정이 있나요? 로그인':'처음 이용하시나요? 회원가입';document.getElementById('authPassword').minLength=signUpMode?8:1;document.getElementById('authPassword').autocomplete=signUpMode?'new-password':'current-password';document.getElementById('authPassword').placeholder=signUpMode?'8자 이상 비밀번호':'비밀번호를 입력해 주세요';showMessage('');});
  authForm.addEventListener('submit',async event=>{event.preventDefault();const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value;if(signUpMode&&password.length<8)return showMessage('비밀번호는 8자 이상 입력해 주세요.',true);submitButton.disabled=true;showMessage(signUpMode?'계정을 만들고 있습니다…':'로그인 중…');try{const result=signUpMode?await client.auth.signUp({email,password,options:{emailRedirectTo:new URL("/",window.location.href).href}}):await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(signUpMode&&!result.data.session){showMessage('회원가입 요청을 확인했어요. 처음 가입한 경우 인증 메일이 도착하면 인증 후 로그인해 주세요. 이미 가입된 이메일이라면 메일이 다시 오지 않을 수 있으니 기존 계정으로 로그인해 주세요.');return;}showMessage('');await startSession(result.data.session);}catch(error){showMessage(authErrorText(error),true);}finally{submitButton.disabled=false;}});
  document.getElementById('signOutButton').addEventListener('click',async()=>{try{await writeQueue;const{error}=await client.auth.signOut();if(error)throw error;}catch(error){document.dispatchEvent(new CustomEvent('jigwan-cloud-error',{detail:errorText(error)}));}});
  async function refresh(){const records=await loadRecords();document.dispatchEvent(new CustomEvent('jigwan-records-loaded',{detail:records}));}
  for(const name of ['jigwan-refresh-records','jigwan-photo-urls-expired'])document.addEventListener(name,()=>{refreshQueue=refreshQueue.then(refresh).catch(error=>document.dispatchEvent(new CustomEvent('jigwan-cloud-error',{detail:errorText(error)})));});
  document.addEventListener('jigwan-cloud-error',event=>{const toast=document.getElementById('toast');toast.textContent=`서버 저장에 실패했습니다: ${event.detail}`;toast.classList.add('is-visible');setTimeout(()=>toast.classList.remove('is-visible'),5000);});
  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){user=null;lastUserId=null;memory.delete(KEY);document.dispatchEvent(new CustomEvent('jigwan-records-loaded',{detail:[]}));document.getElementById('editorDialog').close();document.getElementById('detailDialog').close();showGate('로그아웃했습니다. 다시 로그인해 기록을 확인하세요.');}else if(event==='SIGNED_IN'&&session?.user&&lastUserId!==session.user.id){lastUserId=session.user.id;setTimeout(()=>startSession(session),0);}});
  client.auth.getSession().then(({data,error})=>{if(error)return showGate(`인증 상태를 확인하지 못했습니다: ${errorText(error)}`,true);if(data.session?.user)lastUserId=data.session.user.id;startSession(data.session);});
})();
