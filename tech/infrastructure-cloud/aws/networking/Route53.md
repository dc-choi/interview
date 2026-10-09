---
tags: [infrastructure, aws, route53, dns, networking, routing-policy]
status: done
category: "Infrastructure - AWS"
aliases: ["Route 53", "Route53", "Amazon Route 53"]
verified_at: 2026-08-12
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
| **Alias** | 도메인 → 지원되는 AWS 리소스 또는 같은 호스팅 영역의 같은 타입 레코드 |
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

## Routing Policy 8종

| 정책 | 동작 | 사용 사례 |
|------|------|-----------|
| **Simple** | 같은 레코드에 여러 값을 두면 Route 53이 모든 값을 임의 순서로 재귀 resolver에 반환. Health Check 연동 없음 | 단일 리소스 또는 단순 다중 값 응답 |
| **Weighted** | 동일 이름 레코드에 **가중치** 부여 | A/B 테스트, 점진적 트래픽 전환, Region 간 비율 분배 |
| **Latency-based** | AWS가 수집한 사용자와 AWS 리전 사이의 지연 데이터를 바탕으로 지연이 더 낮은 리전의 레코드를 선택 | 글로벌 사용자의 지연 최적화 |
| **Failover** | **Primary 장애 시 Secondary**로 전환 (Active/Standby) | DR(재해 복구), Primary-DR 구성 |
| **Geolocation** | **사용자의 지리적 위치(국가, 대륙)** 기반 라우팅 | 지역별 컨텐츠, 언어 차별화, 규제 대응 |
| **Geo-proximity** | **사용자-리소스 간 지리적 거리** 기반. **Bias 값**으로 특정 리전 트래픽 가감 가능 | 일반 public/private hosted zone 레코드로 직접 구성 가능. Traffic Flow는 시각화와 복합 정책에 선택적으로 사용 |
| **IP-based** | 관리자가 올린 CIDR 컬렉션(클라이언트 IP 대역과 엔드포인트 매핑) 기준 라우팅. 프라이빗 호스팅 영역에서는 사용 불가 | 특정 ISP, 사내 IP 대역을 지정 엔드포인트로 보내는 네트워크 비용, 성능 튜닝 |
| **Multi-Value Answer** | 다수 IP 반환 + **Health Check 가능** → 실패 시 자동 제외. **헬시 레코드를 최대 8개까지 응답**하고, 헬시 레코드가 8개 이하면 전부 반환하며, 전부 unhealthy면 unhealthy 레코드를 최대 8개 반환 | 단순 부하 분산 + 상태 감시 |

### 정책 선택 가이드

- 단순 단일 리소스 → **Simple**
- 카나리, 점진적 배포 → **Weighted** (예: 90:10)
- 응답 속도 최적화 → **Latency-based**
- 메인-DR 구조 → **Failover**
- 사용자 국가 기준 분기 → **Geolocation**
- 클라이언트 IP 대역(ISP 등) 기준 분기 → **IP-based**
- 거리 + 가중치(bias) 정밀 조정 → **Geo-proximity**
- ELB 없이 단순 분산 + 헬스체크 → **Multi-Value Answer**

### 국가별 배치와 지연 최적화는 다른 정책이다

2026-10-09 Geolocation과 Latency-based 공식 문서 확인 기준이다. Geolocation은 DNS 질의의 추정 위치를 관리자가 지정한 리소스로 매핑한다. 국가별로 가까운 리전을 지정할 수 있지만, 이 정책 자체가 매 요청의 최저 지연 리전을 측정해 고르는 것은 아니다.

- 국가와 대륙 레코드가 겹치면 더 작은 지리 범위가 우선한다. 예를 들어 유럽 전체와 특정 유럽 국가를 서로 다른 리소스로 보낼 수 있다.
- 위치를 식별하지 못한 IP와 별도 레코드가 없는 지역을 처리하려면 `Default` 레코드를 둔다. 이 기본 레코드가 없으면 해당 질의에 `no answer`가 반환될 수 있다.
- 지연 최적화가 목적이면 Latency-based 정책을 검토한다. 이 정책도 사용자와 AWS 데이터센터 사이에서 일정 기간 수집한 지연 데이터를 사용하며, 애플리케이션의 실시간 응답시간을 직접 비교하는 정책은 아니다.

