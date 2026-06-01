/* global window */
// data.jsx — 데모 데이터 제거. 실데이터는 live.jsx(프록시 경유)로만 주입.
//  - NOTICES: 빈 배열. live.jsx 가 조달청 /list 실데이터로 채움.
//  - MY_HISTORY: 빈 배열. 사용자가 직접 입력한 기록만(localStorage 연동 여지).
//  - makeSimilar: 실데이터 도착 전 안전한 빈 골격(0 / '분석 대기'),
//    공고 선택 시 live.jsx 가 조달청 /analyze 실분포로 교체.

const AGENCIES = [
  '서울특별시청', '서울시 구청', '서울시설공단', '서울교통공사',
  '서울주택도시공사', '서울시 상수도사업본부', '서울시 도시기반시설본부',
  '서울시교육청',
];
const WORK_TYPES = ['도로포장', '아스콘포장', '보도블록정비', '차도정비',
  '인도정비', '하수도정비', '상수도정비', '굴착복구', '배수로정비', '토목공사'];

// 실데이터는 live.jsx 가 프록시(/list)에서 받아 window.APP_DATA.NOTICES 에 주입
const NOTICES = [];

// 내 투찰 기록 — 사용자 입력분만 (데모 없음)
const MY_HISTORY = [];

// 실데이터 도착 전 안전 골격 (live.jsx 가 /analyze 실분포로 교체)
function makeSimilar(noticeId) {
  return {
    notice_id: noticeId,
    total: 0,
    region: '서울특별시',
    work_label: '실데이터 분석 대기',
    base_range: '—',
    avg_success: 0, min_success: 0, max_success: 0, median_success: 0,
    avg_adj: 0,
    concentrated_range: [0, 0],
    most_common_range: [0, 0],
    avg_competition: 0,
    recent_trend: '공고를 선택하면 조달청 낙찰 실데이터로 분석합니다. (분석 대기)',
    strategy: '실데이터 분석 대기',
    buckets: [],
    recent: [],
    strategies: {
      conservative: { rate: 0, label: '보수형', desc: '실데이터 분석 대기' },
      middle: { rate: 0, label: '중간형', desc: '실데이터 분석 대기' },
      aggressive: { rate: 0, label: '공격형', desc: '실데이터 분석 대기' },
    },
    estimated: false,
    source: '실데이터 분석 대기',
  };
}

// helpers
function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('ko-KR');
}
function fmtKRW(n) { return fmt(n) + '원'; }
function fmt억(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 100_000_000) return (n / 100_000_000).toFixed(2) + '억';
  if (n >= 10_000) return (n / 10_000_000).toFixed(1) + '천만';
  return fmt(n) + '원';
}
function calcBid(base, adj, lower) {
  return Math.round(base * (adj / 100) * (lower / 100));
}
function getRecommendedBid(notice, sim) {
  if (!notice) return null;
  const lo = Number(notice.rate_range && notice.rate_range[0]) || 97;
  const hi = Number(notice.rate_range && notice.rate_range[1]) || 103;
  const mid = (lo + hi) / 2;
  const pickRate = (v, fallback) => {
    const n = Number(v);
    return n > 0 ? n : fallback;
  };
  const strategies = sim && sim.strategies ? sim.strategies : {};
  const consRate = pickRate(strategies.conservative && strategies.conservative.rate,
    pickRate(sim && sim.concentrated_range && sim.concentrated_range[0], Math.max(lo, mid - 0.04)));
  const middleRate = pickRate(strategies.middle && strategies.middle.rate,
    pickRate(sim && sim.avg_adj, mid));
  const aggRate = pickRate(strategies.aggressive && strategies.aggressive.rate,
    pickRate(sim && sim.concentrated_range && sim.concentrated_range[1], Math.min(hi, mid + 0.04)));

  const rawKey = (sim && sim.recommendation_key) || 'middle';
  const key = rawKey === 'conservative' || rawKey === 'aggressive' ? rawKey : 'middle';
  const candidates = {
    conservative: {
      key: 'conservative',
      uiKey: 'conservative',
      label: '안정형',
      desc: '낙찰 하위권 투찰률 기준',
      rate: consRate,
      price: calcBid(notice.base_price, consRate, notice.lower_rate),
    },
    middle: {
      key: 'middle',
      uiKey: 'balanced',
      label: '추천형',
      desc: '실낙찰 집중 구간 기준',
      rate: middleRate,
      price: calcBid(notice.base_price, middleRate, notice.lower_rate),
    },
    aggressive: {
      key: 'aggressive',
      uiKey: 'aggressive',
      label: '공격형',
      desc: '낙찰 상위권 투찰률 기준',
      rate: aggRate,
      price: calcBid(notice.base_price, aggRate, notice.lower_rate),
    },
  };
  const selected = candidates[key];
  const total = Number(sim && (sim.total || sim.sample_count || sim.similar_count)) || 0;
  const confidence = total >= 30 && sim && sim.estimated === false ? '높음'
    : total >= 8 ? '보통'
    : '대기';
  const bidRate = notice.base_price ? +(selected.price / notice.base_price * 100).toFixed(3) : 0;
  return {
    key,
    uiKey: selected.uiKey,
    label: selected.label,
    desc: selected.desc,
    rate: selected.rate,
    price: selected.price,
    bidRate,
    total,
    confidence,
    source: sim && sim.source ? sim.source : '실데이터 분석 대기',
    reason: sim && (sim.recommendation_reason || sim.strategy || sim.recent_trend)
      ? (sim.recommendation_reason || sim.strategy || sim.recent_trend)
      : '공고를 선택하면 조달청 실데이터 기반으로 추천 금액을 계산합니다.',
    candidates,
  };
}
function statusLabel(s) {
  if (s === 'urgent') return { label: '마감 임박', cls: 'badge-warn' };
  if (s === 'closed') return { label: '마감 완료', cls: 'badge-mute' };
  if (s === 'flag') return { label: '확인 필요', cls: 'badge-neg' };
  return { label: '정상 진행', cls: 'badge-pos' };
}

window.APP_DATA = {
  AGENCIES, WORK_TYPES, NOTICES, MY_HISTORY,
  makeSimilar, fmt, fmtKRW, fmt억, calcBid, getRecommendedBid, statusLabel,
};
