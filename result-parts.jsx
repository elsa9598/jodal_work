// result.jsx — Final result dashboard (v2)
// 9 cards including AI similar-work analysis + 3-tier strategy

// ─── 3-tier strategy hero ──────────────────────────────────────────────────
function StrategyHero({ basePrice, lowerBound, strategies, recommendation }) {
  const order = ['conservative', 'middle', 'aggressive'];
  const labels = { conservative: '보수형', middle: '중간형', aggressive: '공격형' };

  if (!strategies) return null;

  // Compute prices for each strategy
  const prices = {};
  order.forEach((k) => {
    const s = strategies[k];
    if (s && s.rate != null) {
      prices[k] = bidPrice(basePrice, s.rate, lowerBound);
    }
  });

  const recPrice = prices[recommendation];

  return (
    <div className="result-hero">
      <div className="result-hero-label">
        AI 추천 투찰 금액 · <b style={{ color: '#fff' }}>{labels[recommendation]}</b>
      </div>
      {recPrice != null ? (
        <div className="result-hero-amount">
          {formatNum(recPrice)}<span className="result-hero-amount-unit">원</span>
        </div>
      ) : (
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red-500)',
                      padding: '12px 0' }}>계산 불가 · 필수 데이터 누락</div>
      )}

      {/* 3 strategies side by side */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        marginTop: 16, position: 'relative',
      }}>
        {order.map((k) => {
          const s = strategies[k];
          const isRec = k === recommendation;
          return (
            <div key={k} style={{
              padding: '10px 8px', borderRadius: 8,
              background: isRec ? 'rgba(229, 57, 53, 0.18)'
                                : 'rgba(255, 255, 255, 0.08)',
              border: isRec ? '1px solid rgba(229, 57, 53, 0.5)'
                            : '1px solid rgba(255, 255, 255, 0.12)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: isRec ? '#ffbcb6' : 'rgba(255,255,255,0.6)',
                letterSpacing: '0.04em', marginBottom: 4,
              }}>
                {isRec && '★ '}{labels[k]}
              </div>
              <div style={{
                fontFamily: 'var(--font-num)',
                fontSize: 14, fontWeight: 700, color: '#fff',
                marginBottom: 2, fontVariantNumeric: 'tabular-nums',
              }}>
                {prices[k] != null ? formatNum(prices[k]) : '-'}
              </div>
              <div style={{
                fontSize: 9.5, color: 'rgba(255,255,255,0.55)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                사정률 {s.rate?.toFixed?.(2) || s.rate}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Similar work AI analysis card ─────────────────────────────────────────
function SimilarWorkCard({ analysis }) {
  if (!analysis) {
    return (
      <div className="card">
        <div className="card-title">
          <span className="card-title-num">5</span>
          유사 공사 AI 분석
        </div>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-500)',
                      fontSize: 13 }}>AI 분석 결과가 없습니다.</div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-title">
        <span className="card-title-num">5</span>
        유사 공사 AI 분석
        <span className="pill pill-info" style={{ marginLeft: 'auto' }}>
          AI 추정
        </span>
      </div>

      {/* Top stat: count */}
      <div style={{
        padding: 14, background: 'var(--navy-50)', borderRadius: 10,
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          fontFamily: 'var(--font-num)', fontSize: 28, fontWeight: 800,
          color: 'var(--navy-800)', lineHeight: 1,
        }}>{analysis.similar_count}</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-900)' }}>
            건의 유사 공사 분석
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>
            {analysis.business_type} · {analysis.region} · {analysis.base_price_range}
          </div>
        </div>
      </div>

      <div className="kv"><div className="kv-key">평균 낙찰률</div>
        <div className="kv-val kv-val-num">{analysis.avg_bid_rate?.toFixed?.(3) || analysis.avg_bid_rate}%</div></div>
      <div className="kv"><div className="kv-key">평균 사정률</div>
        <div className="kv-val kv-val-num">{analysis.avg_target_rate?.toFixed?.(3) || analysis.avg_target_rate}%</div></div>
      <div className="kv"><div className="kv-key">사정률 집중 구간</div>
        <div className="kv-val kv-val-num">
          {analysis.hot_range_low?.toFixed?.(2) || analysis.hot_range_low} ~ {analysis.hot_range_high?.toFixed?.(2) || analysis.hot_range_high}%
        </div></div>
      <div className="kv"><div className="kv-key">가장 많이 나온 사정률</div>
        <div className="kv-val kv-val-num" style={{ color: 'var(--navy-800)' }}>
          {analysis.top_rate?.toFixed?.(2) || analysis.top_rate}%
        </div></div>

      {/* Mini distribution chart */}
      <div style={{ marginTop: 12, padding: '10px 4px',
                    background: 'var(--ink-50)', borderRadius: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-500)',
                      marginBottom: 6, paddingLeft: 6, fontWeight: 600 }}>
          사정률 분포
        </div>
        <svg viewBox="0 0 320 70" style={{ width: '100%', height: 70 }}>
          {[14, 24, 38, 56, 66, 60, 48, 34, 22, 12].map((h, i) => {
            const x = 10 + i * 30;
            const cx = 4 + i; // index of bar at "top"
            const isHot = i >= 3 && i <= 6;
            return (
              <rect key={i} x={x} y={66 - h} width="22" height={h}
                    fill={isHot ? 'var(--navy-700)' : 'var(--ink-300)'} rx="2" />
            );
          })}
          <line x1="0" x2="320" y1="66" y2="66" stroke="var(--ink-300)" strokeWidth="0.5" />
        </svg>
      </div>

      {analysis.recent_trend && (
        <div style={{
          marginTop: 10, padding: 10, background: '#fff7e6',
          border: '1px solid #f5d490', borderRadius: 8,
          fontSize: 11.5, color: '#92590f', lineHeight: 1.5,
        }}>
          💡 {analysis.recent_trend}
        </div>
      )}
    </div>
  );
}

window.StrategyHero = StrategyHero;
window.SimilarWorkCard = SimilarWorkCard;
