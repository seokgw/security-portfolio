const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  const records = new Map(); let failSave=true;
  await page.route('**/cloud-client.js*',route=>route.fulfill({contentType:'text/javascript',body:`
    window.createBRBCloud=async callback=>{
      window.testAuthCallback=callback;
      return {login:async()=>callback({id:'fixture-user'}),logout:async()=>callback(null),
        list:async()=>{const r=await fetch('/fixture-records');return r.json()},
        save:async(record,expectedUpdatedAt)=>{const r=await fetch('/fixture-records',{method:'POST',body:JSON.stringify({record,expectedUpdatedAt})});const data=await r.json();if(!r.ok)throw Error(data.error);return data.updatedAt;}};
    };`}));
  await page.route('**/fixture-records',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:[...records.values()]});
    const {record,expectedUpdatedAt}=route.request().postDataJSON();
    if(failSave){failSave=false;return route.fulfill({status:503,json:{error:'DB에 저장하지 못했습니다.'}});}
    const old=records.get(record.date);
    if(old && old.updatedAt!==expectedUpdatedAt)return route.fulfill({status:409,json:{error:'다른 화면에서 기록이 변경됐습니다.'}});
    const updatedAt=String(Date.now());records.set(record.date,{...record,updatedAt});return route.fulfill({json:{updatedAt}});
  });
  await page.goto('http://127.0.0.1:8765/br-b/');
  assert.equal(await page.locator('#factors input').count(),14);
  assert.equal(await page.locator('#daily-fields select').count(),5);
  await page.locator('#record-date').fill('2026-09-29');
  await page.locator('#hours').fill('2.5');await page.getByLabel('가족과 연락',{exact:true}).check();
  await page.locator('#frequency').selectOption({label:'거의 매일'});
  await page.locator('#stress').selectOption('많음');await page.locator('#sleep').fill('6');
  await page.getByRole('button',{name:'3. 결과 확인'}).click();
  assert.equal(await page.locator('#result').isVisible(),true);
  assert.equal(await page.locator('#save').isEnabled(),false);
  await page.locator('#login').click();await page.locator('#save').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('save').disabled);
  await page.locator('#save').click();await page.getByText('DB에 저장하지 못했습니다.',{exact:true}).waitFor();
  assert.equal(records.size,0);assert.equal(await page.locator('#hours').inputValue(),'2.5');
  await page.locator('#save').click();await page.waitForFunction(()=>document.getElementById('history-rows').children.length===1);
  await page.locator('#record-date').fill('2026-09-30');await page.locator('#hours').fill('3');
  assert.equal(await page.locator('#save').isEnabled(),false);
  await page.locator('#stress').selectOption('보통');await page.locator('#sleep').fill('7');
  await page.getByRole('button',{name:'3. 결과 확인'}).click();
  assert.match(await page.locator('#result-content').innerText(),/많음 → 보통/);
  await page.locator('#save').click();await page.waitForFunction(()=>document.getElementById('history-rows').children.length===2);
  await page.getByRole('button',{name:'2026-09-29 기록 열기·수정'}).click();
  assert.equal(await page.locator('#stress').inputValue(),'많음');
  await page.locator('#hours').fill('4');await page.getByRole('button',{name:'3. 결과 확인'}).click();
  await page.locator('#save').click();await page.getByText('2026-09-29 기록을 DB에 수정했습니다.',{exact:false}).waitFor();assert.equal(records.size,2);
  await page.locator('#sleep').fill('-1');await page.getByRole('button',{name:'3. 결과 확인'}).click();assert.equal(await page.locator('#result').isVisible(),false);
  await page.locator('#sleep').fill('7');await page.locator('#record-date').fill('2099-01-01');await page.getByRole('button',{name:'3. 결과 확인'}).click();assert.equal(await page.locator('#result').isVisible(),false);
  await context.clearCookies();await page.evaluate(()=>localStorage.clear());await page.reload();
  assert.equal(await page.locator('#history-rows tr').count(),0);
  await page.locator('#login').click();await page.waitForFunction(()=>document.getElementById('history-rows').children.length===2);
  assert.equal(records.get('2026-09-29').hours,4);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#logout').click();assert.equal(await page.locator('#history-rows tr').count(),0);
  assert.deepEqual(pageErrors,[]);
  console.log('PASS mocked DB: expanded fields, guest result, failed save, daily create/update, comparison, stale input, invalid date/sleep, cache-clear recovery, logout isolation, mobile width. Actual Supabase/RLS/OAuth not tested.');
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
