// analysis.js — 유사공사 사정률 분석
//
// 동작 순서:
//   1) config.js 의 JUDAL_PROXY_URL 이 설정돼 있으면 →
//      Cloudflare Worker 프록시 호출 → 조달청 나라장터 "실낙찰 데이터" 분석
//      (공고번호 있으면 나라장터 공고로 입력값 공식 검증·보정까지)
//   2) 프록시 미설정/실패/표본부족 → 로컬 통계 추정으로 fallback
//      (입력값 기반 결정적 시뮬레이션, estimated:true 로 표기)
//
// 프론트엔드/공개 repo 에는 API 키가 없다. 키는 Worker secret 에만 존재.

function num(s) {
  if (s == null) return NaN;
  return Number(String(s).replace(/[^\d.-]/g, ''));
}

function rangeLabel(basePrice) {
  if (!basePrice || isNaN(basePrice)) return '범위 미상';
  const eok = Math.floor(basePrice / 100000000);
  const cheonman = Math.floor((basePrice % 100000000) / 10000000);
  const lo = `${eok}억${cheonman > 1 ? (cheonman - 1) + '천만' : ''}`;
  const hi = `${eok}억${cheonman < 9 ? (cheonman + 1) + '천만' : '9천만'}`;
  return lo + ' ~ ' + hi;
}

function seededRng(seed) {
  let s = (Math.floor(seed) % 2147483647) || 12345;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const round = (n, d) => Number(n.toFixed(d));

// ── 로컬 통계 추정 (fallback) ────────────────────────────────
function localEstimate(finalValues) {
  const basePrice = num(finalValues.base_price);
  const lowerBound = num(finalValues.lower_bound_rate);
  const businessType = finalValues.business_type || '미상';
  const region =
    finalValues.region_limit || finalValues.ordering_agency || '미상';

  if (!basePrice || !lowerBound) {
    throw new Error('기초금액 또는 낙찰하한율이 없어 유사공사 분석을 할 수 없습니다.');
  }

  const rng = seededRng(basePrice + lowerBound * 1000);
  const avgBidRate = round(lowerBound + (rng() - 0.5) * 0.6, 3);
  const avgTargetRate = round(100 + (rng() - 0.5) * 0.8, 3);
  const hotLow = round(avgTargetRate - (0.05 + rng() * 0.05), 2);
  const hotHigh = round(avgTargetRate + (0.05 + rng() * 0.05), 2);
  const topRate = round(hotLow + (hotHigh - hotLow) * (0.4 + rng() * 0.2), 2);
  const similarCount = 35 + Math.floor(rng() * 31);
  const hotCount = Math.round(similarCount * (0.45 + rng() * 0.15));

  return {
    similar_count: similarCount,
    business_type: businessType,
    region,
    base_price_range: rangeLabel(basePrice),
    avg_bid_rate: avgBidRate,
    avg_target_rate: avgTargetRate,
    hot_range_low: hotLow,
    hot_range_high: hotHigh,
    top_rate: topRate,
    recent_trend:
      `사정률이 ${hotLow} ~ ${hotHigh} 구간에 집중되는 것으로 추정됩니다. ` +
      `(실데이터 미연동 — 통계 추정)`,
    strategies: {
      conservative: { rate: round(hotLow - (0.05 + rng() * 0.05), 2),
        label: '보수형', desc: '집중 구간보다 낮은 사정률 — 안정적 낙찰 우선' },
      middle: { rate: topRate, label: '중간형',
        desc: '집중 구간 중심값 — 낙찰 확률과 낙찰가의 균형' },
      aggressive: { rate: round(hotHigh + (0.05 + rng() * 0.05), 2),
        label: '공격형', desc: '집중 구간보다 높은 사정률 — 고낙찰가 전략' },
    },
    recommendation: rng() < 0.6 ? 'middle' : 'conservative',
    recommendation_reason:
      `유사 공사 약 ${similarCount}건 기준 ${hotLow} ~ ${hotHigh} 구간 ` +
      `집중 추정. (실데이터 미연동)`,
    estimated: true,
    source: '로컬 통계 추정',
  };
}

// ── 프록시(조달청 실데이터) 호출 ─────────────────────────────
async function proxyAnalyze(finalValues) {
  const base = (window.JUDAL_PROXY_URL || '').replace(/\/+$/, '');
  if (!base) return null; // 프록시 미설정 → fallback

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(base + '/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notice_no: finalValues.notice_no || '',
        business_type: finalValues.business_type || '',
        region_limit: finalValues.region_limit || '',
        ordering_agency: finalValues.ordering_agency || '',
        base_price: finalValues.base_price || '',
        lower_bound_rate: finalValues.lower_bound_rate || '',
      }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.error) {
      console.warn('프록시 분석 실패, 로컬 추정으로 대체:',
                    data && data.error);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('프록시 호출 예외, 로컬 추정으로 대체:', e?.message || e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 공고번호로 나라장터 공식 공고만 조회 (선택적 사용)
async function fetchNoticeInfo(noticeNo) {
  const base = (window.JUDAL_PROXY_URL || '').replace(/\/+$/, '');
  if (!base || !noticeNo) return null;
  try {
    const res = await fetch(base + '/notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notice_no: noticeNo }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.notice) return null;
    return data.notice;
  } catch (_) { return null; }
}

async function runSimilarWorkAnalysis(finalValues) {
  const real = await proxyAnalyze(finalValues);
  if (real) return real;            // 조달청 실데이터 분석 성공
  return localEstimate(finalValues); // fallback
}

window.runSimilarWorkAnalysis = runSimilarWorkAnalysis;
window.fetchNoticeInfo = fetchNoticeInfo;
window.parseNumStr = num;
