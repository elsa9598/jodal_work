# judal 실데이터 프록시 — 설정 가이드

조달청 나라장터 실낙찰 데이터로 분석하려면 아래 3단계가 필요합니다.
**완전 격리(B안)** 기준 — "오둥이 하루"·R2·기존 자산과 0 접점.

> 안 해도 앱은 동작합니다. 프록시 미설정 시 자동으로 로컬 통계 추정으로
> fallback 합니다 (UI에 "실데이터 미연동 — 통계 추정" 표기).

---

## 1. 조달청 나라장터 OpenAPI 키 발급 (무료, 필수)

핵심 데이터 소스. 이게 없으면 실데이터 분석 불가.

1. <https://www.data.go.kr> 로그인 (회원가입 무료)
2. 검색창에 **"나라장터 낙찰정보서비스"** → 상세 → **활용신청**
3. 같은 방식으로 **"나라장터 입찰공고정보서비스"** 도 활용신청
   (공고번호로 기초금액·하한율 공식 검증용)
4. 마이페이지 → 오픈API → 발급된 **일반 인증키(serviceKey)** 복사
   - 보통 신청 즉시~1시간 내 승인
   - 일일 트래픽 기본 1,000건 → 필요 시 "활용신청 변경"으로 상향(무료)

---

## 2. 별도 Cloudflare 계정 + Workers 전용 토큰 (B안 격리)

1. **새 이메일/계정**으로 <https://dash.cloudflare.com> 가입
   (기존 R2·cartoon-music 계정과 분리 → 나중에 통째 폐쇄해도 영향 0)
2. My Profile → **API Tokens** → Create Token
   → "Edit Cloudflare Workers" 템플릿 선택
   → 이 토큰은 Workers 외 자원(R2 등)엔 권한 없음
3. 토큰 문자열 복사 (이 채팅·repo 에 절대 붙여넣지 말 것)

---

## 3. 배포

PowerShell에서 `proxy/` 폴더 기준:

```powershell
npm i -g wrangler
$env:CLOUDFLARE_API_TOKEN = "<2단계에서 만든 Workers 전용 토큰>"
wrangler deploy
wrangler secret put JODAL_API_KEY
#  ↑ 프롬프트에 1단계 serviceKey 붙여넣기 (Worker 안에만 저장됨)
```

배포가 끝나면 출력되는 주소를 복사:

```
https://judal-proxy.<당신-계정>.workers.dev
```

이 주소를 프로젝트 루트 `config.js` 의 `JUDAL_PROXY_URL` 에 넣고
judal repo 에 커밋·푸시하면 끝. 모바일에서 실데이터 분석이 켜집니다.

```js
window.JUDAL_PROXY_URL = "https://judal-proxy.<당신-계정>.workers.dev";
```

---

## 나중에 완전 삭제 (B안의 장점)

```powershell
wrangler delete            # Worker 1개 제거 → 프론트는 자동 로컬 추정 전환
```

또는 Cloudflare 대시보드에서 그 계정 자체를 폐쇄.
어느 쪽이든 judal repo·"오둥이 하루"·R2 에 영향 없음.
`config.js` 의 `JUDAL_PROXY_URL` 만 `""` 로 되돌리면 흔적 0.

---

## 동작 점검

```powershell
curl -X POST https://judal-proxy.<계정>.workers.dev/notice `
  -H "Content-Type: application/json" `
  -d '{\"notice_no\":\"20251115-00834\"}'
```

`{ "notice": { ... } }` 가 오면 정상.
`{ "error": ... }` 면 SETUP.md 1~3 단계 키/토큰 재확인.

> 참고: 조달청 OpenAPI 는 서비스/버전에 따라 응답 필드명이 다를 수 있습니다.
> 키 발급 후 실제 응답을 보고 `worker.js` 의 `recordSajeongRate` /
> `fetchNotice` 필드 매핑을 한 번 보정해야 할 수 있습니다 (주석 표시됨).
