// ocr.js — Real OCR via Claude vision (single-capture v2)

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

async function compressImage(file, maxSide = 1600, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width: w, height: h } = img;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
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

function parseOcrJson(text) {
  if (!text) throw new Error('빈 응답');
  let s = String(text).replace(/^[\s\S]*?```(?:json)?\s*/, '');
  s = s.replace(/\s*```[\s\S]*$/, '').trim();
  if (!s.startsWith('{')) {
    const i = s.indexOf('{');
    if (i < 0) throw new Error('JSON 없음: ' + text.slice(0, 120));
    s = s.slice(i);
  }
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

// Single-capture OCR — extracts all fields from one BidQ screenshot
async function ocrSingleCapture(file, schema) {
  const compressed = await compressImage(file);
  const base64 = await fileToBase64(compressed);
  const mediaType = compressed.type || 'image/jpeg';

  const fieldsList = schema.fields.map((f) =>
    `    "${f.key}": ""  // ${f.label}${f.unit ? ' [' + f.unit + ']' : ''}`,
  ).join('\n');

  const prompt =
`이 이미지는 한국 조달청/비드큐(BidQ) 입찰 공고 화면입니다.
이미지에서 보이는 텍스트를 정확히 읽고, 아래 항목들의 값을 추출하세요.

JSON 객체 하나만 응답 (코드블록·설명·다른 텍스트 금지):
{
  "raw": "이미지에서 추출한 핵심 라벨·값들을 줄바꿈으로 나열한 OCR 원문 (배경 UI 생략)",
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
- raw는 핵심 라벨·값 중심 (전체 UI 텍스트를 다 옮길 필요 없음)`;

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

window.fileToBase64 = fileToBase64;
window.compressImage = compressImage;
window.parseOcrJson = parseOcrJson;
window.ocrSingleCapture = ocrSingleCapture;
