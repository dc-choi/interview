---
tags: [infrastructure, cloud, saas, multi-tenant, data-residency, isolation]
status: done
verified_at: 2026-10-09
category: "Infrastructure - 클라우드 기초"
aliases: ["SaaS Regional Data Isolation", "SaaS 리전별 데이터 격리"]
---

# SaaS 리전별 데이터 격리

데이터 거주성(data residency)은 저장과 처리 위치의 경계다. 테넌트 격리는 고객 사이의 접근 경계다. 같은 리전에 있다는 이유로 고객 데이터가 격리되거나, 고객별 인프라를 분리했다는 이유로 요구한 지역 안에 데이터가 머무는 것은 아니다.

## 운영 기능과 고객 워크로드

SaaS의 control plane은 온보딩, 인증, 테넌트 관리와 운영 분석 같은 공통 기능을 맡는다. application plane은 고객이 사용하는 기능, 업무 처리와 데이터를 맡는다. control plane은 관리자 화면만을 뜻하지 않으며 API와 운영 서비스도 포함한다.

중앙에서 고객을 관리하면서 application plane을 요구한 리전에 배치할 수 있다. 다만 고객 식별 정보와 사용량 같은 메타데이터에도 위치 제약이 있으면 control plane의 저장과 처리 위치를 따로 결정해야 한다.

### 온보딩 접수와 고객 자원 준비의 경계

부분 검증(2026-10-13): AWS SaaS Architecture Fundamentals는 온보딩을 조정하는 공통 기능과 고객 자원을 프로비저닝하는 application plane의 책임을 구분한다. 전용 자원을 쓰는 silo 방식도 공통 identity, 온보딩, 배포와 운영 체계로 관리하면 SaaS가 될 수 있다. 자원 공유 여부만으로 SaaS 여부를 판단하지 않는다.

전용 환경의 온보딩에는 고객별 인프라 생성과 경우에 따른 계정 한도 조정이 더해진다. 운영 설계에서는 가입 접수, 자원 생성, 테넌트 권한 연결과 실제 이용 준비를 별도 상태로 추적하는 방식을 검토한다. 중간 실패 시 재시도와 남은 자원 처리를 시험하고, 고객 계정 생성만으로 서비스 준비 완료를 알리지 않는다(설계 점검 제안). 이 절만 대조했으며 기존 데이터 위치 정책의 검증일은 유지한다.

## 리전 안의 격리 방식

| 방식 | 자원 배치 | 검토할 비용과 경계 |
|---|---|---|
| Pool | 여러 테넌트가 자원 공유 | 자원 효율을 얻지만 요청과 데이터 접근마다 테넌트 경계를 강제해야 함 |
| Silo | 테넌트별 전용 자원 | 분리 경계가 명확하지만 테넌트마다 배포, 관측과 용량 관리 부담이 생김 |
| Bridge | 계층 또는 서비스별로 두 방식 혼합 | 웹 계층 공유와 저장소 분리처럼 요구에 맞출 수 있지만 경계별 정책을 함께 관리해야 함 |

리전 선택과 격리 방식은 독립적인 결정이다. 특정 지역에 전용 데이터 저장소를 두더라도 공유 API, 작업 큐와 운영 도구가 다른 테넌트나 지역의 데이터를 섞지 않는지 확인한다. URL의 테넌트 이름만으로 접근 권한을 결정하지 않는다.

## 테넌트 컨텍스트를 서비스 경계 너머로 전달한다

부분 검증(2026-10-09): AWS의 SaaS identity와 tenant isolation 문서를 대조했다. 인증된 사용자와 테넌트의 연결은 요청을 처리하는 서비스에도 전달되어야 한다. 이 컨텍스트는 테넌트별 로그, 지표, 사용량 계측과 자원 접근 제한에 쓰인다.

인증 성공이나 기능별 역할 권한만으로 테넌트 격리가 성립하지는 않는다. 예를 들어 보고서를 조회할 역할이 있는 사용자라도 다른 고객의 보고서를 읽어서는 안 된다. 자원 접근 시 현재 테넌트의 범위를 적용해야 한다.

리전별 application plane에 적용할 때는 다음을 점검한다(설계 제안).

- 요청의 테넌트와 허용 리전을 검증한 뒤 대상 자원으로 라우팅한다. 클라이언트가 보낸 테넌트 식별자를 검증 없이 권한으로 쓰지 않는다.
- 내부 서비스 호출과 비동기 작업에도 검증된 테넌트 컨텍스트를 전달한다. 재시도나 배치 처리에서 이 값이 누락되거나 다른 고객의 값과 섞이는지 확인한다.
- 같은 역할을 가진 두 테넌트로 교차 접근을 시험한다. 정상 조회 성공과 다른 테넌트의 자원 접근 차단을 각각 확인한다.

