---
tags: [infrastructure, aws, rds, aurora, endpoint, failover, operations]
status: done
category: "Infrastructure - AWS"
aliases: ["Aurora Endpoints", "Aurora Endpoint 운영", "Custom Endpoint", "Aurora Failover read-only"]
---

# Aurora Endpoint 운영 — 종류, 함정, Failover

> 상위 문서: [[RDS-Aurora|RDS / Aurora 관리형 DB]], 아키텍처 기초는 [[RDS-Aurora-Architecture|Aurora 공유 스토리지, 클러스터 엔드포인트]]

Aurora Endpoint는 애플리케이션이 특정 DB 인스턴스를 직접 바라보지 않게 해주는 추상화 진입점이다. Writer 인스턴스가 바뀌어도 앱은 같은 Endpoint를 쓰면 되므로, 인스턴스 장애나 변경을 앱으로부터 숨겨주는 완충재 역할을 한다. 단, "켜면 알아서 된다"가 아니라 각 Endpoint의 거동(특히 장애 시)을 운영 정책에 포함해야 한다.

## Endpoint 4종

- **Cluster(Writer) Endpoint**: 항상 현재 Writer 역할 인스턴스로 연결. 읽기와 쓰기 모두 가능한 쓰기 진입점. Aurora 생성 시 자동 생성.
- **Reader Endpoint**: 클러스터 내 **모든** Reader 인스턴스에 대한 단일 진입점. 자동 생성.
- **Custom Endpoint**: 사용자가 직접 정의하고 멤버를 관리하는 Endpoint. 워크로드 격리용.
- **Instance Endpoint**: 특정 인스턴스에 직접 연결. 진단이나 특정 노드 작업용.

## Writer Endpoint와 Replica Lag

Aurora는 공유 스토리지라 Replica Lag가 보통 밀리초 수준이지만 0은 아니다. "방금 쓴 데이터를 반드시 즉시 읽어야 하는" 민감한 조회(read-your-own-writes)는 Reader가 아니라 **Writer Endpoint로 라우팅**하는 것을 검토해야 한다. 읽기 부하 분산보다 데이터 최신성이 더 중요한 경우의 선택이다. 라우팅 전략 일반론은 [[Read-Replica-Routing|Read Replica 라우팅]], 복제 지연 read-after-write 함정은 [[RDS-Operational-Pitfalls|RDS 운영 함정]] 참고.

## Reader Endpoint의 두 가지 함정

**1. 지능형 로드밸런서가 아니다.** Reader Endpoint는 연결 시점에 Reader 중 하나로 보내는 DNS 기반 분산이라, Reader가 여러 대여도 트래픽이 완벽히 균등하게 분산되지 않는다. "Reader Endpoint를 쓰는데 왜 한쪽만 바쁘지?"가 전형적 증상. 커넥션 풀이 기존 연결을 오래 유지하면 불균형이 더 굳어진다. 정교한 분산이 필요하면 ProxySQL 같은 별도 프록시 계층을 검토한다.

**2. Reader가 없으면 Writer로 연결될 수 있다.** Reader 인스턴스가 하나도 없거나 정상 상태가 아니면 Reader Endpoint가 Writer로 폴백된다. 연결 자체는 유지되어 좋지만, 앱이 "Reader Endpoint = 무조건 읽기 전용"이라고 가정하면 위험하다 — 읽기 트래픽이 Writer로 몰려 Writer 부하가 커진다. Reader Endpoint의 장애 시 거동까지 운영 정책에 명시해야 한다.

## Custom Endpoint — 워크로드 격리

Default Reader Endpoint는 모든 Reader를 대상으로 해서 OLTP와 배치/분석 쿼리를 분리할 수 없다. OLTP는 빠른 응답이 핵심이고, 배치/분석은 무거운 대신 응답 시간이 덜 중요하다. 둘이 같은 인스턴스에서 돌면 무거운 쿼리가 버퍼 풀 캐시를 밀어내고 CPU/I/O 경합을 일으켜 온라인 응답까지 느려진다.

