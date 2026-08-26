export const RATIOS = { "1:1": [1080, 1080], "4:5": [1080, 1350], "9:16": [1080, 1920] };
export const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

export function coverRect(imageWidth, imageHeight, targetWidth, targetHeight) {
  const scale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight);
  const width = imageWidth * scale, height = imageHeight * scale;
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height };
}

export function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const lines = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") { lines.push(""); continue; }
    let line = "";
    for (const char of Array.from(paragraph)) {
      const candidate = line + char;
      if (line && ctx.measureText(candidate).width > maxWidth) { lines.push(line); line = char; }
      else line = candidate;
    }
    lines.push(line);
  }
  return lines;
}

export function validateImageFile(file) {
  if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) return "지원하지 않는 파일 형식입니다. PNG 또는 JPEG 파일을 선택해주세요.";
  if (file.size > 20 * 1024 * 1024) return "이미지 크기는 20MB 이하여야 합니다.";
  return null;
}

export function validateImportedTemplates(data) {
  if (!data || !Array.isArray(data.templates)) return { ok: false, error: "templates 배열이 필요합니다." };
  const ids = new Set();
  for (const item of data.templates) {
    const valid = item && typeof item.id === "string" && item.id && typeof item.name === "string" && item.name.trim()
      && Object.hasOwn(RATIOS, item.ratio) && typeof item.text === "string"
      && Number.isFinite(item.textX) && item.textX >= 0 && item.textX <= 100
      && Number.isFinite(item.textY) && item.textY >= 0 && item.textY <= 100
      && Number.isFinite(item.fontSize) && item.fontSize >= 18 && item.fontSize <= 140
      && /^#[0-9a-f]{6}$/i.test(item.textColor) && ["left", "center", "right"].includes(item.textAlign)
      && typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt))
      && typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt));
    if (!valid) return { ok: false, error: "필수 템플릿 항목이 누락되었거나 값이 올바르지 않습니다." };
    if (ids.has(item.id)) return { ok: false, error: "중복된 템플릿 ID가 있습니다." };
    ids.add(item.id);
  }
  return { ok: true, templates: data.templates.map(item => ({ ...item })) };
}

export function createTemplate(state, name, now = new Date().toISOString(), id = crypto.randomUUID()) {
  return { id, name: name.trim(), ratio: state.ratio, text: state.text, textX: state.textX, textY: state.textY,
    fontSize: state.fontSize, textColor: state.textColor, textAlign: state.textAlign, createdAt: now, updatedAt: now };
}

export function updateTemplate(items, id, state, name, now = new Date().toISOString()) {
  return items.map(item => item.id === id ? { ...item, name: name.trim(), ratio: state.ratio, text: state.text,
    textX: state.textX, textY: state.textY, fontSize: state.fontSize, textColor: state.textColor,
    textAlign: state.textAlign, updatedAt: now } : item);
}

export function deleteTemplate(items, id) { return items.filter(item => item.id !== id); }

export function clampTextPosition({ desiredX, desiredY, blockWidth, blockHeight, topExtent, bottomExtent, canvasWidth, canvasHeight, align, margin }) {
  let minX, maxX;
  if (align === "left") { minX = margin; maxX = canvasWidth - margin - blockWidth; }
  else if (align === "right") { minX = margin + blockWidth; maxX = canvasWidth - margin; }
  else { minX = margin + blockWidth / 2; maxX = canvasWidth - margin - blockWidth / 2; }
  if (maxX < minX) minX = maxX = canvasWidth / 2;
  const above = topExtent ?? blockHeight / 2;
  const below = bottomExtent ?? blockHeight / 2;
  const minY = margin + above, maxY = canvasHeight - margin - below;
  return {
    x: Math.min(Math.max(desiredX, minX), maxX),
    y: maxY < minY ? canvasHeight / 2 : Math.min(Math.max(desiredY, minY), maxY),
  };
}

export function fitTextLayout(ctx, text, requestedFontSize, maxWidth, maxHeight, setFont) {
  let fontSize = requestedFontSize;
  let lines = [];
  let lineHeight = 0;
  let blockHeight = 0;
  let topExtent = 0;
  let bottomExtent = 0;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    setFont(fontSize);
    lines = wrapText(ctx, text, maxWidth);
    lineHeight = fontSize * 1.25;
    const firstMetrics = ctx.measureText(lines[0] || "가");
    const lastMetrics = ctx.measureText(lines.at(-1) || "가");
    const ascent = firstMetrics.actualBoundingBoxAscent ?? fontSize * .8;
    const descent = lastMetrics.actualBoundingBoxDescent ?? fontSize * .25;
    topExtent = lines.length ? (lines.length - 1) * lineHeight / 2 + ascent : 0;
    bottomExtent = lines.length ? (lines.length - 1) * lineHeight / 2 + descent : 0;
    blockHeight = topExtent + bottomExtent;
    if (blockHeight <= maxHeight || fontSize <= 1) break;
    fontSize = Math.max(1, fontSize * Math.min(.9, maxHeight / blockHeight));
  }
  return { fontSize, lines, lineHeight, blockHeight, topExtent, bottomExtent };
}

export function renderCanvas(ctx, state, width, height) {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#172a46"); gradient.addColorStop(1, "#09111f");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  if (state.image) {
    const rect = coverRect(state.image.naturalWidth || state.image.width, state.image.naturalHeight || state.image.height, width, height);
    ctx.drawImage(state.image, rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = "rgba(3, 9, 20, .22)"; ctx.fillRect(0, 0, width, height);
  }
  if (!state.text) return;
  const scale = width / 1080;
  const requestedFontSize = state.fontSize * scale;
  const setFont = size => { ctx.font = `800 ${size}px "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif`; };
  setFont(requestedFontSize);
  ctx.textAlign = state.textAlign; ctx.textBaseline = "middle"; ctx.fillStyle = state.textColor;
  ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 12 * scale; ctx.shadowOffsetY = 3 * scale;
  const margin = width * .04;
  const maxWidth = width - margin * 2;
  const layout = fitTextLayout(ctx, state.text, requestedFontSize, maxWidth, height - margin * 2, setFont);
  const { fontSize, lines, lineHeight, blockHeight, topExtent, bottomExtent } = layout;
  const blockWidth = Math.max(...lines.map(line => ctx.measureText(line).width), 0);
  const safe = clampTextPosition({
    desiredX: width * state.textX / 100,
    desiredY: height * state.textY / 100,
    blockWidth, blockHeight, topExtent, bottomExtent, canvasWidth: width, canvasHeight: height,
    align: state.textAlign, margin,
  });
  const anchorX = safe.x;
  const centerY = safe.y;
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => ctx.fillText(line, anchorX, startY + index * lineHeight, maxWidth));
  ctx.shadowColor = "transparent";
}
