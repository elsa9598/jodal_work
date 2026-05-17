// ocr.js — In-browser OCR via Tesseract.js (no server, no API key)
//
// 모바일/정적 배포에서 동작하도록 window.claude 의존을 제거하고
// Tesseract.js(브라우저 내장 OCR)로 비드큐 캡처를 읽는다.
// Tesseract는 한글+숫자 인식 정확도가 Claude보다 낮으므로,
// 추출값은 "참고용 추정"이며 사용자가 검토 화면에서 수정하는 것을 전제로 한다.

async function compressImage(file, maxSide = 1800, quality = 0.9) {
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

// 필드별 라벨 후보와 값 타입
const FIELD_HINTS = {
  notice_no:              { terms: ['공고번호', '공고 번호'],            type: 'text'   },
  title:                  { terms: ['공고명', '공 고 명'],               type: 'text'   },
  ordering_agency:        { terms: ['발주기관', '발주 기관'],            type: 'text'   },
  demand_agency:          { terms: ['수요기관', '수요 기관'],            type: 'text'   },
  business_type:          { terms: ['업종', '업 종'],                    type: 'text'   },
  region_limit:           { terms: ['지역제한', '지역 제한', '지역'],    type: 'text'   },
  deadline:               { terms: ['입찰마감일시', '입찰 마감일시', '입찰마감', '입찰 마감', '마감일시'], type: 'text' },
  opening_datetime:       { terms: ['개찰일시', '개찰 일시', '개찰'],    type: 'text'   },
  base_price:             { terms: ['기초금액', '기초 금액'],            type: 'amount' },
  estimated_price:        { terms: ['추정가격', '추정 가격'],            type: 'amount' },
  price_range:            { terms: ['예정가격범위', '예정가격 범위', '예정가격', '예가범위'], type: 'text' },
  a_value:                { terms: ['A값', 'A 값', 'A값(원)'],           type: 'amount' },
  pure_construction_cost: { terms: ['순공사원가', '순공사 원가', '순공사'], type: 'amount' },
  lower_bound_rate:       { terms: ['낙찰하한율', '낙찰 하한율', '하한율'], type: 'rate' },
  bid_rate_range:         { terms: ['투찰률범위', '투찰률 범위', '투찰률', '투찰율'], type: 'rate' },
};

// 라벨 텍스트 → 글자 사이 공백을 허용하는 정규식 (Tesseract가 한글 사이에
// 공백을 자주 끼워 넣기 때문)
function labelRegex(term) {
  const esc = term.replace(/\s+/g, '').split('').map((ch) =>
    ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  ).join('\\s*');
  return new RegExp(esc + '\\s*[:：)\\]]?\\s*(.*)');
}

// 숫자 필드에서 OCR이 흔히 틀리는 글자 보정
const DIGIT_FIX = { O: '0', o: '0', D: '0', l: '1', I: '1', i: '1',
                    S: '5', s: '5', B: '8', Z: '2', z: '2', g: '9',
                    G: '6', b: '6', q: '9', T: '7' };

function fixDigits(str) {
  let changed = false;
  const out = str.replace(/[OoDlIiSsBZzgGbqT]/g, (m) => {
    if (DIGIT_FIX[m]) { changed = true; return DIGIT_FIX[m]; }
    return m;
  });
  return { value: out, changed };
}

function extractAmount(rest) {
  // "123,456,000원" 또는 "1억2,345만" 형태
  let m = rest.match(/([0-9OoDlIiSsBZzgGbqT][0-9OoDlIiSsBZzgGbqT,.\s억만천]*)\s*원/);
  if (!m) m = rest.match(/([0-9OoDlIiSsBZzgGbqT][0-9OoDlIiSsBZzgGbqT,.]{2,})/);
  if (!m) return null;
  return m[1].replace(/\s+/g, '').replace(/[.,]$/, '');
}

function extractRate(rest) {
  const range = rest.match(
    /([0-9OoSsBlI]{1,3}(?:\.[0-9OoSsBlI]+)?)\s*[~\-–]\s*([0-9OoSsBlI]{1,3}(?:\.[0-9OoSsBlI]+)?)/);
  if (range) return range[1] + ' ~ ' + range[2];
  const one = rest.match(/([0-9OoSsBlI]{1,3}(?:\.[0-9OoSsBlI]+)?)\s*%?/);
  return one ? one[1] : null;
}

// Tesseract 원문 텍스트에서 스키마 필드들을 휴리스틱 추출
function parseFieldsFromText(text, schema) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/[|]+/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean);

  const extracted = {};
  const corrections = [];

  for (const f of schema.fields) {
    const hint = FIELD_HINTS[f.key];
    if (!hint) continue;

    let rawVal = null;
    for (const term of hint.terms) {
      const re = labelRegex(term);
      for (const line of lines) {
        const m = line.match(re);
        if (m && m[1] != null && m[1].trim()) { rawVal = m[1].trim(); break; }
      }
      if (rawVal) break;
    }
    if (!rawVal) { extracted[f.key] = ''; continue; }

    if (hint.type === 'amount') {
      const amt = extractAmount(rawVal);
      if (amt) {
        const { value, changed } = fixDigits(amt);
        if (changed) {
          corrections.push({ field: f.key, from: amt, to: value,
                             reason: 'OCR 숫자 글자 자동 보정' });
        }
        extracted[f.key] = value;
      } else extracted[f.key] = '';
    } else if (hint.type === 'rate') {
      const r = extractRate(rawVal);
      if (r) {
        const { value, changed } = fixDigits(r);
        if (changed) {
          corrections.push({ field: f.key, from: r, to: value,
                             reason: 'OCR 숫자 글자 자동 보정' });
        }
        extracted[f.key] = value;
      } else extracted[f.key] = '';
    } else {
      extracted[f.key] = rawVal.replace(/[)\]]+$/, '').slice(0, 60).trim();
    }
  }

  return { extracted, corrections };
}

// 단일 캡처 OCR — Tesseract.js로 비드큐 화면에서 필드 추출
async function ocrSingleCapture(file, schema, onProgress) {
  if (typeof Tesseract === 'undefined') {
    throw new Error('OCR 엔진(Tesseract.js)을 불러오지 못했습니다. 네트워크를 확인하세요.');
  }
  const compressed = await compressImage(file);

  const { data } = await Tesseract.recognize(compressed, 'kor+eng', {
    logger: (msg) => {
      if (onProgress && msg.status === 'recognizing text') {
        onProgress(msg.progress);
      }
    },
  });

  const rawText = (data && data.text ? data.text : '').trim();
  if (!rawText) {
    throw new Error('이미지에서 글자를 인식하지 못했습니다. 더 선명한 캡처로 다시 시도하세요.');
  }

  const { extracted, corrections } = parseFieldsFromText(rawText, schema);
  return { raw: rawText, extracted, corrections };
}

window.compressImage = compressImage;
window.parseFieldsFromText = parseFieldsFromText;
window.ocrSingleCapture = ocrSingleCapture;
