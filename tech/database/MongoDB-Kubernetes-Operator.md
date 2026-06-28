---
tags: [database, mongodb, kubernetes, operator, psmdb, ebs, aws, operations]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["MongoDB Kubernetes Operator", "PSMDB Operator", "MongoDB on Kubernetes", "K8s에서 MongoDB 운영"]
---

# Kubernetes에서 MongoDB 운영 (PSMDB Operator)

셀프 매니지드 MongoDB를 Kubernetes 위에서 Operator로 운영하면 생성, 확장, 장애 복구 같은 반복 작업을 선언적으로 자동화할 수 있다. 다만 Operator 하나로 끝나지 않고 Kubernetes 리소스, AWS 리소스, 여러 컨트롤러가 함께 얽히기 때문에 **외부 접속, 장애 대응, 대용량 멤버 추가**는 별도의 이해와 설계가 필요하다. 이 문서는 [[Database-Operations-Automation|DB 운영 자동화]]의 "Kubernetes Operator(셀프 매니지드 DB)" 도메인을 실제 구현 수준으로 풀어낸 모습이다.

## MongoDB 운영 방식 3가지

| 방식 | 자동화 수준 | 비용 | 운영 부담 |
|------|------------|------|----------|
| 직접 설치형 (EC2, 물리 서버) | 낮음 — 설치, 확장, 복구, 백업, 모니터링 전부 수동 | 낮음 | 큼 |
| Atlas (관리형) | 높음 — 완전 관리형 | **가장 큼** | 작음 |
| **K8s + PSMDB Operator** | 중간 — 직접 설치형보다 훨씬 많이 자동화 | 중간 | 중간 |

Operator 방식은 Atlas만큼 완전 관리형은 아니지만, 직접 설치형의 수작업 대부분을 선언적으로 대체한다는 점에서 둘의 중간에 있다.

## PSMDB와 Operator 패턴

**PSMDB(Percona Server for MongoDB)** 는 MongoDB Community Edition을 기반으로 백업 등 엔터프라이즈 성격 기능을 더한 Percona의 배포판이다. **PSMDB Operator** 는 이 PSMDB를 Kubernetes 위에서 운영하는 컨트롤러다.

Operator는 사람(DBA)이 하던 운영 절차를 코드로 옮긴 패턴이다. Replica Set을 직접 만들려면 인스턴스 준비, 스토리지 연결, MongoDB 설치, Replica Set 초기화, 멤버 추가를 순서대로 해야 한다. Operator를 쓰면 운영자는 Custom Resource(CR)에 "멤버 3개짜리 Replica Set"이라는 **목표 상태만 선언**하고, 그 절차의 실행은 Operator가 맡는다. 운영자는 절차를 지시하는 사람에서 목표 상태를 정의하는 사람으로 바뀐다.

### 선언적 관리와 Reconcile Loop

선언적 관리는 "어떻게 할지"가 아니라 "어떤 상태이길 원하는지"를 적는 방식이다. 멤버 수 3, 버전 8.0, 스토리지 100GB라고 선언하면, Operator는 **원하는 상태(desired)와 현재 상태(current)를 계속 비교하고 차이가 생기면 다시 맞춘다.** 이 반복이 Reconcile Loop다. 파드가 죽거나 노드가 사라지거나 멤버 수가 바뀌어도 Operator는 클러스터를 목표 상태로 되돌린다. 이것이 운영 지식(페일오버, 백업, 스케일)을 코드로 박아 넣는 CRD + 컨트롤 루프 패턴의 본질이다.

## Kubernetes에서 AWS 리소스까지 함께 움직이는 구조

PSMDB Operator는 MongoDB 운영에 필요한 **Kubernetes 리소스(StatefulSet, Service, PersistentVolume, Secret)** 만 만든다. 그 뒤 실제 AWS 리소스는 각자의 컨트롤러가 자기 리소스를 보고 처리한다.

| 선언한 K8s 리소스 | 처리하는 컨트롤러 | 만들어지는 AWS 리소스 |
|------------------|-----------------|---------------------|
| Service (type LoadBalancer) | AWS Load Balancer Controller | NLB |
| PersistentVolume | EBS CSI Driver | EBS 볼륨 |
| (인증 정보 동기화) | External Secrets Operator | Secrets Manager ↔ K8s Secret |

즉 MongoDB 운영은 하나의 Operator가 아니라 **여러 Operator와 컨트롤러가 각자 리소스를 reconcile하며 협력**하는 구조다. 문제가 생겼을 때 원인이 MongoDB인지 Operator인지 Kubernetes인지 AWS 설정인지 구분하기 어려운 이유도 여기에 있다.

## 직접 운영(EC2) vs Operator 운영

