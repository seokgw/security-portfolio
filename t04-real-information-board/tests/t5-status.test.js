'use strict';
// 과제 5: fresh / stale / error 상태 구분 개선에 대한 자동 검사.
// 과제 4 tests/core.test.js는 수정하지 않고 새 파일로 추가한다.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const C=require('../core');
const fixtures=path.join(__dirname,'..','assets','fixtures');const get=name=>JSON.parse(fs.readFileSync(path.join(fixtures,`${name}.json`),'utf8'));

// T5-TEST-01/02 (로직): 정상 재생 후 상태는 fresh이고 값/단위가 채워진다.
test('T5-TEST-01/02: 정상 재생 후 freshness=fresh, 값/단위 존재',()=>{
  let s=C.emptyState();
  s=C.runFixture(s,get('normal-d1-a'));
  s=C.runFixture(s,get('normal-d1-b'));
  assert.equal(s.status.freshness,'fresh');
  assert.equal(s.status.error_code,'none');
  assert.equal(s.current_reading.normalized_value,105);
  assert.ok(s.current_reading.unit);
});

// T5-TEST-05/06 (로직): 정상값 확보 후 실패하면 stale이며 마지막 정상값이 보존된다.
for(const name of ['timeout','auth-401','rate-429','offline','schema-break']){
  test(`T5-TEST-05/06: 정상값 확보 후 ${name} 실패는 stale이며 값을 보존`,()=>{
    let s=C.emptyState();
    s=C.runFixture(s,get('normal-d1-a'));
    s=C.runFixture(s,get('normal-d1-b'));
    const before=s.current_reading.normalized_value;
    s=C.runFixture(s,get(name));
    assert.equal(s.status.freshness,'stale');
    assert.equal(s.current_reading.normalized_value,before);
  });
}

// T5-TEST-07 (로직): 정상값이 한 번도 없던 상태에서 실패하면 error이며 current_reading은 여전히 없다.
for(const name of ['timeout','auth-401','rate-429','offline','schema-break']){
  test(`T5-TEST-07: 정상값 없는 초기 상태에서 ${name} 실패는 error`,()=>{
    let s=C.emptyState();
    s=C.runFixture(s,get(name));
    assert.equal(s.status.freshness,'error');
    assert.equal(s.current_reading,null);
  });
}

// T5-TEST-08 (로직): stale에서도, error에서도 정상 복구하면 다시 fresh가 된다.
test('T5-TEST-08: stale 이후 복구하면 fresh',()=>{
  let s=C.emptyState();
  for(const n of ['normal-d1-a','normal-d1-b','timeout'])s=C.runFixture(s,get(n));
  assert.equal(s.status.freshness,'stale');
  s=C.runFixture(s,get('recover-d2'));
  assert.equal(s.status.freshness,'fresh');
});

test('T5-TEST-08: error 이후 정상 재생하면 fresh',()=>{
  let s=C.emptyState();
  s=C.runFixture(s,get('offline'));
  assert.equal(s.status.freshness,'error');
  s=C.runFixture(s,get('normal-d1-a'));
  assert.equal(s.status.freshness,'fresh');
  assert.equal(s.current_reading.normalized_value,100);
});
