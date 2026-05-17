/**
 * judal 실데이터 프록시 — Cloudflare Worker
 *
 * 역할: 공개 프론트엔드 대신 조달청 나라장터 OpenAPI를 호출.
 *       서비스키는 이 Worker 의 secret(JODAL_API_KEY)에만 존재하며
 *       프론트엔드/공개 repo 에는 절대 노출되지 않는다.
 *
 * 검증된 엔드포인트(실응답 확인 완료):
 *  - 입찰공고(공사) 단건: GET .../1230000/ad/BidPublicInfoService/
 *      getBidPblancListInfoCnstwk?inqryDiv=2&bidNtceNo=<영문숫자 공고번호>
 *      → bidNtceNm, ntceInsttNm, dminsttNm, presmptPrce(추정가격),
 *        sucsfbidLwltRate(낙찰하한율), cnstrtsiteRgnNm
 *  - 개찰결과(공사) 목록: GET .../1230000/as/ScsbidInfoService/
 *      getOpengResultListInfoCnstwkPPSSrch?inqryDiv=1&inqryBgnDt&inqryEndDt
 *      → opengCorpInfo = "업체명^사업자번호^대표^낙찰금액^투찰률(%)"
 *
 * 비밀(Secret):  JODAL_API_KEY   — data.go.kr 서비스키 (Decoding 형식 권장)
 * 변수(Var):     ALLOWED_ORIGIN  — 허용 Origin (기본 https://elsa9598.github.io)
 *
 * 엔드포인트:
 *   POST /notice    body:{ notice_no }
 *     → 나라장터 공식 공고값 (추정가격·낙찰하한율·공고명·기관)
 *   POST /analyze   body:{ notice_no?, base_price, lower_bound_rate, ... }
 *     → notice_no 있으면 공고로 입력값 공식 보정 후,
 *       최근 공사 개찰결과의 "낙찰자 투찰률" 실분포 분석
 *     200 → analysis.js 가 기대하는 JSON (estimated:false, source 포함)
 *     502 → 데이터 부족/API 오류 (프론트가 로컬 추정으로 fallback)
 */

const NOTICE_URL =
  'https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoCnstwk';
const OPENG_URL =
  'https://apis.data.go.kr/1230000/as/ScsbidInfoService/getOpengResultListInfoCnstwkPPSSrch';

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
function asList(body) {
  const items = body && body.items;
  if (Array.isArray(items)) return items;
  if (Array.isArray(items?.item)) return items.item;
  if (items?.item) return [items.item];
  return [];
}
async function callJodal(url, params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${url}?${qs}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('조달청 API HTTP ' + res.status);
  const data = await res.json();
  const head = data?.response?.header ||
               data?.['nkoneps.com.response.ResponseError']?.header;
  if (head && head.resultCode && head.resultCode !== '00') {
    throw new Error('조달청 API: ' + (head.resultMsg || head.resultCode));
  }
  return data?.response?.body || {};
}

// 공고번호로 나라장터 공식 공고 조회 (공고번호는 영문숫자, 가공 금지)
async function fetchNotice(serviceKey, noticeNo) {
  const bidNo = String(noticeNo).trim().replace(/\s+/g, '');
  if (!bidNo) return null;
  const body = await callJodal(NOTICE_URL, {
    serviceKey, pageNo: '1', numOfRows: '5', type: 'json',
    inqryDiv: '2', bidNtceNo: bidNo,
  });
  const list = asList(body);
  if (!list.length) return null;
  const it = list[0];
  const presmpt = toNum(it.presmptPrce);
  return {
    notice_no: it.bidNtceNo ?? bidNo,
    title: it.bidNtceNm ?? '',
    ordering_agency: it.ntceInsttNm ?? '',
    demand_agency: it.dminsttNm ?? '',
    region_limit: it.cnstrtsiteRgnNm ?? '',
    base_price: presmpt,        // 추정가격(공고 공식값)
    estimated_price: presmpt,
    lower_bound_rate: toNum(it.sucsfbidLwltRate),
    deadline: it.bidClseDt ?? '',
    opening_datetime: it.opengDt ?? '',
    source: '나라장터 입찰공고정보 OpenAPI',
  };
}

// opengCorpInfo "업체명^사업자^대표^낙찰금액^투찰률" → {amt, rate}
function parseOpengCorp(s) {
  if (!s) return null;
  const p = String(s).split('^');
  if (p.length < 5) return null;
  const amt = toNum(p[p.length - 2]);
  const rate = toNum(p[p.length - 1]);
  if (!rate || rate < 50 || rate > 120) return null;
  return { amt, rate };
}

