---
tags: [ai, saas, multi-tenancy, rag, bedrock, isolation, sagemaker, marketplace]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["생성형 AI 멀티테넌시", "Generative AI Multi-Tenancy"]
---

# 생성형 AI SaaS의 테넌트 격리

멀티테넌트 AI 서비스는 모델 호출뿐 아니라 원본 문서, 검색 결과와 도구 실행에도 테넌트 경계를 유지해야 한다. 로그인 성공은 신원 확인이며, 다른 고객의 데이터에 접근하지 못한다는 증거는 아니다. 공유 자원을 쓰더라도 접근할 수 있는 범위는 현재 테넌트로 제한한다.

## 배치와 접근 통제를 구분한다

Silo는 테넌트별 전용 자원, pool은 공유 자원, bridge는 둘을 섞는 구성이다. 전체 서비스에 하나의 모델을 강제하기보다 저장소와 검색, 실행 계층별 요구를 확인한다.

| 구성 | Bedrock Knowledge Bases 기반 RAG 예 | 절충 |
|---|---|---|
| Silo | 테넌트별 버킷, knowledge base와 벡터 저장소 | 개별 설정이 쉽지만 자원과 운영 부담이 늘어남 |
| Pool | knowledge base와 벡터 인덱스를 공유하고 테넌트 메타데이터로 검색 제한 | 공유 효율이 높지만 필터 누락과 자원 경합을 통제해야 함 |
| Bridge | S3 prefix, knowledge base와 인덱스는 테넌트별로 구분하고 collection은 공유 | 설정 분리와 공유 효율을 조합하지만 공유 계층의 경합은 남음 |

이는 공식 RAG 아키텍처의 구성 예다. Prefix나 인덱스 이름을 나눈 것만으로 접근 통제가 생기지는 않는다. 전용 자원도 다른 테넌트의 실행 역할이 접근할 수 있다면 격리가 깨진다.

## 고객 계정 배치와 테넌트 격리는 별개의 선택이다

SaaS Anywhere는 데이터나 애플리케이션 일부를 고객 환경에 배치하되 제공자의 공통 관리 계층(control plane)에서 운영하는 구성이다. Silo, pool, bridge가 자원 공유와 격리 방식을 나눈다면, 다음은 자원이 어느 계정에 놓이는지를 나눈다(2026-10-09 AWS 공개 아키텍처 대조).

| 배치 | 고객 계정 | 제공자 계정 |
|---|---|---|
| Distributed Data Store | 데이터 저장소 일부 또는 전체 | 애플리케이션과 관리 계층 |
| Distributed Application Plane | 일부 애플리케이션 서비스와 필요한 저장소 | 나머지 서비스와 관리 계층 |
| Remote Application Plane | 애플리케이션 전체와 저장소 | 공통 관리 계층 |

고객 계정에 옮기면 온보딩 권한, 업데이트, 계정 간 관측과 장애 대응의 책임을 함께 정해야 한다. 배치 범위는 고객 환경에 있어야 하는 자원으로 좁힌다. 생성형 AI에 적용할 때는 원본 저장소 위치 외에 검색 결과가 전달되는 추론 경로와 로그도 따로 확인한다(설계 점검). 저장소만 고객 계정에 둔 사실은 모델로 데이터가 전달되지 않는다는 보장이 아니다.

## 공급자와 고객이 데이터와 가중치를 서로 넘기지 않는 모델 제공

모델 공급자가 고객 데이터로 추론하거나 미세조정해 주는 사업에서는 고객이 학습과 추론 데이터를, 공급자가 가중치와 학습 코드를 서로 넘기기 어렵다. AWS Marketplace를 거쳐 고객 계정의 SageMaker AI에서 실행하는 모델과 알고리즘 제품은 두 방향을 함께 막는 배치의 예다. 다만 구매자 데이터로 학습하는 알고리즘 제품에서 학습된 가중치의 보호는 판매자의 산출물 암호화에 달려 있다(2026-10-13 AWS 공식 문서 대조).

