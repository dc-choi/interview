---
tags: [infrastructure, aws, route53, dns, networking, routing-policy]
status: done
category: "Infrastructure - AWS"
aliases: ["Route 53", "Route53", "Amazon Route 53"]
---

# Amazon Route 53

AWS의 **관리형 DNS 서비스**. 도메인 등록·DNS 라우팅·상태 체크(Health Check)를 한 곳에서 처리한다. 단순 이름 풀이를 넘어 **트래픽 분배·페일오버·지리 기반 라우팅**까지 수행하는 트래픽 컨트롤러. 일반 DNS 개념·계층 구조는 [[DNS]] 참고.

## 3가지 핵심 기능

1. **Domain Registration** — 도메인 등록 (약 12,000원/년·도메인, 최대 3일 소요)
2. **DNS Routing** — 도메인 요청을 AWS 리소스(EC2·ELB·S3 등) 또는 외부 IP로 라우팅
3. **Health Check** — 엔드포인트 상태 감시·자동 페일오버

## Hosted Zone (호스팅 영역)

- 특정 도메인의 **DNS 레코드를 담는 컨테이너**
- **Public Hosted Zone** — 인터넷에 공개된 도메인 (예: `example.com`)
- **Private Hosted Zone** — **VPC 내부에서만** 해석되는 도메인 (내부 서비스 디스커버리)
  - 하나의 Private Zone을 **여러 VPC**에 연결 가능
  - 온프레미스에서 접근하려면 Route 53 Resolver Endpoint 필요

## Record Type (레코드 종류)

| 타입 | 역할 |
|------|------|
| **A** | 도메인 → **IPv4** 주소 |
| **AAAA** | 도메인 → **IPv6** 주소 |
| **CNAME** | 도메인 → **다른 도메인** (별칭). 루트 도메인 지정 **불가** |
| **Alias** | 도메인 → **AWS 리소스** (Route 53 고유, CNAME 유사하지만 강력) |
| **MX** | 메일 서버 지정 |
| **NS** | 호스팅 영역의 네임 서버 지정 |
| **SOA** | 영역의 시작 레코드 (관리 정보) |
| **TXT** | 임의 텍스트 (SPF·DKIM·도메인 소유 검증 등) |
| **PTR** | IP → 도메인 (역방향) |
| **SRV** | 서비스·포트 지정 |

## Record TTL

- **TTL(Time To Live)** — 캐시 네임 서버·클라이언트가 레코드를 **저장하는 시간(초)**
- Route 53 레코드별로 TTL 지정 가능 (**기본값 300초**)
- TTL이 길면 — DNS 쿼리 비용 절감, 변경 반영은 느림
- TTL이 짧으면 — 변경 즉시 반영, 쿼리 부하 증가
- **장애 전환을 빨리** 하려면 페일오버 레코드 TTL을 짧게 (예: 60초)

## Routing Policy 7종

| 정책 | 동작 | 사용 사례 |
|------|------|-----------|
| **Simple** | 단일 레코드. 다수 IP 지정 시 **무작위 반환** | 단일 서버·기본 라우팅 |
| **Weighted** | 동일 이름 레코드에 **가중치** 부여 | A/B 테스트, 점진적 트래픽 전환, Region 간 비율 분배 |
| **Latency-based** | **지연시간이 가장 낮은** 리전으로 라우팅 | 글로벌 사용자에게 가장 빠른 리전 응답 |
| **Failover** | **Primary 장애 시 Secondary**로 전환 (Active/Standby) | DR(재해 복구), Primary-DR 구성 |
| **Geolocation** | **사용자의 지리적 위치(국가·대륙)** 기반 라우팅 | 지역별 컨텐츠·언어 차별화, 규제 대응 |
| **Geo-proximity** | **사용자-리소스 간 지리적 거리** 기반. **Bias 값**으로 특정 리전 트래픽 가감 가능 | Traffic Flow 기반 정밀 제어 (Route 53 Traffic Flow 필요) |
| **Multi-Value Answer** | 다수 IP 반환(Simple 유사) + **Health Check 가능** → 실패 시 자동 제외 | 단순 부하 분산 + 상태 감시 |

