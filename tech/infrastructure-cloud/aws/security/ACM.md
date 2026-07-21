---
status: done
category: "Infrastructure - AWS"
tags: [aws, saa, acm, ssl, tls, certificate, security, pki]
aliases: [ACM, AWS Certificate Manager, Certificate Manager]
verified_at: 2026-07-21
---

# ACM (AWS Certificate Manager)

AWS가 관리형으로 제공하는 SSL/TLS 인증서 발급, 저장, 갱신 서비스. 퍼블릭 인증서는 개인키 내보내기 가능 여부와 발급 경로에 따라 가격, 배포 대상, 갱신 책임이 달라진다.

## SSL/TLS 인증서 기초

- **목적**: 접속 대상 서버가 위조 서버가 아님을 제3자(CA)가 보증, 클라이언트–서버 통신 암호화에 사용할 세션키를 안전하게 교환.
- **구조**: 서버는 공개키 포함 인증서를 게시 → 클라이언트가 CA 체인으로 검증 → 대칭키 협상(TLS Handshake).
- **DNS와 결합**: 인증서는 도메인(FQDN)에 묶이므로 DNS 소유 증명이 발급의 핵심.
- **현재 표준**: SSL은 폐기, TLS 1.2/1.3 사용. 통념상 "SSL 인증서"라 부르지만 실제는 TLS.

## ACM이란

- AWS 관리형 인증서 서비스.
- 주요 운영 모드:
  - **비내보내기 Public 인증서**: AWS 통합 서비스에서 사용하며 ACM 인증서 자체에 추가 요금이 없다. 개인키를 다운로드할 수 없다.
  - **내보내기 가능 Public 인증서**: 개인키와 인증서를 내보내 EC2, 컨테이너, 온프레미스에 배포할 수 있다. 발급과 갱신 시 도메인별 요금이 발생한다.
  - **외부 인증서 가져오기(Import)**: 서드파티 CA에서 받은 인증서, 개인키를 ACM에 업로드. 자동 갱신 **불가** (만료 전 수동 재가져오기 필요).
- **Private CA(ACM PCA)**: 사설 PKI 운영, 내부 서비스/디바이스용 인증서 발급. 별도 과금.
- **ACME 발급**: ACM의 공개 ACME endpoint를 이용해 최대 45일 인증서를 발급하고 클라이언트가 설치, 갱신한다. 통합 서비스에 attach하는 관리형 경로와 운영 책임이 다르다.

## 통합 가능한 AWS 서비스

ACM 인증서를 직접 연결할 수 있는 대표 서비스.

- **Elastic Load Balancing** (ALB, NLB, CLB) — 리스너 HTTPS/TLS
- **CloudFront** — 배포 단위 HTTPS
- **API Gateway** — 커스텀 도메인 (Edge/Regional 모두)
- **AWS App Runner**, **Amplify**
- **Cognito** (커스텀 도메인)
- **CloudFormation** (리소스 속성으로 ARN 참조)
- **Network Firewall** (TLS 검사)

핵심: **비내보내기** ACM 인증서는 통합 서비스에 attach해서 사용한다. **내보내기 가능** Public 인증서는 EC2 OS, 컨테이너, 온프레미스에도 설치할 수 있지만 갱신본의 재배포는 고객 책임이다.

## us-east-1 (버지니아 북부) 필수 케이스

- **CloudFront에 연결할 인증서는 반드시 `us-east-1`에서 발급/임포트** 해야 한다. CloudFront는 글로벌 서비스지만 인증서 조회를 N. Virginia 리전에서만 수행.
- 그 외 리전 서비스(ALB, API Gateway Regional 등)는 해당 서비스가 있는 리전에서 발급.

> 시험 빈출: "CloudFront 배포에 ACM 인증서 적용이 안 된다" → 정답은 거의 `us-east-1` 리전에서 다시 발급.

## 인증서 발급 절차

