---
tags: [security, crypto, tls, certificate, lets-encrypt, acme]
status: done
category: "Security - 암호"
aliases: ["ACME", "ACME Protocol", "Let's Encrypt", "certbot", "인증서 자동화"]
verified_at: 2026-07-21
---

# ACME Protocol — 인증서 자동화

ACME(Automated Certificate Management Environment)는 **인증서 발급, 갱신, 폐기를 자동화하는 표준 프로토콜**(RFC 8555)이다. Let's Encrypt가 대중화했으며 여러 CA와 클라이언트가 구현한다. 프로토콜은 인증서의 가격이나 유효기간을 정하지 않는다. 그 조건은 ACME 서버를 운영하는 CA와 선택한 프로필의 정책이다.

## 왜 필요한가

수동 인증서 운영은 도메인 제어 검증, CSR 제출, 배포, 만료 전 갱신에서 사람의 실수를 만들기 쉽다. CA와 상품에 따라 절차와 비용은 다르다.

ACME는 이 수명주기를 **API로 자동화**한다. 무료 여부와 유효기간은 프로토콜 속성이 아니다. 예를 들어 Let's Encrypt의 2026-07-21 프로필은 classic 90일, tlsserver 45일, shortlived 약 160시간을 제공한다. 짧은 인증서는 자동 갱신과 실패 알림이 전제다.

## 발급 흐름

```
1. 클라이언트(certbot 등)가 CA에 Account 등록
2. 인증서 발급 요청 (주문 Order 생성)
3. CA가 도메인 소유권 검증 챌린지(Challenge) 제시
4. 클라이언트가 챌린지 수행 (HTTP 응답, DNS TXT, TLS-ALPN 중 선택)
5. CA가 검증 → 성공 시 CSR(Certificate Signing Request) 수락
6. 인증서 발급 → 클라이언트가 설치
```

## 도메인 검증 챌린지 3종

### HTTP-01

- CA가 `http://{domain}/.well-known/acme-challenge/{token}` 경로로 지정 파일 조회
- 클라이언트는 해당 경로에 토큰 응답 준비
- **장점**: 가장 간단, 대부분 웹서버에서 쉽게 구현
- **한계**: 와일드카드(`*.example.com`) 인증서 **불가**, 80 포트 개방 필요

### DNS-01

- CA가 `_acme-challenge.{domain}` TXT 레코드 조회
- 클라이언트가 해당 TXT 레코드를 등록
- **장점**: **와일드카드 인증서 지원**, 서버가 꺼져 있어도 가능
- **한계**: DNS API 자동화 필요(Route 53, Cloudflare DNS Plugin 등)

### TLS-ALPN-01

- CA가 TLS 연결 시 ALPN 확장으로 `acme-tls/1`을 협상, 특정 인증서를 제시받음
- **장점**: 80/443만 열려 있으면 됨
- **한계**: 서버 측 ALPN 지원 필요, 구현 난이도 높음

## 자동 갱신과 인증서 프로필

- Let's Encrypt classic 프로필은 90일, tlsserver는 45일, shortlived는 약 160시간이다. 프로필 가용성과 기본값은 CA 정책에 따라 달라질 수 있다.
- 고정된 60일 주기보다 ACME Renewal Information(ARI)을 지원하는 클라이언트는 CA가 제시하는 갱신 창을 따르는 편이 안전하다.
- certbot, acme.sh, Caddy 등은 timer나 내장 스케줄러로 갱신하고, 성공 후 필요한 서비스 reload 또는 배포를 수행한다.
- 만료 감시와 실패 알림을 자동화한다.

## 구현체