Custom Endpoint로 **OLTP용 Reader 그룹과 배치용 Reader 그룹을 분리**한다. 운영 규칙은 단순해야 한다(많이 만들수록 관리 복잡도가 커짐):

- OLTP용 / 배치용 정도로만 구분
- 배치 전용 인스턴스는 보통 1대, 기다릴 수 있는 작업만 할당
- 인스턴스 이름에 `batch` 같은 용도 키워드를 넣어 운영자가 즉시 식별
- 배치 Reader는 CPU가 원래 높게 튀므로 **Auto Scaling 지표 대상에서 제외** (상세는 [[RDS-Aurora-AutoScaling|Aurora Auto Scaling]])

## Failover 시 read-only transaction 오류

Failover 후 앱이 예전 Writer 정보를 계속 쓰면 `read-only transaction` 계열 오류가 난다. 두 경우를 구분해야 한다.

- **연결이 끊기는 경우**(하드웨어 장애): 소켓이 죽으므로 앱의 재시도 로직이 비교적 잘 동작한다.
- **연결은 살아 있는데 역할만 바뀐 경우**(업그레이드, 짧은 failover): 기존 커넥션이 더 이상 Writer가 아닌 인스턴스를 바라보면서 쓰기에서 오류가 반복된다. 소켓이 멀쩡해 보여 감지가 더 어렵다.

failover를 예외가 아니라 정기적으로 일어나는 일로 가정하고, 죽은 소켓 폐기와 재시도 전략을 설계한다(죽은 소켓, 재시도+지터는 [[RDS-Operational-Pitfalls|RDS 운영 함정]] 2번).

### AWS Advanced JDBC Wrapper

기존 JDBC 드라이버 위에 고급 기능을 플러그인으로 얹는 오픈소스 드라이버. Failover 시 **최신 Writer를 더 빠르게 찾아** 오류 시간을 줄이고, 노드 장애를 더 빨리 감지해 안정화 시간을 단축한다. 단 오픈소스라 무조건 안전하진 않다 — 특정 버전에서 메모리 사용량 문제가 보고된 적이 있어, 운영과 유사한 부하 테스트가 도입 전제다.

## Endpoint/스케일링 관리는 플랫폼화

Endpoint 멤버십, 제외 대상, Auto Scaling 정책, 알람 연결은 CLI로 직접 조작할 수 있지만 수동 실행은 휴먼 에러가 서비스 장애로 직결되기 쉽다. 반복 작업은 내부 플랫폼/자동화 도구로 관리한다 — "사람이 기억해서 잘하는 구조"가 아니라 **"시스템이 실수하기 어렵게 만드는 구조"**. DB 운영 자동화 일반론은 [[Database-Operations-Automation|DB 운영 자동화]].

## 면접 체크포인트

- Endpoint 4종(Writer/Reader/Custom/Instance)과 각각의 용도
- Writer Endpoint를 읽기에 쓰는 경우(read-your-own-writes, Lag 민감)
- Reader Endpoint가 지능형 LB가 아닌 점, Reader 부재 시 Writer 폴백의 위험
- Custom Endpoint로 OLTP/배치를 격리하는 이유(캐시 밀림, CPU/I/O 경합)
- Failover에서 연결 끊김 vs 역할만 바뀜의 차이와 read-only transaction 오류
- AWS Advanced JDBC Wrapper의 목적과 도입 전 부하 테스트 필요성

## 출처
- [Aurora Endpoint와 Auto Scaling 운영 (YouTube)](https://www.youtube.com/watch?v=qzjx24vJ350&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=2)

## 관련 문서
- [[RDS-Aurora-AutoScaling|Aurora Auto Scaling 운영]] — Reader 스케일링, Flapping, Cache Warming
- [[RDS-Aurora-Architecture|Aurora 아키텍처]] — 공유 스토리지, 클러스터 기초
- [[RDS-Operational-Pitfalls|RDS 운영 함정]] — failover 죽은 소켓, 복제 지연, 커넥션 고갈
- [[Read-Replica-Routing|Read Replica 라우팅]] — 앱 레이어 읽기 분기 전략
- [[Database-Operations-Automation|DB 운영 자동화]] — 반복 운영의 플랫폼화
