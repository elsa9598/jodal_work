/* global React, window */
// Screen 7 — 내 투찰 기록

function HistoryScreen({ onGo }) {
  const { MY_HISTORY, fmt } = window.APP_DATA;
  const { Icon } = window.UI;

  const won = MY_HISTORY.filter(h => h.won).length;
  const total = MY_HISTORY.length;
  const successRate = (won / total * 100).toFixed(1);
  const avgDiff = Math.round(MY_HISTORY.reduce((s, h) => s + h.diff, 0) / total);

  // 공종별
  const byWork = {};
  MY_HISTORY.forEach(h => {
    if (!byWork[h.work]) byWork[h.work] = { total: 0, won: 0 };
    byWork[h.work].total++;
    if (h.won) byWork[h.work].won++;
  });
  const workStats = Object.entries(byWork).map(([k, v]) => ({ work: k, ...v, rate: v.won / v.total })).sort((a, b) => b.total - a.total);

  // 기관별
  const byAgency = {};
  MY_HISTORY.forEach(h => {
    if (!byAgency[h.agency]) byAgency[h.agency] = { total: 0, won: 0 };
    byAgency[h.agency].total++;
    if (h.won) byAgency[h.agency].won++;
  });

  return (
    <div className="fade-in">
      <window.UI.PageHead
        title="내 투찰 기록"
        sub="내가 실제로 입찰한 공고들의 투찰가와 결과를 기록하고 패턴을 분석합니다. 어떤 공종에서 강하고 어떤 기관에서 약한지 한눈에 확인하세요."
        right={
          <button className="btn btn-primary">+ 새 투찰 기록</button>
        }
      />

      {/* Top KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <KCard label="총 투찰" value={total} unit="건" />
        <KCard label="낙찰 성공" value={won} unit="건" tone="pos" />
        <KCard label="성공률" value={successRate} unit="%" tone="accent" />
        <KCard label="평균 차이" value={fmt(Math.abs(avgDiff))} unit="원" tone={avgDiff < 0 ? 'neg' : 'pos'} prefix={avgDiff < 0 ? '−' : '+'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Recent records table */}
        <div className="card card-flush">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="kicker"><span className="bar"></span>기록</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>최근 투찰 결과</div>
            </div>
            <select className="select"><option>전체 기간</option><option>최근 3개월</option><option>최근 6개월</option></select>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>개찰일</th>
                <th>공고</th>
                <th>공종</th>
                <th className="right">내 투찰가</th>
                <th className="right">낙찰가</th>
                <th className="right">차이</th>
                <th>순위</th>
                <th>결과</th>
              </tr>
            </thead>
            <tbody>
              {MY_HISTORY.map(h => (
                <tr key={h.id}>
                  <td className="tnum muted">{h.date}</td>
                  <td>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{h.title}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{h.agency}</div>
                  </td>
                  <td><span className="badge">{h.work}</span></td>
                  <td className="right tnum">{fmt(h.my_bid)}</td>
                  <td className="right tnum">{fmt(h.hit_bid)}</td>
                  <td className="right tnum" style={{ color: h.diff > 0 ? 'var(--pos)' : 'var(--neg)' }}>
                    {h.diff > 0 ? '+' : ''}{fmt(h.diff)}
                  </td>
                  <td><span className="badge" style={{ background: h.rank === 1 ? 'var(--pos-soft)' : 'var(--bg-2)', borderColor: h.rank === 1 ? 'rgba(52,211,153,0.35)' : 'var(--line)', color: h.rank === 1 ? 'var(--pos)' : 'var(--ink-mid)' }}>{h.rank}위</span></td>
                  <td>
                    {h.won
                      ? <span className="badge badge-pos"><span className="dot"></span>낙찰</span>
                      : <span className="badge badge-mute"><span className="dot"></span>실패</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right rail — analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="kicker"><span className="bar"></span>공종별 성과</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, marginBottom: 14 }}>내가 강한 공종은?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {workStats.map(s => (
                <div key={s.work}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span>{s.work}</span>
                    <span className="tnum muted">{s.won}/{s.total} · <span className="strong" style={{ color: s.rate >= 0.5 ? 'var(--pos)' : 'var(--ink)' }}>{(s.rate * 100).toFixed(0)}%</span></span>
                  </div>
                  <div className="progress"><span style={{ width: (s.rate * 100) + '%', background: s.rate >= 0.5 ? 'var(--pos)' : 'var(--accent)' }}></span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(180deg, var(--surface-2), var(--surface))' }}>
            <div className="kicker"><span className="bar"></span>AI 패턴 인사이트</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, marginBottom: 12 }}>내 입찰 습관</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Insight2 icon="spark" tone="pos" text={<><strong>강점:</strong> 도로포장 공사에서 성공률이 가장 높습니다. 중간형·공격형 전략 적중률 우수.</>}/>
              <Insight2 icon="warn" tone="warn" text={<><strong>약점:</strong> 보수형으로 들어간 케이스는 평균 3~6위로 순위 밀림. 사정률을 0.02% 위로 조정 권장.</>}/>
              <Insight2 icon="info" text={<><strong>패턴:</strong> 평균 차이 <span className="tnum">{fmt(Math.abs(avgDiff))}원</span>. 낙찰가 대비 정밀도는 매우 높은 편입니다.</>}/>
            </div>
          </div>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 14 }}>
        ※ 내 투찰 기록은 본인이 직접 입력한 데이터를 기반으로 분석됩니다. 외부에 전송되지 않습니다.
      </div>
    </div>
  );
}

function KCard({ label, value, unit, tone, prefix }) {
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'pos' ? 'var(--pos)' : tone === 'neg' ? 'var(--neg)' : 'var(--ink)';
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        {prefix && <span style={{ fontSize: 20, fontWeight: 700, color, marginRight: 2 }}>{prefix}</span>}
        <span className="tnum" style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</span>
        <span className="muted" style={{ fontSize: 12 }}>{unit}</span>
      </div>
    </div>
  );
}

function Insight2({ icon, tone, text }) {
  const { Icon } = window.UI;
  const c = tone === 'pos' ? 'var(--pos)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink-low)';
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.55 }}>
      <Icon name={icon} size={15} style={{ color: c, flex: '0 0 15px', marginTop: 2 }}/>
      <div style={{ color: 'var(--ink-mid)' }}>{text}</div>
    </div>
  );
}

window.HistoryScreen = HistoryScreen;