| 도구 | 특징 |
|---|---|
| **certbot** | EFF 제작, 레퍼런스 구현. Apache, Nginx 플러그인 내장 |
| **acme.sh** | 순수 셸 스크립트. 의존성 없이 가볍고 DNS Plugin 풍부 |
| **Caddy** | 웹 서버가 ACME를 내장 — **설정 없이 자동 HTTPS** |
| **Traefik** | 리버스 프록시가 ACME 내장, K8s Ingress와 결합 |
| **cert-manager** | K8s용. Ingress, Certificate CRD 단위로 관리 |
| **AWS ACM ACME endpoint** | AWS가 발급하는 최대 45일 Public 인증서를 표준 ACME 클라이언트로 발급. 설치와 갱신은 클라이언트 책임 |
| **AWS Private CA Connector for SCEP/ACME** | 사설 PKI 워크로드에 ACM Private CA 인증서를 자동 발급하는 별도 경로 |

## Let's Encrypt 인증서 체인 — Chains of Trust

Let's Encrypt가 발급한 인증서가 브라우저에서 신뢰되는 이유는 **Root CA → Intermediate CA → 내 인증서** 체인이 루트 스토어에 등록된 Root에 이어지기 때문.

### Root CA

| Root | 키 종류 | 생성 | 신뢰 유효 |
|---|---|---|---|
| **ISRG Root X1** | RSA 4096 | 2015 | ~2030 |
| **ISRG Root X2** | ECDSA P-384 | 2020 | ~2035 |

ISRG(Internet Security Research Group)가 Let's Encrypt를 운영. X1이 원조, X2는 ECDSA 전환을 위해 신설. X1, X2 모두 주요 브라우저, OS 트러스트 스토어에 포함됨.

### Intermediate CA

실제 subscriber 인증서를 발급하는 중간 CA. Root는 오프라인 보관, Intermediate만 온라인으로 서명 작업. 주기적으로 교체.

- **RSA 계열**(R10, R11, R12, R13 등): 구형 클라이언트와 호환성 높음
- **ECDSA 계열**(E5, E6, E7, E8 등): 체인 크기가 작아 핸드셰이크 빠름
- 각 Intermediate는 대개 2~5년 유효

### Cross-Signing — 트러스트 스토어 커버리지 확장

신규 Root가 만들어진 직후에는 많은 오래된 장치(임베디드, 구형 Android 등)가 아직 그 Root를 신뢰하지 못한다. 이를 위해 **이미 널리 신뢰되는 다른 Root(예: IdenTrust DST Root CA X3)** 가 새 Root 또는 Intermediate에 대해 교차 서명해주는 패턴이 사용된다.

- Let's Encrypt 초기에는 IdenTrust가 ISRG Root X1을 교차 서명해 호환성을 확보
- 2021년 DST Root CA X3 만료 시 **체인이 두 갈래**로 제공되어 서버가 상황에 맞게 선택 가능
- ACME 클라이언트는 `preferred chain` 옵션으로 체인을 선택할 수 있음

### ECDSA vs RSA 체인 선택

- **ECDSA 체인**: 핸드셰이크 빠름, 데이터 전송량 적음 (모바일, TLS 연결이 잦은 API에 유리)
- **RSA 체인**: 호환성 높음 (구형 브라우저, IoT 장치)
- 두 체인을 모두 준비해두고 클라이언트에 따라 서버가 선택하는 구성도 가능

### 만료, 갱신 운영 포인트

- **Subscriber 인증서**의 유효기간은 CA와 프로필에 따라 다르다. 짧은 수명은 자동 갱신이 필수다.
- **Intermediate**가 만료되면 그것으로 서명된 모든 인증서의 체인이 끊김 → 서버가 체인에 포함하는 Intermediate 파일을 **자동으로 최신화**하는 구성이 중요 (`fullchain.pem` 사용)
- **Root 만료 일정**: X1은 2030년까지, X2는 2035년까지 — 장기 운영 시 Root 전환 계획 필요

## AWS ACM과의 차이

