/* global React, window */
// Screen 1 — Home (dashboard overview)

function HomeScreen({ onGo, onOpenNotice, saved, onToggleSave }) {
  const { NOTICES, fmt, fmt억 } = window.APP_DATA;
  const { Icon, NoticeCard } = window.UI;

  const today = NOTICES.filter(n => n.days_left <= 3 && n.status !== 'closed');
  const open = NOTICES.filter(n => n.status !== 'closed');
  const recent = NOTICES.slice(0, 4);

  // KPI counts by work
  const byWork = {};
  open.forEach(n => { byWork[n.work] = (byWork[n.work] || 0) + 1; });
  const topWorks = Object.entries(byWork).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // total base price sum
  const totalBase = open.reduce((s, n) => s + n.base_price, 0);

  return (
    <div className="fade-in">
      {/* Hero band */}
      <div style={{
        position: 'relative',
        padding: '28px 28px',
        borderRadius: 22,
        background: 'linear-gradient(135deg, var(--surface-2), var(--surface)) padding-box, linear-gradient(135deg, var(--accent), transparent 60%) border-box',
        border: '1px solid transparent',
        marginBottom: 22,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -120, top: -80, width: 420, height: 420,
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}/>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, position: 'relative' }}>
          <div style={{ flex: 1 }}>
            <div className="kicker"><span className="bar"></span>나라장터 공공데이터 · 서울 · 토목·포장 전용</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 10 }}>
              과거 유사 공사 <span style={{ color: 'var(--accent)' }}>42건</span>을 기반으로<br/>
              오늘의 투찰 후보 금액을 계산합니다.
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-mid)', marginTop: 12, maxWidth: 600, lineHeight: 1.6 }}>
              서울시 관공서의 토목·포장 공사 입찰을 실시간으로 수집하고,
              유사 공사 낙찰률·사정률 패턴을 분석해 <strong style={{ color: 'var(--ink)' }}>보수형 / 중간형 / 공격형</strong> 세 가지 후보 금액을 제시합니다.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn btn-primary btn-lg" onClick={() => onGo('list')}>
                실시간 입찰 보기 <Icon name="arrowRight" size={16}/>
              </button>
              <button className="btn btn-lg" onClick={() => onGo('simulation')}>
                투찰가 시뮬레이션
              </button>
              <button className="btn btn-lg btn-ghost" onClick={() => onGo('history')}>
                내 투찰 기록
              </button>
            </div>
          </div>

          <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-low)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              오늘의 추천 공고
            </div>
            <div
              onClick={() => onOpenNotice(NOTICES[0])}
              style={{
                padding: 16, borderRadius: 14,
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid var(--line)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>AI 추천 · 중간형 전략 적합</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>{NOTICES[0].title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-mid)' }}>
                <span>{NOTICES[0].agency}</span>
                <span className="tnum">D-{NOTICES[0].days_left}</span>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)', fontSize: 12 }}>
                <span className="muted">중간형 추천가 · </span>
                <span className="tnum strong" style={{ color: 'var(--accent)' }}>
                  {fmt(Math.round(NOTICES[0].base_price * 0.9998 * NOTICES[0].lower_rate / 100))} 원
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 }}>
        <KpiCard label="진행 중 공고" value={open.length} suffix="건" tone="accent" sub="서울 토목·포장 전용 필터링" />
        <KpiCard label="마감 임박 (3일↓)" value={today.length} suffix="건" tone="warn" sub="놓치면 안 되는 공고" />
        <KpiCard label="총 기초금액" value={fmt억(totalBase)} sub={`평균 ${fmt억(totalBase / open.length)} / 건`} />
        <KpiCard label="유사 공사 분석 풀" value="42" suffix="건" sub="최근 6개월 · 도로포장·토목" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16 }}>
        {/* Recent notices */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="kicker"><span className="bar"></span>실시간</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>최신 입찰 공고</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => onGo('list')}>
              전체 {NOTICES.length}건 보기 <Icon name="arrowRight" size={14}/>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {recent.map(n => (
              <NoticeCard
                key={n.id}
                notice={n}
                compact
                onOpen={onOpenNotice}
                saved={saved.has(n.id)}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Work type breakdown */}
          <div className="card">
            <div className="kicker"><span className="bar"></span>공종 분포</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, marginBottom: 14 }}>진행 중 공사 유형</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topWorks.map(([w, c]) => {
                const pct = (c / open.length) * 100;
                return (
                  <div key={w}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                      <span>{w}</span>
                      <span className="tnum muted">{c}건 · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="progress"><span style={{ width: pct + '%' }}></span></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick action */}
          <div className="card" style={{
            background: 'linear-gradient(180deg, var(--surface-2), var(--surface))',
          }}>
            <div className="kicker"><span className="bar"></span>빠른 시작</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, marginBottom: 12 }}>
              한 번에 투찰가 계산하기
            </div>
            <ol style={{ paddingLeft: 18, fontSize: 12.5, color: 'var(--ink-mid)', lineHeight: 1.9, margin: 0 }}>
              <li>실시간 공고 목록에서 관심 공고 선택</li>
              <li>유사 공사 분석으로 사정률 패턴 확인</li>
              <li>슬라이더로 보수/중간/공격형 후보 비교</li>
              <li>결과 대시보드에서 체크리스트 검토 후 투찰</li>
            </ol>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }} onClick={() => onGo('list')}>
              지금 시작 <Icon name="arrowRight" size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, suffix, sub, tone }) {
  const toneColor = tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink)';
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="stat-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <div className="stat-value lg tnum" style={{ color: toneColor }}>{value}</div>
        {suffix && <div style={{ color: 'var(--ink-low)', fontSize: 13, fontWeight: 600 }}>{suffix}</div>}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

window.HomeScreen = HomeScreen;
