---
tags: [nodejs, security, release, patch-management]
status: done
verified_at: 2026-11-15
category: "OS & Runtime"
aliases: ["Node.js Security Release Triage", "Node.js 보안 릴리스 대응"]
---

# Node.js 보안 릴리스 대응

> 한 줄 요약: Node.js 보안 릴리스는 지원 중인 여러 릴리스 라인에 같은 날 나오지만 라인마다 수정 목록이 다르다. 릴리스 노트의 Notable Changes에 있거나 없다는 것만으로는 그 라인의 영향 여부도, 수정 여부도 확정하지 않는다. 영향 판단은 최신 보안 공지의 영향 라인에서 출발하고, 수정 반영 여부는 커밋 목록으로 확인한다. 적용 판단은 보안 공지의 영향 라인과 서비스가 실제로 쓰는 경로로 하고, 배포 완료는 실제 실행 버전과 검증 결과로 기록한다.

## 정의

Node.js 프로젝트는 보안 수정을 모아 지원 중인 릴리스 라인들에 동시에 패치 릴리스를 낸다. 2026-10-21 기준 지원 라인은 Current 26과 LTS 24, 22였고, 26은 2026-10-28 Active LTS로 넘어갔다. Node.js 27부터는 Current 전에 Alpha 단계가 생기므로 지원 라인 구성은 릴리스 일정표로 확인한다. 정보는 두 층으로 나온다.

| 문서 | 담는 내용 | 담지 않는 내용 |
|---|---|---|
| 보안 공지(`nodejs.org/en/blog/vulnerability/...`) | CVE별 심각도, 요약, 영향을 받는 릴리스 라인, 의존성 갱신 | 라인 안의 세부 영향 버전 범위 |
| 라인별 릴리스 노트(`nodejs.org/en/blog/release/vX.Y.Z`) | Notable Changes의 CVE 태그 수정, 그 밖의 변경과 커밋 목록 | 영향 버전 범위, 공격 조건, 재현 입력 |

공지는 지원 종료(End-of-Life) 버전이 보안 릴리스 때마다 영향을 받는 것으로 간주한다. 프로젝트는 EOL 라인에 수정을 내지 않으므로 기본 대응은 지원 라인으로 올리는 것이다. 공지는 Maintenance LTS를 지난 버전의 상용 지원을 OpenJS Ecosystem Sustainability Program 파트너를 통해 받을 수 있다고도 적는다.

## 라인별 목록 차이를 읽는 법

같은 날 나온 세 라인의 목록 길이가 다르면 짧은 목록을 영향이 적다는 뜻으로 읽기 쉽다. 차이의 원인은 여러 가지다.

- **취약 코드가 그 라인에 없다.** 기능이 최신 라인에만 있거나, 회귀가 특정 라인 이후에만 들어갔다.
- **수정이 CVE 태그 없이 커밋 목록에만 있다.** 공지에는 있는 CVE가 Notable Changes에 보이지 않을 수 있다.
- **반대로 태그만 있고 커밋이 없다.** Notable Changes가 CVE를 태그했지만 그 라인의 커밋 목록에 대응 커밋이 없는 경우가 있다(아래 2026-11-11 사례).
- **심각도 표기가 문서마다 다르다.** 릴리스 노트가 두 CVE를 한 줄로 묶어 높은 쪽 심각도만 붙이는 경우가 있다.

그래서 릴리스 노트만 보고 라인별 영향을 추정하지 않는다. 공지의 CVE별 영향 라인 표를 출발점으로 삼되 새 공지가 나오면 다시 읽고, 릴리스 노트와 커밋 목록은 그 수정이 실제로 실렸는지 대조하는 데 쓴다. 두 문서 모두에 근거가 없는 칸은 비워 두고 미확인으로 남긴다.

## 사례: 2026-10-21 보안 릴리스

2026-10-21 v26.12.1(Current), v24.22.1(LTS), v22.23.4(LTS)가 함께 나왔다. 공지의 최고 심각도는 High이고 CVE는 10개다.