SaaS Builder Toolkit for AWS는 control plane과 application plane의 패턴을 CDK 기반 구성요소로 제공한다. 공식 저장소는 이를 sample code로 규정하고 운영 배포 전 조직 기준에 맞는 인가와 보안 구현을 요구한다. 툴킷 도입 자체를 격리나 데이터 위치 요구 충족의 증거로 삼지 않는다.

## Kubernetes 배치 단위와 접근 통제를 구분한다

부분 검증(2026-10-13): Kubernetes 멀티테넌시와 Amazon EKS IRSA 공식 문서를 대조했다. Namespace는 클러스터 안의 논리적 관리 단위다. Namespace를 나눴다는 사실만으로 테넌트의 네트워크, AWS 자원과 실행 환경이 모두 격리되지는 않는다.

| 경계 | 필요한 통제와 한계 |
|---|---|
| Kubernetes API 접근 | RBAC로 사용자와 service account의 접근 범위를 제한한다. Namespace 생성만으로 다른 고객의 API 자원 접근이 차단됐다고 판단하지 않는다 |
| Pod 사이 통신 | NetworkPolicy로 허용 경로를 정하고 이를 집행하는 CNI 지원을 확인한다. 지원하지 않는 플러그인에서는 정책 객체가 있어도 집행되지 않는다 |
| AWS 자원 접근 | IRSA는 service account에 IAM role을 연결한다. 테넌트별 S3 경로나 DynamoDB 자원처럼 실제 접근 대상을 IAM 정책에서 제한해야 한다 |
| 노드의 자격 증명과 실행 환경 | IMDS 접근이 제한되지 않으면 Pod가 노드 IAM role 자격 증명에도 접근할 수 있다. IRSA를 사용해도 같은 노드의 Pod는 커널을 공유하므로 컨테이너 자체가 보안 경계로 바뀌지는 않는다 |

적용 점검 제안: 테넌트 A의 Pod에서 테넌트 B의 API, 저장소와 네트워크 목적지 접근이 각각 거부되는지 시험한다. 한 계층의 거부 결과로 다른 계층의 격리를 대신 증명하지 않는다. 여러 고객 요청을 받는 공유 Pod에서는 IRSA role 연결만으로 요청별 테넌트 인가가 끝났다고 보지 않고 애플리케이션의 접근 경계도 검증한다. 이 절은 격리 설계의 점검 기준이며 배포 시험이나 데이터 위치 정책 전체의 재검증 결과가 아니다. 기존 `verified_at`은 유지한다.

## 데이터 경로 전체를 확인한다

다음은 배치와 복제 원칙에서 도출한 설계 점검 제안이다.

1. 데이터 종류별로 허용한 저장 위치와 처리 위치를 기록한다. 업무 원본, 결과, 로그와 운영 메타데이터를 구분한다.
2. 입력 수집부터 처리, 결과 반환까지 실제 경로를 그린다. 외부 API와 AI 추론으로 보내는 데이터도 포함한다.
3. 백업, 복제와 장애 복구 목적지를 확인한다. 평상시 리전만 맞아도 장애 전환이 허용 범위를 벗어날 수 있다.
4. 중앙 운영 기능과 연결이 끊겼을 때 고객 기능이 어디까지 지속되는지 확인한다. 인증, 설정 조회와 작업 실행의 의존성을 나눈다.
5. 지역 배치와 별개로 운영자의 접근 권한, 암호화 키와 감사 기록을 검토한다.

복제 전략은 RPO, 데이터 정합성과 위치 제약을 함께 만족하도록 정한다. 복구 속도만을 이유로 허용하지 않은 지역에 사본을 만들지 않는다. 모든 유전체 또는 의료 데이터에 같은 반출 금지가 적용된다고 일반화하지 않으며, 특정 클라우드나 리전 선택을 법률 준수의 증명으로 쓰지 않는다.

### 테넌트의 저장 리전과 AI 추론 리전은 다를 수 있다

부분 검증(2026-10-13): Amazon Bedrock과 Qlik Cloud의 cross-region inference 문서를 대조했다. 서비스가 여러 리전에 배포된다는 사실만으로 모든 기능이 선택한 리전 안에서 처리된다고 판단하지 않는다. 이 절의 추론 경로만 대조했으며 기존 `verified_at`은 유지한다.

