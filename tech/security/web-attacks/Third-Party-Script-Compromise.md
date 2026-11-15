---
tags: [security, web-attacks, third-party-script, supply-chain, csp, sri]
status: done
verified_at: 2026-11-15
category: "Security - 웹 공격"
aliases: ["Third-Party Script Compromise", "서드파티 스크립트 침해", "외부 스크립트 공급망 공격", "Third-Party JavaScript Management"]
---

# 서드파티 스크립트 침해

분석, 성능 측정, 채팅, 광고처럼 다른 회사가 호스팅하는 JavaScript를 `<script src>`로 페이지에 넣으면 그 코드는 자기 회사 코드와 같은 권한으로 실행된다. 공급자가 침해되면 공격자는 공급자의 파일만 바꿔서 그 스크립트를 쓰는 모든 사이트의 사용자 세션 안에서 코드를 실행할 수 있다. 스크립트의 원래 용도(속도 측정, 방문 집계)는 브라우저가 강제하는 권한 경계가 아니다.

패키지 설치와 빌드 단계의 공급망 공격은 [[Supply-Chain-Security|공급망 보안]]이 다룬다. 이 문서는 사용자의 브라우저가 실행 시점에 외부에서 받아 오는 스크립트를 다룬다.

## 권한은 용도가 아니라 실행 위치가 정한다

- **같은 권한** — 페이지에 직접 넣은 스크립트는 DOM을 읽고 바꾸며, 페이지가 이미 올려 둔 함수와 라이브러리를 호출하고, 로그인한 사용자의 세션으로 요청을 보낼 수 있다. OWASP는 서드파티 코드가 사용자에게 주어진 권한과 정확히 같은 권한으로 실행된다고 정리한다.
- **변경 통제 상실** — 공급자 서버의 파일이 바뀌면 다음 페이지 로드부터 바뀐 코드가 실행된다. 공급자 쪽 코드가 그대로 유지된다는 보장은 보통 없다.
- **검토 부재** — 호출하는 쪽이 공급자 코드를 검토하는 경우는 드물다. 처음 넣을 때 검토했더라도 위 이유로 지금 실행되는 코드와 같다는 보장이 없다.
- **정보 노출** — 브라우저가 공급자 서버에 직접 요청하므로 일반 HTTP 헤더, referrer와 그 공급자가 이전에 심어 둔 쿠키가 공급자에게 간다.

## 사례: 성능 측정 스크립트로 거래 세션을 쓴 침해

2026-10-29 예측 시장 Polymarket은 polymarket.com에 로드하던 서드파티 공급자의 스크립트가 침해됐다고 공지했다. 다음 날 사후 보고는 그것이 성능 모니터링 스크립트였고, 공격자가 그 스크립트를 Polymarket 사용자를 노린 코드로 바꿨고, 짧은 시간 동안 사이트를 열어 둔 일부 사용자의 활성 세션으로 포지션을 팔고 지갑에서 자금을 옮겼다고 설명했다.

| 항목 | 사후 보고의 내용 |
| --- | --- |
| 즉시 대응 | 침해된 스크립트 제거와 모든 캐시 삭제, 추가 유출을 막기 위한 거래와 relayer 중단, 모든 활성 로그인 세션 초기화 |
| 장애 시간 | 상태 페이지 기록 37분(17:38~18:15 UTC, Major outage 표시는 18:06까지) |
| 보상 | 유출된 지갑 환급과 강제 매도 포지션의 가치 보전(슬리피지 포함), 중단 중 손실 보전. 합계 3.9백만 달러(2.7백만 달러와 중단 관련 1.2백만 달러) |
| 재발 방지 계획 | 서드파티 스크립트를 무결성 통제와 지속 검증을 더해 재배포. 예시로 더 강한 CSP, 명시적인 버전 고정, 샌드박싱을 들었다 |

사후 보고는 공급자 이름, 영향받은 사용자 수와 지갑 유형, 거래 승인 요청이 화면에 떴는지를 밝히지 않았다. 언론과 보안 업체가 보도한 공급자 이름과 피해 지갑 수는 사후 보고에 없어 이 문서에 사실로 쓰지 않는다.

이 사례에서 일반화할 교훈은 공급자를 믿을 수 있느냐보다 그 코드가 무엇에 닿을 수 있느냐다. 속도를 재는 스크립트가 돈을 옮기는 코드와 같은 페이지, 같은 세션에서 실행되면 공급자 한 곳의 침해가 곧 거래 권한의 침해가 된다.

## 통제별로 막는 것과 못 막는 것

| 통제 | 막는 것 | 못 막는 것 |
| --- | --- | --- |
| CSP `script-src`, `connect-src` | 허용하지 않은 출처의 스크립트 로드와 연결 | 허용한 출처에서 온 바뀐 코드의 실행, 허용한 출처로 보내는 요청의 내용 |
| SRI(`integrity` 속성) | 검토한 파일과 해시가 다른 파일의 실행. 불일치하면 브라우저가 로드를 거부하고 네트워크 오류를 낸다 | 공급자가 파일을 정상 갱신할 때의 기능 중단, 처음부터 악성인 파일 |
| 버전 고정과 자체 호스팅(미러링) | 공급자 서버의 파일 교체가 곧바로 반영되는 것 | 고정한 버전 자체의 결함, 페이지 안에서 실행되는 동안의 권한 |
| 샌드박스 `iframe` | 호스트 페이지 DOM과 쿠키에 대한 직접 접근 | iframe 안 자체 기능의 악용, 잘못 연 sandbox 토큰 |
| 서버 측 수집 | 해당 수집을 브라우저 밖으로 빼 페이지 코드 수를 줄임 | 여전히 페이지에서 실행되는 다른 스크립트 |
| 데이터 레이어 | 공급자에게 넘길 값을 정하는 약속 | 페이지에서 실행되는 스크립트의 권한 제한. 데이터 레이어는 샌드박스가 아니다 |