| 수정 | 공지 심각도 | 공지의 영향 라인 | 릴리스 노트 |
|---|---|---|---|
| TLS의 비정규 IP 표기 거부(선행 0, 16진수, 축약 IPv4) CVE-2026-106069, CVE-2026-106072 | High, Medium | 26, 24, 22 | 세 라인 모두 한 줄에 묶여 High로 표기 |
| TLS IP 정규화 회귀 수정(전각 숫자 IP로 호스트 이름 검증 우회) CVE-2026-105483 | High | 26, 24 | 26.12.1, 24.22.1 |
| `dns.resolve*()`와 `dns.reverse()`의 NUL 문자 입력 검증 CVE-2026-105482 | High | 26, 24, 22 | 세 라인 |
| Brotli 디코더 범위 밖 쓰기 CVE-2026-111497 | High | 26, 24, 22 | 세 라인 |
| HTTP Agent keep-alive 소켓의 요청 전 응답 처리 CVE-2026-105481 | Medium | 26, 24, 22 | 세 라인 |
| `crypto.randomUUID()` 등 엔트로피 캐시가 `--build-snapshot` snapshot과 `useSnapshot` SEA에 저장되는 문제 CVE-2026-106074 | Medium | 26, 24, 22 | 세 라인 |
| `zlib.ZipFile`의 잘못된 ZIP local header 캐시 CVE-2026-106070 | Low | 26 | 26.12.1 |
| Permission Model 와일드카드 경로의 과다 허용 CVE-2026-106071 | Low | 26 | 세 라인 모두 CVE 태그 없음. 26.12.1 커밋 목록에 와일드카드 노드 수정 커밋이 있으나 CVE와의 대응은 커밋 제목으로 추정한 것이다. 10월 공지 기준이며 11월 공지는 세 라인으로 적는다(아래 사례) |
| Permission Model의 `fs.realpathSync` 우회 CVE-2026-106073 | Low | 26, 24, 22 | 세 라인 |

읽을 점은 다음과 같다.

