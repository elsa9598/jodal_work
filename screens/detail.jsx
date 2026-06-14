/* global React, window */
// Screen 3 — 공고 상세

function DetailScreen({ notice, onGo, saved, onToggleSave }) {
  const { fmt, fmtKRW, fmt억, calcBid, makeSimilar, getRecommendedBid, statusLabel } = window.APP_DATA;
  const { Icon } = window.UI;

  if (!notice) {
    return (
      <div className="card center" style={{ padding: 60 }}>
        <div className="muted">공고를 먼저 선택해주세요.</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onGo('list')}>입찰 목록으로</button>
      </div>
    );
  }

  const st = statusLabel(notice.status);
  const isSaved = saved.has(notice.id);
  const sim = makeSimilar(notice.id);
  const rec = getRecommendedBid(notice, sim);

  // quick preview of bid candidates
  const consRate = rec.candidates.conservative.rate;
  const balRate = rec.candidates.middle.rate;
  const aggRate = rec.candidates.aggressive.rate;
  const cons = rec.candidates.conservative.price;
  const bal = rec.candidates.middle.price;
  const agg = rec.candidates.aggressive.price;

  // 예정가격 범위
  const priceLow = Math.round(notice.base_price * (notice.rate_range[0] / 100));
  const priceHigh = Math.round(notice.base_price * (notice.rate_range[1] / 100));

  return (
    <div className="fade-in">
      <window.UI.PageHead
        title={notice.title}
        sub={
          <span>
            공고번호 <span className="strong tnum" style={{ color: 'var(--ink)' }}>{notice.notice_no}</span> · {notice.agency} · {notice.region}
          </span>
        }
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => onGo('list')}>
              <Icon name="arrowLeft" size={14}/> 목록
            </button>
            <button className="btn" onClick={() => onToggleSave(notice.id)} style={{ color: isSaved ? 'var(--accent)' : 'var(--ink)' }}>
              <Icon name={isSaved ? 'starFill' : 'star'} size={14}/>
              {isSaved ? '관심 등록됨' : '관심 등록'}
            </button>
            <button className="btn">
              <Icon name="external" size={14}/> 원문 공고
            </button>
          </div>
        }
      />

      {/* Status strip */}
      <div className="card card-tight" style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
        <div className="accent-rail"></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <span className={'badge ' + st.cls}><span className="dot"></span>{st.label}</span>
          <span className="badge">{notice.work}</span>
          <span className="badge">{notice.method}</span>
          <span className="badge">{notice.license}</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          <div className="stat-row">
            <span className="stat-label">입찰 마감</span>
            <span className="tnum strong" style={{ fontSize: 14 }}>{notice.deadline}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">개찰일시</span>
            <span className="tnum strong" style={{ fontSize: 14 }}>{notice.opening}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">남은시간</span>
            <span className="tnum strong" style={{ fontSize: 14, color: notice.status === 'urgent' ? 'var(--warn)' : 'var(--accent)' }}>D-{notice.days_left}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* LEFT — info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 공고 기본 정보 */}
          <div className="card">
            <div className="kicker"><span className="bar"></span>공고 기본 정보</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, marginBottom: 14 }}>공고 상세</div>
            <InfoGrid items={[
              ['공고번호', notice.notice_no, 'mono'],
              ['공고명', notice.title],
              ['발주기관', notice.agency],
              ['수요기관', notice.demand],
              ['공종', notice.work],
              ['지역제한', notice.region],
              ['면허 조건', notice.license],
              ['공동수급 가능 여부', notice.joint],
              ['계약 방법', notice.method],
              ['입찰 방식', notice.bid_method],
              ['입찰 마감일시', notice.deadline, 'tnum'],
              ['개찰일시', notice.opening, 'tnum'],
            ]} />
          </div>

          {/* 금액 계산 정보 */}
          <div className="card">
            <div className="kicker"><span className="bar"></span>금액 계산 정보</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, marginBottom: 14 }}>예정가격 / 산식 기준값</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              <BigStat label="기초금액" value={fmt(notice.base_price)} unit="원" tone="accent" />
              <BigStat label="추정가격" value={fmt(notice.estimated)} unit="원" />
              <BigStat label="낙찰하한율" value={notice.lower_rate} unit="%" />
            </div>

            <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>예정가격 범위 (사정률 {notice.rate_range[0]}% ~ {notice.rate_range[1]}%)</div>
              <div className="tnum strong" style={{ fontSize: 16 }}>
                {fmt(priceLow)} 원 ~ {fmt(priceHigh)} 원
              </div>
              <div style={{ position: 'relative', height: 8, background: 'var(--surface)', borderRadius: 999, marginTop: 12 }}>
                <div style={{ position: 'absolute', left: '0%', right: '0%', top: 0, bottom: 0,
                  background: 'linear-gradient(90deg, var(--accent-soft), var(--accent), var(--accent-soft))',
                  borderRadius: 999 }}></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <InfoLine label="A값" value={fmt(notice.a_value) + ' 원'} />
              <InfoLine label="순공사원가" value={fmt(notice.pure_cost) + ' 원'} />
            </div>
          </div>
        </div>

        {/* RIGHT — pre-analysis preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick recommendation */}
          <div className="card" style={{
            background: 'linear-gradient(180deg, rgba(79,140,255,0.06), var(--surface))',
            border: '1px solid var(--accent-line)',
          }}>
            <div className="kicker"><span className="bar"></span>픽 추천</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, marginBottom: 4 }}>낙찰 가능성 높은 후보 금액</div>
            <div className="muted" style={{ fontSize: 11.5, marginBottom: 14 }}>
              조달청 개찰결과의 집중 투찰률을 현재 공고 기초금액에 대입한 참고값입니다.
            </div>

            <div style={{ padding: 16, borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div className="muted" style={{ fontSize: 11.5 }}>추천 전략 · {rec.label}</div>
                  <div className="tnum" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>
                    {fmt(rec.price)}<span style={{ fontSize: 14, color: 'var(--ink-mid)', fontWeight: 600 }}>원</span>
                  </div>
                </div>
                <span className={'badge ' + (rec.confidence === '높음' ? 'badge-pos' : rec.confidence === '보통' ? 'badge-warn' : 'badge-mute')}>
                  표본 {rec.total}건 · 신뢰도 {rec.confidence}
                </span>
              </div>
              <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.55, marginTop: 10 }}>
                적용 사정률 <span className="tnum strong" style={{ color: 'var(--ink)' }}>{rec.rate.toFixed(3)}%</span>
                <span> · 예상 투찰률 </span>
                <span className="tnum strong" style={{ color: 'var(--ink)' }}>{rec.bidRate.toFixed(3)}%</span>
              </div>
            </div>

            <CandidateRow label="안정형" sub={`사정률 ${consRate.toFixed(3)}%`} value={cons} tone="mute" featured={rec.key === 'conservative'} />
            <CandidateRow label="추천형" sub={`사정률 ${balRate.toFixed(3)}%`} value={bal} tone="accent" featured={rec.key === 'middle'} />
            <CandidateRow label="공격형" sub={`사정률 ${aggRate.toFixed(3)}%`} value={agg} tone="warn" featured={rec.key === 'aggressive'} />

            <div className="hr"></div>
            <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
              세 후보 차이 <span className="strong" style={{ color: 'var(--ink)' }}>{fmt(agg - cons)}</span> 원 · 약 {((agg - cons) / cons * 100).toFixed(2)}%
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="kicker"><span className="bar"></span>다음 단계</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, marginBottom: 14 }}>분석 흐름</div>
            <StepBtn n={1} label="유사 공사 분석하기" sub="실시간 개찰결과 근거 확인" onClick={() => onGo('analysis')} icon="chart" />
            <StepBtn n={2} label="투찰가 시뮬레이션" sub="낙찰하한율 기준 16개 샘플" onClick={() => onGo('simulation')} icon="calc" featured />
            <StepBtn n={3} label="결과 대시보드 보기" sub="8개 카드 · 체크리스트" onClick={() => onGo('dashboard')} icon="grid" />
          </div>

          <div className="card card-tight" style={{ background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Icon name="info" size={16} style={{ color: 'var(--ink-low)', flex: '0 0 16px', marginTop: 2 }}/>
              <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
                기초금액·낙찰하한율·사정률 <strong style={{ color: 'var(--ink-mid)' }}>3가지 값</strong>이 모두 확인되어야 투찰가가 계산됩니다.
                현재 공고는 <strong style={{ color: 'var(--pos)' }}>모든 값 확인 완료</strong> 상태입니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
      {items.map(([k, v, cls]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed var(--line)', fontSize: 13, gap: 16 }}>
          <span style={{ color: 'var(--ink-low)' }}>{k}</span>
          <span className={cls || ''} style={{ color: 'var(--ink)', textAlign: 'right', fontWeight: 500 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
function InfoLine({ label, value }) {
  return (
    <div style={{ padding: 12, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <div className="muted" style={{ fontSize: 11.5 }}>{label}</div>
      <div className="tnum strong" style={{ fontSize: 15, marginTop: 4 }}>{value}</div>
    </div>
  );
}
function BigStat({ label, value, unit, tone }) {
  const color = tone === 'accent' ? 'var(--accent)' : 'var(--ink)';
  return (
    <div style={{ padding: 14, background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--line)' }}>
      <div className="muted" style={{ fontSize: 11.5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        <span className="tnum strong" style={{ fontSize: 20, color }}>{value}</span>
        <span className="muted" style={{ fontSize: 11 }}>{unit}</span>
      </div>
    </div>
  );
}
function CandidateRow({ label, sub, value, tone, featured }) {
  const { fmt } = window.APP_DATA;
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink)';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 14px', borderRadius: 10,
      background: featured ? 'var(--accent-soft)' : 'transparent',
      border: featured ? '1px solid var(--accent-line)' : '1px solid transparent',
      marginBottom: 6,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}{featured && <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: 10 }}>권장</span>}</div>
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>
      </div>
      <div className="tnum strong" style={{ fontSize: 16, color }}>{fmt(value)} <span className="muted" style={{ fontSize: 11 }}>원</span></div>
    </div>
  );
}
function StepBtn({ n, label, sub, onClick, icon, featured }) {
  const { Icon } = window.UI;
  return (
    <button
      className="btn"
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 14px', marginBottom: 8,
        background: featured ? 'var(--accent)' : 'var(--surface-2)',
        borderColor: featured ? 'var(--accent)' : 'var(--line)',
        color: featured ? '#fff' : 'var(--ink)',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 8,
        background: featured ? 'rgba(255,255,255,0.2)' : 'var(--bg-2)',
        display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
      }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{sub}</div>
      </div>
      <Icon name="arrowRight" size={14}/>
    </button>
  );
}

window.DetailScreen = DetailScreen;
