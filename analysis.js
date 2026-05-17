// analysis.js — AI similar-work pattern analysis
//
// After OCR, this takes the finalized bid info and asks Claude to estimate
// what similar 나라장터/조달청 historical tenders look like — count, average
// rates, hot ranges, and 3-tier strategy recommendations.
//
// IMPORTANT: this is a SIMULATION. The model doesn't have live access to
// 나라장터. We prompt it to produce plausible, internally-consistent
// statistics that make the demo feel grounded. The result is clearly labeled
// "AI 추정" in the UI.

function parseAnalysisJson(text) {
  if (!text) throw new Error('빈 응답');
  let s = String(text).replace(/^[\s\S]*?```(?:json)?\s*/, '');
  s = s.replace(/\s*```[\s\S]*$/, '').trim();
  if (!s.startsWith('{')) {
    const i = s.indexOf('{');
    if (i < 0) throw new Error('JSON 없음');
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
      if (depth === 0) return JSON.parse(s.slice(0, i + 1));
    }
  }
  throw new Error('JSON 닫힘 없음');
}

// Parse "123,456,000원" → 123456000
function num(s) {
  if (s == null) return NaN;
  return Number(String(s).replace(/[^\d.-]/g, ''));
}

// Format a number into Korean readable range (e.g. "1억2천만")
function rangeLabel(basePrice) {
  if (!basePrice || isNaN(basePrice)) return '범위 미상';
  const eok = Math.floor(basePrice / 100000000);
  const cheonman = Math.floor((basePrice % 100000000) / 10000000);
  const lo = `${eok}억${cheonman > 1 ? (cheonman - 1) + '천만' : ''}`;
  const hi = `${eok}억${cheonman < 9 ? (cheonman + 1) + '천만' : '9천만'}`;
  return lo + ' ~ ' + hi;
}

async function runSimilarWorkAnalysis(finalValues) {
  const basePrice = num(finalValues.base_price);
  const lowerBound = num(finalValues.lower_bound_rate);
  const businessType = finalValues.business_type || '미상';
  const region = finalValues.region_limit || finalValues.ordering_agency || '미상';

  if (!basePrice || !lowerBound) {
    throw new Error('기초금액 또는 낙찰하한율이 없어 유사공사 분석을 할 수 없습니다.');
  }

  const prompt =
`너는 한국 조달청·나라장터 입찰 분석가다. 다음 공고 정보를 보고
유사 공사 낙찰 패턴을 "그럴듯한 시뮬레이션"으로 추정하라.

[입력 공고 정보]
- 업종: ${businessType}
- 지역: ${region}
- 기초금액: ${basePrice.toLocaleString()}원
- 낙찰하한율: ${lowerBound}%

[규칙]
- 실제 데이터가 아닌 통계 시뮬레이션이므로 그럴듯하고 일관성 있게 추정
- 평균 낙찰률 (avg_bid_rate)은 ${lowerBound}% 근처(±0.3) 범위
- 평균 사정률 (avg_target_rate)은 100% 근처(99.6~100.4) 범위
- 사정률 집중 구간 (hot_range_low ~ hot_range_high)은 avg_target_rate를 중심으로 ±0.1 범위
- top_rate는 hot_range 안의 한 값
- 3가지 전략 사정률:
  - conservative: hot_range_low - 0.05 ~ -0.10
  - middle:       top_rate
  - aggressive:   hot_range_high + 0.05 ~ +0.10
- 추천 전략은 일반적으로 "middle" 또는 "conservative"

JSON 객체 하나만 응답 (코드블록·설명 금지):
{
  "similar_count": 35~65 사이의 정수,
  "business_type": "${businessType}",
  "region": "${region}",
  "base_price_range": "예: 1억 ~ 1억5천만",
  "avg_bid_rate": 숫자(소수점 3자리),
  "avg_target_rate": 숫자(소수점 3자리),
  "hot_range_low": 숫자(소수점 2자리),
  "hot_range_high": 숫자(소수점 2자리),
  "top_rate": 숫자(소수점 2자리),
  "recent_trend": "1-2문장으로 최근 흐름 묘사",
  "strategies": {
    "conservative": {"rate": 숫자, "label": "보수형", "desc": "1문장 설명"},
    "middle":       {"rate": 숫자, "label": "중간형", "desc": "1문장 설명"},
    "aggressive":   {"rate": 숫자, "label": "공격형", "desc": "1문장 설명"}
  },
  "recommendation": "conservative 또는 middle 또는 aggressive",
  "recommendation_reason": "왜 이 전략을 추천하는지 1-2문장"
}`;

  const response = await window.claude.complete({
    messages: [{ role: 'user', content: prompt }],
  });

  const parsed = parseAnalysisJson(response);

  // Sanity-fill any missing fields so the UI doesn't crash.
  parsed.business_type     = parsed.business_type     || businessType;
  parsed.region            = parsed.region            || region;
  parsed.base_price_range  = parsed.base_price_range  || rangeLabel(basePrice);
  parsed.similar_count     = parsed.similar_count     || 40;
  parsed.strategies        = parsed.strategies        || {};
  parsed.recommendation    = parsed.recommendation    || 'middle';

  return parsed;
}

window.runSimilarWorkAnalysis = runSimilarWorkAnalysis;
window.parseNumStr = num;
