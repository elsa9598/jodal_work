/* global React, window */
// Screen 5 — 투찰가 시뮬레이션 (HERO)

const { useState: useStateS, useMemo: useMemoS, useEffect: useEffectS } = React;

function SimulationScreen({ notice, onGo, finalChoice, onChooseFinal }) {
  const { fmt, calcBid, makeSimilar } = window.APP_DATA;
  const { Icon } = window.UI;

  if (!notice) {
    return (
      <div className="card center" style={{ padding: 60 }}>
        <div className="muted">먼저 입찰 공고를 선택해주세요.</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onGo('list')}>입찰 목록으로</button>
      </div>
    );
  }

  const sim = useMemoS(() => makeSimilar(notice.id), [notice]);

  const consRate = sim.concentrated_range[0];
  const balRate = +sim.avg_adj.toFixed(2);
  const aggRate = sim.concentrated_range[1];

  const [rate, setRate] = useStateS(balRate);
  const [strategy, setStrategy] = useStateS('balanced');

  const setStrat = (s) => {
    setStrategy(s);
    if (s === 'conservative') setRate(consRate);
    if (s === 'balanced') setRate(balRate);
    if (s === 'aggressive') setRate(aggRate);
  };

  useEffectS(() => {
    if (Math.abs(rate - consRate) < 0.005) setStrategy('conservative');
    else if (Math.abs(rate - balRate) < 0.005) setStrategy('balanced');
    else if (Math.abs(rate - aggRate) < 0.005) setStrategy('aggressive');
    else setStrategy('custom');
  }, [rate]);

  const cons = calcBid(notice.base_price, consRate, notice.lower_rate);
  const bal = calcBid(notice.base_price, balRate, notice.lower_rate);
  const agg = calcBid(notice.base_price, aggRate, notice.lower_rate);
  const current = calcBid(notice.base_price, rate, notice.lower_rate);

  const minVal = Math.min(cons, bal, agg, current) - 200000;
  const maxVal = Math.max(cons, bal, agg, current) + 200000;
  const pct = (v) => ((v - minVal) / (maxVal - minVal)) * 100;

  return (
    <div className="fade-in">
      <window.UI.PageHead
        title="투찰가 시뮬레이션"
        sub={
          <span>
            <strong style={{ color: 'var(--ink)' }}>{notice.title}</strong> · 슬라이더로 사정률을 조정하면 투찰 금액이 실시간 계산됩니다.
          </span>
        }
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => onGo('analysis')}><Icon name="arrowLeft" size={14}/> 유사 공사 분석</button>
            <button className="btn btn-primary" onClick={() => { onChooseFinal({ rate, strategy, price: current }); onGo('dashboard'); }}>
              결과 대시보드 <Icon name="arrowRight" size={14}/>
            </button>
          </div>
        }
      />

      <div className="card" style={{ padding: '28px 28px 24px', background: 'linear-gradient(180deg, var(--surface-2), var(--surface))', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
          <div>
            <div className="kicker"><span className="bar"></span>3가지 후보 한눈에 비교</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>보수형 · 중간형 · 공격형</div>
          </div>
          <div className="muted" style={{ fontSize: 12, textAlign: 'right' }}>
            기초금액 <span className="tnum strong" style={{ color: 'var(--ink)' }}>{fmt(notice.base_price)}원</span> ·
            낙찰하한율 <span className="tnum strong" style={{ color: 'var(--ink)' }}>{notice.lower_rate}%</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
          <Candidate label="보수형" sub="안정 · 사정률 하단" rate={consRate} price={cons} tone="mute"
            active={strategy === 'conservative'} onClick={() => setStrat('conservative')} diffFromBal={cons - bal} />
          <Candidate label="중간형" sub="권장 · 평균 사정률" rate={balRate} price={bal} tone="accent"
            active={strategy === 'balanced'} featured onClick={() => setStrat('balanced')} diffFromBal={0} />
          <Candidate label="공격형" sub="적극 · 사정률 상단" rate={aggRate} price={agg} tone="warn"
            active={strategy === 'aggressive'} onClick={() => setStrat('aggressive')} diffFromBal={agg - bal} />
        </div>

        <div style={{ position: 'relative', height: 110, padding: '20px 8px 0' }}>
          <div style={{ position: 'absolute', left: 8, right: 8, top: 50, height: 4, background: 'var(--surface-3)', borderRadius: 999 }}></div>
          <CandMarker pos={pct(cons)} top label="보수형" sub={fmt(cons) + '원'} tone="mute" />
          <CandMarker pos={pct(bal)} top label="중간형" sub={fmt(bal) + '원'} tone="accent" />
          <CandMarker pos={pct(agg)} top label="공격형" sub={fmt(agg) + '원'} tone="warn" />

          <div style={{ position: 'absolute', left: `calc(${pct(current)}% + 8px)`, top: 36, bottom: 4, transform: 'translateX(-50%)', transition: 'left 0.15s ease', zIndex: 2 }}>
            <div style={{ width: 2, height: 36, background: 'var(--accent)', boxShadow: '0 0 0 4px var(--accent-soft)', margin: '0 auto' }}/>
            <div className="tnum" style={{ padding: '4px 10px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 700, marginTop: 4, whiteSpace: 'nowrap' }}>
              내 선택 {fmt(current)}원
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 28, fontSize: 12, flexWrap: 'wrap' }}>
            <div><span className="muted">최저 ↔ 최고 차이 </span><span className="tnum strong">{fmt(agg - cons)}</span><span className="muted"> 원</span></div>
            <div><span className="muted">비율 </span><span className="tnum strong">{((agg - cons) / cons * 100).toFixed(3)}%</span></div>
            <div><span className="muted">중간 → 공격형 </span><span className="tnum strong" style={{ color: 'var(--warn)' }}>+{fmt(agg - bal)}원</span></div>
            <div><span className="muted">중간 → 보수형 </span><span className="tnum strong" style={{ color: 'var(--ink-low)' }}>{fmt(cons - bal)}원</span></div>
          </div>
          <span className="badge badge-accent"><Icon name="spark" size={11}/> AI 권장 · 중간형</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="kicker"><span className="bar"></span>사정률 직접 조정</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, marginBottom: 22 }}>슬라이더로 미세 조정</div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
            {[['conservative', '보수형', consRate],['balanced', '중간형', balRate],['aggressive', '공격형', aggRate],['custom', '직접 입력', null]].map(([k, label, r]) => (
              <button key={k} className={'btn btn-sm' + (strategy === k ? ' btn-primary' : '')}
                onClick={() => r != null && setStrat(k)} disabled={k === 'custom'}
                style={{ flex: 1, justifyContent: 'center', opacity: k === 'custom' && strategy !== 'custom' ? 0.6 : 1 }}>
                {label}{r != null && <span className="tnum" style={{ opacity: 0.7, marginLeft: 4 }}>{r}%</span>}
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div className="muted" style={{ fontSize: 11.5 }}>적용 사정률</div>
            <div className="tnum" style={{ fontSize: 44, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {rate.toFixed(2)}<span style={{ fontSize: 22, color: 'var(--ink-low)', fontWeight: 500 }}>%</span>
            </div>
          </div>

          <div style={{ position: 'relative', padding: '6px 0 30px' }}>
            <input type="range" className="sim-slider"
              min={notice.rate_range[0]} max={notice.rate_range[1]} step="0.01"
              value={rate} onChange={e => setRate(parseFloat(e.target.value))} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-low)', marginTop: 12 }} className="tnum">
              <span>{notice.rate_range[0]}%</span>
              <span style={{ color: 'var(--accent)' }}>집중 {sim.concentrated_range[0]}~{sim.concentrated_range[1]}%</span>
              <span>{notice.rate_range[1]}%</span>
            </div>
          </div>

          <div className="hr"></div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 12 }}>직접 입력</span>
            <input className="input" type="number" step="0.01" value={rate}
              onChange={e => setRate(parseFloat(e.target.value || balRate))} style={{ flex: 1 }} />
            <span className="muted">%</span>
            <button className="btn btn-sm" onClick={() => setRate(balRate)}>리셋</button>
          </div>
        </div>

        <div className="card">
          <div className="kicker"><span className="bar"></span>계산 결과</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, marginBottom: 18 }}>최종 투찰 후보 금액</div>

          <div style={{ padding: 20, background: 'linear-gradient(180deg, var(--accent-soft), transparent)', border: '1px solid var(--accent-line)', borderRadius: 14, marginBottom: 18 }}>
            <div className="muted" style={{ fontSize: 11.5 }}>예상 투찰 금액</div>
            <div className="tnum" style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.03em', marginTop: 4 }}>
              {fmt(current)}<span style={{ fontSize: 18, color: 'var(--ink-mid)', fontWeight: 600 }}>원</span>
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              {strategy === 'balanced' ? '중간형 · 권장 전략' : strategy === 'conservative' ? '보수형 전략' : strategy === 'aggressive' ? '공격형 전략' : '직접 입력 전략'}
            </div>
          </div>

          <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>계산식</div>
          <div className="mono" style={{ padding: 14, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12, lineHeight: 1.9 }}>
            <div><span style={{ color: 'var(--ink-low)' }}>기초금액</span> = <span className="strong">{fmt(notice.base_price)}</span> 원</div>
            <div><span style={{ color: 'var(--ink-low)' }}>× 사정률</span> = <span className="strong" style={{ color: 'var(--accent)' }}>{rate.toFixed(2)}%</span></div>
            <div><span style={{ color: 'var(--ink-low)' }}>× 낙찰하한율</span> = <span className="strong">{notice.lower_rate}%</span></div>
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6 }}>
              <span style={{ color: 'var(--ink-low)' }}>→ 결과</span> = <span className="strong" style={{ color: 'var(--accent)' }}>{fmt(current)}</span> 원
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onGo('analysis')}>패턴 다시 보기</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => { onChooseFinal({ rate, strategy, price: current }); onGo('dashboard'); }}>
              <Icon name="check" size={14}/> 이 금액으로 확정
            </button>
          </div>
        </div>
      </div>

      <div className="card card-tight" style={{ marginTop: 16, background: 'var(--bg-2)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="warn" size={16} style={{ color: 'var(--warn)', flex: '0 0 16px', marginTop: 2 }}/>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.65 }}>
          본 시뮬레이션은 과거 유사 공사 {sim.total}건의 사정률 패턴을 기반으로 한 <strong style={{ color: 'var(--ink-mid)' }}>참고용 계산</strong>입니다.
          실제 낙찰을 보장하지 않으며, 최종 투찰 전 조달청 나라장터 원문 공고의 A값·순공사원가·면허 조건을 반드시 직접 확인하세요.
        </div>
      </div>
    </div>
  );
}

