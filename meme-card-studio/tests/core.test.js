import test from "node:test";
import assert from "node:assert/strict";
import { coverRect, wrapText, validateImageFile, validateImportedTemplates, createTemplate, updateTemplate, deleteTemplate, clampTextPosition } from "../core.js";

test("cover crop fills square, portrait and story targets", () => {
  for (const [w,h] of [[1080,1080],[1080,1350],[1080,1920]]) { const r=coverRect(1600,900,w,h); assert.ok(r.width>=w); assert.ok(r.height>=h); assert.equal(r.x,(w-r.width)/2); }
});
test("wrapText respects explicit and automatic wrapping including emoji", () => {
  const ctx={measureText:t=>({width:Array.from(t).length*10})};
  assert.deepEqual(wrapText(ctx,"가나다라마바사",30),["가나다","라마바","사"]);
  assert.deepEqual(wrapText(ctx,"한글 English\n🙂",200),["한글 English","🙂"]);
  assert.deepEqual(wrapText(ctx,"",200),[]);
});
test("unsupported image is rejected without mutation concern",()=>{ assert.match(validateImageFile({type:"image/gif",size:1}),/지원하지 않는/); assert.equal(validateImageFile({type:"image/png",size:1}),null); });
const state={ratio:"4:5",text:"안녕",textX:50,textY:70,fontSize:64,textColor:"#ffffff",textAlign:"center"};
const now="2026-08-26T00:00:00.000Z";
test("template CRUD uses stable id",()=>{ const a=createTemplate(state,"A",now,"stable-id"), b=createTemplate(state,"B",now,"other-id"); const updated=updateTemplate([a,b],"stable-id",{...state,text:"변경"},"A2",now); assert.equal(updated[0].id,"stable-id"); assert.equal(updated[0].text,"변경"); assert.deepEqual(deleteTemplate(updated,"stable-id").map(x=>x.id),["other-id"]); });
test("schema accepts valid export and rejects broken records",()=>{ const valid=createTemplate(state,"A",now,"id-1"); assert.equal(validateImportedTemplates({templates:[valid]}).ok,true); assert.equal(validateImportedTemplates({templates:[{name:"누락"}]}).ok,false); assert.equal(validateImportedTemplates({templates:[valid,{...valid}]}).ok,false); });
test("text block stays inside every canvas edge for each alignment", () => {
  const common={blockWidth:600,blockHeight:240,canvasWidth:1080,canvasHeight:1080,margin:43};
  assert.deepEqual(clampTextPosition({...common,desiredX:0,desiredY:0,align:"center"}),{x:343,y:163});
  assert.deepEqual(clampTextPosition({...common,desiredX:1080,desiredY:1080,align:"left"}),{x:437,y:917});
  assert.deepEqual(clampTextPosition({...common,desiredX:0,desiredY:540,align:"right"}),{x:643,y:540});
});
