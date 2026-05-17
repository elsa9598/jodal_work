/* global React, window */
// Screen 6 — 카드형 결과 대시보드 (8 cards)

const { useState: useStateD } = React;

function DashboardScreen({ notice, finalChoice, onGo }) {
  const { fmt, calcBid, makeSimilar } = window.APP_DATA;
  const { Icon, BucketBars } = window.UI;

  if (!notice) {
    return (
      <div className="card center" style={{ padding: 60 }}>
        <div className="muted">공고와 투찰가를 먼저 확정해주세요.</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onGo('list')}>입찰 목록으로</button>
      </div>
    );
  }

  const sim = makeSimilar(notice.id);
  const consRate = sim.concentrated_range[0];
  const balRate = +sim.avg_adj.toFixed(2);
  const aggRate = sim.concentrated_range[1];
  const cons = calcBid(notice.base_price, consRate, notice.lower_rate);
  const bal = calcBid(notice.base_price, balRate, notice.lower_rate);
  const agg = calcBid(notice.base_price, aggRate, notice.lower_rate);

  const final = finalChoice || { rate: balRate, strategy: 'balanced', price: bal };

  const stratLabel = final.strategy === 'balanced' ? '중간형 (권장)'
    : final.strategy === 'conservative' ? '보수형'
    : final.strategy === 'aggressive' ? '공격형'
    : '직접 입력';

  const [checks, setChecks] = useStateD({
    notice_no: true, title: true, agency: true, license: true, region: true,
    joint: true, base: true, lower: true, a_value: false,
    pure_cost: false, deadline: true, opening: true, final_price: true,
  });
  const toggle = (k) => setChecks({ ...checks, [k]: !checks[k] });
  const checkItems = [
    ['notice_no', '공고번호 확인'],
    ['title', '공고명 확인'],
    ['agency', '발주기관 확인'],
    ['license', '면허 조건 확인'],
    ['region', '지역 제한 확인'],
    ['joint', '공동수급 여부 확인'],
    ['base', '기초금액 확인'],
    ['lower', '낙찰하한율 확인'],
    ['a_value', 'A값 반영 여부 확인'],
    ['pure_cost', '순공사원가 확인'],
    ['deadline', '입찰 마감시간 확인'],
    ['opening', '개찰일시 확인'],
    ['final_price', '최종 투찰 금액 확인'],
  ];
  const checkedCount = Object.values(checks).filter(Boolean).length;

  return (
    <div className="fade-in">
      <window.UI.PageHead
        title="투찰 전 결과 대시보드"
        sub={
          <span>
            <strong style={{ color: 'var(--ink)' }}>{notice.title}</strong> · 투찰 전 8개 카드로 핵심 정보를 최종 점검합니다.
          </span>
        }
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => onGo('simulation')}><Icon name="arrowLeft" size={14}/> 시뮬레이션</button>
            <button className="btn"><Icon name="save" size={14}/> PDF 저장</button>
            <button className="btn btn-primary"><Icon name="external" size={14}/> 나라장터로 이동</button>
          </div>
        }
      />

      {/* 8 cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>

        {/* CARD 1 — 분석 상태 */}
        <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CardLabel n={1} title="분석 상태" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--pos-soft)', display: 'grid', placeItems: 'center', flex: '0 0 60px' }}>
              <Icon name="check" size={28} style={{ color: 'var(--pos)' }}/>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--pos)' }}>분석 완료</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>모든 필수 데이터 확인 완료</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 4 }}>
            <MiniStat label="기초금액" ok />
            <MiniStat label="낙찰하한율" ok />
            <MiniStat label="사정률" ok />
          </div>
        </div>

        {/* CARD 2 — 추천 투찰 후보 금액 (BIG) */}
        <div className="card" style={{ gridColumn: 'span 8', background: 'linear-gradient(135deg, rgba(79,140,255,0.06), var(--surface))', border: '1px solid var(--accent-line)' }}>
          <CardLabel n={2} title="추천 투찰 후보 금액" right={<span className="badge badge-accent">최종 선택: {stratLabel}</span>} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
            <MoneyTile label="보수형" sub={`사정률 ${consRate}%`} price={cons} active={final.strategy === 'conservative'} tone="mute" />
            <MoneyTile label="중간형" sub={`사정률 ${balRate}%`} price={bal} active={final.strategy === 'balanced'} tone="accent" />
            <MoneyTile label="공격형" sub={`사정률 ${aggRate}%`} price={agg} active={final.strategy === 'aggressive'} tone="warn" />
          </div>
          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="muted" style={{ fontSize: 11.5 }}>차이 분석</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <span className="tnum strong">{fmt(agg - cons)}</span>원
                <span className="muted"> 차이 · 비율 </span>
                <span className="tnum strong">{((agg - cons) / cons * 100).toFixed(3)}%</span>
              </div>
            </div>
            <button className="btn btn-sm" onClick={() => onGo('simulation')}>슬라이더 다시 조정</button>
          </div>
        </div>

        {/* CARD 3 — 공고 핵심 정보 */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <CardLabel n={3} title="공고 핵심 정보" />
          <KvRow k="공고번호" v={notice.notice_no} mono />
          <KvRow k="공고명" v={notice.title} clip />
          <KvRow k="발주기관" v={notice.agency} />
          <KvRow k="수요기관" v={notice.demand} />
          <KvRow k="공종" v={<span className="badge">{notice.work}</span>} />
          <KvRow k="지역제한" v={notice.region} />
          <KvRow k="면허 조건" v={notice.license} />
          <KvRow k="입찰 마감" v={notice.deadline} mono />
          <KvRow k="개찰일시" v={notice.opening} mono last />
        </div>

        {/* CARD 4 — 유사 공사 낙찰 패턴 */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <CardLabel n={4} title="유사 공사 낙찰 패턴" right={<span className="badge badge-accent">{sim.total}건</span>} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <Mini2 k="평균 낙찰률" v={sim.avg_success.toFixed(3) + '%'} />
            <Mini2 k="평균 사정률" v={sim.avg_adj.toFixed(3) + '%'} />
            <Mini2 k="집중 구간" v={`${sim.concentrated_range[0]}~${sim.concentrated_range[1]}%`} />
            <Mini2 k="경쟁률 평균" v={sim.avg_competition + ' 개사'} />
          </div>
          <div style={{ marginTop: 12, height: 90 }}>
            <BucketBars buckets={sim.buckets} highlight={['99.96~99.98', '99.98~100.00', '100.00~100.02']}/>
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--ink-mid)' }}>최근 흐름:</strong> {sim.recent_trend}
          </div>
        </div>

        {/* CARD 5 — 조달청 입찰 입력 정보 */}
        <div className="card" style={{ gridColumn: 'span 4', background: 'linear-gradient(180deg, rgba(79,140,255,0.05), var(--surface))', border: '1px solid var(--accent-line)' }}>
          <CardLabel n={5} title="나라장터에 입력할 정보" right={<Icon name="pin" size={14} style={{ color: 'var(--accent)' }}/>} />
          <div style={{ padding: 16, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, textAlign: 'center', marginBottom: 12 }}>
            <div className="muted" style={{ fontSize: 11 }}>최종 투찰 금액</div>
            <div className="tnum" style={{ fontSize: 30, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.03em', marginTop: 4 }}>
              {fmt(final.price)}<span style={{ fontSize: 15, color: 'var(--ink-low)', fontWeight: 500 }}>원</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-mid)', marginTop: 6 }}>{stratLabel} · 사정률 <span className="tnum">{final.rate.toFixed(2)}%</span></div>
          </div>
          <KvRow k="기초금액" v={fmt(notice.base_price) + ' 원'} mono />
          <KvRow k="낙찰하한율" v={notice.lower_rate + ' %'} mono />
          <KvRow k="적용 사정률" v={final.rate.toFixed(2) + ' %'} mono />
          <KvRow k="A값" v={fmt(notice.a_value) + ' 원'} mono last />
        </div>

        {/* CARD 6 — 체크리스트 */}
        <div className="card" style={{ gridColumn: 'span 5' }}>
          <CardLabel n={6} title="입찰 전 체크리스트" right={
            <span className="badge" style={{ background: 'var(--bg-2)' }}>
              <span className="tnum strong" style={{ color: checkedCount === checkItems.length ? 'var(--pos)' : 'var(--ink)' }}>{checkedCount}</span>/{checkItems.length}
            </span>
          }/>
          <div className="progress" style={{ marginBottom: 10 }}>
            <span style={{ width: (checkedCount / checkItems.length) * 100 + '%', background: checkedCount === checkItems.length ? 'var(--pos)' : 'var(--accent)' }}></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            {checkItems.map(([k, label]) => (
              <div key={k} className={'check' + (checks[k] ? ' on' : '')} onClick={() => toggle(k)} style={{ cursor: 'pointer' }}>
                <div className="box">{checks[k] && <Icon name="check" size={12}/>}</div>
                <div className="label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 7 — 계산식 */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <CardLabel n={7} title="계산식" />
          <div className="mono" style={{ padding: 14, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, lineHeight: 1.9 }}>
            <div className="tnum"><span className="muted">기초금액</span>  {fmt(notice.base_price)}</div>
            <div className="tnum"><span className="muted">× 사정률   </span> {final.rate.toFixed(2)}%</div>
            <div className="tnum"><span className="muted">× 낙찰하한율 </span>{notice.lower_rate}%</div>
            <div style={{ borderTop: '1px solid var(--line-strong)', margin: '8px 0', paddingTop: 8 }}>
              <div className="tnum strong" style={{ fontSize: 16, color: 'var(--accent)' }}>= {fmt(final.price)}원</div>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
            원 단위 정수 반올림 · 천 단위 콤마 표기
          </div>
        </div>

        {/* CARD 8 — 주의사항 */}
        <div className="card" style={{ gridColumn: 'span 3', background: 'var(--warn-soft)', border: '1px solid rgba(251,191,36,0.4)' }}>
          <CardLabel n={8} title="주의사항" toneColor="var(--warn)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-mid)' }}>
            <p style={{ margin: 0 }}>
              본 결과는 나라장터 공공데이터와 과거 유사 공사 낙찰 결과를 기반으로 한 <strong style={{ color: 'var(--ink)' }}>참고용 시뮬레이션</strong>입니다.
            </p>
            <p style={{ margin: 0, color: 'var(--warn)' }}>실제 낙찰을 보장하지 않습니다.</p>
            <p style={{ margin: 0 }}>
              투찰 전 반드시 조달청 원문 공고와 입찰 조건을 직접 확인하세요.
            </p>
          </div>
        </div>

      </div>

      {/* Final actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
        <div>
          <div className="muted" style={{ fontSize: 11.5 }}>준비 완료</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
            체크리스트 {checkedCount}/{checkItems.length} · 최종 투찰가 <span className="tnum" style={{ color: 'var(--accent)' }}>{fmt(final.price)}원</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn">내 기록에 저장</button>
          <button className="btn btn-primary btn-lg" disabled={checkedCount < checkItems.length}>
            <Icon name="external" size={14}/> 나라장터에서 투찰하기
          </button>
        </div>
      </div>
    </div>
  );
}

function CardLabel({ n, title, right, toneColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: toneColor ? 'rgba(255,255,255,0.12)' : 'var(--accent-soft)',
          color: toneColor || 'var(--accent)',
          display: 'grid', placeItems: 'center',
          border: '1px solid ' + (toneColor ? 'transparent' : 'var(--accent-line)'),
        }} className="tnum">{n}</div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em' }}>{title}</div>
      </div>
      {right}
    </div>
  );
}
function MoneyTile({ label, sub, price, active, tone }) {
  const { fmt } = window.APP_DATA;
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink-mid)';
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: active ? (tone === 'accent' ? 'var(--accent-soft)' : tone === 'warn' ? 'var(--warn-soft)' : 'var(--surface-2)') : 'var(--bg-2)',
      border: '1px solid ' + (active ? color : 'var(--line)'),
      position: 'relative',
    }}>
      {active && <div style={{ position: 'absolute', top: 8, right: 8 }}><span className="badge badge-accent" style={{ fontSize: 9, padding: '2px 6px' }}>선택</span></div>}
      <div style={{ fontSize: 11, color, fontWeight: 700 }}>{label}</div>
      <div className="muted tnum" style={{ fontSize: 10.5, marginTop: 2 }}>{sub}</div>
      <div className="tnum" style={{ fontSize: 19, fontWeight: 800, marginTop: 8, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
        {fmt(price)}<span className="muted" style={{ fontSize: 11, fontWeight: 500 }}>원</span>
      </div>
    </div>
  );
}
function MiniStat({ label, ok }) {
  const { Icon } = window.UI;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'var(--bg-2)', borderRadius: 8, fontSize: 11 }}>
      <Icon name="check" size={11} style={{ color: ok ? 'var(--pos)' : 'var(--ink-dim)' }}/>
      <span className="muted">{label}</span>
    </div>
  );
}
function Mini2({ k, v }) {
  return (
    <div style={{ padding: 8, background: 'var(--bg-2)', borderRadius: 8 }}>
      <div className="muted" style={{ fontSize: 10.5 }}>{k}</div>
      <div className="tnum strong" style={{ fontSize: 13, marginTop: 2 }}>{v}</div>
    </div>
  );
}
function KvRow({ k, v, mono, last, clip }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12,
      padding: '7px 0',
      borderBottom: last ? 'none' : '1px dashed var(--line)',
      fontSize: 12,
    }}>
      <span className="muted" style={{ flex: '0 0 auto' }}>{k}</span>
      <span className={mono ? 'tnum' : ''} style={{ fontWeight: 500, textAlign: 'right',
        ...(clip ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 } : {}) }}>{v}</span>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