Bedrock의 geographic inference profile은 지정한 지리 범위 안에서, global profile은 전 세계의 지원 AWS 상용 리전에서 추론 요청을 처리할 수 있다. 지리 범위 제한과 단일 리전 고정은 다르다. 계정에서 수동 활성화하지 않은 리전도 처리 대상이 될 수 있으므로 계정의 활성 리전 목록만으로 추론 위치를 판단하지 않는다. Bedrock을 직접 호출하는 구성에서는 소스 리전의 CloudTrail 기록에 있는 `additionalEventData.inferenceRegion`으로 실제 처리 리전을 확인한다.

SaaS 사례로 Qlik Cloud는 cross-region inference를 활성화하면 테넌트 리전의 모델 가용성이나 용량에 따라 요청을 다른 리전으로 보내 처리한다. 해당 기능은 처리 리전에 데이터를 저장하거나 캐시하지 않는 일시적 처리로 설명되지만, 저장하지 않는다는 조건이 그 리전에서 처리하지 않는다는 뜻은 아니다. 기능별 목적지와 적용 기간은 공급자의 현재 처리 위치 표로 확인한다.

설계 점검 제안: 저장, 백업과 추론의 허용 위치를 따로 적고, AI 기능을 켤 때 입력에 포함되는 사용자 질문, 업무 데이터와 메타데이터의 전송 경로를 확인한다. 자체 Bedrock 호출의 로그 확인 방법을 관리형 SaaS 고객에게 그대로 요구하지 않으며, SaaS에서는 공급자가 제공하는 처리 위치와 설정 증거를 확인한다. 암호화나 일시적 처리만으로 위치 요구 충족을 판정하지 않는다.

## 데이터 위치와 운영 주권의 경계

데이터 저장 리전을 정하는 것과 계정, 인증, 과금, 운영 지원의 의존성을 분리하는 것은 다른 설계다. 운영 주권 요구가 있으면 업무 데이터 외에 제어 기능과 운영자 접근 경계도 확인한다.

AWS European Sovereign Cloud의 설계는 별도 파티션과 독립된 계정, identity, 과금 시스템을 두는 사례다. 글로벌 AWS 계정과 분리된 계정이 필요하며, 고객이 자원을 관리하며 만드는 역할, 권한과 설정 같은 메타데이터도 EU 안에 유지하는 경계를 제시한다. 고객 콘텐츠는 고객이 달리 선택하지 않는 한 해당 경계 안에서 저장하고 처리하도록 설계됐다(2026-10-07 설계 문서 확인).

이를 SaaS에 적용할 때는 다음을 별도로 검토한다.

- 고객 인증과 운영 도구가 다른 파티션이나 외부 서비스에 의존하는가
- 로그, 백업, 지원 과정의 자료 전달까지 허용한 위치와 접근 조건을 만족하는가
- 고객이 선택한 외부 전송이나 원격 접근이 원래의 데이터 경계를 바꾸는가

위 항목은 설계 검토 제안이다. 별도 파티션을 선택했다는 사실만으로 애플리케이션의 모든 데이터 경로나 법률상 의무를 충족했다고 판단하지 않는다.

### 고객 데이터와 공급자 운영 데이터의 경계

부분 검증(2026-10-10): AWS European Sovereign Cloud의 Design approach에서 데이터 경계를 대조했다. 고객 콘텐츠, 고객이 생성한 메타데이터와 AWS 자체 운영 데이터는 같은 범주가 아니다.

- S3에 저장한 이미지 파일은 고객 콘텐츠다. 버킷과 객체 이름, 권한과 태그는 고객이 생성한 메타데이터의 예다. 이 메타데이터는 EU 안에 유지하며 고객 승인 없이 EU 밖에서 접근하지 않는 경계를 둔다.
- 내부 시스템 지표처럼 고객 콘텐츠나 고객 생성 메타데이터에 해당하지 않는 AWS 운영 데이터 중 일부는 EU 밖으로 나갈 수 있다. 설계 문서는 용량 관리, 성능 모니터링과 보안 기능을 그 용도로 설명한다.

따라서 운영 주권을 검토할 때는 모든 종류의 데이터가 같은 위치와 접근 제한을 갖는다고 가정하지 않는다. 데이터 목록에 생성 주체, 데이터 범주, 저장과 처리 위치, 외부 접근 및 전송 조건을 함께 적어 요구사항과 대조한다(설계 점검 제안).

