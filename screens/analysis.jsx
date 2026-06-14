/* global React, window */
// Screen 4 — 실시간 유사 공사 분석

function AnalysisScreen({ notice, onGo }) {
  const { fmt, makeSimilar } = window.APP_DATA;
  const { Icon, BucketBars } = window.UI;

  const sim = notice ? makeSimilar(notice.id) : null;
  const recent = Array.isArray(sim?.recent) ? sim.recent : [];
  const hasEvidence = recent.length > 0;
  const pct = (v, digits = 3) => Number(v || 0).toFixed(digits);

  if (!notice || !sim) {
    return (
      <div className="card center" style={{ padding: 60 }}>
        <div className="muted">공고를 먼저 선택해야 분석을 시작할 수 있습니다.</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onGo('list')}>입찰 목록으로</button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <window.UI.PageHead
        title="실시간 유사 공사 분석"
        sub={
          <span>
            기준 공고 <span className="strong" style={{ color: 'var(--ink)' }}>{notice.title}</span> · 조달청 개찰결과 {sim.total}건을 확인했습니다.
          </span>
        }
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => onGo('detail')}><Icon name="arrowLeft" size={14}/> 공고 상세</button>
            <button className="btn btn-primary" onClick={() => onGo('simulation')}>투찰가 시뮬레이션 <Icon name="arrowRight" size={14}/></button>
          </div>
        }
      />

      {/* Criteria bar */}
      <div className="card card-tight" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className="kicker"><span className="bar"></span>검색 기준</div>
          <Chip label="동일 지역" value="서울특별시" />
          <Chip label="동일 공종" value={notice.work} />
          <Chip label="기초금액 ±30%" value={`${fmt(Math.round(notice.base_price * 0.7))} ~ ${fmt(Math.round(notice.base_price * 1.3))}`} />
          <Chip label="면허 조건" value={notice.license} />
          <Chip label="실제 적용 기준" value={sim.filter_label || '분석 대기'} />
          <Chip label="조회 기간" value={sim.search_days ? `최근 ${sim.search_days}일` : '분석 대기'} />
          <div style={{ flex: 1 }}></div>
          <span className="badge badge-accent" title={sim.source}>조달청 실시간</span>
        </div>
      </div>

      {/* KPI top row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        <SimKpi label="유사 공사 건수" value={sim.total} unit="건" />
        <SimKpi label="평균 낙찰률" value={pct(sim.avg_success)} unit="%" tone="accent" />
        <SimKpi label="평균 사정률" value={pct(sim.avg_adj)} unit="%" tone="accent" />
        <SimKpi label="경쟁률 평균" value={sim.avg_competition} unit="개사" />
        <SimKpi label="낙찰률 중앙값" value={pct(sim.median_success)} unit="%" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Chart */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="kicker"><span className="bar"></span>실시간 개찰결과</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>근거 공사의 환산 사정률 분포</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11.5 }}>
              <Legend color="var(--accent)" label={`집중 구간 ${sim.concentrated_range[0]}~${sim.concentrated_range[1]}%`} />
              <Legend color="var(--surface-3)" label="일반 분포" />
            </div>
          </div>

          <BucketBars
            buckets={sim.buckets}
            highlight={sim.buckets && sim.buckets.length ? [sim.buckets.reduce((a, b) => a.count >= b.count ? a : b).range] : []}
          />

          <div style={{
            display: 'flex', gap: 12, alignItems: 'center',
            marginTop: 18, padding: 12, background: 'var(--bg-2)',
            borderRadius: 10, border: '1px solid var(--line)',
          }}>
            <Icon name="spark" size={18} style={{ color: 'var(--accent)' }}/>
            <div style={{ fontSize: 13, lineHeight: 1.55, flex: 1 }}>
              <strong>가장 많이 나온 구간: </strong>
              <span className="tnum">{sim.most_common_range[0]}% ~ {sim.most_common_range[1]}%</span>
              <span className="muted"> · {sim.recent_trend}</span>
              {sim.warning && <span style={{ color: 'var(--warn)' }}> {sim.warning}</span>}
            </div>
            <span className="badge badge-accent">근거 {recent.length}건 표시</span>
          </div>
        </div>

        {/* Range card */}
        <div className="card">
          <div className="kicker"><span className="bar"></span>낙찰률 범위</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, marginBottom: 18 }}>최저 · 평균 · 최고</div>

          <RangeBar
            min={sim.min_success}
            avg={sim.avg_success}
            max={sim.max_success}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 20 }}>
            <RangeStat label="최저" value={pct(sim.min_success)} unit="%" />
            <RangeStat label="평균" value={pct(sim.avg_success)} unit="%" tone="accent" />
            <RangeStat label="최고" value={pct(sim.max_success)} unit="%" />
          </div>

          <div className="hr"></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Insight icon="info" text={<>이 표본은 <strong>{sim.filter_label || '실시간 개찰결과'}</strong> 기준으로 자동 선택되었습니다.</>}/>
            <Insight icon="warn" tone="warn" text={<>표본 수가 적거나 기준이 확장된 경우, 최종 투찰 전 나라장터 원문과 업체 판단을 함께 확인하세요.</>}/>
          </div>
        </div>
      </div>

      {/* Recent table */}
      <div className="card card-flush" style={{ marginTop: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="kicker"><span className="bar"></span>참고 데이터</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>실제 참고한 조달청 개찰결과</div>
          </div>
          <span className="badge badge-accent">화면 표시 {recent.length}건 / 표본 {sim.total}건</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>개찰일</th>
                <th>발주기관</th>
                <th>공사명</th>
                <th>낙찰업체</th>
                <th className="right">낙찰금액</th>
                <th className="right">투찰률</th>
                <th className="right">환산 사정률</th>
              </tr>
            </thead>
            <tbody>
              {hasEvidence ? recent.map((r, i) => (
                <tr key={`${r.notice_no || i}-${i}`}>
                  <td className="tnum muted">{r.date || '-'}</td>
                  <td>{r.agency || '-'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title || '공사명 미제공'}</div>
                    {r.notice_no && <div className="muted tnum" style={{ fontSize: 11, marginTop: 3 }}>{r.notice_no}</div>}
                  </td>
                  <td>{r.winner || '-'}</td>
                  <td className="right tnum strong">{fmt(r.hit)}</td>
                  <td className="right tnum">{pct(r.rate)}%</td>
                  <td className="right tnum" style={{ color: 'var(--accent)' }}>{pct(r.adj)}%</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="center muted" style={{ padding: 28 }}>
                    공고를 선택하면 조달청 개찰결과 근거가 이곳에 표시됩니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SimKpi({ label, value, unit, tone }) {
  const color = tone === 'accent' ? 'var(--accent)' : 'var(--ink)';
  return (
    <div className="card card-tight">
      <div className="stat-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        <span className="tnum strong" style={{ fontSize: 22, color }}>{value}</span>
        <span className="muted" style={{ fontSize: 11.5 }}>{unit}</span>
      </div>
    </div>
  );
}

function RangeStat({ label, value, unit, tone }) {
  const color = tone === 'accent' ? 'var(--accent)' : 'var(--ink)';
  return (
    <div className="center" style={{ padding: 10, background: 'var(--bg-2)', borderRadius: 10 }}>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
      <div className="tnum strong" style={{ fontSize: 18, color, marginTop: 4 }}>
        {value}<span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>{unit}</span>
      </div>
    </div>
  );
}

function RangeBar({ min, avg, max }) {
  // visual scale: anchor min..max
  const total = max - min;
  const avgPct = total > 0 ? ((avg - min) / total) * 100 : 50;
  return (
    <div style={{ position: 'relative', padding: '24px 8px 30px' }}>
      <div style={{ position: 'relative', height: 8, background: 'var(--surface-2)', borderRadius: 999 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '100%',
          background: 'linear-gradient(90deg, var(--surface-3), var(--accent) 50%, var(--surface-3))',
          borderRadius: 999,
        }}/>
        <Mark pos={0} label={min.toFixed(3) + '%'} />
        <Mark pos={avgPct} label={avg.toFixed(3) + '%'} primary />
        <Mark pos={100} label={max.toFixed(3) + '%'} />
      </div>
    </div>
  );
}
function Mark({ pos, label, primary }) {
  return (
    <div style={{ position: 'absolute', left: `${pos}%`, top: -4, transform: 'translateX(-50%)' }}>
      <div style={{
        width: primary ? 14 : 10, height: primary ? 14 : 10,
        background: primary ? 'var(--accent)' : 'var(--ink-mid)',
        borderRadius: 999,
        boxShadow: primary ? '0 0 0 4px var(--accent-soft)' : 'none',
        margin: '0 auto',
      }}/>
      <div className="tnum" style={{ fontSize: 11, marginTop: 8, color: primary ? 'var(--accent)' : 'var(--ink-low)', fontWeight: primary ? 700 : 500, whiteSpace: 'nowrap', textAlign: 'center' }}>{label}</div>
    </div>
  );
}

function Chip({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'var(--bg-2)', border: '1px solid var(--line)', fontSize: 11.5 }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--ink-mid)' }}>
      <span style={{ width: 10, height: 10, background: color, borderRadius: 3 }}></span>
      {label}
    </span>
  );
}

function Insight({ icon, text, tone }) {
  const { Icon } = window.UI;
  const c = tone === 'warn' ? 'var(--warn)' : 'var(--ink-low)';
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.55 }}>
      <Icon name={icon} size={15} style={{ color: c, flex: '0 0 15px', marginTop: 2 }}/>
      <div style={{ color: 'var(--ink-mid)' }}>{text}</div>
    </div>
  );
}

window.AnalysisScreen = AnalysisScreen;
