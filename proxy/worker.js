/**
 * judal 실데이터 프록시 — Cloudflare Worker
 *
 * 역할: 공개 프론트엔드 대신 조달청 나라장터 낙찰정보 OpenAPI를 호출하고,
 *       유사 공사의 "사정률 분포"를 실제 낙찰 데이터로 계산해 돌려준다.
 *       OpenAPI 서비스키는 이 Worker의 환경변수(JODAL_API_KEY)에만 존재하며
 *       프론트엔드/공개 repo에는 절대 노출되지 않는다.
 *
 * 비밀(Secret):  JODAL_API_KEY   — data.go.kr 나라장터 낙찰정보서비스 serviceKey
 * 변수(Var):     ALLOWED_ORIGIN  — 허용 Origin (기본 https://elsa9598.github.io)
 *
 * 엔드포인트:
 *   POST /notice    body:{ notice_no }
 *     → 나라장터 입찰공고 공식 정보 (기초금액·낙찰하한율·업종 검증/보정용)
 *   POST /analyze   body:{ notice_no?, business_type, region,
 *                          base_price, lower_bound_rate }
 *     → notice_no 있으면 공고 정보로 입력값 자동 검증·보정 후,
 *       조달청 실낙찰 데이터로 사정률 분포 분석
 *     200 → analysis.js가 기대하는 JSON (estimated:false, source 포함)
 *     502 → 데이터 부족/API 오류 (프론트가 로컬 추정으로 fallback)
 */

const JODAL_BASE =
  'https://apis.data.go.kr/1230000/as/ScsbidInfoService/getScsbidListSttusCnstwk';

// 나라장터 입찰공고정보서비스 (공사) — 공고번호로 공식 공고 조회
const NOTICE_BASE =
  'https://apis.data.go.kr/1230000/as/BidPublicInfoService/getBidPblancListInfoCnstwk';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

const json = (obj, status, origin) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8',
               ...corsHeaders(origin) },
  });

const toNum = (s) => Number(String(s ?? '').replace(/[^\d.-]/g, ''));
const round = (n, d) => Number(Number(n).toFixed(d));

function rangeLabel(basePrice) {
  if (!basePrice || isNaN(basePrice)) return '범위 미상';
  const eok = Math.floor(basePrice / 1e8);
  const cm = Math.floor((basePrice % 1e8) / 1e7);
  const lo = `${eok}억${cm > 1 ? (cm - 1) + '천만' : ''}`;
  const hi = `${eok}억${cm < 9 ? (cm + 1) + '천만' : '9천만'}`;
  return lo + ' ~ ' + hi;
}

function ymd(d) {
  return d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
}

// 낙찰 레코드 1건에서 사정률(예정가격 ÷ 기초금액 × 100) 추출.
// API 필드명이 서비스/버전마다 달라 흔한 후보를 모두 시도한다.
function recordSajeongRate(rec) {
  const direct = toNum(rec.sjngRt ?? rec.rsrvtnPrceRt ?? rec.aslnRt);
  if (direct && direct > 90 && direct < 110) return direct;

  const plan = toNum(rec.plnprc ?? rec.rsrvtnPrce ?? rec.predPrce);
  const base = toNum(rec.bssamt ?? rec.basePrce ?? rec.baseAmt);
  if (plan && base) {
    const r = (plan / base) * 100;
    if (r > 90 && r < 110) return round(r, 4);
  }
  return null;
}