적용 검증에서는 DNS가 선택한 리전과 실제 페이지/API 응답시간을 따로 측정한다. 웹 서버만 여러 리전에 배치하고 그 서버가 호출하는 API나 DB가 한 리전에 남아 있다면, 후속 호출 경로도 별도로 확인해야 한다. 이는 DNS 정책의 보장 사항이 아니라 서비스 전체 경로를 점검하기 위한 설계 체크포인트다. 이번 대조는 이 절과 기존 라우팅 표의 관련 두 정책에 한정하며 frontmatter의 기존 검증일은 유지한다.

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
  - **App Runner** 서비스
  - **OpenSearch Service** 커스텀 도메인
  - **AppSync** 도메인 이름
  - 동일 호스팅 영역의 같은 타입 Route 53 레코드

### CNAME vs Alias

| 기준 | CNAME | Alias |
|------|-------|-------|
| 대상 | 모든 도메인 (AWS, 외부) | 지원되는 AWS 리소스 또는 같은 영역의 호환 레코드 |
| **루트 도메인**(zone apex) | **지정 불가** (`example.com` 불가) | **지정 가능** |
| 비용 | 일반 DNS 쿼리 요금 | 지원되는 AWS 리소스 대상 Alias 쿼리는 Route 53 쿼리 요금 없음 |
| Health Check | 레코드에 직접 연결하지 않음 | 대상 종류에 따라 Evaluate Target Health 또는 별도 상태 확인 구성 가능 |

- 루트 도메인(`example.com`)에는 CNAME을 만들 수 없다. ELB, CloudFront처럼 DNS 이름을 가진 지원 리소스에 연결할 때 Alias를 사용하며, 루트 A/AAAA 레코드에 IP 주소를 직접 넣는 구성도 가능하다.

## 삭제한 S3 버킷을 가리키는 DNS

2026-10-07 AWS 공식 문서 기준, S3 endpoint로 향하는 CNAME이나 Alias를 남긴 채 대응 버킷을 삭제하면 다른 계정이 같은 이름의 버킷을 만들어 해당 도메인으로 콘텐츠를 제공할 수 있다. 이는 도메인 등록 소유권 이전이 아니라 남은 DNS와 재사용된 버킷 이름의 결합이다.

운영에서는 버킷 폐기와 DNS 정리를 함께 관리한다. 이미 다른 계정으로 요청이 가면 해당 레코드를 제거하거나 통제 가능한 대상으로 바꾸고, DNS 캐시가 갱신될 때까지 기존 요청이 남을 수 있음을 고려한다. 도메인 소유만으로 기존 이름의 S3 버킷을 되찾을 수 있다고 가정하지 않는다.

- **새 이름 사용**: 소유한 새 서브도메인과 일치하는 버킷을 먼저 확보한 뒤 S3 website endpoint로 연결한다.
- **기존 이름 유지**: 통제하는 S3 버킷을 origin으로 둔 CloudFront에 기존 서브도메인을 alternate domain name으로 등록하고, 그 이름을 포함한 TLS 인증서와 Route 53 Alias를 연결한다.
- **비공개 origin**: CloudFront OAC를 쓸 때는 일반 S3 bucket origin을 사용한다. S3 website endpoint는 custom origin이며 OAC/OAI를 지원하지 않는다.

## Health Check

- 엔드포인트 상태를 주기적으로 감시 → 실패 시 라우팅에서 자동 제외
- 종류
  - **Endpoint** — 특정 IP, 도메인 직접 헬스체크
  - **Calculated** — 부모 헬스체크가 자식 헬스체크(최대 255개)를 감시해 헬시인 자식 수가 지정 임계값 이상이면 healthy
  - **CloudWatch Alarm** — CloudWatch 알람이 보는 지표 데이터 스트림을 헬스체크로 활용
  - **ARC 라우팅 컨트롤** — Application Recovery Controller의 라우팅 컨트롤(on/off 스위치)을 페일오버 레코드에 연결
