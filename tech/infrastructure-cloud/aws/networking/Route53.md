---
tags: [infrastructure, aws, route53, dns, networking, routing-policy]
status: done
category: "Infrastructure - AWS"
aliases: ["Route 53", "Route53", "Amazon Route 53"]
verified_at: 2026-07-21
---

# Amazon Route 53

AWS의 **관리형 DNS 서비스**. 도메인 등록, DNS 라우팅, 상태 체크(Health Check)를 한 곳에서 처리한다. 단순 이름 풀이를 넘어 **트래픽 분배, 페일오버, 지리 기반 라우팅**까지 수행하는 트래픽 컨트롤러. 일반 DNS 개념, 계층 구조는 [[DNS]] 참고.

## 3가지 핵심 기능

1. **Domain Registration** — 지원되는 최상위 도메인의 등록, 갱신, 이전. 가격과 처리 시간은 도메인 종류와 등록 작업에 따라 다르다.
2. **DNS Routing** — 도메인 요청을 AWS 리소스(EC2, ELB, S3 등) 또는 외부 IP로 라우팅
3. **Health Check** — 엔드포인트 상태 감시, 자동 페일오버

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
| **Alias** | 도메인 → 지원되는 AWS 리소스 또는 같은 호스팅 영역의 다른 레코드 |
| **MX** | 메일 서버 지정 |
| **NS** | 호스팅 영역의 네임 서버 지정 |
| **SOA** | 영역의 시작 레코드 (관리 정보) |
| **TXT** | 임의 텍스트 (SPF, DKIM, 도메인 소유 검증 등) |
| **PTR** | IP → 도메인 (역방향) |
| **SRV** | 서비스, 포트 지정 |

## Record TTL

- **TTL(Time To Live)** — 캐시 네임 서버, 클라이언트가 레코드를 **저장하는 시간(초)**
- 비 Alias 레코드는 생성할 때 TTL을 지정한다. 모든 레코드에 적용되는 300초 기본값은 없다.
- Alias 레코드는 TTL을 직접 지정하지 않고 Alias 대상의 TTL을 사용한다.
- TTL이 길면 — DNS 쿼리 비용 절감, 변경 반영은 느림
- TTL이 짧으면 — resolver cache 시간이 줄어 변경 수렴이 빨라질 수 있지만 기존 cache와 DNS 전파 때문에 즉시 반영을 보장하지 않으며 쿼리 수와 비용은 늘 수 있음
- **장애 전환을 빨리** 하려면 페일오버 레코드 TTL을 짧게 (예: 60초)

## Routing Policy 7종

| 정책 | 동작 | 사용 사례 |
|------|------|-----------|
| **Simple** | 같은 레코드에 여러 값을 두면 Route 53이 한 응답에 최대 8개를 임의 순서로 반환 | 단일 리소스 또는 단순 다중 값 응답 |
| **Weighted** | 동일 이름 레코드에 **가중치** 부여 | A/B 테스트, 점진적 트래픽 전환, Region 간 비율 분배 |
| **Latency-based** | AWS가 측정한 리전 간 지연 데이터를 바탕으로 더 낮은 지연이 예상되는 리전을 선택 | 글로벌 사용자의 지연 최적화 |
| **Failover** | **Primary 장애 시 Secondary**로 전환 (Active/Standby) | DR(재해 복구), Primary-DR 구성 |
| **Geolocation** | **사용자의 지리적 위치(국가, 대륙)** 기반 라우팅 | 지역별 컨텐츠, 언어 차별화, 규제 대응 |
| **Geo-proximity** | **사용자-리소스 간 지리적 거리** 기반. **Bias 값**으로 특정 리전 트래픽 가감 가능 | 일반 public/private hosted zone 레코드로 직접 구성 가능. Traffic Flow는 시각화와 복합 정책에 선택적으로 사용 |
| **Multi-Value Answer** | 다수 IP 반환(Simple 유사) + **Health Check 가능** → 실패 시 자동 제외 | 단순 부하 분산 + 상태 감시 |

### 정책 선택 가이드