- v22.23.4의 Notable Changes CVE 항목이 v26.12.1보다 적은 이유는 공지상 정규화 회귀와 ZIP 수정이 22 라인에 해당하지 않기 때문이다(10월 공지 기준으로 와일드카드 권한 수정도 22에 해당하지 않지만 어느 라인의 Notable Changes에도 없다). 22 라인이 덜 위험하다는 뜻이 아니며, 세 라인 공통의 High 수정은 똑같이 적용해야 한다.
- 정규화 회귀(CVE-2026-105483)는 이전 CVE 수정 뒤에 생긴 회귀로 공지에 적혀 있다. 비정규 IP 거부와 회귀 수정은 별도 항목이므로 TLS 검증도 둘을 나눠 확인한다.
- 공지는 공개 취약점 대응용 의존성 갱신으로 c-ares(26, 24, 22), ca-cert(eMudhra 중간 CA 침해), OpenSSL(24, 22), SQLite(22), undici(26, 24, 22)를 적는다. 릴리스 노트상 c-ares는 세 라인 모두 1.34.9, OpenSSL은 3.5.9, SQLite는 3.53.4이고 undici는 라인마다 버전이 다르다.
- 세 라인 모두 루트 인증서를 NSS 3.131.1로 갱신했고, 커밋 목록에는 차단된 공개키를 담은 인증서 체인을 거부하는 TLS 변경(#66871)도 있다. 둘 다 CVE 태그가 없고 공지와 릴리스 노트는 ca-cert 항목과의 대응을 적지 않지만, #66871은 차단 목록의 첫 항목이 2026-10 개인키 침해가 보고된 eMudhra/emSign 중간 인증서 8개이며 일치하면 `X509_V_ERR_CERT_REVOKED`로 보고한다고 밝힌다. 신뢰 저장소와 체인 거부 변경은 연결 실패 같은 별도 영향이 있으므로 TLS 수정과 따로 본다.
- CVE 태그 없는 변경도 라인마다 다르다. V8 backport(`JSON.parse` 관련)는 26과 24의 커밋 목록에 있고 비공개 보안 저장소를 거쳐 들어왔다(Notable Changes에는 26만). 26에는 ES 모듈 동기 로딩 변경의 revert가, 22에는 IPv6 호스트와 IP-Address SAN 대조 변경이 들어 있다. 회귀 검사 범위도 라인별로 잡는다.
- 목록 길이는 무엇을 세는지에 따라 반대가 된다. Notable Changes의 CVE 항목은 22가 26보다 적지만, 22의 커밋 목록은 SQLite 단계별 갱신 등으로 26보다 길다.

## 사례: 2026-11-11 보안 릴리스

3주 뒤 v26.13.1, v24.22.3, v22.23.5가 함께 나왔다. 공지의 최고 심각도는 세 라인 모두 High이고 공지에 적힌 CVE는 16개다. 위 사례와 달리 수정이 HTTP/2와 TLS에 몰렸다. 아래 표는 공지 기준이며, 릴리스 노트와는 아래에 적은 항목만 대조했다.

| 영역 | 공지의 주요 항목 (심각도, 영향 라인) |
|---|---|
| HTTP/2 | 원격에서 프로세스를 중단시키는 assertion 실패 CVE-2026-123863(High, 26, 24), 연결 종료 중 프로토콜 오류 뒤 세션 미정리 CVE-2026-123865(High, 세 라인), 스트림 정리 중 해제된 응답 메모리 전송 CVE-2026-123866(High, 세 라인), `respondWithFile()` 스트림의 use-after-free CVE-2026-123874(High, 26, 24) 외 Medium 3건 |
| HTTPS와 TLS | 길이 0인 TLS 쓰기가 `llhttp_execute()`에 재진입해 서버 힙 내용이 요청 본문에 섞이는 CVE-2026-123864(High, 세 라인, 평문 `node:http`는 영향 없음), 지연된 핸드셰이크 콜백의 원격 미처리 예외 CVE-2026-126051(High, 26, 24), TLS 1.2 재협상으로 servername을 바꿔 클라이언트 인증서 인증을 우회하는 CVE-2026-123872(High, 세 라인), `https.Agent`의 TLS 세션 재사용을 통한 인증서 검증 우회 CVE-2026-123877(Medium) 외 |
| 그 밖 | 프록시 자격 증명이 `ERR_PROXY_INVALID_CONFIG` 오류 메시지에 노출되는 CVE-2026-123871(Medium), Permission Model과 zlib의 Low 3건 |

- **불완전한 이전 수정**: CVE-2026-123863은 2024-04에 고친 CVE-2024-27983의 수정이 덮지 못한 변형이고, CVE-2026-123865는 CVE-2026-48937의 수정이 놓친 경우다. CVE-2026-123871도 CVE-2026-48615의 수정이 같은 하위 시스템의 오류 경로 넷을 놓친 데서 나왔다. 이미 패치한 CVE와 같은 구성요소의 수정이 다시 나오면 이전 대응을 끝난 일로 보지 않고 같은 경로를 다시 검증한다.
- **태그와 커밋이 어긋나는 경우**: 공지는 CVE-2026-123863, 123874, 123828, 123868을 24, 26 라인의 항목으로 적는다. v22.23.5의 Notable Changes는 이 넷에 CVE 태그를 붙이지만 커밋 목록에는 123863의 수정 커밋만 있다. 따라서 123863은 22 라인에도 적용되는 것으로 보고, 나머지 셋은 태그만으로 22 라인의 영향과 수정을 판단하지 않는다. 세 라인의 Notable Changes가 태그한 CVE-2026-123873(Permission Model의 heap snapshot 저장 경로 검사, Low)은 공지에도 없고 세 커밋 목록에서 대응 커밋을 찾지 못해 수정 포함 여부가 미확인이다. Notable Changes의 태그는 커밋 목록과 양방향으로 대조한다.
- **이전 공지와 다른 영향 라인**: Permission Model 와일드카드 과다 허용 CVE-2026-106071은 10월 공지에서 26만 영향이었지만 이번 공지는 세 라인을 영향 라인으로 적는다. 릴리스 노트에는 이 CVE 태그가 없다. 와일드카드 노드 수정 커밋은 v26.12.1에 이어 이번에는 v24.22.3과 v22.23.5의 커밋 목록에 같은 비공개 PR 번호로 들어 있고, 공지가 적은 수정자와 커밋 작성자도 같다. 24, 22로의 백포트로 읽을 수 있지만 CVE와 커밋의 대응을 적은 릴리스 노트는 없다. 같은 CVE라도 새 공지가 나올 때마다 영향 라인을 다시 읽는다.
- **의존성 갱신(공지 기준)**: llhttp(세 라인), undici(26, 24), sqlite(24, 22). 릴리스 노트의 커밋 목록에는 공지에 없는 갱신도 있다(26의 sqlite, 24와 26의 brotli). undici 버전은 라인마다 다르다.
- **제보자 표기**: 공지는 CVE-2026-123863, 123864, 123874, 123875, 123862의 제보자를 한 보안 연구자와 Claude, Anthropic Research의 협업으로 적는다. AI가 찾은 취약점의 신고와 조율은 [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]]를 본다.
- **적용 대조 경로**: HTTP/2 서버(`respondWithFile()`, `altsvc()` 포함), HTTPS 서버, 클라이언트 인증서 인증과 SNI별 CA 설정, TLS 1.2 재협상, `https.Agent` 세션 재사용, 프록시 설정 오류 로그, zlib의 `params()` 대기 중 `destroy()`, Permission Model의 와일드카드 파일 시스템 권한과 `fs.watch` 재귀 감시를 본다. 평문 HTTP만 쓰는 서비스도 HTTP/2와 TLS를 쓰는 사이드카나 의존성이 있는지 확인한다.

