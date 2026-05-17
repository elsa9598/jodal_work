// ocr.js — Real OCR via Claude vision (window.claude.complete with image blocks)
// Each capture has a schema (DEMO_CAPTURES[i]); we send the actual image
// + ask the model to transcribe + extract those exact fields as JSON.

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result);
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Downscale a too-large image before sending — vision works fine at ~1600px
// and very large images either time out or blow the token budget.
async function compressImage(file, maxSide = 1600, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width: w, height: h } = img;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
        // small enough already
        resolve(file);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('canvas toBlob failed')); return; }
        resolve(new File([blob], file.name || 'capture.jpg',
                         { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// Pull the first balanced {...} block out of a response (handles code fences
// and leading prose).
function parseOcrJson(text) {
  if (!text) throw new Error('빈 응답');
  let s = String(text).replace(/^[\s\S]*?```(?:json)?\s*/, '');
  s = s.replace(/\s*```[\s\S]*$/, '').trim();
  if (!s.startsWith('{')) {
    const i = s.indexOf('{');
    if (i < 0) throw new Error('JSON 없음: ' + text.slice(0, 120));
    s = s.slice(i);
  }
  // walk to find balanced close
  let depth = 0, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') inStr = !inStr;
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(0, i + 1)); }
        catch (e) { throw new Error('JSON 파싱 실패: ' + e.message); }
      }
    }
  }
  throw new Error('JSON 닫힘 없음');
}

// Run OCR on one file against one capture schema.
async function ocrCapture(file, schema) {
  const compressed = await compressImage(file);
  const base64 = await fileToBase64(compressed);
  const mediaType = compressed.type || 'image/jpeg';

  const fieldsList = schema.fields.map((f) =>
    `    "${f.key}": ""  // ${f.label}${f.unit ? ' [' + f.unit + ']' : ''}`,
  ).join('\n');

  const prompt =
`이 이미지는 한국 조달청/비드큐(BidQ) 입찰 정보 화면입니다. (${schema.title})
이미지에서 보이는 텍스트를 정확히 읽고, 아래 항목들의 값을 추출하세요.

JSON 객체 하나만 응답 (코드블록·설명·다른 텍스트 금지):
{
  "raw": "이미지에 보이는 텍스트를 줄바꿈으로 구분해 그대로 옮긴 OCR 원문",
  "extracted": {
${fieldsList}
  },
  "corrections": [
    // OCR이 헷갈리기 쉬운 글자(O↔0, l↔1, I↔1, S↔5, B↔8)를 자동 보정한 경우만 추가
    // {"field":"키","from":"원문","to":"보정값","reason":"O를 0으로 보정"}
  ]
}

규칙:
- 숫자는 원본 표기 그대로 (콤마·원·% 포함 가능)
- 화면에 없는 필드는 빈 문자열 ""
- 추측 금지 — 보이는 것만 추출
- raw는 핵심 라벨·값 중심으로 (배경 UI는 생략)`;

  const response = await window.claude.complete({
    messages: [{
      role: 'user',
      content: [
        { type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: prompt },
      ],
    }],
  });

  const parsed = parseOcrJson(response);
  return {
    raw: parsed.raw || '',
    extracted: parsed.extracted || {},
    corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
  };
}

// Run OCR on the full upload set. progressCb gets called per step.
// Returns an array of capture objects parallel to DEMO_CAPTURES.
async function ocrAll(uploads, schemas, progressCb) {
  const out = [];
  for (let i = 0; i < schemas.length; i++) {
    const u = uploads[i];
    const schema = schemas[i];
    if (!u || !u.file) {
      out.push({
        ...schema,
        raw: '(이 슬롯에 이미지가 업로드되지 않았습니다)',
        ai: {},
        corrections: [],
        imageUrl: null,
        empty: true,
        real: false,
      });
      progressCb && progressCb({ step: i, total: schemas.length,
                                  status: 'skipped' });
      continue;
    }
    progressCb && progressCb({ step: i, total: schemas.length,
                                status: 'running',
                                label: schema.title });
    try {
      const r = await ocrCapture(u.file, schema);
      out.push({
        ...schema,
        raw: r.raw,
        ai: r.extracted,
        corrections: r.corrections,
        imageUrl: u.url,
        real: true,
      });
      progressCb && progressCb({ step: i, total: schemas.length,
                                  status: 'done' });
    } catch (e) {
      console.error('OCR error on capture', i, e);
      out.push({
        ...schema,
        raw: 'OCR 오류: ' + (e?.message || String(e)),
        ai: {},
        corrections: [],
        imageUrl: u.url,
        real: true,
        error: true,
      });
      progressCb && progressCb({ step: i, total: schemas.length,
                                  status: 'error',
                                  error: e?.message });
    }
  }
  return out;
}

window.fileToBase64 = fileToBase64;
window.compressImage = compressImage;
window.parseOcrJson = parseOcrJson;
window.ocrCapture = ocrCapture;
window.ocrAll = ocrAll;