| 작업 | EC2 직접 운영 | PSMDB Operator |
|------|--------------|----------------|
| 멤버 추가 | 인스턴스 생성 → 네트워크/스토리지 확인 → OS 튜닝 → MongoDB 설치 → Replica Set 등록 → 백업/모니터링 설정 | CR의 Replica Set 크기를 3 → 5로 변경 |
| 스토리지 확장 | 각 인스턴스 접속 → 볼륨 + 파일시스템 확장 | CR의 볼륨 크기 수정 |
| 장애 복구 | 운영자가 볼륨 확인 → 새 인스턴스 → MongoDB 재설정 → 멤버 정리를 직접 판단/실행 | K8s/Operator가 이상 감지 → 다른 노드에 파드 재기동 → 기존 볼륨 재연결로 자동 복구 |

Operator 환경에서 운영자는 복구 절차를 손으로 실행하는 대신, 장애 발생을 인지하고 DB 상태를 확인하는 역할에 더 집중한다.

## 도입의 현실적 어려움

Operator는 편리하지만 공짜가 아니다.

- **학습 비용**: DBA가 MongoDB뿐 아니라 Kubernetes 리소스, 네트워크, 스토리지, AWS 권한까지 이해해야 한다.
- **원인 구분 난이도**: 장애 원인이 어느 레이어(MongoDB/Operator/K8s/AWS)인지 가르기 어렵다.
- **예상 못 한 기본 동작**: 설정 변경 후 불필요해 보이는 Rolling Restart, 인증서 자동 교체, 대용량 멤버 추가 시 Initial Sync 지연 등이 운영자의 기대와 어긋날 수 있다.

## 외부에서 Replica Set 접속이 어려운 이유

Kubernetes 안의 파드는 IP가 동적으로 바뀌므로, Replica Set 멤버들은 보통 `service.cluster.local` 같은 **클러스터 내부 도메인**으로 서로를 인식한다. 문제는 이 내부 도메인이 클러스터 밖에서는 해석되지 않는다는 점이다.

외부 클라이언트가 NLB를 통해 처음 접속에 성공해도, MongoDB 드라이버는 Replica Set의 **멤버 목록(topology)을 다시 받아온다.** 이때 돌아온 주소가 내부 도메인이면 외부 클라이언트는 다음 연결에서 실패한다. 첫 문은 열렸지만, 안에서 받은 약도가 외부 사람에게는 읽을 수 없는 주소인 셈이다.

### Split Horizon + TLS SNI

해법은 같은 멤버를 **접속 출처에 따라 다른 주소로 광고**하는 것이다.

- **Split Horizon**: 같은 MongoDB 멤버라도 내부에서는 Kubernetes Service 주소로, 외부에서는 NLB 도메인으로 광고하게 한다.
- **TLS SNI**: 서버는 평범한 TCP만으로는 클라이언트가 어떤 호스트 이름으로 접속했는지 알 수 없다. SNI는 TLS 핸드셰이크 단계에서 클라이언트가 "나는 이 호스트로 접속했다"는 정보를 서버에 전달한다. MongoDB는 이 SNI를 보고 외부 도메인 접속인지 판단해, Split Horizon에 맞는 멤버 목록을 돌려준다.

결론적으로 클러스터 외부에서 Replica Set에 안정적으로 접속하려면 **NLB + TLS + SNI + Split Horizon** 이 함께 필요하다.

## 대용량 멤버 추가의 시간 문제: Initial Sync

새 멤버를 추가하면 기본적으로 Initial Sync로 기존 데이터를 복제한다. 핵심 문제는 **소요 시간이 데이터 크기에 비례**한다는 점이다.

| 방식 | 동작 | 100GB 기준 | 한계 |
|------|------|-----------|------|
| Logical Initial Sync | 컬렉션 데이터를 읽어 복사 + 그동안의 변경분을 Oplog로 따라감 | 수십 분 | 데이터 크기에 선형 비례, TB면 며칠 |
| File Copy Based Initial Sync | WiredTiger Backup Cursor로 특정 시점 스냅샷을 떠 데이터 파일을 직접 복사 + 이후 변경분 복구 | 약 15분 | 여전히 크기에 비례, TB면 부담 |
| **EBS Volume Clone** | 스냅샷 후 새 볼륨을 즉시 사용 가능하게 만들고 실제 블록 복사는 백그라운드 | **몇 초** | 크기와 디커플(아래 제약 있음) |

대용량 환경에서 "멤버 하나 추가"는 단순 작업이 아니라 운영 리스크다. 앞 두 방식은 개선은 되지만 데이터 크기에 비례하는 시간이라는 구조적 한계가 남는다.

## EBS Volume Clone을 활용한 빠른 프로비저닝