function Candidate({ label, sub, rate, price, tone, active, featured, onClick, diffFromBal }) {
  const { fmt } = window.APP_DATA;
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink-mid)';
  const bg = active ? (tone === 'accent' ? 'var(--accent-soft)' : tone === 'warn' ? 'var(--warn-soft)' : 'var(--surface-2)') : 'var(--surface)';
  return (
    <button onClick={onClick}
      style={{ background: bg, border: '1px solid ' + (active ? color : 'var(--line)'), borderRadius: 14, padding: '20px 20px 18px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', transition: 'all 0.15s ease', boxShadow: active ? `0 0 0 4px ${tone === 'accent' ? 'var(--accent-soft)' : 'transparent'}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: '-0.01em' }}>
            {label}
            {featured && <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: 10, padding: '2px 7px' }}>권장</span>}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{sub}</div>
        </div>
        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid ' + (active ? color : 'var(--line-strong)'), display: 'grid', placeItems: 'center' }}>
          {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }}></div>}
        </div>
      </div>
      <div className="tnum" style={{ fontSize: 13, color, marginTop: 14, fontWeight: 600 }}>사정률 {rate}%</div>
      <div className="tnum" style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginTop: 4, letterSpacing: '-0.025em' }}>
        {fmt(price)}<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}> 원</span>
      </div>
      {diffFromBal !== undefined && diffFromBal !== 0 && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-low)' }}>
          중간형 대비 <span className="tnum strong" style={{ color: diffFromBal > 0 ? 'var(--warn)' : 'var(--ink-mid)' }}>
            {diffFromBal > 0 ? '+' : ''}{fmt(diffFromBal)}원
          </span>
        </div>
      )}
    </button>
  );
}

function CandMarker({ pos, label, sub, tone, top }) {
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink-mid)';
  return (
    <div style={{ position: 'absolute', left: `calc(${pos}% + 8px)`, top: 44, transform: 'translateX(-50%)' }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: '2px solid var(--bg)', margin: '0 auto' }}></div>
      {top && (
        <div style={{ position: 'absolute', top: -42, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--ink-low)', fontWeight: 600 }}>{label}</div>
          <div className="tnum" style={{ fontSize: 11, color, fontWeight: 700, marginTop: 2 }}>{sub}</div>
        </div>
      )}
    </div>
  );
}

window.SimulationScreen = SimulationScreen;