function analyzeDistribution(rates, basePrice, lowerBound, biz, region) {
  rates.sort((a, b) => a - b);
  const n = rates.length;
  const avg = rates.reduce((s, r) => s + r, 0) / n;

  // 0.1%p 폭 빈 중 최다 밀집 = 낙찰 투찰률 집중구간
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

  return {
    similar_count: n,
    business_type: biz || '공사',
    region: region || '전국',
    base_price_range: rangeLabel(basePrice),
    avg_bid_rate: round(avg, 3),          // 실제 낙찰자 평균 투찰률
    avg_target_rate: round(avg, 3),
    hot_range_low: hotLow,
    hot_range_high: hotHigh,
    top_rate: round(hotKey, 2),
    recent_trend:
      `최근 유사 규모 공사 낙찰 ${n}건 중 ${hotCount}건이 ` +
      `투찰률 ${hotLow}~${hotHigh}% 구간에 집중되었습니다. (조달청 실데이터)`,
    strategies: {
      conservative: { rate: round(pct(0.2), 2), label: '보수형',
        desc: '실제 낙찰 하위 20% 투찰률 — 안정적 낙찰 우선' },
      middle: { rate: round(hotKey, 2), label: '중간형',
        desc: '실제 낙찰이 가장 집중된 투찰률 구간' },
      aggressive: { rate: round(pct(0.8), 2), label: '공격형',
        desc: '실제 낙찰 상위 20% 투찰률 — 고낙찰가 전략' },
    },
    recommendation: hotCount / n >= 0.2 ? 'middle' : 'conservative',
    recommendation_reason:
      `실제 낙찰 ${n}건 분석: ${hotLow}~${hotHigh}% 구간 집중도가 ` +
      `${round((hotCount / n) * 100, 1)}%로 가장 높습니다.`,
    estimated: false,
    source: '조달청 나라장터 개찰결과 OpenAPI (낙찰자 투찰률 실분포)',
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

    // ── 공고 단독 조회 ──
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

    // ── /analyze : 공고 검증(있으면) + 낙찰 투찰률 실분포 ──
    let basePrice = toNum(payload.base_price);
    let lowerBound = toNum(payload.lower_bound_rate);
    let biz = payload.business_type || '공사';
    let region = payload.region_limit || payload.ordering_agency || '';
    let noticeVerified = null;

    if (payload.notice_no) {
      try {
        const notice = await fetchNotice(env.JODAL_API_KEY, payload.notice_no);
        if (notice) {
          noticeVerified = notice;
          if (notice.base_price)       basePrice  = notice.base_price;
          if (notice.lower_bound_rate) lowerBound = notice.lower_bound_rate;
          if (notice.region_limit)     region     = notice.region_limit;
        }
      } catch (_) { /* 공고 조회 실패해도 입력값으로 진행 */ }
    }
    if (!basePrice || !lowerBound) {
      return json({ error: '기초금액(추정가격) 또는 낙찰하한율 누락' }, 400, origin);
    }

    try {
      const end = new Date();
      const begin = new Date();
      begin.setDate(begin.getDate() - 14); // 최근 14일 개찰결과
      const loBand = basePrice * 0.3;
      const hiBand = basePrice * 3.0;
      const rates = [];

      for (let page = 1; page <= 5; page++) {
        const body = await callJodal(OPENG_URL, {
          serviceKey: env.JODAL_API_KEY,
          pageNo: String(page), numOfRows: '100', type: 'json',
          inqryDiv: '1',
          inqryBgnDt: ymd(begin) + '0000',
          inqryEndDt: ymd(end) + '2359',
        });
        const list = asList(body);
        for (const rec of list) {
          const c = parseOpengCorp(rec.opengCorpInfo);
          if (!c) continue;
          // 낙찰금액이 입력 규모와 유사한 건만 (유사 공사 근사)
          if (c.amt && (c.amt < loBand || c.amt > hiBand)) continue;
          rates.push(c.rate);
        }
        const total = toNum(body.totalCount);
        if (!list.length || page * 100 >= total) break;
      }

      if (rates.length < 8) {
        return json({
          error: '유사 규모 낙찰 표본 부족(' + rates.length + '건).',
          sample_count: rates.length,
        }, 502, origin);
      }
      const result =
        analyzeDistribution(rates, basePrice, lowerBound, biz, region);
      if (noticeVerified) result.notice_verified = noticeVerified;
      return json(result, 200, origin);
    } catch (e) {
      return json({ error: '조달청 API 처리 실패: ' + (e?.message || e) },
                  502, origin);
    }
  },
};