EBS Volume Clone은 스냅샷을 뜬 뒤 새 볼륨을 즉시 쓸 수 있게 하고, 실제 블록 복사는 백그라운드로 미룬다. 새 멤버는 전체 복사가 끝나기를 기다리지 않고 바로 기동해 세컨더리가 된다(테스트에서 100GB 멤버를 세컨더리로 만드는 데 몇 초 수준).

핵심은 **Copy-on-Write** 다. 아직 복사 안 된 블록이 필요하면 그때 소스 볼륨에서 가져오고(read-through), 새 변경분은 새 볼륨에 기록한다. 그래서 데이터 크기가 커져도 프로비저닝 완료 시간이 크게 늘지 않는다.

### 제약과 적합한 상황

| 제약 | 내용 |
|------|------|
| 암호화 | 암호화된 볼륨이어야 함 |
| AZ | 동일 Availability Zone 안에서만 복사 |
| 동시성 | 동시 복사 개수 제한 |
| 크기/IOPS | 대상 볼륨이 소스 이상의 크기, IOPS여야 함 |
| **Initializing 성능** | 백그라운드 복사 중에는 설정 IOPS를 다 못 쓸 수 있음 — 기본 보장 IOPS는 쓰되, 추가 성능은 소스 여유와 복사 부하에 좌우 |

즉시 투입은 되지만 고성능 트래픽을 바로 받게 하는 건 신중해야 한다. **적합한 상황**: 기본 IOPS로 충분한 멤버, 소스 볼륨에 여유 IOPS가 있을 때, Hidden Member나 Batch용 멤버를 빠르게 붙일 때, Initial Sync가 지나치게 오래 걸리는 대용량 환경. 운영 패턴은 "빠르게 붙이고, 안정화를 확인한 뒤, 트래픽 투입을 조절"이 안전하다.

다만 EBS Volume Clone 흐름은 아직 완전 자동화가 아니어서, 기존 EBS 볼륨 복제나 PersistentVolume 선생성을 수동으로 처리해야 할 수 있다. 이를 메우는 길은 둘이다 — Operator 코드를 내부 수정(버전 업마다 재정합 부담)하거나, **오픈소스에 이슈/PR로 기능을 반영**(장기 유지보수성과 생태계 측면에서 더 건강)하는 것.

## 면접 체크포인트

- Operator = CRD + Reconcile Loop로 "목표 상태 선언 → 현재 상태 수렴"을 자동화하는 패턴 ([[Database-Operations-Automation|DB 운영 자동화]]의 K8s Operator 도메인)
- PSMDB Operator는 K8s 리소스만 만들고 AWS 리소스는 ALB Controller, EBS CSI, External Secrets가 각자 reconcile → 장애 원인 레이어 구분이 어려운 이유
- 외부 접속이 깨지는 근본 원인(내부 도메인으로 광고되는 topology)과 해법(Split Horizon + TLS SNI + NLB)
- Initial Sync가 데이터 크기에 선형 비례하는 구조적 한계와, EBS Volume Clone(CoW)이 그 시간을 데이터 크기와 디커플하는 원리
- EBS Volume Clone의 제약(암호화, 동일 AZ, Initializing IOPS)과 "빠르게 붙이고 트래픽은 천천히" 운영 패턴
- Operator 도입이 운영자를 무지하게 만드는 게 아니라, 오히려 MongoDB + K8s + AWS를 함께 이해해야 하는 이유

## 사례
- 대규모 DB fleet을 운영하는 팀이 PostgreSQL/MySQL은 Aurora 관리형으로, MongoDB는 PSMDB Operator로 셀프 매니지드 운영하며, 멤버 추가와 스토리지 확장을 CR 선언으로 처리하고, 외부 접속을 Split Horizon + SNI로 열고, 대용량 멤버 프로비저닝을 EBS Volume Clone으로 단축한 사례가 있다.

## 출처
- [Kubernetes에서 MongoDB 운영 (PSMDB Operator, 외부 접속, 빠른 프로비저닝) — DB 밋업 (YouTube)](https://www.youtube.com/watch?v=8QUgXc-tfkI&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=6)

## 관련 문서
- [[Database-Operations-Automation|DB 운영 자동화]] — 이 문서가 구현하는 상위 "K8s Operator" 도메인
- [[DB-Provisioning-Pipeline|DB 프로비저닝 자동화 파이프라인]] — 관리형(Aurora) 쪽 생성 표준화, 이 문서와 형제 격
- [[EKS|Amazon EKS]] — Operator 실행 기반
- [[Load-Balancer|로드 밸런서]] — NLB로 외부 트래픽을 클러스터로 유입
- [[HTTPS-TLS|HTTPS, TLS]] — SNI가 동작하는 TLS 핸드셰이크
- [[MongoDB-Schema-Design|MongoDB 스키마 설계]] — 운영 대상 MongoDB의 데이터 모델링