## 적용 절차

1. **실행 버전 파악**: 저장소의 `.nvmrc`나 `engines`가 아니라 실제 컨테이너 이미지, 서버, 서버리스 런타임에서 `process.version`이 무엇인지 확인한다.
2. **영향 대조**: 공지의 CVE별 영향 라인과 서비스가 쓰는 기능(TLS 클라이언트의 IP 호스트 검증과 인증서 체인, `dns.resolve*()`, `dns.reverse()`와 c-ares, `JSON.parse`, 내장 `fetch`가 쓰는 undici, Brotli 압축 해제, `zlib.ZipFile`, HTTP Agent keep-alive, Permission Model, SEA나 snapshot)과 공지의 의존성 갱신 목록을 대조한다. 쓰지 않는 기능도 의존성이 대신 쓸 수 있으므로 미확인이면 영향 있음으로 둔다.
3. **업그레이드**: 같은 라인의 패치 버전으로 올린다. EOL 라인이면 지원 라인으로의 이전 계획이 먼저다.
4. **경로별 검증**: 변경 경로마다 회귀 검사를 돌린다. 예를 들어 TLS는 비정규 IP 표기 거부와 정규화 회귀를 나눠 보고, 인증서 저장소 갱신과 공개키 차단은 사내 CA와 eMudhra/emSign을 거치는 외부 인증서 체인의 연결로 따로 본다.
5. **기록**: 배포 완료를 실제 실행 버전과 서비스가 쓰는 변경 경로의 검증 결과로 남긴다. 릴리스 노트에 없는 칸은 빈칸으로 둔다.

## 트레이드오프와 주의

- 공지 발표 시각과 실제 배포 시각 사이가 노출 구간이다. 사전 공지(pre-announcement)가 나오면 영향 라인과 최고 심각도만으로도 배포 창을 미리 잡을 수 있다.
- 패치 버전도 보안 외 변경과 의존성 갱신을 함께 싣는다. 긴급도와 회귀 위험을 함께 보되, 회귀 우려만으로 High 수정을 미루지 않는다.
- 2026-10-21 사례 표는 공지와 릴리스 노트를, 2026-11-11 사례 표는 공지를 기준으로 릴리스 노트의 태그와 커밋 목록 일부를 대조한 결과이며 각 CVE의 공격 재현이나 런타임 실행은 하지 않았다.

## 출처

- [Wednesday, October 21, 2026 Security Releases — Node.js](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) — 2026-11-09 CVE별 심각도, 영향 라인, 의존성 갱신과 EOL 버전 영향 문구 대조
- [Wednesday, November 11, 2026 Security Releases — Node.js](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases) — 2026-11-15 CVE별 심각도, 영향 라인, 변형 수정 문구, 제보자, 의존성 갱신 대조
- [Node.js 26.13.1 (LTS) — Node.js](https://nodejs.org/en/blog/release/v26.13.1) — 2026-11-15 CVE 태그와 와일드카드 수정 커밋 유무 대조
- [Node.js 24.22.3 (LTS) — Node.js](https://nodejs.org/en/blog/release/v24.22.3) — 2026-11-15 와일드카드 수정 커밋 대조
- [Node.js 22.23.5 (LTS) — Node.js](https://nodejs.org/en/blog/release/v22.23.5) — 2026-11-15 공지에 24, 26으로 적힌 CVE의 태그와 커밋 목록 대조
- [Wednesday, April 3, 2024 Security Releases — Node.js](https://nodejs.org/en/blog/vulnerability/april-2024-security-releases) — CVE-2024-27983 수정 시점
- [Node.js 26.12.1 (Current) — Node.js](https://nodejs.org/en/blog/release/v26.12.1)
- [Node.js 24.22.1 (LTS) — Node.js](https://nodejs.org/en/blog/release/v24.22.1)
- [Node.js 22.23.4 (LTS) — Node.js](https://nodejs.org/en/blog/release/v22.23.4)
- [tls: reject chains containing blocked public keys (#66871) — nodejs/node](https://github.com/nodejs/node/pull/66871)
- [Node.js Release Working Group — nodejs/Release](https://github.com/nodejs/Release) — 2026-11-09 라인별 LTS 전환일과 Alpha 단계 대조

## 관련 문서

- [[Nodejs-Production-Readiness|Node.js 프로덕션 운영 체크리스트]]
- [[tech/os-runtime/nodejs/Security|Node.js 보안 모범 사례]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
- [[Node.js|Node.js 개요]]