- 엔드포인트 상태 확인은 전 세계에 분산된 Health Checker가 점검하고 결과를 취합 → 헬시로 보고한 비율이 18%를 넘으면 healthy, 18% 이하면 unhealthy (AWS는 이 값이 바뀔 수 있다고 명시. Calculated, CloudWatch, ARC는 위의 각자 기준으로 판정)
- 페일오버, Multi-Value Answer 정책과 함께 쓸 때 핵심

## DNSSEC

- **DNS 응답을 디지털 서명**으로 검증해 DNS 스푸핑, 캐시 포이즈닝 방어
- Route 53에서 호스팅 영역 단위로 활성화 가능 (서명 키 관리 자동화)
- 퍼블릭 호스팅 영역 서명에는 `us-east-1`의 고객 관리형 KMS 키가 필요하며 키 사양은 `ECC_NIST_P256`, 용도는 `SIGN_VERIFY`여야 한다.

## 시험 체크포인트

- AWS 리소스를 도메인에 연결 + **루트 도메인** 사용 → **Alias 레코드** (CNAME 불가)
- AWS의 지연 데이터로 응답 리전을 선택 → **Latency-based** (지리적 최단 거리나 앱 전체 응답시간 보장은 아님)
- **국가, 대륙별로 다른 서버** → **Geolocation**
- **거리 + 특정 리전에 트래픽 더 보내기** → **Geo-proximity** (Bias 값 사용)
- **Primary 장애 시 Secondary로 자동 전환** → **Failover + Health Check**
- ELB 없이 **다수 IP에 분산 + 상태 감시** → **Multi-Value Answer**
- **A/B 테스트, 카나리 배포, 점진적 전환** → **Weighted**
- **특정 ISP, 클라이언트 IP 대역**을 지정 엔드포인트로 → **IP-based** (CIDR 컬렉션)
- **VPC 내부에서만 해석**되는 도메인 → **Private Hosted Zone**
- 하나의 Private Zone을 **여러 VPC에 공유** 가능
- 온프레미스에서 Private Zone 쿼리 → **Route 53 Resolver Endpoint**
- 비 Alias 레코드는 TTL을 명시하고, 장애 전환 목표와 쿼리 비용을 고려해 값을 정함. Alias TTL은 대상에서 상속
- DNS 스푸핑 방지 → **DNSSEC**
- Alias는 **지원 AWS 리소스 또는 같은 영역 레코드 + 루트 도메인 가능**. 요금과 상태 평가는 대상에 따라 확인
- CNAME은 **외부 도메인 가능 + 루트 도메인 불가 + 일반 DNS 쿼리 과금**

## 출처

- [Geolocation routing](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geo.html)
- [Alias와 비 Alias 레코드 선택](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html)
- [레코드 공통 값](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-shared.html)
- [Route 53 DNSSEC 서명 구성](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-cmk-requirements.html)
- [Geo-proximity routing](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geoproximity.html)
- [Simple routing](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-simple.html)
- [Multivalue answer routing](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-multivalue.html)
- [Choosing a routing policy](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)
- [IP-based routing](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-ipbased.html)
- [Latency-based routing](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-latency.html)
- [Route 53 상태 확인 종류](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-types.html)
- [상태 확인의 healthy 판정 방식](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html)
- [Virtual hosting of general purpose buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html)
- [Routing traffic to an Amazon CloudFront distribution by using your domain name](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html)
- [Restrict access to an Amazon S3 origin](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [Stop subdomain routing to a different AWS account — AWS re:Post](https://repost.aws/knowledge-center/route-53-stop-routing-different-account)

## 관련 문서

- [[CloudFront]]
- [[ELB]]
- [[VPC]]
- [[CDN]]
- [[DNS]]