## 공급자 통제와 고객 구성의 검증을 나눈다

2026-10-10 AWS 책임 공유 모델 대조 기준. AWS의 물리 시설 통제처럼 상속하는 통제와, 고객이 자기 환경에서 구현해야 하는 통제는 다르다. 구성 관리도 AWS 인프라와 고객의 DB 및 애플리케이션에서 각각 책임이 있다. 따라서 공급자의 인증이나 평가 자료를 확보한 것만으로 SaaS의 데이터 격리 구성이 검증됐다고 판단하지 않는다.

SaaS 도입에서는 다음과 같이 책임과 증거를 연결할 수 있다(설계 점검 제안).

- 기반 클라우드, SaaS 운영자와 이용 조직 사이에서 계정 관리, 데이터 접근, 로그 보존 및 복구의 담당 범위를 명시한다. 구체적 분담은 사용하는 서비스와 계약으로 확인한다.
- 공급자 자료의 평가 대상과 기간을 확인하고, 실제 테넌트 설정과 데이터 경로에서 남는 통제를 찾는다.
- 리전, 외부 연동이나 업무 범위가 바뀌면 앞서 확인한 격리와 복구 조건이 유지되는지 다시 시험한다.

이 절은 기술 통제의 검증 방법이다. 특정 금융 업무의 SaaS 이용 허용 여부나 규제 절차를 판정하는 근거로 쓰지 않는다.

## 별도 파티션에서는 SaaS 연동 계약도 다시 확인한다

부분 검증(2026-10-10): AWS Marketplace의 European Sovereign Cloud 판매자 안내에서 SaaS 연동 요구를 대조했다. 이 절은 해당 Marketplace의 SaaS 등록과 연동 범위이며 모든 SaaS에 동일한 설정을 요구하는 것은 아니다.

해당 안내는 SaaS 연동에 `eusc-de-east-1`과 Marketplace EventBridge 이벤트를 사용하고, 상용 파티션 endpoint나 SNS 알림에 의존하지 않도록 명시한다. 상용 카탈로그와 ESC 카탈로그의 상품도 독립적으로 관리한다. 기존 상품이 상용 AWS에서 운영된다는 사실만으로 ESC 등록이나 연동이 완료된 것은 아니다.

이 차이를 전환 검토에 적용하면 배포 리전 외에 계정, API endpoint와 이벤트 수신 경로를 함께 점검해야 한다. 대상 파티션에서 구독부터 애플리케이션 제공까지 시험하고, 외부 API와 로그 전송이 요구한 데이터 경계를 벗어나지 않는지 확인하는 절차를 권한다. 특정 공급자의 출시 예고나 협력 발표를 실제 서비스 제공 범위 또는 법률 준수의 증거로 대신하지 않는다(설계 점검).

## 적용 예시

대용량 분석 서비스에서 원본 파일, 분석 작업과 결과는 허용된 리전에 두고 중앙 control plane에는 관리에 필요한 최소 정보만 전달하는 구성을 검토할 수 있다. 어떤 정보를 전달할 수 있는지는 해당 데이터의 요구사항으로 결정한다. 이는 설계 예시이며 특정 의료기관의 실제 배포를 재현한 구성이 아니다.

처리 성능도 별도로 측정한다. 클라우드로 옮긴 특정 사례의 배속을 다른 입력과 파이프라인에 보장값으로 적용하지 않는다. 위치와 접근 조건을 만족하는 환경 안에서 기준 입력, 처리 결과와 실행 시간을 비교한다.

## 출처

- [Amazon Bedrock, Route model inference requests across AWS Regions with cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html)
- [Qlik Cloud, Enabling cross-region inference](https://help.qlik.com/en-US/cloud-services/Subsystems/Hub/Content/Sense_Hub/Admin/cross-region-data-processing.htm)
- [Kubernetes, Multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/)
- [AWS, IAM roles for service accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [AWS Marketplace, Listing and Selling in AWS Marketplace for AWS European Sovereign Cloud](https://docs.aws.amazon.com/marketplace/latest/userguide/esc_seller_guide.html) — SaaS 연동의 endpoint와 이벤트 경로를 대조
- [Shared Responsibility Model — AWS](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [AWS SaaS Architecture Fundamentals, SaaS identity](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/saas-identity.html)
- [AWS SaaS Architecture Fundamentals, Tenant isolation](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/tenant-isolation.html)
- [SaaS Builder Toolkit for AWS — AWS Labs](https://github.com/awslabs/sbt-aws)
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
