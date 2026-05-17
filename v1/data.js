// Demo OCR data based on the 기획서 example (123,456,000원 → 108,345,200원)

const DEMO_CAPTURES = [
  {
    id: 1,
    title: '공고 기본 정보',
    raw: `[공고 정보]
공고번호  20251115-00834-00
공고명    2025년 OO시 OO구 도로보수공사
발주기관  OO시 OO구청
수요기관  OO구 도로관리과
업종      토목공사업
지역제한  OO시 관내
입찰마감  2025-11-28 10:00
개찰일시  2025-11-28 11:00`,
    ai: {
      notice_no: '20251115-00834-00',
      title: '2025년 OO시 OO구 도로보수공사',
      ordering_agency: 'OO시 OO구청',
      demand_agency: 'OO구 도로관리과',
      business_type: '토목공사업',
      region_limit: 'OO시 관내',
      deadline: '2025-11-28 10:00',
      opening_datetime: '2025-11-28 11:00',
    },
    fields: [
      { key: 'notice_no', label: '공고번호' },
      { key: 'title', label: '공고명' },
      { key: 'ordering_agency', label: '발주기관' },
      { key: 'demand_agency', label: '수요기관' },
      { key: 'business_type', label: '업종' },
      { key: 'region_limit', label: '지역제한' },
      { key: 'deadline', label: '입찰 마감일시' },
      { key: 'opening_datetime', label: '개찰일시' },
    ],
    corrections: [],
  },
  {
    id: 2,
    title: '금액 정보',
    raw: `[금액 정보]
기초금액      123,456,000원
추정가격      112,233,000원
예정가격 범위 -3% ~ +3%
부가세 포함   포함
순공사원가    98,765,000원
A값           4,567,000원`,
    ai: {
      base_price: '123,456,000',
      estimated_price: '112,233,000',
      price_range: '-3% ~ +3%',
      vat_included: '포함',
      pure_construction_cost: '98,765,000',
      a_value: '4,567,000',
    },
    fields: [
      { key: 'base_price', label: '기초금액', unit: '원', critical: true },
      { key: 'estimated_price', label: '추정가격', unit: '원' },
      { key: 'price_range', label: '예정가격 범위' },
      { key: 'vat_included', label: '부가세 포함' },
      { key: 'pure_construction_cost', label: '순공사원가', unit: '원' },
      { key: 'a_value', label: 'A값', unit: '원' },
    ],
    corrections: [],
  },
  {
    id: 3,
    title: '낙찰하한율 분석',
    raw: `[낙찰하한율 분석]
낙찰하한율    87.745%
투찰률        87.5 ~ 88.0%
예가 범위     -3% ~ +3%
사정률 기준값 100.000%`,
    ai: {
      lower_bound_rate: '87.745',
      bid_rate_range: '87.5 ~ 88.0',
      price_range: '-3% ~ +3%',
      base_rate: '100.000',
    },
    fields: [
      { key: 'lower_bound_rate', label: '낙찰하한율', unit: '%', critical: true },
      { key: 'bid_rate_range', label: '투찰률 범위', unit: '%' },
      { key: 'price_range', label: '예가 범위' },
      { key: 'base_rate', label: '사정률 기준값', unit: '%' },
    ],
    corrections: [],
  },
  {
    id: 4,
    title: '비드큐 추천 분석',
    raw: `[비드큐 AI 추천]
추천 사정률 시작값  99.850%
추천 사정률 끝값    100.150%
추천 투찰률         87.745%
AI 추천 분석값      예가 상위구간 추천`,
    ai: {
      recommend_rate_start: '99.850',
      recommend_rate_end: '100.150',
      recommended_bid_rate: '87.745',
      ai_recommendation: '예가 상위구간 추천',
    },
    fields: [
      { key: 'recommend_rate_start', label: '추천 사정률 시작값', unit: '%' },
      { key: 'recommend_rate_end', label: '추천 사정률 끝값', unit: '%' },
      { key: 'recommended_bid_rate', label: '추천 투찰률', unit: '%' },
      { key: 'ai_recommendation', label: 'AI 추천 분석' },
    ],
    corrections: [],
  },
  {
    id: 5,
    title: '1순위 사정률 / 경쟁 분석',
    raw: `[1순위 사정률 / 경쟁 분석]
1순위 사정률      1OO.O32%
경쟁사 분석값     12개사 / 평균 87.6%
개찰 예측 데이터  상위 추정구간
최종 추천값       100.032%`,
    ai: {
      primary_target_rate: '100.032',
      competition: '12개사 / 평균 87.6%',
      opening_prediction: '상위 추정구간',
      final_recommendation: '100.032',
    },
    fields: [
      { key: 'primary_target_rate', label: '1순위 사정률', unit: '%', critical: true },
      { key: 'competition', label: '경쟁사 분석' },
      { key: 'opening_prediction', label: '개찰 예측' },
      { key: 'final_recommendation', label: '최종 추천값', unit: '%' },
    ],
    corrections: [
      { field: 'primary_target_rate', from: '1OO.O32%', to: '100.032%', reason: 'O를 0으로 자동 보정 (2건)' },
    ],
  },
];

window.DEMO_CAPTURES = DEMO_CAPTURES;