- **양방향 보호:** 제품은 구매자 계정의 SageMaker AI에서 실행되므로 판매자는 구매자의 추론 데이터에 접근할 수 없다. 구매자는 AWS 서비스 endpoint로만 제품을 쓰며 판매자가 게시한 컨테이너 이미지와 모델 패키지 아티팩트를 직접 가져가거나 기반 인프라에 접근할 수 없다. SageMaker JumpStart의 독점 모델도 가중치와 스크립트를 보여 주지 않는다.
- **네트워크 격리:** Marketplace 리소스로 학습과 추론을 하려면 network isolation이 필수다. 컨테이너는 인터넷, VPC endpoint와 S3를 포함한 어떤 서비스로도 나가는 호출을 할 수 없고 AWS 자격 증명도 받지 않는다. S3 입출력은 SageMaker AI가 컨테이너 밖에서 작업을 만든 구매자의 실행 역할로 처리하며, VPC와 함께 쓰면 데이터와 아티팩트의 내려받기와 올리기가 구매자 VPC 서브넷을 거친다. 그래서 공급자는 의존성을 이미지에 넣어야 하고, 학습 산출물을 암호화한다면 그 키도 이미지에 넣어야 한다.
- **이 배치의 대가:** Marketplace 모델과 알고리즘은 네트워크 연결이 필요한 Serverless Inference endpoint에 배포할 수 없다. 실시간 endpoint의 호출당 한도(입력 25MB, 처리 60초, 스트리밍 응답 8분)는 SageMaker AI의 일반 실시간 추론 한도와 같은 값이라 이 배치만의 대가로 보지 않는다.
- **학습 산출물:** 알고리즘 제품으로 구매자 데이터를 학습하면 모델 아티팩트는 구매자가 정한 S3 경로에 저장되고, 구매자는 판매자의 추론 이미지로 그 모델을 배포한다. AWS는 아티팩트에 담긴 판매자의 지식재산을 보호하려면 출력 전에 암호화하라고 권하지만 강제하지 않는다. 암호화하지 않은 산출물은 구매자 계정에 읽을 수 있는 형태로 남는다(문서에서 도출).
- **과금:** 판매자가 정한 소프트웨어 요금에 사용한 인스턴스 기준의 SageMaker AI 인프라 요금이 더해진다. 세부 요금 방식은 Marketplace 머신러닝 상품 요금 문서를 따른다.

다음은 이 배치를 고를 때의 설계 점검이다.

