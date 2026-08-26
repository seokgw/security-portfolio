import { RATIOS, validateImageFile, validateImportedTemplates, createTemplate, updateTemplate, deleteTemplate, renderCanvas } from "./core.js?v=5";

const $ = id => document.getElementById(id);
const canvas = $("preview"), ctx = canvas.getContext("2d");
const STORAGE_KEY = "meme-card-studio.templates.v1";
const state = { image: null, ratio: "1:1", text: $("textInput").value, textX: 50, textY: 72, fontSize: 64, textColor: "#ffffff", textAlign: "center" };
let templates = loadTemplates();

function message(text, type = "success") { const el = $("status"); el.textContent = text; el.className = `status ${type}`; }
function loadTemplates() { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)); renderTemplates(); }
function render() {
  const [width, height] = RATIOS[state.ratio]; canvas.width = width; canvas.height = height;
  renderCanvas(ctx, state, width, height); $("ratioBadge").textContent = state.ratio;
}
function syncControls() {
  $("textInput").value = state.text; $("textX").value = state.textX; $("textY").value = state.textY;
  $("fontSize").value = state.fontSize; $("textColor").value = state.textColor; $("textAlign").value = state.textAlign;
  document.querySelector(`input[name=ratio][value="${state.ratio}"]`).checked = true;
  $("xOut").value = `${state.textX}%`; $("yOut").value = `${state.textY}%`; $("sizeOut").value = `${state.fontSize}px`; $("colorOut").value = state.textColor.toUpperCase(); render();
}
function applyTemplate(item) {
  Object.assign(state, { ratio: item.ratio, text: item.text, textX: item.textX, textY: item.textY, fontSize: item.fontSize, textColor: item.textColor, textAlign: item.textAlign });
  $("templateName").value = item.name; syncControls(); message(`‘${item.name}’ 템플릿을 불러왔습니다.`);
}
function renderTemplates() {
  const list = $("templateList"); list.replaceChildren();
  if (!templates.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "저장된 템플릿이 없습니다. 첫 템플릿을 만들어보세요."; list.append(empty); return; }
  templates.forEach(item => {
    const card = document.createElement("article"); card.className = "template-card";
    const info = document.createElement("div"), title = document.createElement("strong"), meta = document.createElement("span");
    title.textContent = item.name; meta.textContent = `${item.ratio} · ${new Date(item.updatedAt).toLocaleDateString("ko-KR")}`; info.append(title, meta);
    const actions = document.createElement("div");
    [["불러오기", () => applyTemplate(item)], ["현재 값으로 수정", () => { const name = $("templateName").value.trim() || item.name; templates = updateTemplate(templates, item.id, state, name); persist(); message("템플릿을 수정했습니다."); }], ["삭제", () => { if (confirm(`‘${item.name}’ 템플릿을 삭제할까요?`)) { templates = deleteTemplate(templates, item.id); persist(); message("템플릿을 삭제했습니다."); } }]].forEach(([label, fn]) => { const button = document.createElement("button"); button.textContent = label; button.addEventListener("click", fn); actions.append(button); });
    card.append(info, actions); list.append(card);
  });
}

$("imageInput").addEventListener("change", async event => {
  const file = event.target.files[0], error = validateImageFile(file); event.target.value = "";
  if (error) { message(error, "error"); return; }
  try {
    const url = URL.createObjectURL(file), image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("invalid image");
    state.image = image; $("fileInfo").textContent = `${file.name} · ${image.naturalWidth}×${image.naturalHeight} · ${(file.size / 1024).toFixed(1)}KB`;
    render(); message("이미지를 불러왔습니다."); URL.revokeObjectURL(url);
  } catch { message("이미지를 읽을 수 없습니다. 다른 파일을 선택해주세요.", "error"); }
});
document.querySelectorAll("input[name=ratio]").forEach(el => el.addEventListener("change", e => { state.ratio = e.target.value; render(); }));
[["textInput", "text", e => e.target.value], ["textX", "textX", e => Number(e.target.value)], ["textY", "textY", e => Number(e.target.value)], ["fontSize", "fontSize", e => Number(e.target.value)], ["textColor", "textColor", e => e.target.value], ["textAlign", "textAlign", e => e.target.value]].forEach(([id, key, value]) => $(id).addEventListener("input", e => { state[key] = value(e); syncControls(); }));

function download(type) {
  const [width, height] = RATIOS[state.ratio], out = document.createElement("canvas"); out.width = width; out.height = height;
  renderCanvas(out.getContext("2d"), state, width, height);
  // Canvas 재인코딩으로 원본 EXIF/GPS 메타데이터를 완성 이미지에 복사하지 않는다.
  out.toBlob(blob => { if (!blob) return message("이미지 저장에 실패했습니다.", "error"); const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = `meme-card-${state.ratio.replace(":", "x")}.${type === "image/png" ? "png" : "jpg"}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message(`${type === "image/png" ? "PNG" : "JPEG"} 파일을 저장했습니다.`); }, type, .92);
}
$("downloadPng").addEventListener("click", () => download("image/png")); $("downloadJpeg").addEventListener("click", () => download("image/jpeg"));
$("saveTemplate").addEventListener("click", () => { const name = $("templateName").value.trim(); if (!name) return message("템플릿 이름을 입력해주세요.", "error"); templates = [...templates, createTemplate(state, name)]; persist(); $("templateName").value = ""; message("새 템플릿을 저장했습니다."); });
$("exportJson").addEventListener("click", () => { const blob = new Blob([JSON.stringify({ version: 1, templates }, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "meme-card-templates.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message("템플릿 JSON을 내보냈습니다."); });
$("importJson").addEventListener("change", async e => { const file = e.target.files[0]; e.target.value = ""; if (!file) return; try { const parsed = JSON.parse(await file.text()), result = validateImportedTemplates(parsed); if (!result.ok) return message(result.error, "error"); templates = result.templates; persist(); message(`${templates.length}개 템플릿을 가져왔습니다.`); } catch { message("JSON 문법이 올바르지 않습니다. 기존 템플릿은 유지됩니다.", "error"); } });

syncControls(); renderTemplates();
