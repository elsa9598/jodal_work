/* global window, React */
/* live.jsx — 실데이터 연동 (프록시 경유, 키 노출 0)
 *
 * 키를 공개 사이트에 절대 노출하지 않기 위해 data.go.kr 을 직접 부르지 않고
 * Cloudflare Worker 프록시(키는 Worker secret 에만)를 호출한다.
 *
 *  - window.PROXY_URL 이 비어있으면 → 데모 데이터로 동작 (키·서버 불필요)
 *  - 배포된 프록시 주소를 config.js 의 PROXY_URL 에 넣으면 → 실데이터 자동 전환
 *
 * 프록시 엔드포인트(검증·완성됨, proxy/worker.js):
 *   POST /list    → 서울 토목·포장 입찰공고 목록
 *   POST /notice  → 공고번호 공식 상세
 *   POST /analyze → 최근 유사 낙찰자 투찰률 실분포
 */

function _proxyBase() {
  return (window.PROXY_URL || '').replace(/\/+$/, '');
}

async function _post(path, body) {
  const base = _proxyBase();
  if (!base) return null;
  try {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.error) return null;
    return data;
  } catch (_) { return null; }
}

async function fetchNotices() {
  const data = await _post('/list', { region: '서울', work: '토목포장' });
  if (data && Array.isArray(data.notices) && data.notices.length) {
    return data.notices;
  }
  return null; // 프록시 미설정/실패 → 데모 fallback
}

async function fetchSimilar(notice) {
  const data = await _post('/analyze', {
    notice_no: notice.notice_no,
    base_price: notice.base_price,
    lower_bound_rate: notice.lower_rate,
    region_limit: notice.region,
    work_type: notice.work,
  });
  if (data && !data.error) return data;
  return null; // 데모 fallback (screens 에서 makeSimilar 사용)
}

function _bidRateToAdj(rate, lower) {
  const n = Number(rate);
  const l = Number(lower);
  if (!n || !l) return 0;
  return +(n / l * 100).toFixed(3);
}

function _bucketRange(v) {
  return `${(v - 0.01).toFixed(2)}~${(v + 0.01).toFixed(2)}`;
}

function _fallbackBuckets(low, mid, high, total) {
  const n = Math.max(8, Number(total) || 20);
  const pts = [low - 0.04, low - 0.02, low, mid, high, high + 0.02, high + 0.04]
    .filter((v, i, a) => Number.isFinite(v) && a.indexOf(v) === i)
    .sort((a, b) => a - b);
  return pts.map((v, i) => ({
    range: _bucketRange(v),
    count: Math.max(1, Math.round(n * ([0.08, 0.12, 0.2, 0.28, 0.18, 0.1, 0.04][i] || 0.06))),
  }));
}

function normalizeSimilar(real, fallback, notice) {
  if (!real) return fallback;
  if (real.avg_success != null && real.avg_adj != null) {
    return Object.assign({}, fallback, real);
  }

  const lower = notice.lower_rate || notice.lower_bound_rate;
  const total = real.similar_count || real.sample_count || fallback.total || 0;
  const consBid = real.strategies?.conservative?.rate || real.hot_range_low || real.avg_bid_rate || 0;
  const midBid = real.strategies?.middle?.rate || real.top_rate || real.avg_bid_rate || 0;
  const aggBid = real.strategies?.aggressive?.rate || real.hot_range_high || real.avg_bid_rate || 0;
  const lowAdj = _bidRateToAdj(real.hot_range_low || consBid, lower);
  const midAdj = _bidRateToAdj(midBid, lower);
  const highAdj = _bidRateToAdj(real.hot_range_high || aggBid, lower);
  const avgAdj = _bidRateToAdj(real.avg_bid_rate || midBid, lower);

  return Object.assign({}, fallback, {
    total,
    region: real.region || fallback.region,
    work_label: real.business_type || notice.work || fallback.work_label,
    base_range: real.base_price_range || fallback.base_range,
    avg_success: real.avg_bid_rate || midBid,
    min_success: consBid,
    max_success: aggBid,
    median_success: real.top_rate || midBid,
    avg_adj: avgAdj || midAdj,
    concentrated_range: [lowAdj || midAdj, highAdj || midAdj],
    most_common_range: [lowAdj || midAdj, highAdj || midAdj],
    avg_competition: real.avg_competition || fallback.avg_competition,
    recent_trend: real.recent_trend || fallback.recent_trend,
    strategy: real.recommendation_reason || real.recommendation || fallback.strategy,
    recommendation_key: real.recommendation || fallback.recommendation_key || 'middle',
    recommendation_reason: real.recommendation_reason || fallback.recommendation_reason || '',
    buckets: real.buckets && real.buckets.length
      ? real.buckets
      : _fallbackBuckets(lowAdj || midAdj, midAdj || avgAdj, highAdj || midAdj, total),
    strategies: {
      conservative: Object.assign({}, fallback.strategies.conservative, real.strategies?.conservative, {
        rate: _bidRateToAdj(consBid, lower),
      }),
      middle: Object.assign({}, fallback.strategies.middle, real.strategies?.middle, {
        rate: midAdj || avgAdj,
      }),
      aggressive: Object.assign({}, fallback.strategies.aggressive, real.strategies?.aggressive, {
        rate: _bidRateToAdj(aggBid, lower),
      }),
    },
    estimated: !!real.estimated,
    source: real.source || fallback.source,
    notice_verified: real.notice_verified,
  });
}

