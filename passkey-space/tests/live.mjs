// Explicit manual command only; creates throwaway sample accounts on the HTTPS deployment.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const origin = process.env.LIVE_ORIGIN;
if (!origin?.startsWith('https://')) throw Error('Set LIVE_ORIGIN to the HTTPS deployment');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const results = [];
const req = (path, data, method='POST') => context.request.fetch(origin+'/api'+path, { method, headers: { Origin: origin, 'Content-Type':'application/json' }, ...(method==='GET'?{}:{data:data||{}}) });
async function check(label, response, expected) { const body=await response.json(); assert.equal(response.status(), expected, label); results.push({request:label,status:response.status(),response:body.error?{error:body.error}:{ok:true}}); return body; }
async function options(path,data) { const r=await req(path,data); assert.equal(r.status(),200,await r.text()); return r.json(); }
async function register(accountName,name) { const f=await options('/passkey/register/options',{accountName,name}); const credential=await page.evaluate(optionsJSON=>SimpleWebAuthnBrowser.startRegistration({optionsJSON}),f.options); await check('POST register/verify '+name,await req('/passkey/register/verify',{challengeId:f.challengeId,credential}),200); return credential.id; }
async function assertion(accountName) { const f=await options('/passkey/login/options',{accountName}); const credential=await page.evaluate(optionsJSON=>SimpleWebAuthnBrowser.startAuthentication({optionsJSON}),f.options); return {challengeId:f.challengeId,credential}; }
async function addAuth() { return (await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'usb',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}})).authenticatorId; }
const stamp=Date.now().toString(36), aName='Evidence-A-'+stamp,bName='Evidence-B-'+stamp;
try {
  await cdp.send('WebAuthn.enable'); const one=await addAuth();
  await page.goto(origin); await page.waitForFunction(()=>!!window.SimpleWebAuthnBrowser);
  await check('GET /api/private without cookie',await req('/private',null,'GET'),401);
  const a1=await register(aName,'검증용 노트북');
  const a=(await (await req('/session',null,'GET')).json()).account.id;
  const material=await check('Create encrypted note',await req('/vault',{kind:'note',title:'운영 검증 메모',text:'가상 데이터만 사용하는 저장 검사'}),201);
  const original=await (await req(`/vault/${material.id}`,null,'GET')).json();
  await check('Update own note',await req(`/vault/${material.id}`,{title:'운영 검증 메모',text:'수정 후 보관한 가상 내용',updated:original.updated},'PUT'),200);
  const uploaded=await check('Upload private file',await req('/vault',{kind:'file',title:'운영 검증 파일',filename:'test.txt',base64:Buffer.from('sample file').toString('base64')}),201);
  assert.equal(await (await req(`/vault/${uploaded.id}/download`,null,'GET')).text(),'sample file');
  await cdp.send('WebAuthn.setAutomaticPresenceSimulation',{authenticatorId:one,enabled:false}); const two=await addAuth();
  const a2=await register(undefined,'검증용 두 번째 키');
  await page.reload(); await page.waitForSelector('#authenticated:not([hidden])');
  mkdirSync('docs/task8/evidence',{recursive:true});
  await page.screenshot({path:'docs/task8/evidence/04-live-https.png',fullPage:true});
  const cookies=(await context.cookies()).map(c=>c.name+'='+c.value).join('; ');
  await req('/logout');
  await check('GET private with logged-out cookie',await context.request.get(origin+'/api/private',{headers:{Cookie:cookies}}),401);
  const b1=await register(bName,'검증용 B 키');
  const b=(await (await req('/session',null,'GET')).json()).account.id;
  await check('B GET /api/private?userId=A',await req('/private?userId='+a,null,'GET'),403);
  await check('B cannot read A note',await req(`/vault/${material.id}`,null,'GET'),404);
  await check('B cannot download A file',await req(`/vault/${uploaded.id}/download`,null,'GET'),404);
  await check('B cannot delete A note',await req(`/vault/${material.id}`,{},'DELETE'),404);
  await req('/logout');
  const bad=await assertion(aName);const sig=Buffer.from(bad.credential.response.signature,'base64url');sig[sig.length-1]^=1;bad.credential.response.signature=sig.toString('base64url');
  await check('POST login/verify bad signature',await req('/passkey/login/verify',bad),401);
  const good=await assertion(aName); await check('POST login/verify correct signature',await req('/passkey/login/verify',good),200);
  await check('POST login/verify replay',await req('/passkey/login/verify',good),400);
  assert.equal((await (await req(`/vault/${material.id}`,null,'GET')).json()).text,'수정 후 보관한 가상 내용');
  await check('Delete own note',await req(`/vault/${material.id}`,{},'DELETE'),200);
  await check('Delete own file',await req(`/vault/${uploaded.id}`,{},'DELETE'),200);
  await check('A GET /api/private?userId=B',await req('/private?userId='+b,null,'GET'),403);
  await check('A POST /api/private accountId=B',await req('/private',{accountId:b}),403);
  await check('DELETE first passkey',await req('/passkeys/'+a1,{},'DELETE'),200);
  await check('Remaining passkey login',await req('/passkey/login/verify',await assertion(aName)),200);
  await req('/logout');const f=await options('/passkey/login/options',{accountName:aName});
  await cdp.send('WebAuthn.setAutomaticPresenceSimulation',{authenticatorId:two,enabled:false});await cdp.send('WebAuthn.setAutomaticPresenceSimulation',{authenticatorId:one,enabled:true});
  const deleted=await page.evaluate(optionsJSON=>SimpleWebAuthnBrowser.startAuthentication({optionsJSON}),{...f.options,allowCredentials:[{id:a1,type:'public-key',transports:['usb']}]});
  await check('Deleted passkey with fresh challenge',await req('/passkey/login/verify',{challengeId:f.challengeId,credential:deleted}),401);
  await cdp.send('WebAuthn.setAutomaticPresenceSimulation',{authenticatorId:one,enabled:false});await cdp.send('WebAuthn.setAutomaticPresenceSimulation',{authenticatorId:two,enabled:true});
  await req('/passkey/login/verify',await assertion(aName));await req('/passkeys/'+a2,{},'DELETE');
  await check('Zero passkeys login',await req('/passkey/login/options',{accountName:aName}),401);
  await req('/passkey/login/verify',await assertion(bName));await req('/passkeys/'+b1,{},'DELETE');
  writeFileSync('docs/task8/evidence/live-http-results.json',JSON.stringify({origin,generatedAt:new Date().toISOString(),authenticator:'Chromium virtual security key; real HTTPS and server verification; TLS verification enabled',testAccounts:[aName,bName],results},null,2));
  console.log(results.length+' HTTPS checks passed; test passkeys removed; no session values logged');
} finally {await browser.close();}
