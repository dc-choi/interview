---
tags: [nodejs, security, release, patch-management]
status: done
verified_at: 2026-11-09
category: "OS & Runtime"
aliases: ["Node.js Security Release Triage", "Node.js 보안 릴리스 대응"]
---

# Node.js 보안 릴리스 대응

> 한 줄 요약: Node.js 보안 릴리스는 지원 중인 여러 릴리스 라인에 같은 날 나오지만 라인마다 수정 목록이 다르다. 릴리스 노트의 Notable Changes에 없는 항목은 그 라인의 영향 여부도, 수정 누락 여부도 확정하지 않는다. 영향 판단은 보안 공지의 영향 라인으로, 수정 반영 여부는 커밋 목록으로 확인한다. 적용 판단은 보안 공지의 영향 라인과 서비스가 실제로 쓰는 경로로 하고, 배포 완료는 실제 실행 버전과 검증 결과로 기록한다.

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
- **심각도 표기가 문서마다 다르다.** 릴리스 노트가 두 CVE를 한 줄로 묶어 높은 쪽 심각도만 붙이는 경우가 있다.

그래서 릴리스 노트만 보고 라인별 영향을 추정하지 않는다. 공지의 CVE별 영향 라인 표를 기준으로 삼고, 릴리스 노트와 커밋 목록은 그 수정이 실제로 실렸는지 대조하는 데 쓴다. 두 문서 모두에 근거가 없는 칸은 비워 두고 미확인으로 남긴다.

## 사례: 2026-10-21 보안 릴리스

2026-10-21 v26.12.1(Current), v24.22.1(LTS), v22.23.4(LTS)가 함께 나왔다. 공지의 최고 심각도는 High이고 CVE는 10개다.

| 수정 | 공지 심각도 | 공지의 영향 라인 | 릴리스 노트 |
|---|---|---|---|
| TLS의 비정규 IP 표기 거부(선행 0, 16진수, 축약 IPv4) CVE-2026-106069, CVE-2026-106072 | High, Medium | 26, 24, 22 | 세 라인 모두 한 줄에 묶여 High로 표기 |
| TLS IP 정규화 회귀 수정(전각 숫자 IP로 호스트 이름 검증 우회) CVE-2026-105483 | High | 26, 24 | 26.12.1, 24.22.1 |
| `dns.resolve`의 NUL 문자 입력 검증 CVE-2026-105482 | High | 26, 24, 22 | 세 라인 |
| Brotli 디코더 범위 밖 쓰기 CVE-2026-111497 | High | 26, 24, 22 | 세 라인 |
| HTTP Agent keep-alive 소켓의 요청 전 응답 처리 CVE-2026-105481 | Medium | 26, 24, 22 | 세 라인 |
| `crypto.randomUUID()` 등 엔트로피 캐시가 snapshot과 SEA에 저장되는 문제 CVE-2026-106074 | Medium | 26, 24, 22 | 세 라인 |
| `zlib.ZipFile`의 잘못된 ZIP local header 캐시 CVE-2026-106070 | Low | 26 | 26.12.1 |
| Permission Model 와일드카드 경로의 과다 허용 CVE-2026-106071 | Low | 26 | 세 라인 모두 CVE 태그 없음. 26.12.1 커밋 목록에 와일드카드 노드 수정 커밋이 있으나 CVE와의 대응은 커밋 제목으로 추정한 것이다 |
| Permission Model의 `fs.realpathSync` 우회 CVE-2026-106073 | Low | 26, 24, 22 | 세 라인 |

읽을 점은 다음과 같다.

