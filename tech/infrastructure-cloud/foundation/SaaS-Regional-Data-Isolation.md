---
tags: [infrastructure, cloud, saas, multi-tenant, data-residency, isolation]
status: done
verified_at: 2026-10-07
category: "Infrastructure - 클라우드 기초"
aliases: ["SaaS Regional Data Isolation", "SaaS 리전별 데이터 격리"]
---

# SaaS 리전별 데이터 격리

데이터 거주성(data residency)은 저장과 처리 위치의 경계다. 테넌트 격리는 고객 사이의 접근 경계다. 같은 리전에 있다는 이유로 고객 데이터가 격리되거나, 고객별 인프라를 분리했다는 이유로 요구한 지역 안에 데이터가 머무는 것은 아니다.

## 운영 기능과 고객 워크로드

SaaS의 control plane은 온보딩, 인증, 테넌트 관리와 운영 분석 같은 공통 기능을 맡는다. application plane은 고객이 사용하는 기능, 업무 처리와 데이터를 맡는다. control plane은 관리자 화면만을 뜻하지 않으며 API와 운영 서비스도 포함한다.

중앙에서 고객을 관리하면서 application plane을 요구한 리전에 배치할 수 있다. 다만 고객 식별 정보와 사용량 같은 메타데이터에도 위치 제약이 있으면 control plane의 저장과 처리 위치를 따로 결정해야 한다.

## 리전 안의 격리 방식

| 방식 | 자원 배치 | 검토할 비용과 경계 |
|---|---|---|
| Pool | 여러 테넌트가 자원 공유 | 자원 효율을 얻지만 요청과 데이터 접근마다 테넌트 경계를 강제해야 함 |
| Silo | 테넌트별 전용 자원 | 분리 경계가 명확하지만 테넌트마다 배포, 관측과 용량 관리 부담이 생김 |
| Bridge | 계층 또는 서비스별로 두 방식 혼합 | 웹 계층 공유와 저장소 분리처럼 요구에 맞출 수 있지만 경계별 정책을 함께 관리해야 함 |

리전 선택과 격리 방식은 독립적인 결정이다. 특정 지역에 전용 데이터 저장소를 두더라도 공유 API, 작업 큐와 운영 도구가 다른 테넌트나 지역의 데이터를 섞지 않는지 확인한다. URL의 테넌트 이름만으로 접근 권한을 결정하지 않는다.

## 데이터 경로 전체를 확인한다

다음은 배치와 복제 원칙에서 도출한 설계 점검 제안이다.

1. 데이터 종류별로 허용한 저장 위치와 처리 위치를 기록한다. 업무 원본, 결과, 로그와 운영 메타데이터를 구분한다.
2. 입력 수집부터 처리, 결과 반환까지 실제 경로를 그린다. 외부 API와 AI 추론으로 보내는 데이터도 포함한다.
3. 백업, 복제와 장애 복구 목적지를 확인한다. 평상시 리전만 맞아도 장애 전환이 허용 범위를 벗어날 수 있다.
4. 중앙 운영 기능과 연결이 끊겼을 때 고객 기능이 어디까지 지속되는지 확인한다. 인증, 설정 조회와 작업 실행의 의존성을 나눈다.
5. 지역 배치와 별개로 운영자의 접근 권한, 암호화 키와 감사 기록을 검토한다.

복제 전략은 RPO, 데이터 정합성과 위치 제약을 함께 만족하도록 정한다. 복구 속도만을 이유로 허용하지 않은 지역에 사본을 만들지 않는다. 모든 유전체 또는 의료 데이터에 같은 반출 금지가 적용된다고 일반화하지 않으며, 특정 클라우드나 리전 선택을 법률 준수의 증명으로 쓰지 않는다.

## 데이터 위치와 운영 주권의 경계

데이터 저장 리전을 정하는 것과 계정, 인증, 과금, 운영 지원의 의존성을 분리하는 것은 다른 설계다. 운영 주권 요구가 있으면 업무 데이터 외에 제어 기능과 운영자 접근 경계도 확인한다.

AWS European Sovereign Cloud의 설계는 별도 파티션과 독립된 계정, identity, 과금 시스템을 두는 사례다. 글로벌 AWS 계정과 분리된 계정이 필요하며, 고객이 자원을 관리하며 만드는 역할, 권한과 설정 같은 메타데이터도 EU 안에 유지하는 경계를 제시한다. 고객 콘텐츠는 고객이 달리 선택하지 않는 한 해당 경계 안에서 저장하고 처리하도록 설계됐다(2026-10-07 설계 문서 확인).

이를 SaaS에 적용할 때는 다음을 별도로 검토한다.

- 고객 인증과 운영 도구가 다른 파티션이나 외부 서비스에 의존하는가
- 로그, 백업, 지원 과정의 자료 전달까지 허용한 위치와 접근 조건을 만족하는가
- 고객이 선택한 외부 전송이나 원격 접근이 원래의 데이터 경계를 바꾸는가

위 항목은 설계 검토 제안이다. 별도 파티션을 선택했다는 사실만으로 애플리케이션의 모든 데이터 경로나 법률상 의무를 충족했다고 판단하지 않는다.

## 적용 예시

대용량 분석 서비스에서 원본 파일, 분석 작업과 결과는 허용된 리전에 두고 중앙 control plane에는 관리에 필요한 최소 정보만 전달하는 구성을 검토할 수 있다. 어떤 정보를 전달할 수 있는지는 해당 데이터의 요구사항으로 결정한다. 이는 설계 예시이며 특정 의료기관의 실제 배포를 재현한 구성이 아니다.

처리 성능도 별도로 측정한다. 클라우드로 옮긴 특정 사례의 배속을 다른 입력과 파이프라인에 보장값으로 적용하지 않는다. 위치와 접근 조건을 만족하는 환경 안에서 기준 입력, 처리 결과와 실행 시간을 비교한다.

## 출처

- [AWS European Sovereign Cloud, Design approach](https://docs.aws.amazon.com/whitepapers/latest/overview-aws-european-sovereign-cloud/design-approach.html)
- [AWS SaaS Architecture Fundamentals, Control plane vs. application plane](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/control-plane-vs.-application-plane.html)
- [AWS SaaS Tenant Isolation Strategies, Pool isolation](https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/pool-isolation.html)
- [AWS SaaS Tenant Isolation Strategies, Silo isolation](https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/silo-isolation.html)
- [AWS SaaS Tenant Isolation Strategies, The bridge model](https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/the-bridge-model.html)
- [SaaS design levers for sovereignty on AWS — AWS Public Sector Blog](https://aws.amazon.com/blogs/publicsector/saas-design-levers-for-sovereignty-on-aws/)
- [AWS Well-Architected, Understand factors that determine your data replication strategy](https://docs.aws.amazon.com/wellarchitected/latest/data-residency-hybrid-cloud-services-lens/drhcops03-bp02.html)

## 관련 문서

- [[Cloud-Service-Models|서비스 계층과 운영 책임]]
- [[Access-Control-Models|요청과 자원에 대한 인가]]
- [[HealthOmics-Workflows|분석 실행과 결과 검증]]
- [[Cloud-Migration-Strategies|전환 범위와 검증]]
