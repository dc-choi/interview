---
tags: [aws, outposts, hybrid-cloud, edge-computing, manufacturing]
status: done
verified_at: 2026-11-04
category: "Infrastructure - AWS"
aliases: ["Outposts 워크로드 배치", "Outposts Workload Boundaries", "제조 시스템 하이브리드 배치"]
---

# Outposts 워크로드 배치와 연결 조건

AWS Outposts는 AWS 인프라와 일부 서비스를 고객 현장으로 확장한다. 현장에 컴퓨팅과 저장 자원을 두어 지연과 로컬 데이터 처리 요구에 대응하면서 AWS의 API와 도구를 사용한다. Outpost는 연결된 리전과 가용 영역의 확장이며 독립 리전이 아니다.

## 시스템 전체보다 지연에 민감한 경로를 나눈다

제조 시스템을 검토할 때는 설비, 설비와 직접 통신하는 인터페이스, 저장과 분석을 맡는 백엔드를 나눠 본다. 설비에서 데이터를 읽는 경로와 수집한 데이터를 나중에 전송하는 경로는 허용 지연과 실패 영향이 다를 수 있다.

다음은 배치 판단을 위한 검증 질문이다. 특정 제조 현장의 보장값이나 정해진 아키텍처는 아니다.

| 경로 | 먼저 확인할 조건 |
|---|---|
| 설비와 수집기 사이 | polling 간격, 응답 지연, 수집 실패 때 재시도와 누락 판정 |
| 수집기와 리전 백엔드 사이 | 전송 지연, 현장 버퍼 용량, 연결 복구 후 재전송과 중복 처리 |
| 저장 데이터와 업무 처리 사이 | 누락 검출, 이벤트 순서, 공정 실적과 데이터의 대사 |

전체를 리전으로 옮기는 안과 수집기를 현장에 남기는 안을 같은 입력으로 비교한다. PoC에서는 지연뿐 아니라 누락과 중복, 연결 단절과 복구를 확인한다. 클라우드 서비스의 연결 요건을 충족했다는 사실만으로 공정의 응답 시간 요구를 통과했다고 판단하지 않는다.

## Rack과 server의 지원 범위

2026-11-04 공식 지원 표 기준, EC2와 ECS는 racks와 servers 모두 지원하지만 RDS, EBS, S3와 Application Load Balancer는 racks에만 표시되어 있다. 제품 형태와 리전별 지원을 함께 확인한다. 리전에서 사용한 모든 서비스를 더 작은 현장 장비에 그대로 옮길 수 있다고 가정하지 않는다.

이 차이는 비상 운영 구성에도 적용된다. 현장만으로 업무를 지속하려는 설계라면 필요한 DB, 저장소와 애플리케이션 의존성이 현장 구성에 있는지 먼저 확인해야 한다.

## 현장 설치와 리전 연결은 별도 준비다

Outposts rack은 설치 공간과 반입 경로, 하중, 냉각과 전원 조건을 요구한다. 네트워크에는 로컬 장비와의 BGP 연결, VLAN과 주소 계획, 방화벽과 MTU 조건이 있다. 장비 주문과 애플리케이션 배포 사이에 현장 준비 및 연결 검증을 별도 작업으로 둔다.

Service link는 Outposts 관리와 리전 간 트래픽에 필요한 암호화된 연결이다. Direct Connect 또는 인터넷 연결을 사용할 수 있다. 물리 장비가 현장에 있다는 사실을 리전 연결 없이 모든 관리와 서비스 기능을 사용할 수 있다는 뜻으로 해석하지 않는다.

검증 제안: 로컬 애플리케이션의 지속 실행, 리전 API 호출, 새 자원 생성과 장애 복구를 각각 시험한다. 연결 단절 때 유지할 업무와 중단할 업무를 미리 정하고, 현장 버퍼가 가득 찼을 때의 동작도 확인한다. 이 문서는 실제 장비나 장애 시험 결과를 제공하지 않는다.

## 출처

- [AWS Outposts, What is AWS Outposts?](https://docs.aws.amazon.com/outposts/latest/userguide/what-is-outposts.html) — 리전과 AZ 확장, 제품 형태별 자원 지원
- [AWS Outposts, Site requirements for Outposts racks](https://docs.aws.amazon.com/outposts/latest/userguide/outposts-requirements.html) — 시설, 전원과 네트워크 준비
- [AWS Outposts, Connectivity through service link](https://docs.aws.amazon.com/outposts/latest/userguide/service-links.html) — 관리 및 데이터 경로, 리전 연결 조건
- [Why Not Cloud? LG화학 제조환경(MES)의 최초 AWS 도입을 위한 도전 — Amazon Web Services Korea](https://www.youtube.com/watch?v=5q_D8ONgxo8) — 설비 수집과 백엔드 분리, PoC와 현장 준비를 검토하는 계기. 발표의 누락률, 거리와 비용 성과는 보장값으로 사용하지 않았다.

## 관련 문서

- [[Cloud-Migration-Strategies|클라우드 전환 전략]]
- [[IoT-Edge-Cloud-Pipeline|IoT 엣지와 클라우드 파이프라인]]
- [[EKS-Hybrid-Nodes|EKS Hybrid Nodes]]
