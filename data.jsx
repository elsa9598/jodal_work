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
function statusLabel(s) {
  if (s === 'urgent') return { label: '마감 임박', cls: 'badge-warn' };
  if (s === 'closed') return { label: '마감 완료', cls: 'badge-mute' };
  if (s === 'flag') return { label: '확인 필요', cls: 'badge-neg' };
  return { label: '정상 진행', cls: 'badge-pos' };
}

window.APP_DATA = {
  AGENCIES, WORK_TYPES, NOTICES, MY_HISTORY,
  makeSimilar, fmt, fmtKRW, fmt억, calcBid, statusLabel,
};
