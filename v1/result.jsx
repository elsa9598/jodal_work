// result.jsx — Final result dashboard with 8 cards

function formatNum(n) {
  if (n == null || isNaN(n)) return '-';
  return Math.round(n).toLocaleString('en-US');
}

function parseAmount(s) {
  if (s == null) return NaN;
  return Number(String(s).replace(/[^\d.-]/g, ''));
}

function ResultScreen({ captures, userVals, onBack, onReanalyze, onInspect }) {
  // Build effective values: AI value with user override on top
  const eff = (cap, key) => {
    const u = userVals[cap.id]?.[key];
    return u !== undefined && u !== '' ? u : cap.ai[key];
  };

  // Extract calculation inputs
  const cap2 = captures.find((c) => c.id === 2);
  const cap3 = captures.find((c) => c.id === 3);
  const cap4 = captures.find((c) => c.id === 4);
  const cap5 = captures.find((c) => c.id === 5);

  const basePrice  = parseAmount(eff(cap2, 'base_price'));
  const lowerBound = parseAmount(eff(cap3, 'lower_bound_rate'));
  const primaryRate = parseAmount(eff(cap5, 'primary_target_rate'));
  const recStart   = parseAmount(eff(cap4, 'recommend_rate_start'));
  const recEnd     = parseAmount(eff(cap4, 'recommend_rate_end'));

  // Applied rate priority: primary → avg(start,end) → none
  let appliedRate = null;
  let appliedReason = '';
  if (!isNaN(primaryRate)) {
    appliedRate = primaryRate;
    appliedReason = '1순위 사정률 적용';
  } else if (!isNaN(recStart) && !isNaN(recEnd)) {
    appliedRate = (recStart + recEnd) / 2;
    appliedReason = '추천 사정률 구간 평균 적용';
  }

  const hasAll = !isNaN(basePrice) && !isNaN(lowerBound) && appliedRate != null;
  const expected = hasAll
    ? basePrice * (appliedRate / 100) * (lowerBound / 100)
    : null;

  const totalCorr = captures.reduce((s, c) => s + c.corrections.length, 0);
  const totalEdits = Object.values(userVals).reduce(
    (s, v) => s + Object.keys(v).length, 0,
  );

  // Confidence: high if no missing & few corrections, medium if some, low if missing
  const confidence = !hasAll ? 'low' : totalCorr > 3 ? 'medium' : 'high';
  const confidenceLabel = { high: '높음', medium: '보통', low: '낮음' }[confidence];
  const confidenceColor = { high: '#2e9d54', medium: '#d97706', low: '#d32f2f' }[confidence];
  const confidencePct = { high: 92, medium: 72, low: 38 }[confidence];

  return (
    <div className="app" data-screen-label="05 최종 결과">
      <div className="app-header">
        <button className="app-header-back" onClick={onBack} aria-label="뒤로">←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="app-header-title">조달청 낙찰 예상 결과</div>
          <div className="app-header-sub">
            {captures[0]?.ai?.notice_no || '-'} · {cap2?.ai?.business_type || ''}
          </div>
        </div>
      </div>

      <div className="app-body">

        {/* ── Card 1: Status ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasAll
            ? <span className="pill pill-ok">✓ 분석 완료</span>
            : <span className="pill pill-error">❌ 필수 데이터 누락</span>
          }
          {totalCorr > 0 && (
            <span className="pill pill-warn">⚠ 자동 보정 {totalCorr}건</span>
          )}
          {totalEdits > 0 && (
            <span className="pill pill-info">✎ 직접 수정 {totalEdits}건</span>
          )}
        </div>

        {/* ── Card 2: HERO — Expected bid price ── */}
        <div className="result-hero">
          <div className="result-hero-label">최종 예상 투찰 금액</div>
          {hasAll ? (
            <>
              <div className="result-hero-amount">
                {formatNum(expected)}<span className="result-hero-amount-unit">원</span>
              </div>
              <div className="result-hero-meta">
                <div className="result-hero-meta-cell">
                  적용 사정률<b>{appliedRate.toFixed(3)}%</b>
                </div>
                <div className="result-hero-meta-cell">
                  낙찰하한율<b>{lowerBound.toFixed(3)}%</b>
                </div>
                <div className="result-hero-meta-cell">
                  기초금액<b>{formatNum(basePrice)}원</b>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              fontSize: 18, fontWeight: 700, color: 'var(--red-500)',
              padding: '20px 0', lineHeight: 1.5,
            }}>
              계산 불가<br />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>
                기초금액 · 낙찰하한율 · 사정률 중 일부가 누락되었습니다.
              </span>
            </div>
          )}
        </div>

        {/* ── Card 3: Notice info ── */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">3</span>
            공고 정보
          </div>
          <div className="kv"><div className="kv-key">공고번호</div>
            <div className="kv-val">{eff(captures[0], 'notice_no')}</div></div>
          <div className="kv"><div className="kv-key">공고명</div>
            <div className="kv-val" style={{ fontSize: 13 }}>{eff(captures[0], 'title')}</div></div>
          <div className="kv"><div className="kv-key">발주기관</div>
            <div className="kv-val">{eff(captures[0], 'ordering_agency')}</div></div>
          <div className="kv"><div className="kv-key">수요기관</div>
            <div className="kv-val">{eff(captures[0], 'demand_agency')}</div></div>
          <div className="kv"><div className="kv-key">업종</div>
            <div className="kv-val">{eff(captures[0], 'business_type')}</div></div>
          <div className="kv"><div className="kv-key">지역제한</div>
            <div className="kv-val">{eff(captures[0], 'region_limit')}</div></div>
          <div className="kv"><div className="kv-key">입찰마감</div>
            <div className="kv-val kv-val-num">{eff(captures[0], 'deadline')}</div></div>
          <div className="kv"><div className="kv-key">개찰일시</div>
            <div className="kv-val kv-val-num">{eff(captures[0], 'opening_datetime')}</div></div>
        </div>

        {/* ── Card 4: Calculation inputs ── */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">4</span>
            조달청 계산 정보
          </div>
          <div className="kv"><div className="kv-key">기초금액</div>
            <div className="kv-val kv-val-num" style={{ color: 'var(--navy-800)' }}>
              {eff(cap2, 'base_price')} 원</div></div>
          <div className="kv"><div className="kv-key">추정가격</div>
            <div className="kv-val kv-val-num">{eff(cap2, 'estimated_price')} 원</div></div>
          <div className="kv"><div className="kv-key">예정가격 범위</div>
            <div className="kv-val kv-val-num">{eff(cap2, 'price_range')}</div></div>
          <div className="kv"><div className="kv-key">A값</div>
            <div className="kv-val kv-val-num">{eff(cap2, 'a_value')} 원</div></div>
          <div className="kv"><div className="kv-key">순공사원가</div>
            <div className="kv-val kv-val-num">{eff(cap2, 'pure_construction_cost')} 원</div></div>
          <div className="kv"><div className="kv-key">낙찰하한율</div>
            <div className="kv-val kv-val-num" style={{ color: 'var(--navy-800)' }}>
              {eff(cap3, 'lower_bound_rate')} %</div></div>
          <div className="kv"><div className="kv-key">추천 사정률</div>
            <div className="kv-val kv-val-num">
              {eff(cap4, 'recommend_rate_start')} ~ {eff(cap4, 'recommend_rate_end')} %</div></div>
          <div className="kv"><div className="kv-key">1순위 사정률</div>
            <div className="kv-val kv-val-num" style={{ color: 'var(--navy-800)' }}>
              {eff(cap5, 'primary_target_rate')} %</div></div>
          <div className="kv"><div className="kv-key">적용 사정률</div>
            <div className="kv-val kv-val-num" style={{ color: 'var(--green-600)' }}>
              {appliedRate != null ? appliedRate.toFixed(3) + ' %' : '-'}</div></div>
          <div className="kv"><div className="kv-key">추천 투찰률</div>
            <div className="kv-val kv-val-num">{eff(cap4, 'recommended_bid_rate')} %</div></div>
          {appliedReason && (
            <div style={{
              fontSize: 11, color: 'var(--ink-500)', marginTop: 8,
              padding: '6px 10px', background: 'var(--navy-50)',
              borderRadius: 6, lineHeight: 1.4,
            }}>
              ℹ {appliedReason}
            </div>
          )}
        </div>

        {/* ── Card 5: OCR verification ── */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">5</span>
            OCR 검증 결과
            <span className="pill pill-info" style={{ marginLeft: 'auto' }}>
              5장 / {totalCorr + totalEdits}건 변경
            </span>
          </div>
          {captures.flatMap((cap) =>
            cap.corrections.map((corr) => {
              const f = cap.fields.find((x) => x.key === corr.field);
              const userVal = userVals[cap.id]?.[corr.field];
              const aiVal = cap.ai[corr.field];
              const finalVal = (userVal !== undefined && userVal !== '') ? userVal : aiVal;
              return (
                <div key={`${cap.id}-${corr.field}`} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 4 }}>
                    캡처 {cap.id} · {f?.label || corr.field}
                  </div>
                  <div className="diff-row">
                    <div className="diff-label">OCR 원문</div>
                    <div className="diff-val raw">{corr.from}</div>
                  </div>
                  <div className="diff-row">
                    <div className="diff-label">AI 보정</div>
                    <div className="diff-val ai">{corr.to}</div>
                  </div>
                  <div className="diff-row">
                    <div className="diff-label">사용자</div>
                    <div className="diff-val user">{userVal !== undefined && userVal !== '' ? userVal : '— (변경 없음)'}</div>
                  </div>
                  <div className="diff-row">
                    <div className="diff-label">최종 적용</div>
                    <div className="diff-val final">{finalVal}{f?.unit ? ` ${f.unit}` : ''}</div>
                  </div>
                </div>
              );
            })
          )}
          {totalCorr === 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-500)', padding: '12px 0' }}>
              자동 보정된 항목이 없습니다.
            </div>
          )}
        </div>

        {/* ── Card 6: Formula ── */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">6</span>
            계산식
          </div>
          <div className="formula">
            <div className="formula-line">
              <span>기초금액</span>
              <span className="num">{eff(cap2, 'base_price')}</span>
            </div>
            <div className="formula-line">
              <span className="formula-op">× 적용 사정률</span>
              <span className="num">{appliedRate != null ? appliedRate.toFixed(3) + '%' : '-'}</span>
            </div>
            <div className="formula-line">
              <span className="formula-op">× 낙찰하한율</span>
              <span className="num">{!isNaN(lowerBound) ? lowerBound.toFixed(3) + '%' : '-'}</span>
            </div>
            <div className="formula-line formula-eq">
              <span style={{ fontWeight: 700, color: 'var(--red-600)' }}>= 예상 투찰</span>
              <span className="formula-val">
                {expected != null ? formatNum(expected) + '원' : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Card 7: OCR confidence ── */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">7</span>
            OCR 신뢰도
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="conf-bar">
                <div className="conf-fill" style={{ width: `${confidencePct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                            fontSize: 10, color: 'var(--ink-400)' }}>
                <span>낮음</span><span>보통</span><span>높음</span>
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: confidenceColor }}>
              {confidenceLabel}
            </div>
          </div>
          <div className="kv"><div className="kv-key">OCR 상태</div>
            <div className="kv-val ok-text">success</div></div>
          <div className="kv"><div className="kv-key">처리 이미지</div>
            <div className="kv-val">5 / 5장</div></div>
          <div className="kv"><div className="kv-key">자동 숫자 보정</div>
            <div className="kv-val">{totalCorr}건</div></div>
          <div className="kv"><div className="kv-key">사용자 직접 수정</div>
            <div className="kv-val">{totalEdits}건</div></div>
          <div className="kv"><div className="kv-key">누락 데이터</div>
            <div className="kv-val">{hasAll ? '없음' : '있음'}</div></div>
        </div>

        {/* Safety notice */}
        <div style={{
          padding: 14, borderRadius: 10, background: '#fff7e6',
          border: '1px solid #f5d490', fontSize: 11, color: '#92590f',
          lineHeight: 1.6,
        }}>
          본 결과는 비드큐 캡처 이미지에서 OCR로 추출한 데이터를 기반으로 계산한
          <b> 참고용 시뮬레이션</b>입니다.
          OCR 인식 오류 또는 원문 데이터 누락이 있을 수 있으므로,
          최종 투찰 전 반드시 조달청 원문과 비드큐 원문을 직접 확인하세요.
          본 앱은 실제 낙찰 결과를 보장하지 않습니다.
        </div>
      </div>

      {/* ── Card 8: Bottom action bar ── */}
      <div className="app-footer">
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={() => onInspect(0)}>
            🔍 원문 보기
          </button>
          <button className="btn btn-secondary"
                  onClick={() => navigator.clipboard?.writeText(JSON.stringify({
                    expected_bid_price: expected,
                    base_price: basePrice,
                    applied_rate: appliedRate,
                    lower_bound_rate: lowerBound,
                  }, null, 2))}>
            📋 데이터 복사
          </button>
        </div>
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={onReanalyze}>
            ↻ 다시 분석
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            📄 PDF 저장
          </button>
        </div>
      </div>
    </div>
  );
}

window.ResultScreen = ResultScreen;
