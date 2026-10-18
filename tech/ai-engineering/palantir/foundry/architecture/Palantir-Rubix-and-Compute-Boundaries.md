---
tags: [palantir, rubix, kubernetes, multimodal, compute]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 연산 배치와 Rubix"]
---

# 연산 배치와 Rubix의 실행 경계

Multimodal Data Plane(MMDP)은 데이터 형식, 연산 엔진과 모델 선택을 분리하는 아키텍처다. Rubix는 플랫폼 안의 실행 자원에 보안과 가용성 정책을 적용하는 Kubernetes 기반이다. 외부 데이터와 외부 연산을 연결하는 기능까지 모두 같은 프로세스나 클러스터에 들어간다는 의미는 아니다.

2026-10-16 공식 문서의 구조 설명을 대조했다. 실제 클러스터의 교체 주기, 장애 복구와 배포 무중단을 시험한 결과는 아니다.

## 데이터 위치와 연산 위치를 따로 정한다

MMDP는 Iceberg를 주요 테이블 형식으로 설명하며, 플랫폼 관리 카탈로그와 외부 virtual catalog/table을 함께 다룬다. 미디어, 문서, 스트림과 시공간 데이터도 포함한다. 센서 값과 센서 설명 메타데이터처럼 관련 데이터가 서로 다른 경로로 유입될 수 있으므로, 연결 키와 시점을 함께 설계해야 한다.

| 연산 경로 | 실행 위치와 책임 |
|---|---|
| 기본 런타임 | Spark, Flink와 단일 노드 엔진 등을 플랫폼에서 관리 |
| Compute Modules | 사용자 컨테이너를 플랫폼 실행 기반에서 운영 |
| 외부 연산 조정 | 외부 모델 서버, Spark나 HPC 등의 실행 자원과 연결 |
| Compute pushdown | 지원되는 외부 데이터 플랫폼의 연산 자원으로 처리 위임 |

데이터 가상화와 외부 연산 위임은 별개다. 외부 파일을 참조해도 변환 산출물과 객체 색인이 생길 수 있다. 어떤 연산을 외부로 보낼 수 있는지는 연결과 기능별 계약을 확인해야 한다. 각 엔진이 모든 모달리티와 모든 앱에서 같은 기능을 제공한다고 가정하지 않는다.

Ontology 아래의 원천 변환과 위의 사용자 상호작용 함수가 연산을 공유할 수 있지만, 처리 지연과 재시도, 접근 권한 요구는 다르다. 배치에 적합한 엔진 선택을 대화형 응답에도 그대로 적용하지 않는다. 이는 아키텍처로부터 도출한 설계 판단이다.

## 일시적인 노드를 전제로 가용성을 설계한다

Rubix는 워크로드 격리, 암호화, 워크로드 간 인증/인가와 로그, 노드 교체와 확장을 결합한다. 노드를 오래 유지해 안정성을 얻기보다, 교체와 장애를 견디도록 서비스를 배치하는 구조다. 교체는 정책에 따른 draining과 종료 절차를 사용한다.

공개 설명에는 수명이 다른 두 대상이 나온다.

- Rubix 페이지: **노드**는 48시간을 넘겨 유지되지 않는다.
- MMDP 페이지: **컨테이너**는 72시간 이내 파괴하고 교체한다.

대상이 다르므로 하나의 공통 TTL로 합치지 않는다. 실제 배포의 적용 범위와 예외는 이 두 문서만으로 확정할 수 없다. 노드 교체가 침해 지속성을 줄이는 설계여도 자격 증명이나 외부 시스템을 통한 지속 접근까지 제거했다는 증거는 아니다.

## Apollo의 의도와 Rubix의 실행을 연결한다

Apollo는 설치, 업그레이드와 롤백 계획을 계산하고 전달한다. Rubix의 API 계층은 서비스 생성, 상태 관측, 제품 revision과 설정 관리를 실행 자원에 연결한다.

Rubix의 관리 서비스 설명은 다중 노드와 blue/green 배포를 전제로 한다. 새 환경을 만든 뒤 관측하고, 정해진 기간 정상 동작하면 트래픽을 점진적으로 옮기고 기존 자원을 제거하는 방식이다. 이 설명을 모든 사용자 컨테이너와 모든 Apollo 배포 방식의 무중단 보장으로 확대하지 않는다. 상태 이전, 외부 의존성, readiness와 앱의 장애 내성은 해당 서비스 계약에서 확인한다.

클라우드와 온프레미스에 공통 실행 기반을 제공하는 목표도 물리 자원, 네트워크 지연과 사용 가능한 서비스가 동일하다는 뜻은 아니다. FedStart나 Mission Manager를 통한 규제 환경 배포 역시 고객의 앱과 데이터 관리 책임을 대체하지 않는다.

## 출처

- [Palantir, Multimodal Data Plane](https://www.palantir.com/docs/foundry/architecture-center/multimodal-data-plane)
- [Palantir, The Rubix substrate](https://www.palantir.com/docs/foundry/architecture-center/rubix)

## 관련 문서

- [[Palantir-Data-and-Model-Integration|가상화, 파생 저장과 외부 모델 권한]]
- [[Palantir-Platform-Composition|플랫폼 구성과 상호운용]]
- [[Apollo|배포 계획, 제약과 운영]]
- [[Palantir-Security-and-Governance|플랫폼 통제와 고객 책임]]