- **CSP 허용 목록은 행위 단위가 아니다.** 연결을 허용한 출처라는 사실은 그 출처로 가는 모든 요청이 안전하다는 뜻이 아니다. 공급자 출처 자체가 침해되면 허용 목록은 공격을 통과시킨다. nonce, `strict-dynamic`과 지시어별 설정은 [[Security-Headers|보안 헤더]]와 [[NextJS-Content-Security-Policy|Next.js CSP와 nonce]]를 따른다.
- **SRI는 교차 출처 요청에 CORS가 필요하다.** `<script>`에 `crossorigin`을 붙이고 공급자가 CORS를 허용해야 하며, 교차 출처 `no-cors` 요청에서는 SRI가 항상 실패한다. 해시 접두사는 `sha256`, `sha384`, `sha512`를 쓴다. 공급자가 같은 URL의 파일을 갱신하면 안전하지만 동작하지 않는 상태가 될 수 있으므로 버전이 붙은 URL이나 자체 호스팅과 함께 쓴다.

```html
<script
  src="https://cdn.example.com/rum/v4.2.1/rum.min.js"
  integrity="sha384-<검토한 파일의 base64 해시>"
  crossorigin="anonymous"></script>
```

- **sandbox 토큰 조합을 확인한다.** 빈 `sandbox`는 모든 제한을 적용하고 토큰을 더할 때마다 제한이 풀린다. `allow-same-origin`이 없으면 내부 문서는 항상 동일 출처 정책에 실패하는 특수 출처로 다뤄진다. 내장 문서가 호스트 페이지와 같은 출처일 때 `allow-scripts`와 `allow-same-origin`을 함께 주면 내부 코드가 `sandbox` 속성을 제거할 수 있어 샌드박스가 없는 것과 같아진다.

## 설계 체크리스트

- 결제, 송금, 거래 승인, 인증 화면처럼 세션으로 돈이나 권한을 움직이는 페이지에는 측정과 마케팅 스크립트를 싣지 않거나, 싣는다면 샌드박스 iframe이나 별도 출처로 분리한다. 측정 범위가 약간 줄어드는 비용과 공급자 침해의 피해 범위를 비교한다.
- 서드파티 스크립트 목록에 공급자, 목적, 로드하는 페이지, 버전 고정 여부, SRI 적용 여부와 담당자를 둔다. 목적이 끝난 스크립트는 제거한다.
- 버전 없는 최신 URL은 공급자가 갱신할 때마다 해시가 어긋나 SRI를 유지하기 어렵다는 점을 기록하고 대신 쓸 통제(자체 호스팅, 격리)를 정한다.
- 사고 대응 절차에 스크립트 제거, 캐시 삭제(CDN과 서비스 워커 포함), 민감 기능의 일시 중단, 활성 세션 일괄 초기화를 넣는다. 위 사례의 사후 보고도 스크립트 제거와 캐시 삭제, 거래 중단, 세션 초기화를 조치로 들었다.
- CSP 위반 보고와 실제 로드되는 스크립트 해시의 변화를 모니터링해 공급자 파일 교체를 감지한다.

## 면접 체크포인트

- 성능 측정 스크립트가 거래를 실행할 수 있는 이유와 브라우저의 실제 권한 경계
- CSP 허용 목록, SRI, 버전 고정, 샌드박스가 각각 막는 단계의 차이
- SRI와 공급자의 무버전 URL 갱신이 충돌하는 지점
- `allow-scripts`와 `allow-same-origin` 조합의 위험
- 서드파티 침해 사고에서 세션 초기화와 캐시 삭제가 필요한 이유

## 출처

- [Security incident - 3rd party vendor compromised — Polymarket Status](https://status.polymarket.com/cmvvek1i90eme14ruga1z6tuj) — 2026-10-29 장애 기록과 2026-10-30 사후 보고. 언론이 보도한 공급자 이름과 피해 규모는 사후 보고에 없어 채택하지 않았다.
- [OWASP Cheat Sheet Series, Third Party JavaScript Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html)
- [MDN, Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [MDN, `<iframe>`: The Inline Frame element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) — `sandbox` 속성
- [How One Script Stole Millions From Polymarket — ByteMonk](https://www.youtube.com/watch?v=eynDCMF5Wmc) — 음성 전사 기반. 화면에 승인 요청이 떴다는 연구자 분석은 1차 출처로 확인하지 못해 쓰지 않았다.

## 관련 문서

- [[Supply-Chain-Security|공급망 보안]] — 설치와 빌드 단계의 공급망 공격
- [[XSS|XSS]] — 페이지 안에서 임의 스크립트가 실행될 때의 영향과 방어
- [[Security-Headers|보안 헤더]] — CSP와 다른 응답 헤더
- [[NextJS-Content-Security-Policy|Next.js CSP와 nonce]] — SRI와 CSP의 역할 구분
- [[NextJS-Third-Party-Integrations|Next.js 서드파티 통합]]
- [[웹공격(WebAttacks)|웹 공격 인덱스]]