- v22.23.4의 목록이 v26.12.1보다 짧은 이유는 공지상 정규화 회귀와 ZIP 수정이 22 라인에 해당하지 않기 때문이다(와일드카드 권한 수정도 22에 해당하지 않지만 어느 라인의 Notable Changes에도 없다). 22 라인이 덜 위험하다는 뜻이 아니며, 세 라인 공통의 High 수정은 똑같이 적용해야 한다.
- 정규화 회귀(CVE-2026-105483)는 이전 CVE 수정 뒤에 생긴 회귀로 공지에 적혀 있다. 비정규 IP 거부와 회귀 수정은 별도 항목이므로 TLS 검증도 둘을 나눠 확인한다.
- 공지는 공개 취약점 대응용 의존성 갱신으로 c-ares(26, 24, 22), ca-cert(eMudhra 중간 CA 침해), OpenSSL(24, 22), SQLite(22), undici(26, 24, 22)를 적는다. 릴리스 노트상 c-ares는 세 라인 모두 1.34.9, OpenSSL은 3.5.9, SQLite는 3.53.4이고 undici는 라인마다 버전이 다르다.
- 세 라인 모두 루트 인증서를 NSS 3.131.1로 갱신했고, 커밋 목록에는 차단된 공개키를 담은 인증서 체인을 거부하는 TLS 변경도 있다. 둘 다 CVE 태그가 없고 공지의 ca-cert 항목과 어느 커밋이 대응하는지는 문서에 적혀 있지 않다. 신뢰 저장소와 체인 거부 변경은 연결 실패 같은 별도 영향이 있으므로 TLS 수정과 따로 본다.
- 보안 외 변경도 라인마다 다르다. V8 backport는 26과 24의 커밋 목록에 있고(Notable Changes에는 26만), 26에는 ES 모듈 동기 로딩 변경의 revert가, 22에는 IPv6 호스트와 IP-Address SAN 대조 변경이 들어 있다. 회귀 검사 범위도 라인별로 잡는다.

## 적용 절차

1. **실행 버전 파악**: 저장소의 `.nvmrc`나 `engines`가 아니라 실제 컨테이너 이미지, 서버, 서버리스 런타임에서 `process.version`이 무엇인지 확인한다.
2. **영향 대조**: 공지의 CVE별 영향 라인과 서비스가 쓰는 기능(TLS 클라이언트의 IP 호스트 검증과 인증서 체인, `dns.resolve`와 c-ares, 내장 `fetch`가 쓰는 undici, Brotli 압축 해제, `zlib.ZipFile`, HTTP Agent keep-alive, Permission Model, SEA나 snapshot)과 공지의 의존성 갱신 목록을 대조한다. 쓰지 않는 기능도 의존성이 대신 쓸 수 있으므로 미확인이면 영향 있음으로 둔다.
3. **업그레이드**: 같은 라인의 패치 버전으로 올린다. EOL 라인이면 지원 라인으로의 이전 계획이 먼저다.
4. **경로별 검증**: 변경 경로마다 회귀 검사를 돌린다. 예를 들어 TLS는 비정규 IP 표기 거부와 정규화 회귀를 나눠 보고, 인증서 저장소 갱신과 공개키 차단은 사내 CA와 외부 인증서 체인의 연결로 따로 본다.
5. **기록**: 배포 완료를 실제 실행 버전과 서비스가 쓰는 변경 경로의 검증 결과로 남긴다. 릴리스 노트에 없는 칸은 빈칸으로 둔다.

## 트레이드오프와 주의

- 공지 발표 시각과 실제 배포 시각 사이가 노출 구간이다. 사전 공지(pre-announcement)가 나오면 영향 라인과 최고 심각도만으로도 배포 창을 미리 잡을 수 있다.
- 패치 버전도 보안 외 변경과 의존성 갱신을 함께 싣는다. 긴급도와 회귀 위험을 함께 보되, 회귀 우려만으로 High 수정을 미루지 않는다.
- 이 사례 표는 공지와 릴리스 노트를 대조한 결과이며 각 CVE의 공격 재현이나 런타임 실행은 하지 않았다.

## 출처

- [Wednesday, October 21, 2026 Security Releases — Node.js](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) — 2026-11-09 CVE별 심각도, 영향 라인, 의존성 갱신과 EOL 버전 영향 문구 대조
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
