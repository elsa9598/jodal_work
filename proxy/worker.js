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
const BASIS_URL =
  'https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoCnstwkBsisAmount';
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
function baseAmountFromNoticeItem(it, basis) {
  if (basis?.base_price) return basis.base_price;
  const presmpt = toNum(it.presmptPrce);
  const vat = toNum(it.VAT ?? it.vat);
  return presmpt && vat ? presmpt + vat : presmpt;
}

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
  const [noticeBody, basis] = await Promise.all([
    callJodal(NOTICE_URL, {
      serviceKey, pageNo: '1', numOfRows: '5', type: 'json',
      inqryDiv: '2', bidNtceNo: bidNo,
    }),
    fetchBasisAmount(serviceKey, bidNo).catch(() => null),
  ]);
  const list = asList(noticeBody);
  if (!list.length) return null;
  const it = list[0];
  const presmpt = toNum(it.presmptPrce);
  const base = baseAmountFromNoticeItem(it, basis);
  return {
    notice_no: it.bidNtceNo ?? bidNo,
    title: it.bidNtceNm ?? '',
    ordering_agency: it.ntceInsttNm ?? '',
    demand_agency: it.dminsttNm ?? '',
    region_limit: it.cnstrtsiteRgnNm ?? '',
    base_price: base,
    estimated_price: presmpt,
    a_value: basis?.a_value ?? null,
    pure_cost: basis?.pure_cost ?? null,
    lower_bound_rate: toNum(it.sucsfbidLwltRate),
    rate_range: basis?.rate_range || [97, 103],
    deadline: it.bidClseDt ?? '',
    opening_datetime: it.opengDt ?? '',
    source: basis?.source || '나라장터 입찰공고정보 OpenAPI',
  };
}

function calcAValue(it) {
  const keys = [
    'mrfnHealthInsrprm',      // 국민건강보험료
    'npnInsrprm',             // 국민연금보험료
    'odsnLngtrmrcprInsrprm',  // 노인장기요양보험료
    'rtrfundNon',             // 퇴직공제부금비
    'sftyMngcst',             // 산업안전보건관리비
    'sftyChckMngcst',         // 안전관리비
    'qltyMngcst',             // 품질관리비
    'envCnsrvcst',            // 환경보전비
    'scontrctPayprcePayGrntyFee', // 하도급대금지급보증수수료
  ];
  const sum = keys.reduce((s, k) => s + (toNum(it[k]) || 0), 0);
  return sum || null;
}

async function fetchBasisAmount(serviceKey, noticeNo) {
  const bidNo = String(noticeNo || '').trim().replace(/\s+/g, '');
  if (!bidNo) return null;
  const end = new Date();
  end.setDate(end.getDate() + 30);
  const begin = new Date();
  begin.setDate(begin.getDate() - 365);
  const body = await callJodal(BASIS_URL, {
    serviceKey, pageNo: '1', numOfRows: '5', type: 'json',
    inqryDiv: '2',
    inqryBgnDt: ymd(begin) + '0000',
    inqryEndDt: ymd(end) + '2359',
    bidNtceNo: bidNo,
  });
  const list = asList(body);
  if (!list.length) return null;
  const it = list.find((x) => String(x.bidNtceNo || '') === bidNo) || list[0];
  const lo = toNum(it.rsrvtnPrceRngBgnRate);
  const hi = toNum(it.rsrvtnPrceRngEndRate);
  return {
    base_price: toNum(it.bssamt),
    pure_cost: toNum(it.bssAmtPurcnstcst) || null,
    a_value: calcAValue(it),
    rate_range: lo && hi ? [lo, hi] : null,
    basis_open_dt: it.bssamtOpenDt || '',
    source: '나라장터 입찰공고정보 OpenAPI + 공사기초금액정보',
  };
}

