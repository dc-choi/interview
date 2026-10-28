---
tags: [security, web-attacks, capability-url, share-link, dns, privacy]
status: done
verified_at: 2026-10-27
category: "Security - 웹 공격"
aliases: ["Capability URL", "Capability URL Exposure", "공유 링크 노출", "공유 링크의 노출 경로", "Passive DNS 노출"]
---

# 공유 링크(Capability URL)의 노출 경로

Capability URL은 URL을 가진 사람이면 누구에게나 자원 접근을 허용하는 주소다. 계정 없이 여는 문서 공유 링크와 일회용 비밀번호 재설정 링크가 이에 해당하며, URL 자체가 접근 권한이다. 서버가 요청자의 권한을 확인하지 않는 결함인 [[IDOR]]와 달리 처음부터 소유만으로 접근하도록 설계한 방식이므로, 안전성은 URL이 어디까지 퍼지는지에 달려 있다. 추측하기 어려운 식별자는 무작위 대입을 막을 뿐 URL이 다른 경로로 새는 것은 막지 못한다.

## URL이 새는 경로

W3C TAG의 2014-02-18 초안(Good Practices for Capability URLs, TAG 의견 문서를 목표로 하며 W3C 권고안이 될 문서는 아니다)은 capability URL을 대체로 비밀로 유지할 수 없다고 보고 다음 경로를 든다.

- 주소창에서 쉽게 복사되고, 서버 로그와 브라우저 기록에 남는다.
- 페이지가 링크한 다른 사이트가 `Referer` 헤더로 받는다.
- 페이지의 서드파티 스크립트, 기록 동기화 서비스와 브라우저 툴바가 볼 수 있다.
- 전달 경로의 중개자가 본다. URL 단축 서비스를 거쳐 공유되는 경우가 예다.
- 검색 엔진이 수집하면 검색 결과에 나올 수 있다.

정상 접근과 부정 접근을 구별할 단서가 없어 오용을 알아채기 어렵고, 한 URL을 여러 사람에게 줬다면 폐기가 모두에게 영향을 준다.

## 호스트 이름에 넣은 값은 DNS와 네트워크 기록에 남을 수 있다

2026-10 Meta의 개인 AI 에이전트 Muse 사례는 URL의 경로가 아니라 호스트 이름에 정보를 넣었을 때의 노출을 보여 준다. 공유 링크마다 대화 제목과 무작위 식별자를 이은 호스트 이름을 `cf.metaaiusercontent.com` 아래에 만들었다. 누군가 처음 링크를 열면 무작위 식별자를 포함한 호스트 이름 전체가 DNS 조회에 실린다. 패시브 DNS 업체는 자기 리졸버가 관찰한 조회를 모아 검색할 수 있게 하므로, 그런 리졸버를 거친 조회는 데이터셋에 남을 수 있다. 2026-10-27 발견 기업의 글을 대조한 내용이다.

- **규모:** 보안 업체 Claroc은 상용 패시브 DNS 데이터셋에 콘텐츠 도메인으로 한 번 질의하고 와일드카드 DNS 스캔 잡음을 걸러 낸 뒤 6,800개 넘는 공유 호스트 이름을 얻었다. 누구나 조회할 수 있는 공개 URL 스캔 서비스에도 Muse 공유 페이지의 저장된 스캔이 75건 넘게 있었다. 추측이나 무작위 대입은 하지 않았다.
- **내용:** 계정 없이 일반 브라우저로 수백 개만 열었고, 소규모 사업자의 대출 신청서, 회사 내부 매출 검토, 일부 계좌번호가 보이는 은행 사기 경고, 직원 연간 휴가표 등이 보였다.
- **대응과 남은 기록:** 10-08 Meta 버그 바운티로 제보했고 10-18 글을 공개했다. 10-20 Meta는 Ars Technica의 문의 뒤 공유 기능을 중단한다고 밝혔다. 같은 날 앞서 계정 없이 열렸던 공유 40개를 다시 확인하니 모두 열리지 않았지만, 제목이 든 호스트 이름은 패시브 DNS 기록에 그대로 남았다.
- **robots.txt의 한계:** Muse의 `robots.txt`는 공유 경로를 수집하지 말라고 요청했지만, `robots.txt`는 수집을 다룰 뿐 접근을 통제하지 않는다.

무작위 식별자의 길이는 추측을 막지만, 기반 시설이 이름을 기록하고 검색 가능하게 만드는 경로에서는 보호가 되지 않는다. 호스트 이름은 비밀이 아니다. 제목처럼 내용을 설명하는 값은 링크를 지운 뒤에도 DNS 기록에서 지울 수 없다(이 문서의 해석).

호스트 이름은 DNS 밖에서도 드러난다. TLS 1.3에서도 ClientHello의 SNI(Server Name Indication)는 평문이므로 ECH(Encrypted Client Hello, RFC 9849)를 쓰지 않으면 경로상의 관찰자가 볼 수 있고, 연결을 중계하는 프록시와 네트워크 장비의 기록에도 남을 수 있다. 호스트마다 공개 인증서를 발급하면 그 이름이 인증서 투명성(CT) 로그에 공개된다. Chrome은 일부 기업 정책 예외를 빼면 CT 정책을 충족하지 않는 인증서를 검증에서 거부하므로, Chrome에서 열리는 공개 인증서는 CT 로그를 거친다. 와일드카드 인증서는 CT에 개별 호스트 이름을 남기지 않지만 DNS와 SNI 노출은 그대로다.