window.JodalLive = {
  get enabled() { return !!_proxyBase(); },
  fetchNotices,
  fetchSimilar,
};

// ── 기존 화면(window.APP_DATA 직접 사용)에 무침습 실데이터 주입 ──
// makeSimilar 는 화면이 동기 호출하므로: 캐시에 실데이터 있으면 그걸,
// 없으면 데모를 즉시 반환하고 백그라운드로 실데이터를 받아 캐시 후 재렌더.
(function wireRealData() {
  const D = window.APP_DATA;
  if (!D || D._liveWired) return;
  D._liveWired = true;

  const demoMakeSimilar = D.makeSimilar;
  const simCache = {};        // notice.id → 실분석 결과
  const pending = {};

  D.makeSimilar = function (noticeId) {
    if (simCache[noticeId]) return simCache[noticeId];
    const notice = (D.NOTICES || []).find((n) => n.id === noticeId);
    if (window.JodalLive.enabled && notice && !pending[noticeId]) {
      pending[noticeId] = true;
      fetchSimilar(notice).then((real) => {
        if (real) {
          // 화면 buckets/필드 형태에 맞춰 병합 (데모 골격 + 실수치)
          simCache[noticeId] = normalizeSimilar(real, demoMakeSimilar(noticeId), notice);
          window.dispatchEvent(new CustomEvent('jodal:update'));
        }
      }).catch(() => {}).finally(() => { pending[noticeId] = false; });
    }
    return demoMakeSimilar(noticeId);   // 즉시 데모 반환 (이후 실데이터로 교체)
  };

  // 공고 목록 실데이터 부트스트랩
  if (window.JodalLive.enabled) {
    fetchNotices().then((list) => {
      if (list && list.length) {
        D.NOTICES = list;
        window.dispatchEvent(new CustomEvent('jodal:update'));
      }
    }).catch(() => {});
  }
})();

// React hook: 실시간 공고 (프록시 미설정/실패 시 데모 fallback)
window.useLiveNotices = function () {
  const R = window.React || React;
  const [state, setState] = R.useState({
    notices: window.APP_DATA.NOTICES, loading: true, source: 'demo',
  });
  R.useEffect(() => {
    let alive = true;
    if (!window.JodalLive.enabled) {
      setState({ notices: window.APP_DATA.NOTICES, loading: false, source: 'demo' });
      return;
    }
    fetchNotices().then((list) => {
      if (!alive) return;
      if (list && list.length) {
        window.APP_DATA.NOTICES = list;
        setState({ notices: list, loading: false, source: 'live' });
      } else {
        setState({ notices: window.APP_DATA.NOTICES, loading: false, source: 'demo' });
      }
    }).catch(() => {
      if (alive) setState({
        notices: window.APP_DATA.NOTICES, loading: false, source: 'demo' });
    });
    return () => { alive = false; };
  }, []);
  return state;
};
