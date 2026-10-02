"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const fields = [
    { id: "stress", label: "오늘 느낀 스트레스", options: ["매우 적음", "적음", "보통", "많음", "매우 많음"] },
    { id: "communication", label: "외부 소통의 충분함", options: ["매우 부족", "부족", "보통", "충분", "매우 충분"] },
    { id: "rest", label: "휴식의 충분함", options: ["매우 부족", "부족", "보통", "충분", "매우 충분"] },
    { id: "sleep", label: "수면시간 (시간)", numeric: true },
    { id: "timeOfUse", label: "주로 사용한 시간대", options: ["일과 전", "일과 후", "취침 전", "여러 시간대"] },
    { id: "mood", label: "사용 후 기분에 대한 느낌", options: ["편안해짐", "비슷함", "불편해짐", "상황에 따라 다름"] }
  ];
  fields.forEach(def => {
    const box = document.createElement("div"), label = document.createElement("label");
    label.htmlFor = def.id; label.textContent = def.label + " · 선택 사항";
    const input = document.createElement(def.numeric ? "input" : "select"); input.id = def.id;
    if (def.numeric) { input.type = "text"; input.inputMode = "decimal"; input.placeholder = "예: 7.5 (0~24)"; }
    else ["선택하지 않음", ...def.options].forEach((text, i) => {
      const option = document.createElement("option"); option.value = i ? text : ""; option.textContent = text; input.append(option);
    });
    const error = document.createElement("p"); error.id = def.id + "-error"; error.className = "error"; error.setAttribute("aria-live", "polite");
    input.setAttribute("aria-describedby", error.id); box.append(label, input, error); $("daily-fields").append(box);
  });
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + "T12:00:00");
    return !Number.isNaN(d.getTime()) && `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` === value && value <= today();
  }
  $("record-date").value = today(); $("record-date").max = today();
  let cloud = null, user = null, records = [], current = null, loading = false, saving = false, loadEpoch = 0, owner = null;
  function validRecord(r) {
    return r && validDate(r.date) && Number.isFinite(r.hours) && r.hours >= 0 && r.hours <= 24 &&
      Array.isArray(r.purpose) && r.purpose.length > 0 && r.purpose.every(i => Number.isInteger(i) && i >= 0 && i < purposes.length) &&
      Array.isArray(r.factor) && r.factor.every(i => Number.isInteger(i) && i >= 0 && i < factors.length) &&
      [...$("frequency").options].some(o => o.value && o.value === r.frequency) && r.daily &&
      fields.every(def => def.numeric ? r.daily[def.id] === null || (Number.isFinite(r.daily[def.id]) && r.daily[def.id] >= 0 && r.daily[def.id] <= 24) : r.daily[def.id] === "" || def.options.includes(r.daily[def.id]));
  }
  function updateSave() {
    $("save").disabled = !current || !user || loading || saving || !cloud || owner !== user.id;
    $("save").textContent = saving ? "DB에 저장 중…" : current ? records.some(r => r.date === current.date) ? `${current.date} 기존 기록 덮어쓰기` : `${current.date} 결과 저장` : "이 날짜의 결과 저장";
  }
  function compare(record) {
    const previous = records.filter(r => r.date < record.date).sort((a,b) => b.date.localeCompare(a.date))[0];
    if (!previous) { section("이전 날짜와 비교", ["이 날짜보다 앞선 저장 기록이 없습니다. 로그인 후 날짜별 기록을 쌓으면 비교할 수 있습니다."]); return; }
    const difference = Number((record.hours - previous.hours).toFixed(2));
    const lines = [`${previous.date}와 비교: 사용시간 ${difference > 0 ? "+" : ""}${difference}시간. 시간 변화만으로 개선·악화를 판단하지 않습니다.`, `평소 소통 빈도: ${previous.frequency} → ${record.frequency}`];
    fields.forEach(def => {
      const a = previous.daily[def.id], b = record.daily[def.id];
      if (a !== "" && a !== null && b !== "" && b !== null) lines.push(`${def.label}: ${a}${def.numeric?"시간":""} → ${b}${def.numeric?"시간":""}`);
    });
    const added = record.factor.filter(i => !previous.factor.includes(i)), removed = previous.factor.filter(i => !record.factor.includes(i));
    lines.push(added.length ? "이번에 새로 선택한 상황: " + added.map(i => factors[i]).join(" / ") : "이번에 새로 선택한 상황은 없습니다.");
    if (removed.length) lines.push("이번에 선택하지 않은 이전 상황: " + removed.map(i => factors[i]).join(" / ") + ". 선택 변화이며 문제 해결을 입증하지 않습니다.");
    section("이전 날짜와 비교", lines);
  }
  const form = $("check-form");
  // app.js validates the base inputs and renders the core result first.
  form.addEventListener("submit", () => {
    current = null; $("save-status").textContent = "";
    const date = $("record-date").value, sleepRaw = $("sleep").value.trim();
    const dateError = validDate(date) ? "" : "오늘 또는 이전의 올바른 날짜를 선택해 주세요.";
    const sleepError = sleepRaw !== "" && (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(sleepRaw) || !Number.isFinite(Number(sleepRaw)) || Number(sleepRaw) > 24) ? "수면시간은 0~24 사이의 숫자로 입력해 주세요." : "";
    $("date-error").textContent = dateError; $("sleep-error").textContent = sleepError;
    $("record-date").setAttribute("aria-invalid", String(Boolean(dateError))); $("sleep").setAttribute("aria-invalid", String(Boolean(sleepError)));
    if (dateError || sleepError) { $("result").hidden = true; $("form-status").textContent = "입력 안내를 확인해 주세요."; (dateError ? $("record-date") : $("sleep")).focus(); }
    if ($("result").hidden) { updateSave(); return; }
    const daily = {}; fields.forEach(def => { const value = $(def.id).value; daily[def.id] = def.numeric ? value.trim() === "" ? null : Number(value) : value; });
    current = { date, hours: Number($("hours").value), purpose: selected("purpose"), factor: selected("factor"), frequency: $("frequency").value, daily };
    $("result-title").textContent = date + " 점검 결과";
    section("오늘의 체감과 생활", fields.map(def => `${def.label}: ${daily[def.id] === "" || daily[def.id] === null ? "미입력" : daily[def.id] + (def.numeric ? "시간" : "")}`));
    if (current.factor.includes(6) || current.factor.includes(7)) section("생활 환경 돌아보기", ["업무·훈련 부담이나 주변 환경 때문에 쉬기 어려웠다고 선택했습니다. 휴대전화 사용과 구분해 함께 살펴보세요."]);
    if (daily.timeOfUse === "취침 전" && current.factor.includes(5)) section("사용 시간대 돌아보기", ["취침 전 사용과 수면·일상 방해를 함께 선택했습니다. 다음 기록에서 사용 시간대와 수면시간을 함께 비교해 보세요."]);
    compare(current); updateSave();
    if (!user) $("save-status").textContent = "결과 확인은 완료됐습니다. 날짜별 DB 저장은 GitHub 로그인 후 사용할 수 있습니다.";
  });
  function invalidate() { current = null; updateSave(); if (!$("result").hidden) $("save-status").textContent = "입력이 변경됐습니다. 결과 확인을 다시 눌러 주세요."; }
  form.addEventListener("input", invalidate); form.addEventListener("change", invalidate);
  form.addEventListener("reset", () => {
    current = null; updateSave(); $("date-error").textContent = $("sleep-error").textContent = "";
    $("record-date").removeAttribute("aria-invalid"); $("sleep").removeAttribute("aria-invalid");
    setTimeout(() => $("record-date").value = today(), 0);
  });
  function openRecord(record) {
    $("record-date").value = record.date; $("hours").value = String(record.hours); $("frequency").value = record.frequency;
    document.querySelectorAll('input[name="purpose"]').forEach(input => input.checked = record.purpose.includes(Number(input.value)));
    document.querySelectorAll('input[name="factor"]').forEach(input => input.checked = record.factor.includes(Number(input.value)));
    fields.forEach(def => $(def.id).value = record.daily[def.id] ?? ""); form.requestSubmit();
  }
  function renderHistory() {
    $("history-rows").replaceChildren(); $("history-empty").hidden = records.length > 0;
    $("export").disabled = !records.length || loading; $("reload-records").disabled = loading || saving;
    $("history-summary").textContent = records.length ? `${records.length}일의 기록 · ${records[0].date} ~ ${records[records.length-1].date} · 기록한 날만 표시하며 누락된 날은 추정하지 않습니다.` : "로그인 후 DB에 저장한 날짜별 기록이 표시됩니다.";
    [...records].reverse().forEach(record => {
      const row = document.createElement("tr");
      [record.date, record.hours + "시간", record.daily.stress || "미입력", record.daily.sleep === null ? "미입력" : record.daily.sleep + "시간"].forEach(value => { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); });
      const controls = document.createElement("td"), button = document.createElement("button"); button.textContent = "열기·수정"; button.className = "secondary"; button.disabled = saving;
      button.setAttribute("aria-label", record.date + " 기록 열기·수정"); button.addEventListener("click", () => openRecord(record)); controls.append(button); row.append(controls); $("history-rows").append(row);
    }); updateSave();
  }
  async function loadRecords() {
    if (!cloud || !user) return;
    const epoch = ++loadEpoch, id = user.id; loading = true; owner = null; renderHistory(); $("storage-status").textContent = "DB 기록을 불러오는 중입니다.";
    try {
      const next = await cloud.list(); if (epoch !== loadEpoch || user?.id !== id) return;
      if (!Array.isArray(next) || !next.every(validRecord) || new Set(next.map(r => r.date)).size !== next.length) throw new Error("저장 기록의 형식을 확인해야 합니다. 기존 DB 기록을 덮어쓰지 않습니다.");
      records = next.sort((a,b) => a.date.localeCompare(b.date)); owner = id; $("storage-status").textContent = "";
    } catch (error) { if (epoch === loadEpoch) $("storage-status").textContent = error.message; }
    finally { if (epoch === loadEpoch) { loading = false; renderHistory(); } }
  }
  function authChanged(nextUser) {
    const same = nextUser?.id && nextUser.id === user?.id; user = nextUser;
    $("login").hidden = Boolean(user); $("logout").hidden = $("reload-records").hidden = !user;
    $("auth-status").textContent = user ? "GitHub 로그인 완료 · 저장 기록은 본인 계정에서만 조회합니다." : "점검은 바로 할 수 있습니다. DB 저장·조회에는 GitHub 로그인이 필요합니다.";
    if (!same) { ++loadEpoch; records = []; owner = null; loading = false; renderHistory(); $("storage-status").textContent = ""; }
    if (user && !same) loadRecords();
    if (!user) { $("result").hidden = true; current = null; updateSave(); }
  }
  $("save").addEventListener("click", async () => {
    if (!current || !user || !cloud || loading || saving || owner !== user.id) return;
    const snapshot = structuredClone(current), id = user.id, existing = records.find(r => r.date === snapshot.date);
    saving = true; updateSave(); renderHistory(); $("save-status").textContent = "DB에 저장 중입니다. 완료 메시지를 확인해 주세요.";
    try {
      const updatedAt = await cloud.save(snapshot, existing?.updatedAt);
      if (user?.id !== id) return;
      records = [...records.filter(r => r.date !== snapshot.date), { ...snapshot, updatedAt }].sort((a,b) => a.date.localeCompare(b.date));
      $("save-status").textContent = `${snapshot.date} 기록을 DB에 ${existing ? "수정" : "저장"}했습니다. 같은 GitHub 계정으로 다시 불러올 수 있습니다.`;
    } catch (error) { if (user?.id === id) $("save-status").textContent = error.message; }
    finally { saving = false; renderHistory(); }
  });
  $("reload-records").addEventListener("click", loadRecords);
  $("login").addEventListener("click", async () => { if (!cloud) return; $("login").disabled = true; try { await cloud.login(); } catch (error) { $("auth-status").textContent = error.message; $("login").disabled = false; } });
  $("logout").addEventListener("click", async () => { if (!cloud || saving) return; try { await cloud.logout(); authChanged(null); } catch (error) { $("auth-status").textContent = error.message; } });
  $("export").addEventListener("click", () => {
    const rows = [["날짜", "사용시간", "사용목적", "평소 소통 빈도", ...fields.map(def => def.label), "환경 요소"], ...records.map(r => [r.date, r.hours, r.purpose.map(i => purposes[i]).join(" / "), r.frequency, ...fields.map(def => r.daily[def.id] ?? ""), r.factor.map(i => factors[i]).join(" / ")])];
    const text = "\ufeff" + rows.map(row => row.map(value => '"' + String(value).replaceAll('"','""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([text], {type:"text/csv;charset=utf-8"})), link = document.createElement("a"); link.href = url; link.download = "BR-B_날짜별기록.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  renderHistory();
  window.createBRBCloud(authChanged).then(client => {
    cloud = client; $("login").disabled = !client;
    if (!client) $("auth-status").textContent = location.protocol === "file:" ? "ZIP에서는 점검 결과를 확인할 수 있습니다. GitHub 로그인과 날짜별 DB 저장은 공개 앱에서 사용해 주세요." : "DB 연결 설정이 아직 완료되지 않았습니다. 점검 결과는 사용할 수 있으나 날짜별 저장은 아직 지원되지 않습니다.";
    updateSave();
  }).catch(() => { $("auth-status").textContent = "DB 연결을 시작하지 못했습니다. 점검은 사용할 수 있으며 저장은 연결 복구 후 가능합니다."; });
})();