- 판매자가 산출물을 암호화했다면 고객 데이터로 만든 모델이라도 판매자 이미지 없이는 쓰지 못할 수 있다. 반대로 암호화하지 않았다면 학습된 가중치가 구매자 쪽에 남는다. 어느 쪽인지와 구독 해지 뒤의 사용, 이전과 삭제 조건을 계약에서 확인한다.
- 앞의 고객 계정 배치는 제공자의 관리 계층이 고객 환경을 운영하지만, 이 배치는 런타임의 외부 연결 자체를 막는다. 품질 감시와 장애 분석을 구매자 계정의 로그와 지원 절차로 설계한다.
- 네트워크 격리는 판매자 컨테이너가 데이터를 밖으로 보내는 경로를 막을 뿐이다. 구매자 계정 안의 저장 위치, 권한과 로그 보관은 구매자가 따로 통제한다. 미세조정한 모델이 학습 데이터를 재현할 위험은 [[Bedrock-Private-Access#모델 커스터마이징의 저장소와 암호화 키를 나눈다|Bedrock 모델 커스터마이징]]을 참고한다. Bedrock 사용자 지정 모델과 산출물 저장 위치는 다르므로 재현 위험의 원리만 적용한다.

## 검색 전에 테넌트 범위를 확정한다

다음은 격리 원칙을 적용한 설계 체크포인트다.

1. 서버가 검증한 신원과 테넌트 소속으로 접근 범위를 결정한다. 요청 본문이나 모델이 제시한 테넌트 ID를 그대로 신뢰하지 않는다.
2. 전용 knowledge base는 서버의 테넌트 매핑으로 선택하고, 공유 인덱스는 서버가 테넌트 필터를 강제한다.
3. 검색 결과를 프롬프트에 넣기 전에 권한을 제한한다. 다른 고객의 문서를 모델에 준 뒤 답변에서 숨기는 방식은 격리가 아니다.
4. 원본 저장소와 벡터 저장소, 도구 호출 권한까지 같은 경계를 적용한다. 공유 실행 계층에서는 요청별로 범위를 좁힌 자격 증명이나 별도 접근 통제 계층을 검토한다.

Pool은 검색 필터를 빠뜨릴 수 없는 공통 호출 경로가 필요하다. Silo는 자원 수 증가와 배포, 삭제 절차를 관리해야 한다. 선택 기준은 고객 수만이 아니라 데이터 경계, 개별 설정 요구와 운영 부담이다.

### 요청별 임시 자격 증명의 범위

2026-10-10 AWS STS `AssumeRole` API 문서 대조 기준. 역할의 trust policy는 누가 역할을 맡을 수 있는지, permissions policy는 그 역할로 무엇을 할 수 있는지를 정한다. 호출에 session policy를 전달하면 역할의 identity-based policy가 허용한 권한과 교집합을 이루며, session policy로 역할의 권한을 늘릴 수는 없다.

이를 테넌트 격리에 적용할 때는 서버가 검증한 테넌트와 허용 자원을 연결해 session policy를 만들고, 발급한 자격 증명을 해당 요청의 하위 호출에 사용한다(설계 제안). JWT를 전달하거나 모델 ID를 테넌트별로 저장하는 것만으로 이 정책이 자동 생성되지는 않는다. 리소스 기반 정책을 포함한 실제 인가 경로도 별도로 검토한다.

테스트에서는 고객 A의 요청으로 고객 B의 모델이나 저장소를 직접 지정하는 경우와, 동시 요청 사이에 자격 증명이 섞이는 경우를 확인한다. 임시 자격 증명 발급 성공과 교차 테넌트 접근 차단은 서로 다른 검증 결과다.

## 같은 테넌트 안에서도 문서 권한을 나눈다

회사 단위 격리를 통과해도 모든 직원이 같은 문서를 볼 수 있는 것은 아니다. 부서, 역할과 개별 허용 범위로 검색 대상을 더 좁힌다. API 호출 권한과 문서 열람 권한도 별도로 판정한다.

2026-10-13 AWS 공개 아키텍처 대조 기준, Amazon Verified Permissions의 Cedar 정책으로 요청자의 허용 부서를 판정하고, 미들웨어가 그 결과를 Bedrock `RetrieveAndGenerate`의 메타데이터 필터로 변환하는 구성이 있다. 이는 한 조직 내부의 논리적 문서 격리다. 필터 생성 경로가 실패하면 유출될 수 있으므로, 고객 간 IAM 자원 경계가 필요한 요구를 이 구성만으로 충족했다고 보지 않는다.

Bedrock `RetrievalFilter` 명세 기준, `equals`와 `in`은 지정한 키와 허용 값에 맞는 문서를 선택하고, `andAll`은 조건들을 모두 만족하도록 결합한다. 반면 `notEquals`는 해당 키가 없는 문서도 반환한다. 따라서 금지 부서 하나를 제외하는 조건과 허용 부서만 선택하는 조건은 같지 않다.

다음은 이 구성을 적용할 때의 설계 점검이다.

- 서버가 확인한 테넌트 경계 안에서 사용자별 허용 범위를 적용한다. 질문이나 모델 출력으로 그 범위를 넓히지 않는다.
- 권한 조회 실패나 허용 범위가 빈 경우에는 검색을 중단한다. 필터를 생략한 재시도를 허용하지 않는다.
- 다른 부서 문서, 권한 메타데이터가 없는 문서, 권한 철회 뒤의 요청을 시험한다. 인가 캐시와 검색 색인의 갱신 지연도 확인한다.

## 요청 수와 토큰 사용량을 따로 제한한다

동일한 요청 한 건도 입력 길이와 출력 길이, 재시도에 따라 사용량이 달라진다. 호출별 테넌트와 모델, 입력과 출력 토큰을 연결하는 계측은 [[LLM-Cost-Optimization|LLM 비용 최적화]]를 따른다. 비용 귀속과 고객에게 청구할 가격은 별개의 판단이다.

API Gateway REST API의 usage plan은 요청 수 기반이며 throttling과 quota는 best effort다. 이를 비용의 강제 상한이나 인증 수단으로 취급하지 않는다. 엄격한 사용량 제한이 필요하면 애플리케이션이 동시 실행, 입력과 출력 길이, 재시도 및 토큰 예산을 함께 통제해야 한다(설계 제안). 사후 집계만으로는 집계 사이에 시작된 동시 요청을 막을 수 없다.

## 이해 확인

- 정상 로그인한 고객이 다른 테넌트 ID로 검색하면 어느 계층이 차단하는가?
- 전용 knowledge base를 두어도 공유 collection의 성능 경합이 남는 이유는 무엇인가?
- 요청 수 제한을 통과한 긴 프롬프트와 반복 호출의 비용을 어떻게 계측하고 제한하는가?
- 공급자는 가중치를, 고객은 데이터를 넘기지 않으려 할 때 어떤 배치가 두 조건을 함께 만족하며, 그 대가로 무엇을 포기하는가?

## 출처

- [Secure multi-tenant RAG with Amazon Bedrock and Verified Permissions — AWS](https://aws.amazon.com/blogs/architecture/secure-multi-tenant-rag-with-amazon-bedrock-and-verified-permissions/) — 2026-10-13 조직 내부 문서 권한과 논리적 격리의 한계를 대조했다. 기존 본문 전체의 재검증은 아니다.
- [Amazon Bedrock, RetrievalFilter](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrievalFilter.html) — 2026-10-13 허용 값 필터, 조건 결합과 `notEquals`의 키 누락 동작을 대조했다. 실패 처리와 테스트 항목은 설계 제안이다.
- [AWS STS, AssumeRole](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) — 역할 정책과 session policy의 범위를 대조했다. 테넌트 매핑과 교차 접근 테스트는 설계 제안이며 기존 본문 전체의 재검증은 아니다.
- [Patterns for Deploying SaaS in Remote Environments — AWS](https://aws.amazon.com/blogs/apn/patterns-for-deploying-saas-in-remote-environments/) — 2026-10-09 고객 계정 배치 세 유형과 공통 운영 책임을 대조했다. 추론 경로와 로그 점검은 생성형 AI에 적용한 설계 제안이며 기존 본문 전체의 재검증은 아니다.
- [AWS, SaaS Architecture Fundamentals: Tenant isolation](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/tenant-isolation.html)
- [Multi-tenant RAG with Amazon Bedrock Knowledge Bases — AWS](https://aws.amazon.com/blogs/machine-learning/multi-tenant-rag-with-amazon-bedrock-knowledge-bases/)
- [Amazon API Gateway, Usage plans and API keys for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html)
- [AWS Marketplace, Security and intellectual property with Amazon SageMaker AI](https://docs.aws.amazon.com/marketplace/latest/userguide/ml-security-and-intellectual-property.html) — 2026-10-13 구매자 계정 실행, 이미지와 아티팩트 비공개, 산출물 저장 위치와 암호화 키 포함을 대조했다.
- [AWS Marketplace, Service restrictions and quotas for machine learning products](https://docs.aws.amazon.com/marketplace/latest/userguide/ml-service-restrictions-and-limits.html) — 2026-10-13 Serverless Inference 배포 불가와 호출당 입력, 처리 시간 상한을 대조했다.
- [Amazon SageMaker AI, Inference options](https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model-options.html) — 실시간 추론의 일반 입력과 처리 시간 한도
- [AWS Marketplace, Machine learning product pricing](https://docs.aws.amazon.com/marketplace/latest/userguide/machine-learning-pricing.html) — 판매자 소프트웨어 요금과 구매자 인프라 요금의 구성
- [Amazon SageMaker AI, Run Training and Inference Containers in Internet-Free Mode](https://docs.aws.amazon.com/sagemaker/latest/dg/mkt-algo-model-internet-free.html) — 2026-10-13 Marketplace 리소스의 network isolation 필수, 자격 증명 미제공과 S3 입출력 처리를 대조했다.
- [AWS, Amazon SageMaker AI FAQs](https://aws.amazon.com/sagemaker/ai/faqs/) — 2026-10-13 판매자와 구매자 사이 데이터와 가중치 비공유, 독점 모델의 가중치 비공개와 과금 구성을 대조했다.
- [\[Keynote\] Game-Changing Generative AI for Games — Amazon Web Services Korea](https://www.youtube.com/watch?v=vrLANVrx8KM) — 고객 데이터와 공급자 노하우를 서로 넘기기 꺼리는 문제 제기를 계기로 삼았다. 해결 구조는 위 공식 문서로 정리했다.

## 관련 문서

- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
- [[LLM-Cost-Optimization|LLM 비용 최적화]]
- [[Bedrock-Private-Access|Bedrock 비공개 연결]]
- [[Data-Flywheel-Moat|데이터 플라이휠과 해자]]
