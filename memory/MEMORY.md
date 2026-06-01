# 낙찰 사이트 작업 메모

## 2026-06-02 실데이터 불일치 수정

- 배포 사이트: https://elsa9598.github.io/jodal_work/
- 프론트 구조: 빌드툴 없는 정적 React/Babel 앱. `index.html`이 `*.jsx`를 `type="text/babel"`로 직접 로드한다.
- 실데이터 프록시: Cloudflare Worker `https://judal-proxy.3dleader0128.workers.dev`.

### 확인한 문제

- 나라장터 공고 상세 API의 `presmptPrce`는 추정가격인데, 기존 Worker가 이것을 앱의 `base_price`/기초금액으로 사용했다.
- 예: `R26BK01532517` 이촌지하차도 공고는 추정가격 1,593,545,455원, 부가세 159,354,545원, 기초금액 1,752,900,000원인데 앱은 추정가격만 표시했다.
- `/analyze` 응답은 `avg_bid_rate`, `hot_range_low` 같은 실응답 필드를 주지만 프론트 화면은 `avg_adj`, `concentrated_range`, `buckets`를 기대해서 분석/시뮬레이션 값이 0으로 흐를 수 있었다.
- 분석 데이터가 백그라운드로 도착해도 `useMemo([notice])` 때문에 `makeSimilar()` 결과가 다시 계산되지 않는 화면이 있었다.
- 홈 화면은 "서울 토목·포장 전용"이라고 표시하면서 비토목 공고까지 첫 추천/최신 목록에 노출할 수 있었다.

### 반영한 로직

- Worker에서 공사기초금액 엔드포인트 `getBidPblancListInfoCnstwkBsisAmount`를 조회하도록 추가했다.
- 기초금액 엔드포인트가 빈값이면 `presmptPrce + VAT`를 `base_price` fallback으로 사용한다.
- 추정가격은 `estimated_price`/`estimated`에 따로 유지한다.
- 공사기초금액 응답이 있으면 `bssAmtPurcnstcst`를 순공사원가, 보험료/안전관리비 등 합계를 A값 후보로 채운다. 응답이 없으면 `null`로 둔다.
- 프론트 `live.jsx`에 `normalizeSimilar()`를 추가해 Worker 실분석 응답을 화면용 `avg_adj`, `concentrated_range`, `strategies`, `buckets` 형태로 변환한다.
- `analysis.jsx`, `simulation.jsx`는 분석 캐시 갱신 후 재렌더될 때 `makeSimilar()`를 다시 호출하도록 수정했다.
- `BucketBars`는 빈 분포 배열에서 깨지지 않고 "분석 분포 데이터 대기 중"을 보여준다.
- 홈 화면은 `civil === true` 공고가 있으면 토목·포장 공고만 우선 표시한다.

### 검증

- `wrangler deploy --dry-run` 통과.
- Worker 배포 완료.
- `/notice` 재검증: `R26BK01532517`의 `base_price`가 1,752,900,000원으로 반환됨.

### 남은 주의점

- 공사기초금액 API가 빈값인 공고는 A값/순공사원가가 계속 `null`일 수 있다. 이 경우 앱에서 "공고 원문 확인 필요" 표시를 강화하는 것이 안전하다.
- 현재 `/list`는 서울 전체 진행 공사를 가져오고, 토목·포장 여부는 `civil` 플래그와 프론트 필터로 제어한다.

## 2026-06-02 픽 추천 투찰가 기능

- 목적: 사용자가 잘 모르는 상태에서도 관심 공고를 하나 픽하면, 실낙찰 데이터 기반 추천 투찰가를 바로 볼 수 있게 한다.
- 핵심 계산 함수: `data.jsx`의 `getRecommendedBid(notice, sim)`.
- 추천값 정의: 과거 유사 낙찰 데이터의 추천 투찰률/집중 구간을 현재 공고의 기초금액·낙찰하한율에 대입한 참고 금액.
- 화면 반영:
  - `screens/detail.jsx`: 오른쪽 카드에 "낙찰 가능성 높은 후보 금액"을 크게 표시.
  - `screens/simulation.jsx`: 안정형/추천형/공격형 후보가 같은 추천 로직을 사용.
  - `screens/dashboard.jsx`: 시뮬레이션 없이 들어와도 기본 최종값이 `getRecommendedBid()` 결과를 사용.
- 용어 정책: "낙찰 보장"처럼 보이지 않게 "픽 추천", "참고값", "실낙찰 집중 구간"으로 표현한다.
- 신뢰도 표기: 실데이터 표본 30건 이상이면 높음, 8건 이상이면 보통, 그 미만은 대기.

## 2026-06-02 낙찰 알림 자동화

- 자동화 ID: `10-pdf`.
- 자동화 이름: `서울 토목·포장 10억 이하 공고 PDF 메일`.
- 실행 시각: 매일 오전 10시.
- 실행 위치: `D:\Claude_works\nakchal`.
- 조건: 서울 토목·포장 계열(`civil=true`), 진행중(`status != "closed"`), 기초금액 10억 원 이하.
- 데이터 소스: Cloudflare Worker `https://judal-proxy.3dleader0128.workers.dev/list`.
- 메일 발송: `D:\.env`의 `RESEND_API_KEY`를 사용하고 수신자는 `ALERT_EMAIL`, `RESEND_TO_EMAIL`, `TO_EMAIL` 순서로 찾는다. 키/시크릿 값은 출력 금지.
- 새 공고가 있으면 `reports/YYYY-MM-DD_공고번호_입찰요약.pdf`를 만들고 Resend로 Gmail에 발송한다.
- 새 공고가 없어도 `[입찰 알림] 오늘은 서울 토목·포장 10억 이하 새 공고 없음` 메일을 발송한다.
- 중복 방지: `memory/seen-under-1b-notices.json`에 발송 완료 공고번호를 기록한다.
- 노트북 방식 자동화라 매일 10시에 노트북 전원, 인터넷, Codex 자동화 실행 환경이 켜져 있어야 한다.

## 작업 운영 메모

- 이 낙찰 프로젝트에서는 메모, 자동화 설정 변경, 코드 변경처럼 보존 가치가 있는 작업을 하면 커밋·푸시까지 이어서 진행한다.
- 단, `.env`, API 키, 토큰, 시크릿 값은 절대 커밋하지 않는다.
