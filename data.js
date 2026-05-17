// data.js — single capture schema with ALL fields combined
// (v2: 1장 캡처 → OCR → AI 유사공사 분석)

const CAPTURE_SCHEMA = {
  title: '비드큐 공고 분석 화면',

  // All extractable fields from one BidQ screen
  // Critical fields are required for the bid calculation.
  fields: [
    // 공고 정보
    { key: 'notice_no',           label: '공고번호',      group: 'notice' },
    { key: 'title',               label: '공고명',        group: 'notice' },
    { key: 'ordering_agency',     label: '발주기관',      group: 'notice' },
    { key: 'demand_agency',       label: '수요기관',      group: 'notice' },
    { key: 'business_type',       label: '업종',          group: 'notice' },
    { key: 'region_limit',        label: '지역제한',      group: 'notice' },
    { key: 'deadline',            label: '입찰 마감일시', group: 'notice' },
    { key: 'opening_datetime',    label: '개찰일시',      group: 'notice' },

    // 금액 정보
    { key: 'base_price',          label: '기초금액',      group: 'amount', unit: '원', critical: true },
    { key: 'estimated_price',     label: '추정가격',      group: 'amount', unit: '원' },
    { key: 'price_range',         label: '예정가격 범위', group: 'amount' },
    { key: 'a_value',             label: 'A값',           group: 'amount', unit: '원' },
    { key: 'pure_construction_cost', label: '순공사원가',  group: 'amount', unit: '원' },

    // 사정률 정보
    { key: 'lower_bound_rate',    label: '낙찰하한율',    group: 'rate',   unit: '%', critical: true },
    { key: 'bid_rate_range',      label: '투찰률 범위',   group: 'rate',   unit: '%' },
  ],
};

// Demo data — for the "데모로 채우기" fallback. Based on the spec example.
const DEMO_CAPTURE = {
  raw: `[비드큐 공고 분석]
공고번호    20251115-00834-00
공고명      2025년 OO시 OO구 도로보수공사
발주기관    OO시 OO구청
수요기관    OO구 도로관리과
업종        토목공사업
지역제한    OO시 관내
입찰 마감   2025-11-28 10:00
개찰일시    2025-11-28 11:00
기초금액    123,456,000원
추정가격    112,233,000원
예정가격    -3% ~ +3%
A값         4,567,000원
순공사원가  98,765,000원
낙찰하한율  87.745%
투찰률      87.5 ~ 88.0%`,
  ai: {
    notice_no: '20251115-00834-00',
    title: '2025년 OO시 OO구 도로보수공사',
    ordering_agency: 'OO시 OO구청',
    demand_agency: 'OO구 도로관리과',
    business_type: '토목공사업',
    region_limit: 'OO시 관내',
    deadline: '2025-11-28 10:00',
    opening_datetime: '2025-11-28 11:00',
    base_price: '123,456,000',
    estimated_price: '112,233,000',
    price_range: '-3% ~ +3%',
    a_value: '4,567,000',
    pure_construction_cost: '98,765,000',
    lower_bound_rate: '87.745',
    bid_rate_range: '87.5 ~ 88.0',
  },
  corrections: [
    { field: 'lower_bound_rate', from: '87.74S%', to: '87.745%',
      reason: 'S를 5로 자동 보정' },
  ],
};

// Demo AI similar-work analysis result
const DEMO_ANALYSIS = {
  similar_count: 42,
  business_type: '토목공사업',
  region: 'OO시',
  base_price_range: '1억 ~ 1억5천만',
  avg_bid_rate: 87.842,
  avg_target_rate: 99.985,
  hot_range_low: 99.94,
  hot_range_high: 100.03,
  top_rate: 99.98,
  recent_trend: '최근 3개월간 100% 근처 사정률이 집중되어 있습니다.',
  strategies: {
    conservative: { rate: 99.85, label: '보수형',
                    desc: '낮은 사정률 — 안정적 낙찰 가능성' },
    middle:       { rate: 99.98, label: '중간형',
                    desc: '평균 사정률 — 균형 잡힌 전략' },
    aggressive:   { rate: 100.10, label: '공격형',
                    desc: '높은 사정률 — 고낙찰가 전략' },
  },
  recommendation: 'middle',
  recommendation_reason: '최근 유사 공사 42건 중 23건이 99.94 ~ 100.03 구간에서 낙찰되었습니다.',
};

window.CAPTURE_SCHEMA = CAPTURE_SCHEMA;
window.DEMO_CAPTURE = DEMO_CAPTURE;
window.DEMO_ANALYSIS = DEMO_ANALYSIS;
