// result.jsx — Final result dashboard (v2: single capture + AI analysis)
// 9 cards. Helpers + sub-cards live in result-utils.js & result-parts.jsx.

function ResultScreen({ capture, userVals, analysis, analysisError,
                        onBack, onReanalyze, onInspect, onRunAnalysis }) {
  // Resolve effective values (user override > AI extracted)
  const eff = (key) => {
    const u = userVals[key];
    return u !== undefined && u !== '' ? u : (capture.ai[key] ?? '');
  };

  const basePrice  = parseAmount(eff('base_price'));
  const lowerBound = parseAmount(eff('lower_bound_rate'));

  const hasRequired = !isNaN(basePrice) && !isNaN(lowerBound);
  const strategies = analysis?.strategies;
  const recommendation = analysis?.recommendation || 'middle';
  const recRate = strategies?.[recommendation]?.rate;
  const recBidPrice = hasRequired && recRate != null
    ? bidPrice(basePrice, recRate, lowerBound) : null;

  const corrections = capture.corrections || [];
  const editCount = Object.keys(userVals).filter((k) => {
    const ai = capture.ai[k] ?? '';
    return (userVals[k] ?? ai) !== ai;
  }).length;

  // Confidence
  const confidence = !hasRequired ? 'low'
    : corrections.length > 2 ? 'medium' : 'high';
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
            {eff('notice_no') || '-'} · {eff('business_type') || ''}
          </div>
        </div>
      </div>

      <div className="app-body">

        {/* Card 1: Status */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasRequired
            ? <span className="pill pill-ok">✓ 분석 완료</span>
            : <span className="pill pill-error">❌ 필수 데이터 누락</span>}
          {analysis && <span className="pill pill-info">AI 유사공사 {analysis.similar_count}건 분석</span>}
          {corrections.length > 0 && (
            <span className="pill pill-warn">⚠ 자동 보정 {corrections.length}건</span>
          )}
          {editCount > 0 && (
            <span className="pill pill-info">✎ 직접 수정 {editCount}건</span>
          )}
          {analysisError && (
            <span className="pill pill-error">AI 분석 오류</span>
          )}
        </div>

        {/* Card 2: 3-tier strategy hero */}
        {hasRequired && strategies ? (
          <StrategyHero
            basePrice={basePrice}
            lowerBound={lowerBound}
            strategies={strategies}
            recommendation={recommendation}
          />
        ) : (
          <div className="result-hero">
            <div className="result-hero-label">최종 예상 투찰 금액</div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: 'var(--red-500)',
              padding: '12px 0', lineHeight: 1.5,
            }}>
              {!hasRequired ? '계산 불가' : 'AI 분석 미실행'}<br />
              <span style={{ fontSize: 13, fontWeight: 500,
                             color: 'rgba(255,255,255,0.75)' }}>
                {!hasRequired
                  ? '기초금액 · 낙찰하한율이 필요합니다.'
                  : '유사공사 분석이 아직 실행되지 않았습니다.'}
              </span>
            </div>
            {hasRequired && !strategies && onRunAnalysis && (
              <button className="btn"
                      onClick={onRunAnalysis}
                      style={{ marginTop: 10, background: 'rgba(255,255,255,0.2)',
                               color: '#fff', height: 40 }}>
                AI 분석 실행하기
              </button>
            )}
          </div>
        )}

        {analysis?.recommendation_reason && (
          <div style={{
            padding: 12, borderRadius: 10, background: 'var(--navy-50)',
            border: '1px solid var(--navy-100)', fontSize: 12,
            color: 'var(--navy-800)', lineHeight: 1.55,
          }}>
            <b>{({conservative:'보수형',middle:'중간형',aggressive:'공격형'})[recommendation]}</b>을
            추천하는 이유: {analysis.recommendation_reason}
          </div>
        )}

        {/* Card 3: Notice info */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">3</span>
            공고 정보
          </div>
          {[
            ['공고번호', 'notice_no'],
            ['공고명', 'title'],
            ['발주기관', 'ordering_agency'],
            ['수요기관', 'demand_agency'],
            ['업종', 'business_type'],
            ['지역제한', 'region_limit'],
            ['입찰마감', 'deadline'],
            ['개찰일시', 'opening_datetime'],
          ].map(([label, key]) => (
            <div key={key} className="kv">
              <div className="kv-key">{label}</div>
              <div className="kv-val" style={{
                fontSize: key === 'title' ? 13 : 14,
                fontVariantNumeric: 'tabular-nums',
              }}>{eff(key) || '-'}</div>
            </div>
          ))}
        </div>

        {/* Card 4: Calc info */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">4</span>
            조달청 계산 정보
          </div>
          <div className="kv">
            <div className="kv-key">기초금액</div>
            <div className="kv-val kv-val-num" style={{ color: 'var(--navy-800)' }}>
              {eff('base_price') || '-'}{eff('base_price') && ' 원'}</div>
          </div>
          <div className="kv">
            <div className="kv-key">추정가격</div>
            <div className="kv-val kv-val-num">{eff('estimated_price') || '-'}{eff('estimated_price') && ' 원'}</div>
          </div>
          <div className="kv">
            <div className="kv-key">예정가격 범위</div>
            <div className="kv-val">{eff('price_range') || '-'}</div>
          </div>
          <div className="kv">
            <div className="kv-key">A값</div>
            <div className="kv-val kv-val-num">{eff('a_value') || '-'}{eff('a_value') && ' 원'}</div>
          </div>
          <div className="kv">
            <div className="kv-key">순공사원가</div>
            <div className="kv-val kv-val-num">{eff('pure_construction_cost') || '-'}{eff('pure_construction_cost') && ' 원'}</div>
          </div>
          <div className="kv">
            <div className="kv-key">낙찰하한율</div>
            <div className="kv-val kv-val-num" style={{ color: 'var(--navy-800)' }}>
              {eff('lower_bound_rate') || '-'}{eff('lower_bound_rate') && ' %'}</div>
          </div>
          <div className="kv">
            <div className="kv-key">투찰률 범위</div>
            <div className="kv-val kv-val-num">{eff('bid_rate_range') || '-'}{eff('bid_rate_range') && ' %'}</div>
          </div>
          {recRate != null && (
            <div className="kv">
              <div className="kv-key">적용 사정률 (추천)</div>
              <div className="kv-val kv-val-num" style={{ color: 'var(--green-600)' }}>
                {recRate.toFixed(3)} %
              </div>
            </div>
          )}
        </div>

        {/* Card 5: Similar-work AI analysis */}
        <SimilarWorkCard analysis={analysis} />

        {/* Card 6: OCR verification */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">6</span>
            OCR 검증 결과
            <span className="pill pill-info" style={{ marginLeft: 'auto' }}>
              {corrections.length + editCount}건 변경
            </span>
          </div>
          {corrections.length === 0 && editCount === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-500)',
                          padding: '12px 0' }}>
              자동 보정·직접 수정 항목이 없습니다.
            </div>
          ) : (
            <>
              {corrections.map((corr) => {
                const f = capture.fields.find((x) => x.key === corr.field);
                const userVal = userVals[corr.field];
                const aiVal = capture.ai[corr.field];
                const finalVal = (userVal !== undefined && userVal !== '') ? userVal : aiVal;
                return (
                  <div key={corr.field} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700,
                                  color: 'var(--ink-900)', marginBottom: 4 }}>
                      {f?.label || corr.field}
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
                      <div className="diff-val user">
                        {userVal !== undefined && userVal !== '' ? userVal : '— (변경 없음)'}
                      </div>
                    </div>
                    <div className="diff-row">
                      <div className="diff-label">최종 적용</div>
                      <div className="diff-val final">
                        {finalVal}{f?.unit ? ` ${f.unit}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Show user edits without auto-corrections */}
              {Object.keys(userVals).map((key) => {
                if (corrections.find((c) => c.field === key)) return null; // already shown
                const ai = capture.ai[key] ?? '';
                const u = userVals[key];
                if (u === ai || u == null) return null;
                const f = capture.fields.find((x) => x.key === key);
                return (
                  <div key={key} style={{
                    marginBottom: 8, paddingBottom: 8,
                    borderBottom: '1px dashed var(--ink-200)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700,
                                  color: 'var(--ink-900)' }}>
                      {f?.label || key} <span style={{ fontSize: 10,
                                                       color: 'var(--orange-500)' }}>· 직접 수정</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>
                      AI: {ai || '-'} → 사용자: <b style={{ color: 'var(--orange-600)' }}>{u}</b>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Card 7: Formula */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">7</span>
            계산식 ({({conservative:'보수형',middle:'중간형',aggressive:'공격형'})[recommendation]})
          </div>
          <div className="formula">
            <div className="formula-line">
              <span>기초금액</span>
              <span className="num">{eff('base_price') || '-'}</span>
            </div>
            <div className="formula-line">
              <span className="formula-op">× 적용 사정률</span>
              <span className="num">{recRate != null ? recRate.toFixed(3) + '%' : '-'}</span>
            </div>
            <div className="formula-line">
              <span className="formula-op">× 낙찰하한율</span>
              <span className="num">{!isNaN(lowerBound) ? lowerBound.toFixed(3) + '%' : '-'}</span>
            </div>
            <div className="formula-line formula-eq">
              <span style={{ fontWeight: 700, color: 'var(--red-600)' }}>= 예상 투찰</span>
              <span className="formula-val">
                {recBidPrice != null ? formatNum(recBidPrice) + '원' : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 8: OCR confidence */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-num">8</span>
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
          <div className="kv">
            <div className="kv-key">OCR 상태</div>
            <div className="kv-val ok-text">{capture.real ? 'success (Claude vision)' : 'demo'}</div>
          </div>
          <div className="kv">
            <div className="kv-key">자동 숫자 보정</div>
            <div className="kv-val">{corrections.length}건</div>
          </div>
          <div className="kv">
            <div className="kv-key">사용자 직접 수정</div>
            <div className="kv-val">{editCount}건</div>
          </div>
          <div className="kv">
            <div className="kv-key">누락 데이터</div>
            <div className="kv-val">{hasRequired ? '없음' : '있음'}</div>
          </div>
        </div>

        {/* Safety notice */}
        <div style={{
          padding: 14, borderRadius: 10, background: '#fff7e6',
          border: '1px solid #f5d490', fontSize: 11, color: '#92590f',
          lineHeight: 1.6,
        }}>
          본 결과는 비드큐 캡처 이미지 OCR + AI 통계 추정 기반
          <b> 참고용 시뮬레이션</b>입니다.
          유사 공사 분석 데이터는 AI가 추정한 패턴이며 실제 개찰 결과를 보장하지 않습니다.
          최종 투찰 전 반드시 조달청 원문과 나라장터 원문을 직접 확인하세요.
        </div>
      </div>

      {/* Card 9: Bottom actions */}
      <div className="app-footer">
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={onInspect}>
            🔍 원문 보기
          </button>
          <button className="btn btn-secondary"
                  onClick={() => {
                    const payload = {
                      notice: { notice_no: eff('notice_no'), title: eff('title') },
                      base_price: basePrice,
                      lower_bound: lowerBound,
                      analysis,
                      bid_prices: strategies && Object.fromEntries(
                        Object.entries(strategies).map(([k, s]) => [
                          k, bidPrice(basePrice, s.rate, lowerBound),
                        ]),
                      ),
                    };
                    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
                  }}>
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
