---
tags: [ai, saas, multi-tenancy, rag, bedrock, isolation]
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

## 검색 전에 테넌트 범위를 확정한다

다음은 격리 원칙을 적용한 설계 체크포인트다.

1. 서버가 검증한 신원과 테넌트 소속으로 접근 범위를 결정한다. 요청 본문이나 모델이 제시한 테넌트 ID를 그대로 신뢰하지 않는다.
2. 전용 knowledge base는 서버의 테넌트 매핑으로 선택하고, 공유 인덱스는 서버가 테넌트 필터를 강제한다.
3. 검색 결과를 프롬프트에 넣기 전에 권한을 제한한다. 다른 고객의 문서를 모델에 준 뒤 답변에서 숨기는 방식은 격리가 아니다.
4. 원본 저장소와 벡터 저장소, 도구 호출 권한까지 같은 경계를 적용한다. 공유 실행 계층에서는 요청별로 범위를 좁힌 자격 증명이나 별도 접근 통제 계층을 검토한다.

Pool은 검색 필터를 빠뜨릴 수 없는 공통 호출 경로가 필요하다. Silo는 자원 수 증가와 배포, 삭제 절차를 관리해야 한다. 선택 기준은 고객 수만이 아니라 데이터 경계, 개별 설정 요구와 운영 부담이다.

## 요청 수와 토큰 사용량을 따로 제한한다

동일한 요청 한 건도 입력 길이와 출력 길이, 재시도에 따라 사용량이 달라진다. 호출별 테넌트와 모델, 입력과 출력 토큰을 연결하는 계측은 [[LLM-Cost-Optimization|LLM 비용 최적화]]를 따른다. 비용 귀속과 고객에게 청구할 가격은 별개의 판단이다.

API Gateway REST API의 usage plan은 요청 수 기반이며 throttling과 quota는 best effort다. 이를 비용의 강제 상한이나 인증 수단으로 취급하지 않는다. 엄격한 사용량 제한이 필요하면 애플리케이션이 동시 실행, 입력과 출력 길이, 재시도 및 토큰 예산을 함께 통제해야 한다(설계 제안). 사후 집계만으로는 집계 사이에 시작된 동시 요청을 막을 수 없다.

## 이해 확인

- 정상 로그인한 고객이 다른 테넌트 ID로 검색하면 어느 계층이 차단하는가?
- 전용 knowledge base를 두어도 공유 collection의 성능 경합이 남는 이유는 무엇인가?
- 요청 수 제한을 통과한 긴 프롬프트와 반복 호출의 비용을 어떻게 계측하고 제한하는가?

## 출처

- [Patterns for Deploying SaaS in Remote Environments — AWS](https://aws.amazon.com/blogs/apn/patterns-for-deploying-saas-in-remote-environments/) — 2026-10-09 고객 계정 배치 세 유형과 공통 운영 책임을 대조했다. 추론 경로와 로그 점검은 생성형 AI에 적용한 설계 제안이며 기존 본문 전체의 재검증은 아니다.
- [AWS, SaaS Architecture Fundamentals: Tenant isolation](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/tenant-isolation.html)
- [Multi-tenant RAG with Amazon Bedrock Knowledge Bases — AWS](https://aws.amazon.com/blogs/machine-learning/multi-tenant-rag-with-amazon-bedrock-knowledge-bases/)
- [Amazon API Gateway, Usage plans and API keys for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html)

## 관련 문서

- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
- [[LLM-Cost-Optimization|LLM 비용 최적화]]