| 항목 | ACME 프로토콜 | AWS ACM 관리형 인증서 |
|---|---|---|
| 성격 | CA와 클라이언트가 구현하는 자동화 규약 | AWS가 발급, 저장, 통합 배포를 관리하는 서비스 |
| 발급 대상 | CA 정책과 challenge 통과 범위 | 통합 서비스용 비내보내기, 내보내기 가능 Public, Private CA 등 유형별 상이 |
| 갱신 책임 | 클라이언트가 CA의 갱신 창에 맞춰 요청, 설치 | 통합 서비스는 ACM이 관리. 내보낸 인증서의 갱신본 재배포는 고객 책임 |
| EC2에 직접 설치 | CA가 발급한 인증서를 클라이언트가 설치 가능 | 내보내기 가능 Public 인증서나 ACM ACME 인증서는 가능, 비내보내기는 불가 |
| 비용 | CA와 상품 정책에 따름 | 인증서 유형별 가격이 다름 |

통합 AWS 서비스라면 비내보내기 ACM 인증서가 운영 부담이 낮다. EC2, 컨테이너, 온프레미스는 ACM의 내보내기 가능 인증서, ACM ACME, 다른 ACME CA, 외부 CA 가운데 비용과 재배포 책임을 비교해 선택한다.

## 보안 고려

- **계정 키 보호**: ACME 계정 키가 유출되면 해당 도메인의 인증서를 임의 발급당할 수 있음
- **Rate Limit**: Let's Encrypt의 제한은 registered domain, 계정, 동일 인증서 집합 등 버킷별로 다르고 일부 ARI 기반 갱신은 예외가 적용된다. 고정 숫자를 외우기보다 운영 시 공식 제한 페이지를 확인하고 staging으로 자동화를 검증한다.
- **CAA DNS 레코드**: 도메인에 `CAA` 레코드를 설정해 **지정한 CA만 발급 허용** → 탈취 방지
- **OCSP Stapling**: 인증서 해지(Revocation) 확인 오버헤드를 줄임. ACME로 받은 인증서도 Stapling 설정 권장

## 흔한 실수

- **갱신 자동화 누락** → 만료로 사이트 다운. 알림까지 설정해야 안전
- **DNS-01 플러그인 권한 과다** — 전체 존 수정 권한을 주어 보안 리스크. 전용 IAM 계정, 존으로 제한
- **동일 도메인 중복 발급** — 여러 서버가 동시에 재발급해 Rate Limit 소진
- **staging 환경 인증서를 prod에 배포** — Let's Encrypt staging은 다른 CA라 브라우저가 거부

## 면접 체크포인트

- **ACME 프로토콜 개요**와 Let's Encrypt가 바꾼 것
- **HTTP-01 vs DNS-01** 차이와 와일드카드 발급에 DNS-01이 필요한 이유
- ACME가 가격과 유효기간을 규정하지 않으며 CA 프로필에 따라 수명이 달라진다는 점
- **CAA 레코드**로 방어하는 인증서 탈취 시나리오
- **cert-manager/K8s**에서 Certificate CRD 자동 관리
- **ACM 관리형 vs ACME 자동화** 선택 기준 (배포 대상, 가격, 갱신과 재배포 책임)

## 출처
- [RFC 8555 — Automatic Certificate Management Environment](https://www.rfc-editor.org/rfc/rfc8555.html)
- [Let's Encrypt — Profiles](https://letsencrypt.org/ca/docs/profiles/)
- [Let's Encrypt — Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Let's Encrypt — Chains of Trust](https://letsencrypt.org/certificates/)
- [AWS Certificate Manager now supports ACME](https://aws.amazon.com/about-aws/whats-new/2026/07/aws-certificate-manager-acme/)
- [AWS Certificate Manager — Exportable public certificates](https://docs.aws.amazon.com/acm/latest/userguide/acm-exportable-certificates.html)

## 관련 문서
- [[HTTPS-TLS|HTTPS / TLS Handshake]]
- [[Public-Key-Cryptography|공개키 암호, PKI]]
- [[RSA-Encryption|RSA 암호화]]
