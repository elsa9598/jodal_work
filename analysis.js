// analysis.js — 로컬 유사공사 패턴 추정 (서버·API 키 불필요)
//
// 모바일/정적 배포에서 동작하도록 window.claude 의존을 제거하고,
// 입력 공고 정보(기초금액·낙찰하한율)로부터 결정적(seeded) 통계 시뮬레이션을
// 생성한다. 실제 나라장터 데이터가 아닌 "AI 추정"이며 UI에 그렇게 표기된다.
// 같은 입력 → 같은 결과(재현 가능).

// "123,456,000원" → 123456000
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

// 입력값으로 시드를 만들어 동일 입력엔 동일 난수열
function seededRng(seed) {
  let s = (Math.floor(seed) % 2147483647) || 12345;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const round = (n, d) => Number(n.toFixed(d));

async function runSimilarWorkAnalysis(finalValues) {
  const basePrice = num(finalValues.base_price);
  const lowerBound = num(finalValues.lower_bound_rate);
  const businessType = finalValues.business_type || '미상';
  const region = finalValues.region_limit || finalValues.ordering_agency || '미상';

  if (!basePrice || !lowerBound) {
    throw new Error('기초금액 또는 낙찰하한율이 없어 유사공사 분석을 할 수 없습니다.');
  }

  const rng = seededRng(basePrice + lowerBound * 1000);

  // 평균 낙찰률: 하한율 ±0.3
  const avgBidRate = round(lowerBound + (rng() - 0.5) * 0.6, 3);
  // 평균 사정률: 100 ±0.4
  const avgTargetRate = round(100 + (rng() - 0.5) * 0.8, 3);
  // 사정률 집중 구간: 평균 ±0.1
  const hotLow  = round(avgTargetRate - (0.05 + rng() * 0.05), 2);
  const hotHigh = round(avgTargetRate + (0.05 + rng() * 0.05), 2);
  const topRate = round(hotLow + (hotHigh - hotLow) * (0.4 + rng() * 0.2), 2);

  const similarCount = 35 + Math.floor(rng() * 31); // 35~65
  const hotCount = Math.round(similarCount * (0.45 + rng() * 0.15));

  const strategies = {
    conservative: {
      rate: round(hotLow - (0.05 + rng() * 0.05), 2),
      label: '보수형',
      desc: '집중 구간보다 낮은 사정률 — 안정적 낙찰 가능성을 우선',
    },
    middle: {
      rate: topRate,
      label: '중간형',
      desc: '집중 구간 중심값 — 낙찰 확률과 낙찰가의 균형',
    },
    aggressive: {
      rate: round(hotHigh + (0.05 + rng() * 0.05), 2),
      label: '공격형',
      desc: '집중 구간보다 높은 사정률 — 고낙찰가를 노리는 전략',
    },
  };

  const recommendation = rng() < 0.6 ? 'middle' : 'conservative';
  const recName = strategies[recommendation].label;

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
      `최근 유사 공사에서 사정률이 ${hotLow} ~ ${hotHigh} 구간에 집중되는 ` +
      `흐름이 관찰됩니다. (통계 추정)`,
    strategies,
    recommendation,
    recommendation_reason:
      `유사 공사 ${similarCount}건 중 약 ${hotCount}건이 ` +
      `${hotLow} ~ ${hotHigh} 구간에서 낙찰되어 ${recName} 전략을 추천합니다.`,
    estimated: true,
  };
}

window.runSimilarWorkAnalysis = runSimilarWorkAnalysis;
window.parseNumStr = num;
