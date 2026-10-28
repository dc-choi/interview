---
tags: [databricks, cloud, control-plane, compute-plane]
status: done
verified_at: 2026-10-28
category: "Infrastructure - 클라우드 기초"
aliases: ["Databricks Control Plane", "Databricks 제어와 연산 영역"]
---

# Databricks의 제어 영역과 연산 영역

Databricks의 control plane은 웹 애플리케이션과 관리용 백엔드 서비스를 제공하고, compute plane은 데이터를 처리한다. 화면에서 코드를 작성하고 실행하는 경험이 하나로 보여도 관리와 연산의 위치는 구분한다. 아래 배치 설명은 AWS용 공식 아키텍처 기준이다.

## 연산 방식에 따라 계정 경계가 달라진다

| 영역 | 역할 | 배치 |
| --- | --- | --- |
| Control plane | 웹 애플리케이션과 Databricks가 관리하는 백엔드 | 고객의 AWS 계정 밖, Databricks 측 |
| Classic compute plane | classic compute의 데이터 처리 | 고객 AWS 계정의 workspace별 가상 네트워크 |
| Serverless compute plane | serverless compute의 데이터 처리 | Databricks 측 관리 영역 |

따라서 compute plane을 고객 AWS 계정이라고만 설명하면 serverless 구성을 놓친다. Classic workspace의 workspace storage bucket은 고객 AWS 계정에 있고, serverless workspace는 default storage를 사용하며 고객 클라우드 저장소에도 연결할 수 있다.

## 적용할 때 확인할 경계

다음은 위 구조를 적용한 설계 점검 제안이다.

1. 사용하는 compute가 classic인지 serverless인지 먼저 확인한다.
2. 실행 위치, 원본 데이터 저장 위치와 접근 권한을 각각 확인한다. 배치도만으로 데이터 접근이 허용됐다고 판단하지 않는다.
3. 웹 화면 접근 성공과 연산 실행 성공을 나누어 확인한다. 실행 실패는 대상 compute와 저장소 연결을 포함해 조사한다.

이 분리는 운영 책임을 이해하는 출발점이다. 모든 데이터가 고객 계정에만 머문다는 보장이나 모든 클라우드의 동일한 배치를 뜻하지 않는다. 실제 workspace 생성, 권한과 네트워크 연결은 시험하지 않았다.

## 출처

- [Databricks, High-level architecture](https://docs.databricks.com/aws/en/getting-started/high-level-architecture/)

## 관련 문서

- [[Cloud-Service-Models|클라우드 서비스 모델과 책임 분담]]
- [[SaaS-Regional-Data-Isolation|SaaS 리전별 데이터 격리]]
- [[Palantir-Databricks-Connector|Foundry와 Databricks 연결]]