1. **도메인 입력**: FQDN(`app.example.com`) 또는 **와일드카드**(`*.example.com`). SAN으로 여러 도메인 함께 묶기 가능.
2. **검증 방식 선택**:
   - **DNS 검증** — ACM이 제공하는 CNAME 레코드를 도메인 DNS에 추가. **자동 갱신과 궁합 최고**(레코드만 유지하면 갱신 시 추가 확인 불필요). Route 53이면 콘솔에서 원클릭 등록 가능.
   - **이메일 검증** — WHOIS에 등록된 도메인 관리자/`admin@`, `webmaster@` 등 표준 주소로 검증 메일 발송. 갱신 때마다 이메일 응답 필요(자동화에 불리).
3. **검증 완료** → "Issued" 상태가 되면 통합 서비스에 attach 가능.

## 갱신

- ACM 관리형 인증서는 자격 조건을 만족하면 자동 갱신을 시도한다. 시작 시점과 방식은 인증서 유형에 따라 다르므로 운영에서는 만료 이벤트를 함께 감시한다.
- **DNS 검증**: CNAME이 유지되면 자동 재검증 → 무중단 갱신.
- **이메일 검증**: 갱신 시점에 다시 메일 응답 필요. 응답 실패 시 만료.
- **내보내기 가능 인증서**: 유효기간은 198일이며 ACM이 만료 45일 전에 갱신을 시작한다. 내보내서 설치한 복사본은 자동 재배포되지 않는다.
- **Imported 인증서**: 자동 갱신 없음. 만료 임박 이벤트는 EventBridge로 알림 가능.

## DNS 검증 vs 이메일 검증 비교

| 항목 | DNS 검증 | 이메일 검증 |
|---|---|---|
| 자동화 | 우수 (한 번 등록 후 유지) | 매 갱신마다 수동 응답 |
| Route 53 통합 | 콘솔 원클릭 | 무관 |
| 갱신 신뢰성 | 높음 | 낮음 (메일 누락 위험) |
| WHOIS 비공개 도메인 | 영향 없음 | 메일 못 받을 수 있음 |

운영에서는 **DNS 검증이 기본 권장**.

## 가격, 제한 (2026-07-21 확인)

- 비내보내기 Public 인증서: AWS 통합 서비스에서 사용할 때 인증서 자체에 추가 요금 없음.
- 내보내기 가능 Public 인증서: 발급과 갱신마다 표준 FQDN은 USD 7, wildcard 이름은 USD 79. 현재 가격은 AWS 가격 페이지에서 재확인한다.
- ACM PCA: CA 운영비 + 발급 인증서당 과금.
- 도메인 수: 1개 인증서당 SAN 포함 대량 도메인 묶기 가능(쿼터 내).
- 인증서 자체는 다른 계정/리전으로 복사 불가 → 각 리전에서 별도 발급.

## 시험 체크포인트

- CloudFront에 적용할 인증서는 **`us-east-1`** 발급. 시험 단골.
- **DNS 검증**이 자동 갱신, 자동화에 유리. 이메일 검증의 단점은 갱신 수동 응답.
- **Imported 인증서는 자동 갱신 없음**. 만료 알림은 EventBridge/CloudWatch.
- 비내보내기 Public 인증서는 추가 인증서 요금이 없고 개인키 추출 불가. 내보내기 가능 Public 인증서는 과금되며 EC2, 컨테이너, 온프레미스에 배포 가능.
- **ACM PCA**는 사내 PKI/디바이스 인증서 발급용. 퍼블릭 인증서와 구분.
- 통합 서비스: ELB, CloudFront, API Gateway, Cognito, CloudFormation, Network Firewall. EC2/온프레미스 직접 설치가 필요하면 내보내기 가능 인증서나 ACME, 외부 CA 경로를 선택.
- 와일드카드(`*.example.com`)는 한 단계 서브도메인만 커버. `a.b.example.com`은 별도 SAN 필요.

## 출처

- [AWS Certificate Manager — Exportable public certificates](https://docs.aws.amazon.com/acm/latest/userguide/acm-exportable-certificates.html)
- [AWS Certificate Manager pricing](https://aws.amazon.com/certificate-manager/pricing/)
- [AWS Certificate Manager — Managed renewal](https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html)
- [AWS Certificate Manager now supports ACME](https://aws.amazon.com/about-aws/whats-new/2026/07/aws-certificate-manager-acme/)

## 관련 문서

- [[CloudFront]]
- [[ELB]]
- [[API-Gateway]]
- [[Route53]]
- [[KMS]]
- [[ACME-Protocol]]
