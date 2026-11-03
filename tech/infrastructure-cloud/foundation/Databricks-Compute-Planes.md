---
tags: [databricks, cloud, control-plane, compute-plane, serverless]
status: done
verified_at: 2026-11-03
category: "Infrastructure - 클라우드 기초"
aliases: ["Databricks Control Plane", "Databricks 제어와 연산 영역"]
---

# Databricks의 제어 영역과 연산 영역

Databricks의 control plane은 웹 애플리케이션과 관리용 백엔드 서비스를 제공하고, compute plane은 데이터를 처리한다. 화면에서 코드를 작성하고 실행하는 경험이 하나로 보여도 관리와 연산의 위치는 구분한다. 아래 배치 설명은 AWS용 공식 아키텍처 기준이다.

## 연산 방식에 따라 계정 경계가 달라진다

| 영역 | 역할 | 배치 |
| --- | --- | --- |
| Control plane | 웹 애플리케이션과 Databricks가 관리하는 백엔드 | 고객의 AWS 계정 밖, 고객의 Databricks 계정 |
| Classic compute plane | classic compute의 데이터 처리 | 고객 AWS 계정의 workspace별 가상 네트워크 |
| Serverless compute plane | serverless compute의 데이터 처리 | 고객의 Databricks 계정 안에서 Databricks가 관리하는 영역. workspace의 classic compute plane과 같은 AWS 리전 |

따라서 compute plane을 고객 AWS 계정이라고만 설명하면 serverless 구성을 놓친다. Classic workspace의 workspace storage bucket은 고객 AWS 계정에 있고, serverless workspace는 default storage를 사용하며 고객 클라우드 저장소에도 연결할 수 있다.

## Serverless를 고르기 전에 확인할 제약

2026-11-03 Databricks AWS 문서 Serverless compute limitations(2026-11-02 갱신 표기, notebook과 job용 serverless compute 대상) 대조 기준이다. 아래 표는 공식 목록의 일부이며, 목록은 자주 바뀌므로 도입 시점에 전체를 다시 확인한다.

| 구분 | 확인할 제약 |
| --- | --- |
| 실행 환경 구성 | compute policy, compute 범위 init script와 instance pool을 지원하지 않는다. 패키지와 Python 환경은 base environment나 notebook 의존성으로 구성한다. Apache Spark compute 설정도 대부분 지원하지 않으며 지원하는 설정 목록이 따로 있다 |
| 라이브러리 | Maven 좌표와 notebook의 JAR 라이브러리를 지원하지 않으며, JAR는 job의 JAR task로 실행할 수 있다. compute 범위 라이브러리 대신 notebook 범위 라이브러리를 쓴다 |
| 실행 시간 | 최대 7일이며, 넘으면 플랫폼이 종료하고 재시도하지 않는다. 문서는 더 긴 작업을 작은 실행으로 나누거나 classic compute로 실행하라고 안내한다. 이 한도는 query 실행 timeout과 별개이며, serverless job은 기본으로 query 실행 timeout이 없다 |
| API와 언어 | Spark Connect API만 지원하고 RDD API는 지원하지 않는다. R은 지원하지 않고, notebook에서는 Scala도 지원하지 않는다 |
| 스트리밍과 UDF | trigger를 반드시 지정한다. 지정하지 않으면 Spark가 `Trigger.ProcessingTime("0 seconds")`를 쓰는데 Trigger.Continuous와 Trigger.ProcessingTime은 지원하지 않는다. 지원하는 trigger는 권장되는 Trigger.AvailableNow와 deprecated인 Trigger.Once이며, 이 제한은 Lakeflow pipeline 처리 모드에는 적용되지 않는다. UDF는 인터넷에 접근할 수 없고, UDF, map, mapPartitions 같은 사용자 코드의 메모리 사용은 1 GB를 넘을 수 없다 |
| 관측 | Spark UI와 Spark 로그를 볼 수 없어 query profile과 클라이언트 측 애플리케이션 로그를 쓴다 |
| 외부 데이터 | 외부 데이터 원천에는 Unity Catalog로 연결해야 한다. 자원은 IPv4로 닿아야 하며 IPv6로만 닿는 자원에는 연결할 수 없다 |

