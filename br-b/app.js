"use strict";
const purposes = ["가족과 연락", "친구와 연락", "SNS", "영상 시청", "게임", "정보 검색", "기타"];
const factors = ["외부 사람과 충분히 소통하지 못한다고 느낀다", "조직 내 대인관계에서 스트레스를 느낀다", "혼자 있다는 느낌을 자주 받는다", "휴대전화 사용이 휴식에 도움이 된다고 느낀다", "휴대전화를 너무 오래 사용한다고 느낀다", "휴대전화 사용 때문에 수면이나 일상에 방해를 받는다고 느낀다"];
function choices(id, values, name) {
  const container = document.getElementById(id);
  values.forEach((value, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox"; input.name = name; input.value = String(index);
    label.append(input, document.createTextNode(value)); container.append(label);
  });
}
choices("purposes", purposes, "purpose"); choices("factors", factors, "factor");
function selected(name) { return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(input => Number(input.value)); }
function section(title, lines) {
  const heading = document.createElement("h3"); heading.textContent = title;
  const list = document.createElement("ul");
  lines.forEach(line => { const item = document.createElement("li"); item.textContent = line; list.append(item); });
  document.getElementById("result-content").append(heading, list);
}
const form = document.getElementById("check-form");
const result = document.getElementById("result");
form.addEventListener("submit", event => {
  event.preventDefault(); result.hidden = true;
  const raw = document.getElementById("hours").value.trim();
  const hours = Number(raw); const purpose = selected("purpose"); const factor = selected("factor");
  const frequency = document.getElementById("frequency").value;
  const hoursError = !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw) || !Number.isFinite(hours) ? "0~24 사이의 숫자로 입력해 주세요." : hours > 24 ? "하루 사용시간은 24시간 이하로 입력해 주세요." : "";
  const errors = {hours: raw === "" ? "하루 사용시간을 입력해 주세요." : hoursError, purpose: purpose.length ? "" : "주요 사용 목적을 하나 이상 선택해 주세요.", frequency: frequency ? "" : "외부 소통 빈도를 선택해 주세요."};
  Object.entries(errors).forEach(([key, message]) => { document.getElementById(key + "-error").textContent = message; });
  document.getElementById("hours").setAttribute("aria-invalid", String(Boolean(errors.hours)));
  document.getElementById("frequency").setAttribute("aria-invalid", String(Boolean(errors.frequency)));
  if (Object.values(errors).some(Boolean)) {
    document.getElementById("form-status").textContent = "입력을 확인해 주세요. 안내된 항목을 수정하면 계속 사용할 수 있습니다.";
    (errors.hours ? document.getElementById("hours") : errors.purpose ? document.querySelector('input[name="purpose"]') : document.getElementById("frequency")).focus(); return;
  }
  document.getElementById("form-status").textContent = ""; document.getElementById("result-content").replaceChildren();
  section("사용 패턴", [`하루 평균 ${hours}시간 · 주요 목적: ${purpose.map(index => purposes[index]).join(", ")}`, factor.includes(4) || factor.includes(5) ? "사용시간과 함께 스스로 느끼는 과도한 사용·수면 또는 일상 방해 여부를 기록해 비교해 보세요." : "시간만으로 좋고 나쁨을 판단하지 않습니다. 같은 시간이어도 목적과 느끼는 영향을 함께 살펴보세요."]);
  section("외부 소통", [`소통 빈도: ${frequency} · 가족·친구 연락 목적 선택: ${purpose.includes(0) || purpose.includes(1) ? "있음" : "없음"}`, factor.includes(0) || factor.includes(2) ? "소통 부족 또는 고립감을 선택했습니다. 연락 빈도와 실제로 느끼는 소통의 충분함을 함께 돌아보세요." : "소통 빈도 자체가 소통의 질이나 스트레스 감소를 입증하지는 않습니다."]);
  section("환경·스트레스 관련 요소", factor.length ? factor.map(index => factors[index]) : ["선택한 환경 항목이 없습니다. 이는 스트레스가 없다는 진단을 뜻하지 않습니다."]);
  const prompts = ["며칠간 같은 항목을 기록해 시간·목적·소통·환경을 함께 비교해 보세요."];
  if (factor.includes(1)) prompts.push("조직 내 관계에서 느끼는 불편은 휴대전화 사용과 구분해서 살펴보세요.");
  if (factor.includes(3) && factor.includes(5)) prompts.push("휴식에 도움이 되는 느낌과 수면·일상 방해가 함께 있습니다. 두 경험이 언제 나타나는지 함께 기록해 보세요.");
  else if (factor.includes(3)) prompts.push("휴식에 도움이 된다고 느끼는 사용 목적과 상황을 기록해 보세요.");
  if (factor.includes(5)) prompts.push("수면·일상을 방해한다고 느끼는 시간대나 사용 목적을 스스로 살펴보세요.");
  section("다음 점검", prompts); result.hidden = false; result.focus();
});
form.addEventListener("reset", () => { result.hidden = true; document.getElementById("form-status").textContent = ""; ["hours", "purpose", "frequency"].forEach(key => document.getElementById(key + "-error").textContent = ""); ["hours", "frequency"].forEach(key => document.getElementById(key).removeAttribute("aria-invalid")); });
document.getElementById("edit").addEventListener("click", () => document.getElementById("hours").focus());