- 단순 단일 리소스 → **Simple**
- 카나리, 점진적 배포 → **Weighted** (예: 90:10)
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
  - **ELB** (ALB, NLB, CLB)
  - **API Gateway**
  - 웹사이트 호스팅 활성화한 **S3 Bucket**
  - **Elastic Beanstalk** 환경
  - **VPC Interface Endpoint**
  - **Global Accelerator**
  - 동일 호스팅 영역의 다른 Route 53 레코드

### CNAME vs Alias

| 기준 | CNAME | Alias |
|------|-------|-------|
| 대상 | 모든 도메인 (AWS, 외부) | 지원되는 AWS 리소스 또는 같은 영역의 호환 레코드 |
| **루트 도메인**(zone apex) | **지정 불가** (`example.com` 불가) | **지정 가능** |
| 비용 | 일반 DNS 쿼리 요금 | 지원되는 AWS 리소스 대상 Alias 쿼리는 Route 53 쿼리 요금 없음 |
| Health Check | 레코드에 직접 연결하지 않음 | 대상 종류에 따라 Evaluate Target Health 또는 별도 상태 확인 구성 가능 |

- 루트 도메인(`example.com`)에는 CNAME을 만들 수 없다. ELB, CloudFront처럼 DNS 이름을 가진 지원 리소스에 연결할 때 Alias를 사용하며, 루트 A/AAAA 레코드에 IP 주소를 직접 넣는 구성도 가능하다.

## Health Check

- 엔드포인트 상태를 주기적으로 감시 → 실패 시 라우팅에서 자동 제외
- 종류
  - **Endpoint** — 특정 IP, 도메인 직접 헬스체크
  - **Calculated** — 여러 헬스체크를 AND/OR로 조합
  - **CloudWatch Alarm** — CloudWatch 알람 상태를 헬스체크로 활용
- 글로벌 분산된 Health Checker가 동시 점검 → 일정 비율 이상 실패 시 unhealthy
- 페일오버, Multi-Value Answer 정책과 함께 쓸 때 핵심

## DNSSEC

- **DNS 응답을 디지털 서명**으로 검증해 DNS 스푸핑, 캐시 포이즈닝 방어
- Route 53에서 호스팅 영역 단위로 활성화 가능 (서명 키 관리 자동화)
- 퍼블릭 호스팅 영역 서명에는 `us-east-1`의 고객 관리형 KMS 키가 필요하며 키 사양은 `ECC_NIST_P256`, 용도는 `SIGN_VERIFY`여야 한다.

## 시험 체크포인트

- AWS 리소스를 도메인에 연결 + **루트 도메인** 사용 → **Alias 레코드** (CNAME 불가)
- 글로벌 사용자에게 **가장 가까운/빠른 리전**으로 → **Latency-based**
- **국가, 대륙별로 다른 서버** → **Geolocation**
- **거리 + 특정 리전에 트래픽 더 보내기** → **Geo-proximity** (Bias 값 사용)
- **Primary 장애 시 Secondary로 자동 전환** → **Failover + Health Check**
- ELB 없이 **다수 IP에 분산 + 상태 감시** → **Multi-Value Answer**
- **A/B 테스트, 카나리 배포, 점진적 전환** → **Weighted**
- **VPC 내부에서만 해석**되는 도메인 → **Private Hosted Zone**
- 하나의 Private Zone을 **여러 VPC에 공유** 가능
- 온프레미스에서 Private Zone 쿼리 → **Route 53 Resolver Endpoint**
- 비 Alias 레코드는 TTL을 명시하고, 장애 전환 목표와 쿼리 비용을 고려해 값을 정함. Alias TTL은 대상에서 상속
- DNS 스푸핑 방지 → **DNSSEC**
- Alias는 **지원 AWS 리소스 또는 같은 영역 레코드 + 루트 도메인 가능**. 요금과 상태 평가는 대상에 따라 확인
- CNAME은 **외부 도메인 가능 + 루트 도메인 불가 + 일반 DNS 쿼리 과금**

## 출처

- [Alias와 비 Alias 레코드 선택](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html)
- [레코드 공통 값](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-shared.html)
- [Route 53 DNSSEC 서명 구성](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-cmk-requirements.html)
- [Geo-proximity routing](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geoproximity.html)

## 관련 문서

- [[CloudFront]]
- [[ELB]]
- [[VPC]]
- [[CDN]]
- [[DNS]]