네트워크는 같은 날 대조한 Serverless compute plane networking 문서(2026-10-29 갱신 표기) 기준이다. Serverless compute plane은 Databricks가 관리하며, 고객 자원에는 자원의 위치, 구성과 종류에 따라 S3 gateway endpoint, private IP나 public IP로 연결한다. 이 세 연결 방식은 따로 표시가 없으면 GA이고, Databricks private connectivity를 쓰는 기능은 private preview라 account team에 요청해야 쓸 수 있다. 계정 수준의 리전 단위 구성인 NCC(network connectivity configuration)가 private endpoint 생성을 관리한다. account admin이 account console에서 만들고, 같은 리전의 여러 workspace에 붙일 수 있다.

- 자원 앞에 방화벽을 두면 classic compute plane의 연결에도 영향이 있으므로, 방화벽에서 classic compute 자원의 네트워크도 함께 허용한다.
- Public Preview 때의 legacy stable IP 목록은 폐기돼 NCC UI와 Network Connectivity API에서 더 이상 제공되지 않는다. 이 IP를 쓰고 있거나 account console의 NCC에서 복사해 썼다면 문서가 연결한 새 방식으로 옮겨야 하고, 옮기기 전까지는 serverless compute가 자원에 접근할 때 403 Forbidden을 받을 수 있다.
- Serverless 작업이 고객 자원에 연결할 때와 일부 고성능 서비스가 다른 리전의 클라이언트로 데이터를 내보낼 때의 네트워크 비용은 Databricks가 청구한다. Databricks private connectivity를 쓰면 private endpoint마다 시간당 요금과 처리한 데이터의 GB당 요금이 붙는다. 문서는 리전 간 요금을 피하려면 자원과 같은 리전에 workspace를 만들라고 권한다.

선택 점검 제안: notebook과 job 작업의 요구를 위 표의 모든 행과 공식 제약 목록 전체에 먼저 대조한다. 표나 공식 문서의 대안으로 풀리지 않는 항목이 있으면 classic compute를 쓴다. 걸리는 항목이 없어도 serverless 단가와 위 네트워크 비용, NCC와 방화벽 준비를 classic compute의 운영 부담과 함께 비교한 뒤 serverless를 우선 검토한다. 이 선택을 제어 범위와 운영 부담의 교환으로 보는 것은 계기 영상의 관점을 옮긴 이 문서의 해석이다.

## 적용할 때 확인할 경계

다음은 위 구조를 적용한 설계 점검 제안이다.

1. 사용하는 compute가 classic인지 serverless인지 먼저 확인한다.
2. 실행 위치, 원본 데이터 저장 위치와 접근 권한을 각각 확인한다. 배치도만으로 데이터 접근이 허용됐다고 판단하지 않는다.
3. 웹 화면 접근 성공과 연산 실행 성공을 나누어 확인한다. 실행 실패는 대상 compute와 저장소 연결을 포함해 조사한다.

이 분리는 운영 책임을 이해하는 출발점이다. 모든 데이터가 고객 계정에만 머문다는 보장이나 모든 클라우드의 동일한 배치를 뜻하지 않는다. 실제 workspace 생성, 권한과 네트워크 연결은 시험하지 않았다.

## 출처

- [Databricks, High-level architecture](https://docs.databricks.com/aws/en/getting-started/high-level-architecture/)
- [Databricks, Serverless compute limitations](https://docs.databricks.com/aws/en/compute/serverless/limitations)
- [Databricks, Serverless compute plane networking](https://docs.databricks.com/aws/en/security/network/serverless-network-security/)
- [서버리스가 무조건 정답일까? Classic vs Serverless 이해하기 — YouTube, 현수IT HyunsooIT](https://www.youtube.com/watch?v=Uv5lAPLKJVM) — 제어와 운영 부담의 교환이라는 관점의 계기. 제약과 네트워크 사실은 위 공식 문서로 대조했다.

## 관련 문서

- [[Cloud-Service-Models|클라우드 서비스 모델과 책임 분담]]
- [[SaaS-Regional-Data-Isolation|SaaS 리전별 데이터 격리]]
- [[Palantir-Databricks-Connector|Foundry와 Databricks 연결]]