### 정책 선택 가이드

- 단순 단일 리소스 → **Simple**
- 카나리·점진적 배포 → **Weighted** (예: 90:10)
- 응답 속도 최적화 → **Latency-based**
- 메인-DR 구조 → **Failover**
- 사용자 국가 기준 분기 → **Geolocation**
- 거리 + 가중치(bias) 정밀 조정 → **Geo-proximity**
- ELB 없이 단순 분산 + 헬스체크 → **Multi-Value Answer**

## Alias 레코드

- Route 53 고유 확장. **CNAME과 유사하지만 더 강력**
- AWS 리소스의 도메인(예: `xxx.elb.amazonaws.com`)을 쿼리 대상으로 지정
- Alias가 응답할 수 있는 대상
  - **CloudFront Distribution**
  - **ELB** (ALB·NLB·CLB)
  - **API Gateway**
  - 웹사이트 호스팅 활성화한 **S3 Bucket**
  - **Elastic Beanstalk** 환경
  - **VPC Interface Endpoint**
  - **Global Accelerator**
  - 동일 호스팅 영역의 다른 Route 53 레코드

### CNAME vs Alias

| 기준 | CNAME | Alias |
|------|-------|-------|
| 대상 | 모든 도메인 (AWS·외부) | **AWS 리소스 전용** |
| **루트 도메인**(zone apex) | **지정 불가** (`example.com` 불가) | **지정 가능** |
| 비용 | DNS 쿼리 과금 | **무료** (AWS 리소스 대상 쿼리) |
| Health Check | 직접 불가 | **가능** |

- 루트 도메인(`example.com`)을 ELB·CloudFront에 연결할 때 **반드시 Alias**

## Health Check

- 엔드포인트 상태를 주기적으로 감시 → 실패 시 라우팅에서 자동 제외
- 종류
  - **Endpoint** — 특정 IP·도메인 직접 헬스체크
  - **Calculated** — 여러 헬스체크를 AND/OR로 조합
  - **CloudWatch Alarm** — CloudWatch 알람 상태를 헬스체크로 활용
- 글로벌 분산된 Health Checker가 동시 점검 → 일정 비율 이상 실패 시 unhealthy
- 페일오버·Multi-Value Answer 정책과 함께 쓸 때 핵심

## DNSSEC

- **DNS 응답을 디지털 서명**으로 검증해 DNS 스푸핑·캐시 포이즈닝 방어
- Route 53에서 호스팅 영역 단위로 활성화 가능 (서명 키 관리 자동화)
- KMS의 **Customer Managed CMK**(asymmetric ECC_NIST_P256)를 사용해 서명

## 시험 체크포인트

- AWS 리소스를 도메인에 연결 + **루트 도메인** 사용 → **Alias 레코드** (CNAME 불가)
- 글로벌 사용자에게 **가장 가까운/빠른 리전**으로 → **Latency-based**
- **국가·대륙별로 다른 서버** → **Geolocation**
- **거리 + 특정 리전에 트래픽 더 보내기** → **Geo-proximity** (Bias 값 사용)
- **Primary 장애 시 Secondary로 자동 전환** → **Failover + Health Check**
- ELB 없이 **다수 IP에 분산 + 상태 감시** → **Multi-Value Answer**
- **A/B 테스트·카나리 배포·점진적 전환** → **Weighted**
- **VPC 내부에서만 해석**되는 도메인 → **Private Hosted Zone**
- 하나의 Private Zone을 **여러 VPC에 공유** 가능
- 온프레미스에서 Private Zone 쿼리 → **Route 53 Resolver Endpoint**
- 기본 TTL **300초**, 페일오버용으로 60초 등 짧게 설정
- DNS 스푸핑 방지 → **DNSSEC**
- Alias는 **AWS 리소스 한정 + 무료 + 루트 도메인 가능 + 헬스체크 가능**
- CNAME은 **외부 도메인 가능 + 루트 도메인 불가 + 유료**

## 출처

- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[CloudFront]]
- [[ELB]]
- [[VPC]]
- [[CDN]]
- [[DNS]]