function pickText(obj, keys) {
  for (const k of keys) {
    const v = obj && obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function calcAdjRate(bidRate, lowerBound) {
  const r = Number(bidRate);
  const l = Number(lowerBound);
  return r && l ? round((r / l) * 100, 3) : 0;
}

function dateLabel(s) {
  const raw = String(s || '');
  const m = raw.match(/(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : raw.slice(0, 10);
}

// opengCorpInfo "업체명^사업자^대표^낙찰금액^투찰률" → {amt, rate, winner}
function parseOpengCorp(s) {
  if (!s) return null;
  const p = String(s).split('^');
  if (p.length < 5) return null;
  const winner = String(p[0] || '').trim();
  const amt = toNum(p[p.length - 2]);
  const rate = toNum(p[p.length - 1]);
  if (!rate || rate < 50 || rate > 120) return null;
  return { amt, rate, winner };
}

function makeEvidenceRow(rec, corp, lowerBound) {
  return {
    date: dateLabel(pickText(rec, ['opengDt', 'opengDate', 'rlOpengDt'])),
    agency: pickText(rec, ['ntceInsttNm', 'dminsttNm', 'orderInsttNm']) || '-',
    title: pickText(rec, ['bidNtceNm', 'cnstwkNm', 'resultNm']) || '공사명 미제공',
    notice_no: pickText(rec, ['bidNtceNo']),
    winner: corp.winner || '-',
    hit: corp.amt || 0,
    rate: round(corp.rate, 3),
    adj: calcAdjRate(corp.rate, lowerBound),
  };
}

function makeBuckets(rates, lowerBound) {
  const bins = {};
  for (const r of rates) {
    const adj = calcAdjRate(r, lowerBound);
    if (!adj) continue;
    const k = Math.round(adj * 20) / 20; // 0.05%p bins
    bins[k] = (bins[k] || 0) + 1;
  }
  return Object.keys(bins).map(Number).sort((a, b) => a - b).map((k) => ({
    range: `${round(k - 0.025, 3).toFixed(3)}~${round(k + 0.025, 3).toFixed(3)}`,
    count: bins[k],
  }));
}

function analyzeDistribution(rates, basePrice, lowerBound, biz, region, evidence, filterMeta) {
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
    search_days: filterMeta?.search_days || 14,
    filter_label: filterMeta?.label || '금액대 유사 개찰결과',
    warning: n < 8 ? `표본이 ${n}건뿐이라 추천 신뢰도는 낮습니다.` : '',
    buckets: makeBuckets(rates, lowerBound),
    recent: evidence.slice(0, 20),
  };
}

function scoreOpenResult(rec, basePrice, corp) {
  const text = [
    pickText(rec, ['bidNtceNm', 'cnstwkNm', 'resultNm']),
    pickText(rec, ['ntceInsttNm', 'dminsttNm', 'orderInsttNm']),
  ].join(' ');
  const isSeoul = SEOUL_KEYS.some((k) => text.includes(k));
  const isCivil = WORK_KEYS.some((k) => text.includes(k));
  const amt = corp.amt || 0;
  return {
    isSeoul,
    isCivil,
    amount07: amt >= basePrice * 0.7 && amt <= basePrice * 1.3,
    amount05: amt >= basePrice * 0.5 && amt <= basePrice * 1.5,
    amountWide: amt >= basePrice * 0.3 && amt <= basePrice * 3.0,
  };
}

function chooseEvidence(candidates, basePrice) {
  const tiers = [
    { label: '서울·토목/포장·낙찰금액 ±30%', test: (x) => x.score.isSeoul && x.score.isCivil && x.score.amount07 },
    { label: '토목/포장·낙찰금액 ±30%', test: (x) => x.score.isCivil && x.score.amount07 },
    { label: '낙찰금액 ±30%', test: (x) => x.score.amount07 },
    { label: '낙찰금액 50~150%', test: (x) => x.score.amount05 },
    { label: '낙찰금액 30~300%', test: (x) => x.score.amountWide },
  ];
  for (const tier of tiers) {
    const picked = candidates.filter(tier.test);
    if (picked.length >= 8) return { picked, label: tier.label };
  }
  const fallback = candidates.filter((x) => x.score.amountWide);
  return { picked: fallback, label: fallback.length ? '낙찰금액 30~300% (표본 부족)' : '조건에 맞는 개찰결과 없음' };
}

// ── 서울 토목·포장 입찰공고 목록 (앱 notice 형태로 매핑) ──
// 서울 = 리터럴 '서울' + 25개 자치구명 (자치구 공고는 기관명에 '서울' 미포함)
const SEOUL_KEYS = ['서울', '강남', '서초', '송파', '강동', '마포', '영등포',
  '용산', '성동', '광진', '동대문', '중랑', '성북', '강북', '도봉', '노원',
  '은평', '서대문', '양천', '강서', '구로', '금천', '동작', '관악', '종로'];
const WORK_KEYS = ['토목', '포장', '도로', '아스콘', '보도', '차도', '인도',
                   '배수', '하수', '상수', '굴착복구'];

function _daysLeft(s) {
  const m = String(s || '').match(/(\d{4})-?(\d{2})-?(\d{2})/);
  if (!m) return 0;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return Math.max(0, Math.round((d - new Date()) / 86400000));
}
function _statusOf(s) {
  const dl = _daysLeft(s);
  if (dl <= 0) return 'closed';
  if (dl <= 3) return 'urgent';
  return 'open';
}

// 모듈 캐시 (warm isolate 동안 유지 — 30분). 매 요청 130페이지 스캔 방지.
let LIST_CACHE = { ts: 0, data: null };
const LIST_TTL = 30 * 60 * 1000;
const SCAN_PAGES = 20;     // 최근 게시 2,000건 스캔
const BATCH = 5;           // 병렬 배치 크기

function mapNotice(it) {
  const name = it.bidNtceNm || '';
  const presmpt = toNum(it.presmptPrce);
  const base = baseAmountFromNoticeItem(it, null);
  return {
    id: 'L-' + (it.bidNtceNo || '') + '-' + (it.bidNtceOrd || '0'),
    notice_no: it.bidNtceNo || '',
    title: name,
    agency: it.ntceInsttNm || '-',
    demand: it.dminsttNm || it.ntceInsttNm || '-',
    work: WORK_KEYS.find((k) => name.includes(k)) || '기타',
    civil: WORK_KEYS.some((k) => name.includes(k)),  // 토목·포장 계열 여부
    region: it.cnstrtsiteRgnNm || '서울특별시',
    base_price: base,
    estimated: presmpt,
    a_value: null,
    pure_cost: null,
    lower_rate: toNum(it.sucsfbidLwltRate) || 87.745,
    rate_range: [97.0, 103.0],
    license: it.indstrytyLmtYn === 'Y' ? '면허 제한 있음' : '공고 확인',
    joint: it.cmmnSpldmdCorpRgnLmtYn === 'Y' ? '공동수급 지역제한' : '공고 확인',
    method: it.cntrctCnclsMthdNm || '공고 확인',
    bid_method: it.bidMethdNm || '전자입찰 / 적격심사',
    deadline: (it.bidClseDt || '').slice(0, 16),
    opening: (it.opengDt || '').slice(0, 16),
    status: _statusOf(it.bidClseDt),
    days_left: _daysLeft(it.bidClseDt),
    posted: (it.bidNtceDt || '').slice(0, 16),
    flag: presmpt ? null : '기초금액 확인필요',
    _real: true,
  };
}

function applyBasisToNotice(notice, basis) {
  if (!basis) return notice;
  return {
    ...notice,
    base_price: basis.base_price || notice.base_price,
    a_value: basis.a_value ?? notice.a_value,
    pure_cost: basis.pure_cost ?? notice.pure_cost,
    rate_range: basis.rate_range || notice.rate_range,
    basis_open_dt: basis.basis_open_dt || '',
  };
}

async function hydrateBasisForNotices(serviceKey, notices) {
  const out = [];
  for (let start = 0; start < notices.length; start += BATCH) {
    const chunk = notices.slice(start, start + BATCH);
    const basisList = await Promise.all(
      chunk.map((n) => fetchBasisAmount(serviceKey, n.notice_no).catch(() => null)),
    );
    chunk.forEach((n, i) => out.push(applyBasisToNotice(n, basisList[i])));
  }
  return out;
}

// ── 새 토목·포장 공고 알리미 (Cron) ──
function _parseDt(s) {
  const m = String(s || '').match(/(\d{4})-?(\d{2})-?(\d{2})[ T]?(\d{2})?:?(\d{2})?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
}

async function sendAlertEmail(env, list) {
  if (!env.RESEND_API_KEY || !env.ALERT_EMAIL) return false;
  const rows = list.map((n) =>
    `▸ ${n.title}\n   ${n.agency} · ${n.work} · 기초 ${
      (n.base_price || 0).toLocaleString('ko-KR')}원 · 마감 ${
      n.deadline} (D-${n.days_left})\n   공고번호 ${n.notice_no}`,
  ).join('\n\n');
  const body = {
    from: 'onboarding@resend.dev',
    to: [env.ALERT_EMAIL],
    subject: `[조달 알리미] 새 서울 토목·포장 공고 ${list.length}건`,
    text:
      `서울시 관공서 토목·포장 신규 입찰공고 ${list.length}건이 떴습니다.\n\n` +
      `${rows}\n\n` +
      `─────────\n앱에서 보기: https://elsa9598.github.io/jodal_work/\n` +
      `※ 참고용 — 투찰 전 조달청 원문 공고 반드시 확인`,
  };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function runAlert(env) {
  // 직전 예약(09/19 KST)~지금 사이 게시된 토목·포장만 → 중복 없이 알림
  const now = new Date();
  const hUTC = now.getUTCHours();
  // 이번이 09KST(00UTC)면 직전은 어제 19KST → 14h, 19KST(10UTC)면 직전 09KST → 10h
  const lookbackH = hUTC < 5 ? 14 : 10;
  const since = new Date(now.getTime() - lookbackH * 3600 * 1000);

  const all = await fetchNoticeList(env.JODAL_API_KEY);
  const fresh = all.filter((n) => {
    if (!n.civil) return false;
    const p = _parseDt(n.posted);
    return p && p >= since;
  });
  if (!fresh.length) return { sent: false, count: 0 };
  const ok = await sendAlertEmail(env, fresh);
  return { sent: ok, count: fresh.length };
}

async function fetchNoticeList(serviceKey) {
  if (LIST_CACHE.data && Date.now() - LIST_CACHE.ts < LIST_TTL) {
    return LIST_CACHE.data;
  }
  // 최근 30일 게시분을 다수 페이지 병렬 스캔 → 서울·토목/포장·진행중만
  // 최근 14일 게시분 (진행중 공고는 최신 게시에 몰림 — 창 좁혀 스캔효율↑)
  const end = new Date();
  const begin = new Date();
  begin.setDate(begin.getDate() - 14);
  const common = {
    serviceKey, numOfRows: '100', type: 'json', inqryDiv: '1',
    inqryBgnDt: ymd(begin) + '0000', inqryEndDt: ymd(end) + '2359',
  };
  const out = [];
  const seen = {};
  for (let start = 1; start <= SCAN_PAGES; start += BATCH) {
    const batch = [];
    for (let p = start; p < start + BATCH && p <= SCAN_PAGES; p++) {
      batch.push(
        callJodal(NOTICE_URL, { ...common, pageNo: String(p) })
          .then(asList).catch(() => []),
      );
    }
    const results = await Promise.all(batch);
    let empty = true;
    for (const list of results) {
      if (list.length) empty = false;
      for (const it of list) {
        const key = (it.bidNtceNo || '') + '-' + (it.bidNtceOrd || '0');
        if (seen[key]) continue;
        seen[key] = 1;
        const region = (it.cnstrtsiteRgnNm || '') + ' ' +
          (it.ntceInsttNm || '') + ' ' + (it.dminsttNm || '');
        const name = it.bidNtceNm || '';
        if (!SEOUL_KEYS.some((k) => region.includes(k))) continue;
        // 서울 전체 공사 수집(토목·포장은 화면 필터로). 진행중만.
        if (_statusOf(it.bidClseDt) === 'closed') continue;
        out.push(mapNotice(it));
      }
    }
    if (empty) break; // 더 이상 데이터 없음
  }
  out.sort((a, b) => a.days_left - b.days_left);
  const hydrated = await hydrateBasisForNotices(serviceKey, out);
  LIST_CACHE = { ts: Date.now(), data: hydrated };
  return hydrated;
}

export default {
  // Cron(하루 2회) → 새 토목·포장 공고 메일 알림
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAlert(env));
  },

  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://elsa9598.github.io';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const url = new URL(request.url);
    // (알리미는 Cron 으로만 동작 — 공개 테스트 엔드포인트는 보안상 제거)
    if (request.method !== 'POST' ||
        (url.pathname !== '/analyze' && url.pathname !== '/notice' &&
         url.pathname !== '/list')) {
      return json({ error: 'POST /list, /notice, /analyze 만 지원합니다.' }, 404, origin);
    }
    if (!env.JODAL_API_KEY) {
      return json({ error: 'JODAL_API_KEY 미설정' }, 502, origin);
    }
    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: '잘못된 요청 본문' }, 400, origin); }

    // ── 서울 토목·포장 공고 목록 ──
    if (url.pathname === '/list') {
      try {
        const notices = await fetchNoticeList(env.JODAL_API_KEY);
        return json({ notices, count: notices.length }, 200, origin);
      } catch (e) {
        return json({ error: '나라장터 목록 조회 실패: ' + (e?.message || e) },
                    502, origin);
      }
    }

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
      const searchDays = Math.min(14, Math.max(1, toNum(payload.search_days) || 14));
      const end = new Date();
      const begin = new Date();
      begin.setDate(begin.getDate() - searchDays);
      const candidates = [];

      for (let page = 1; page <= 10; page++) {
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
          if (!c.amt) continue;
          candidates.push({
            rec,
            corp: c,
            score: scoreOpenResult(rec, basePrice, c),
            evidence: makeEvidenceRow(rec, c, lowerBound),
          });
        }
        const total = toNum(body.totalCount);
        if (!list.length || page * 100 >= total) break;
      }

      const chosen = chooseEvidence(candidates, basePrice);
      const evidence = chosen.picked
        .sort((a, b) => String(b.evidence.date).localeCompare(String(a.evidence.date)))
        .map((x) => x.evidence);
      const rates = chosen.picked.map((x) => x.corp.rate);

      if (!rates.length) {
        return json({
          error: '조건에 맞는 조달청 개찰결과를 찾지 못했습니다.',
          sample_count: 0,
          recent: [],
        }, 404, origin);
      }
      const result =
        analyzeDistribution(rates, basePrice, lowerBound, biz, region, evidence, {
          search_days: searchDays,
          label: chosen.label,
        });
      if (noticeVerified) result.notice_verified = noticeVerified;
      return json(result, 200, origin);
    } catch (e) {
      return json({ error: '조달청 API 처리 실패: ' + (e?.message || e) },
                  502, origin);
    }
  },
};