## 설계 점검

W3C TAG 초안의 권고는 다음과 같다.

- 기본 선택지로 쓰지 않고 계정 기반 접근을 먼저 검토한다.
- `https` URL만 쓴다.
- 일회용이나 기간 제한으로 만료시키고, 만료된 URL에는 `410 Gone`이나 `404 Not Found`로 응답한다.
- UUID 같은 추측하기 어려운 값으로 만든다.
- 신뢰하지 않는 서드파티 링크를 두지 않거나 `rel="noreferrer"`를 붙인다. 헤더 수준의 송신 정책은 [[Security-Headers|Referrer-Policy]]로 정한다.
- 자원 하나에 URL을 여러 개 만들 수 있게 해, 하나를 폐기해도 다른 수신자에게 영향이 없게 한다.
- `robots.txt`에는 경로만 적고 개별 URL은 적지 않는다.
- URL에는 동작이 아니라 접근 권한을 담고, GET 요청으로 삭제나 변경이 일어나지 않게 한다.
- 수신자가 그 URL로 무엇을 할 수 있는지 사용자에게 알린다.

초안의 UUID 예시에는 단서가 필요하다. 2024-05 UUID 표준 RFC 9562(RFC 4122 대체)는 구현이 UUID를 추측하기 어렵다고 가정하지 말아야 하고(SHOULD NOT), 소유만으로 접근을 주는 보안 capability로 써서는 안 된다고(MUST NOT) 규정한다. v1과 v6는 시각과 노드 값으로 만들고, v7은 48비트 밀리초 timestamp 뒤의 74비트를 난수나 단조 증가 카운터로 채울 수 있다. 보안 용도에 UUID가 꼭 필요하면 122비트를 무작위로 채우는 v4를 쓰라고 권한다(SHOULD).

이 문서의 적용 제안은 다음과 같다.

- 토큰은 UUID 형식에 기대지 않고 CSPRNG에서 직접 뽑은 난수로 만든다(예: 32바이트를 base64url로 인코딩). UUID를 써야 한다면 CSPRNG로 만든 v4만 쓰되, 표준이 이를 보안 속성으로 보장하지 않으므로 만료와 폐기를 함께 둔다.
- 식별자와 제목, 파일 이름처럼 내용을 드러내는 값을 호스트 이름에 넣지 않는다. 호스트 이름은 DNS, SNI와 인증서 로그로 드러난다. 경로나 쿼리에 둔 값도 위의 로그, Referer와 스크립트 경로로 새므로, 민감한 자료는 공유 링크가 아니라 인증된 공유로 다룬다.
- 공유를 끄거나 지우면 콘텐츠 접근만 막힌다. DNS 기록, 스캔 서비스와 보관소에 남은 이름과 사본은 그대로이므로, 사고 대응에서 공유 페이지를 보존한 외부 서비스까지 확인한다.
- 조직이 쓰는 도구의 공유 기능을 목록화하고 공개 공유의 생성을 감시한다. Claroc도 사용자를 파악하고, 공유 링크가 공개 페이지가 된다는 점을 알리며, 공개 공유를 외부 전송으로 감시하고, 볼 수 없다면 관리 기기에서 해당 도메인을 임시로 차단하라고 권했다.

## 출처

- [W3C, Good Practices for Capability URLs (TAG First Public Working Draft, 2014-02-18)](https://www.w3.org/TR/capability-urls/)
- [IETF, RFC 9562: Universally Unique IDentifiers (UUIDs)](https://www.rfc-editor.org/rfc/rfc9562.html) — 2024-05. 2026-10-27 5.1, 5.4, 5.6, 5.7절의 버전별 구성과 8절 보안 고려사항 대조
- [IETF, RFC 9849: TLS Encrypted Client Hello](https://www.rfc-editor.org/rfc/rfc9849.html) — 2026-03. 2026-10-27 1절의 평문 SNI 노출과 ECH의 한계 대조
- [IETF, RFC 9162: Certificate Transparency Version 2.0](https://www.rfc-editor.org/rfc/rfc9162.html) — 인증서의 공개 기록
- [Chrome, Certificate Transparency Policy](https://googlechrome.github.io/CertificateTransparency/ct_policy.html) — 2026-10-27 CT 정책 미충족 인증서의 검증 실패 대조
- [GhostShares: A Shared Muse Chat Exposed Prep for a Confidential Call With a Frontier AI Lab Leader — Claroc](https://blog.claroc.io/ghostshares-muse-passive-dns/) — 2026-10-18 공개, 10-20 갱신. 2026-10-27 링크 구조, 조회 방법, 확인 범위와 제보 경과 대조

## 관련 문서

- [[IDOR|IDOR (추측하기 어려운 식별자와 서버 측 인가)]]
- [[Grafana-Shared-Dashboard-Security|Grafana 공유 대시보드 보안]] — 공유 토큰의 일시정지와 폐기
- [[Security-Headers|보안 헤더]] — Referrer-Policy
- [[Security-Incident-Response|보안 사고 대응]]
