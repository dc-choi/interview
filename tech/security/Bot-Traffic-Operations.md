---
tags: [security, crawler, rate-limit, observability]
status: done
verified_at: 2026-10-27
category: "보안(Security)"
aliases: ["Bot Traffic Operations", "봇 트래픽 운영"]
---

# 봇 트래픽의 관측과 제한

사용자 분석 도구의 방문 수와 서버가 처리한 요청 수는 다르다. JavaScript를 실행하지 않는 크롤러는 페이지 분석에 잘 드러나지 않으면서 서버 자원을 소비할 수 있다.

## 부하를 설명하는 근거

인증 사용자 수만으로 부하를 추정하지 않고 경로별 요청, 응답 코드, 처리 시간, 전송량과 서버 자원을 연결한다. 특정 User-Agent를 봤다는 사실만으로 요청자의 신원을 확정하지 않는다. 정상 검색 유입과 반복 수집, 취약점 탐색을 요청 패턴과 실제 비용으로 구분한다.

`robots.txt`는 협조하는 크롤러에 대한 요청이지 접근 차단 장치가 아니다. 인증이 필요한 데이터는 인증/인가로, 비용이 큰 공개 경로는 캐시와 요청 제한 등 서버 측 제어로 보호한다. 제한 단위는 IP 하나에 고정하기보다 공유망 사용자와 우회 가능성도 고려한다.

## CAPTCHA 결과와 서버의 처리 결정을 분리한다

reCAPTCHA v2의 체크박스 방식은 클릭 뒤 바로 통과시키거나 추가 문제를 제시할 수 있다. v3는 사용자에게 문제를 풀게 하지 않고 상호작용의 위험을 점수로 반환한다. 따라서 체크박스를 눌렀다는 화면 상태와 실제 서버 검증 성공을 같은 것으로 취급하지 않는다.

v3의 점수는 1.0에 가까울수록 정상 상호작용일 가능성이 높고, 0.0에 가까울수록 봇일 가능성이 높다는 신호다. 서버는 점수와 요청의 맥락에 따라 추가 인증, 검토나 제한 여부를 정한다. `action`별 실제 트래픽을 관찰해 임계값을 조정하며, 하나의 임계값을 모든 경로에 고정하거나 점수를 사람이라는 확정 증명으로 해석하지 않는다. 마우스 궤적이나 쿠키 하나가 통과 여부를 결정한다는 단정도 공개된 API 계약만으로 뒷받침할 수 없다.

### 토큰의 유효성과 요청 맥락을 함께 검사한다

Google의 `siteverify` 방식에서는 클라이언트가 받은 토큰을 백엔드가 검증한다. 응답 토큰은 2분 동안 유효하고 한 번만 검증할 수 있다. v3로 특정 행동을 보호한다면 페이지가 열릴 때 미리 발급받기보다 실제 행동 시점에 `execute`를 호출한다.

적용 점검: 서버 검증의 성공 여부, v3의 점수와 예상한 `action`을 확인하고, 반환된 `hostname`도 서비스가 허용한 호스트와 대조한다. 토큰 만료와 중복 사용은 새 토큰이 필요한 상태로 처리하며, CAPTCHA 통과 뒤에도 인증/인가와 요청 제한은 별도로 적용한다. 정상 사용자 오류와 차단 효과를 함께 관측한다.

2026-10-27 Google의 웹 reCAPTCHA v2/v3와 `siteverify` 공식 문서를 대조했다. 특정 사이트의 판정 신호별 가중치나 공격 성공률, 실제 통합 동작을 검증한 것은 아니다. 아래 서비스 운영자의 경험 사례는 별도의 관측 근거로 유지한다.

## 공개 서비스의 관측 사례

2026-10-14 제공 발췌를 서비스 운영자의 공개 글과 2026-10-16에 대조했다. sprinklz.io는 Hacker News 소개 뒤 로그인 사용자는 적은데 부하가 지속돼 경로별 로그와 NGINX 집계를 확인했다. 주요 요청이 뉴스 API나 화면 JavaScript를 사용하지 않았고, 거의 절반이 한 반복 수집 서비스에서 나왔다는 운영자의 관측이다.

해당 서비스 차단, `robots.txt`, rate limit과 인프라 개선을 적용했다고 설명한다. 이는 특정 사이트의 경험이며 전체 웹에서 AI 봇이 차지하는 비율이나 차단 효과의 일반 통계가 아니다. 로그 원본과 개선 전후 수치는 별도로 확보하지 않았다.

## 운영 점검

차단 전후의 원본 서버 부하, 오류율과 정상 사용자 지연을 함께 본다. 차단 규칙의 적중 수만 높아졌다고 성공을 판단하지 않는다. 악성 요청을 그대로 재생하는 검사는 승인된 격리 환경에서 수행한다.

## 출처

- [Google for Developers, Choosing the type of reCAPTCHA](https://developers.google.com/recaptcha/docs/versions)
- [Google for Developers, reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3)
- [Google for Developers, Verifying the user's response](https://developers.google.com/recaptcha/docs/verify)
- [I posted to HN, and then my website was flooded with AI BOT traffic — Sammy Straus](https://www.sammystraus.com/)
- [RFC 9309, Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)

## 관련 문서

- [[Rate-Limiting|요청 제한 설계]]
- [[Security-Incident-Response|사고 대응과 증거]]