async function fetchScsbid(serviceKey, pageNo) {
  const end = new Date();
  const begin = new Date();
  begin.setMonth(begin.getMonth() - 6); // 최근 6개월

  const qs = new URLSearchParams({
    serviceKey,
    pageNo: String(pageNo),
    numOfRows: '100',
    type: 'json',
    inqryDiv: '1',
    inqryBgnDt: ymd(begin) + '0000',
    inqryEndDt: ymd(end) + '2359',
  });
  const res = await fetch(`${JODAL_BASE}?${qs}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('조달청 API HTTP ' + res.status);
  const data = await res.json();
  const body = data?.response?.body;
  if (!body) throw new Error('조달청 API 응답 형식 오류');
  const items = body.items;
  const list = Array.isArray(items) ? items
             : Array.isArray(items?.item) ? items.item
             : items?.item ? [items.item] : [];
  return { list, total: toNum(body.totalCount) };
}

// 나라장터 입찰공고 공식 정보 조회 (공고번호 기준)
async function fetchNotice(serviceKey, noticeNo) {
  const clean = String(noticeNo).replace(/[^\d-]/g, '');
  const bidNo = clean.split('-')[0] || clean;
  const qs = new URLSearchParams({
    serviceKey,
    pageNo: '1',
    numOfRows: '10',
    type: 'json',
    inqryDiv: '2',
    bidNtceNo: bidNo,
  });
  const res = await fetch(`${NOTICE_BASE}?${qs}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('나라장터 공고 API HTTP ' + res.status);
  const data = await res.json();
  const items = data?.response?.body?.items;
  const list = Array.isArray(items) ? items
             : Array.isArray(items?.item) ? items.item
             : items?.item ? [items.item] : [];
  if (!list.length) return null;
  const it = list[0];
  return {
    notice_no: it.bidNtceNo ?? bidNo,
    title: it.bidNtceNm ?? '',
    ordering_agency: it.ntceInsttNm ?? '',
    demand_agency: it.dminsttNm ?? '',
    business_type: it.indstrytyNm ?? it.bsnsDivNm ?? '',
    region_limit: it.prtcptPsblRgnNm ?? '',
    base_price: toNum(it.bssamt ?? it.presmptPrce),
    estimated_price: toNum(it.presmptPrce),
    lower_bound_rate: toNum(it.sucsfbidLwltRate ?? it.scsbidLwltRate),
    deadline: it.bidClseDt ?? '',
    opening_datetime: it.opengDt ?? '',
    source: '나라장터 입찰공고정보 OpenAPI',
  };
}

function analyzeDistribution(rates, basePrice, lowerBound, biz, region) {
  rates.sort((a, b) => a - b);
  const n = rates.length;
  const avg = rates.reduce((s, r) => s + r, 0) / n;

  // 0.1%p 폭 빈(bin) 중 가장 밀집된 구간 = 사정률 집중구간
  const bins = {};
  for (const r of rates) {
    const k = Math.round(r * 10) / 10;
    bins[k] = (bins[k] || 0) + 1;
  }
  let hotKey = null, hotCount = 0;
  for (const k in bins) {
    if (bins[k] > hotCount) { hotCount = bins[k]; hotKey = Number(k); }
  }
  const hotLow = round(hotKey - 0.05, 2);
  const hotHigh = round(hotKey + 0.05, 2);

  const pct = (p) => rates[Math.min(n - 1, Math.floor(p * n))];
  const strategies = {
    conservative: { rate: round(pct(0.2), 2), label: '보수형',
      desc: '실데이터 하위 20% 사정률 — 안정적 낙찰 우선' },
    middle: { rate: round(hotKey, 2), label: '중간형',
      desc: '실제 낙찰이 가장 집중된 사정률 구간 중심' },
    aggressive: { rate: round(pct(0.8), 2), label: '공격형',
      desc: '실데이터 상위 20% 사정률 — 고낙찰가 전략' },
  };
  const recommendation = hotCount / n >= 0.25 ? 'middle' : 'conservative';

  return {
    similar_count: n,
    business_type: biz || '미상',
    region: region || '미상',
    base_price_range: rangeLabel(basePrice),
    avg_bid_rate: round(lowerBound, 3),
    avg_target_rate: round(avg, 3),
    hot_range_low: hotLow,
    hot_range_high: hotHigh,
    top_rate: round(hotKey, 2),
    recent_trend:
      `최근 6개월 유사 낙찰 ${n}건 중 ${hotCount}건이 ` +
      `${hotLow}~${hotHigh} 구간에 집중되었습니다. (조달청 실데이터)`,
    strategies,
    recommendation,
    recommendation_reason:
      `실제 낙찰 ${n}건 분석 결과 ${hotLow}~${hotHigh} 구간 집중도가 ` +
      `${round((hotCount / n) * 100, 1)}%로 가장 높습니다.`,
    estimated: false,
    source: '조달청 나라장터 낙찰정보 OpenAPI',
    sample_count: n,
  };
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://elsa9598.github.io';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const url = new URL(request.url);
    if (request.method !== 'POST' ||
        (url.pathname !== '/analyze' && url.pathname !== '/notice')) {
      return json({ error: 'POST /analyze 또는 /notice 만 지원합니다.' }, 404, origin);
    }
    if (!env.JODAL_API_KEY) {
      return json({ error: 'JODAL_API_KEY 미설정' }, 502, origin);
    }

    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: '잘못된 요청 본문' }, 400, origin); }

    // ── 나라장터 공고 단독 조회 ──
    if (url.pathname === '/notice') {
      if (!payload.notice_no) {
        return json({ error: '공고번호(notice_no) 누락' }, 400, origin);
      }
      try {
        const notice = await fetchNotice(env.JODAL_API_KEY, payload.notice_no);
        if (!notice) {
          return json({ error: '해당 공고번호의 나라장터 공고를 찾지 못했습니다.' },
                      404, origin);
        }
        return json({ notice }, 200, origin);
      } catch (e) {
        return json({ error: '나라장터 공고 조회 실패: ' + (e?.message || e) },
                    502, origin);
      }
    }

    // ── /analyze : 공고 검증(있으면) + 실낙찰 사정률 분석 ──
    let basePrice = toNum(payload.base_price);
    let lowerBound = toNum(payload.lower_bound_rate);
    let biz = payload.business_type || '';
    let region = payload.region_limit || payload.ordering_agency || '';
    let noticeVerified = null;

    if (payload.notice_no) {
      try {
        const notice = await fetchNotice(env.JODAL_API_KEY, payload.notice_no);
        if (notice) {
          noticeVerified = notice;
          if (notice.base_price)        basePrice  = notice.base_price;
          if (notice.lower_bound_rate)  lowerBound = notice.lower_bound_rate;
          if (notice.business_type)     biz        = notice.business_type;
          if (notice.region_limit)      region     = notice.region_limit;
        }
      } catch (_) { /* 공고 조회 실패해도 OCR 값으로 분석 진행 */ }
    }

    if (!basePrice || !lowerBound) {
      return json({ error: '기초금액 또는 낙찰하한율 누락' }, 400, origin);
    }

    try {
      const rates = [];
      const loBand = basePrice * 0.4;
      const hiBand = basePrice * 2.5;
      // 최대 5페이지(500건) 조회 후 유사 금액대만 필터
      for (let page = 1; page <= 5; page++) {
        const { list, total } = await fetchScsbid(env.JODAL_API_KEY, page);
        for (const rec of list) {
          const b = toNum(rec.bssamt ?? rec.basePrce ?? rec.baseAmt);
          if (b && (b < loBand || b > hiBand)) continue;
          const r = recordSajeongRate(rec);
          if (r != null) rates.push(r);
        }
        if (page * 100 >= total) break;
      }

      if (rates.length < 8) {
        return json({
          error: '유사 낙찰 표본 부족(' + rates.length + '건). 로컬 추정으로 대체하세요.',
          sample_count: rates.length,
        }, 502, origin);
      }
      const result = analyzeDistribution(
        rates, basePrice, lowerBound, biz, region);
      if (noticeVerified) result.notice_verified = noticeVerified;
      return json(result, 200, origin);
    } catch (e) {
      return json({ error: '조달청 API 처리 실패: ' + (e?.message || e) },
                  502, origin);
    }
  },
};
