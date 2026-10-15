---
tags: [infrastructure, aws, rds, aurora, endpoint, failover, operations]
status: done
category: "Infrastructure - AWS"
aliases: ["Aurora Endpoints", "Aurora Endpoint 운영", "Custom Endpoint", "Aurora Failover read-only"]
---

# Aurora Endpoint 운영 — 종류, 함정, Failover

> 상위 문서: [[RDS-Aurora|RDS / Aurora 관리형 DB]], 아키텍처 기초는 [[RDS-Aurora-Architecture|Aurora 공유 스토리지, 클러스터 엔드포인트]]

Aurora Endpoint는 애플리케이션이 특정 DB 인스턴스를 직접 바라보지 않게 해주는 추상화 진입점이다. Writer 인스턴스가 바뀌어도 앱은 같은 Endpoint 이름을 쓸 수 있다. 다만 기존 연결과 DNS 캐시까지 자동으로 정상화되는 것은 아니므로 각 Endpoint의 장애 시 거동을 운영 정책에 포함해야 한다.

## 단일 클러스터의 Endpoint 4종

- **Cluster(Writer) Endpoint**: 현재 Writer 역할 인스턴스를 가리키는 읽기와 쓰기 진입점. Aurora 생성 시 자동 생성되며, 장애 조치 뒤 DNS 변경 반영과 재연결이 필요하다.
- **Reader Endpoint**: 클러스터 내 **모든** Reader 인스턴스에 대한 단일 진입점. 자동 생성.
- **Custom Endpoint**: 사용자가 직접 정의하고 멤버를 관리하는 Endpoint. 워크로드 격리용.
- **Instance Endpoint**: 특정 인스턴스에 직접 연결. 진단이나 특정 노드 작업용.

## Global writer endpoint의 이름과 DNS 전환

부분 검증(2026-10-16): Aurora Global Database 연결 문서와 RDS 이벤트 목록을 대조했다. Global writer endpoint는 위 단일 클러스터의 Writer Endpoint와 구분한다. 관리형 cross-Region switchover 또는 failover 뒤 새 primary의 writer를 가리키므로 연결 문자열을 매번 바꾸는 작업을 줄인다.

- **이름 변경 예외:** Global Database 이름을 바꾸면 global writer endpoint 이름도 바뀐다. 리전 전환 때 연결 문자열을 유지한다는 설명을 DB 이름 변경에도 적용하지 않는다.
- **DNS 변경 확인:** `RDS-EVENT-0397`은 Aurora가 global writer endpoint의 DNS 대상을 변경했음을 알린다. 클라이언트의 DNS 캐시 갱신이나 기존 풀 연결의 교체, 애플리케이션의 쓰기 성공까지 증명하는 이벤트는 아니다.
- **전환 후 도달성:** 앱에서 승격 가능한 각 리전의 VPC까지 네트워크 연결을 준비한다. DNS가 새 primary를 가리켜도 해당 주소에 접근할 경로가 없으면 연결하지 못한다.

운영 점검 제안: 이벤트 수신, 앱 실행 환경의 DNS 재해석, 새 연결 생성과 쓰기 성공 시각을 따로 기록한다. Global writer endpoint로 연결해도 비동기 복제의 데이터 손실과 split-brain 위험은 남는다. 복구 정책은 [[RDS-Aurora-Architecture#Global Database의 대기 구성과 전환 준비|Global Database 전환 준비]]를 따른다. 실제 리전 전환이나 복구 시간은 시험하지 않았다.

## Writer Endpoint와 Replica Lag

Aurora는 공유 스토리지라 Replica Lag가 보통 밀리초 수준이지만 0은 아니다. 방금 쓴 데이터를 즉시 읽어야 하는 민감한 조회(read-your-own-writes)는 **Writer Endpoint로 라우팅**하는 것을 검토해야 한다. 읽기 부하 분산보다 데이터 최신성이 더 중요한 경우의 선택이다. 라우팅 전략 일반론은 [[Read-Replica-Routing|Read Replica 라우팅]], 복제 지연 read-after-write 함정은 [[RDS-Operational-Pitfalls|RDS 운영 함정]] 참고.

## Reader Endpoint의 세 가지 함정

**1. 지능형 로드밸런서가 아니다.** Reader Endpoint는 연결 시점에 Reader 중 하나로 보내는 DNS 기반 분산이라, Reader가 여러 대여도 트래픽이 완벽히 균등하게 분산되지 않는다. "Reader Endpoint를 쓰는데 왜 한쪽만 바쁘지?"가 전형적 증상. 커넥션 풀이 기존 연결을 오래 유지하면 불균형이 더 굳어진다. 정교한 분산이 필요하면 ProxySQL 같은 별도 프록시 계층을 검토한다.

**2. Reader가 없으면 Writer로 연결될 수 있다.** Aurora Replica 없이 primary만 있는 클러스터에서는 Reader Endpoint가 primary로 연결되고 쓰기도 가능하다(2026-10-15 Aurora 사용자 가이드 기준). 이를 Reader의 모든 장애 상황에서 연결을 유지한다는 보장으로 해석하지 않는다. 읽기 전용 권한은 DB 사용자 권한으로 제한하고, 이 경로의 읽기 부하가 Writer에 미치는 영향도 확인한다.

**3. 프록시를 넣어도 DNS 캐시가 분산을 무력화할 수 있다.** Reader Endpoint는 새 연결 단위로 Reader를 나눈다. ProxySQL 문서 기준으로 ProxySQL은 2.4.5부터 백엔드 호스트명의 DNS 조회 결과를 캐시하며 기본으로 켜져 있다(`mysql-monitor_local_dns_cache_ttl` 기본 300000ms, 갱신 주기 `mysql-monitor_local_dns_cache_refresh_interval` 기본 60000ms). Reader Endpoint를 ProxySQL 백엔드로 등록하면 캐시가 유지되는 동안 새 백엔드 연결이 같은 IP, 즉 같은 Reader로 몰릴 수 있다. 두 변수 중 하나를 0으로 두면 캐시가 꺼지지만 연결마다 DNS 조회 지연이 다시 생긴다. 각 Instance Endpoint를 백엔드로 등록하거나 ProxySQL의 `mysql_aws_aurora_hostgroups`로 Writer, Reader와 복제 지연을 자동 탐지해 분산하는 방식도 비교한다. 1번의 해법으로 프록시를 넣는 것만으로 균등 분산이 보장되지는 않는다.

## Writer와 Reader에 읽기를 함께 나눌 때

2026-10-14 Aurora 사용자 가이드 기준. Writer도 읽기를 처리할 수 있어서 읽기를 Writer와 Reader에 함께 나누기도 한다. 이때 앱의 분기와 Endpoint의 분산이 겹치면 비율이 어긋난다. 앱이 읽기마다 Writer Endpoint와 Reader Endpoint 중 하나를 같은 확률로 고르면 Writer가 읽기의 절반을 받고, Reader N대가 나머지 절반을 나눠 각각 약 1/(2N)을 받는다. Reader가 2대면 대략 50:25:25이고, Reader를 늘려도 Writer의 몫은 줄지 않는다. Endpoint의 분산은 연결 단위 DNS 분산이라 실제 비율은 연결을 만들고 재사용하는 방식에 따라 달라진다.

- 앱에서 가중치를 정한다면 인스턴스 수에 맞추고, Reader를 늘리거나 줄일 때마다 함께 바꾼다.
- Writer와 Reader를 함께 넣은 `ANY` 유형 Custom Endpoint로 보내면 Aurora가 등록된 인스턴스에 같은 확률로 연결을 보낸다. 연결이 Writer와 Reader 중 어디에 붙을지 정해지지 않으므로 이 Endpoint로는 쓰기를 보내지 않는다.
- Writer가 읽기를 함께 받으면 쓰기 지연이 늘 수 있다. Writer의 여유와 쓰기 지연을 같이 보고 비중을 정한다.

## Custom Endpoint — 워크로드 격리

Default Reader Endpoint는 모든 Reader를 대상으로 해서 OLTP와 배치/분석 쿼리를 분리할 수 없다. OLTP는 빠른 응답이 핵심이고, 배치/분석은 무거운 대신 응답 시간이 덜 중요하다. 둘이 같은 인스턴스에서 돌면 무거운 쿼리가 버퍼 풀 캐시를 밀어내고 CPU/I/O 경합을 일으켜 온라인 응답까지 느려진다.

Custom Endpoint로 **OLTP용 Reader 그룹과 배치용 Reader 그룹을 분리**한다. 운영 규칙은 단순해야 한다(많이 만들수록 관리 복잡도가 커짐):

- OLTP용 / 배치용 정도로만 구분
- 배치 전용 인스턴스는 보통 1대, 기다릴 수 있는 작업만 할당
- 인스턴스 이름에 `batch` 같은 용도 키워드를 넣어 운영자가 즉시 식별
- 배치 Reader는 CPU가 원래 높게 튀므로 **Auto Scaling 지표 대상에서 제외** (상세는 [[RDS-Aurora-AutoScaling|Aurora Auto Scaling]])
- Aurora MySQL 기준, Reader 그룹 분리는 버퍼 풀 캐시와 CPU/I/O 경합을 격리할 뿐 공유 스토리지의 undo purge 부담은 분리되지 않는다. 배치 Reader의 장기 조회는 여전히 Writer의 History List Length를 키울 수 있다 → [[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]]
- Custom Endpoint 유형은 `READER`와 `ANY`다. 콘솔로 만든 Custom Endpoint는 모두 `ANY`라서 failover나 승격으로 역할이 바뀌어도 멤버가 그대로다. 배치용 Reader가 Writer로 승격되면 배치 연결이 Writer로 갈 수 있으므로, Reader만 담을 Endpoint는 CLI나 API로 `READER` 유형을 지정한다. `READER` 유형은 승격된 인스턴스를 멤버에서 자동으로 뺀다. Custom Endpoint는 클러스터마다 최대 5개다(2026-10-14 Aurora 사용자 가이드 기준).
- Aurora MySQL에서 Writer가 실행한 DDL은 그 테이블을 사용 중인 Reader 연결을 끊을 수 있다(2026-10-14 Aurora 사용자 가이드 기준). 배치 Reader의 장기 작업은 스키마 변경 일정과 겹치지 않게 하고 재시도 경계를 둔다.

## Failover 시 read-only transaction 오류

Failover 후 앱이 예전 Writer 정보를 계속 쓰면 `read-only transaction` 계열 오류가 난다. 두 경우를 구분해야 한다.

- **연결이 끊기는 경우**(하드웨어 장애): 소켓이 죽으므로 앱의 재시도 로직이 비교적 잘 동작한다.
- **연결은 살아 있는데 역할만 바뀐 경우**(업그레이드, 짧은 failover): 기존 커넥션이 더 이상 Writer가 아닌 인스턴스를 바라보면서 쓰기에서 오류가 반복된다. 소켓이 멀쩡해 보여 감지가 더 어렵다.

failover를 예외가 아니라 정기적으로 일어나는 일로 가정하고, 죽은 소켓 폐기와 재시도 전략을 설계한다(죽은 소켓, 재시도+지터는 [[RDS-Operational-Pitfalls|RDS 운영 함정]] 2번).

### AWS Advanced JDBC Wrapper

기존 JDBC 드라이버 위에 토폴로지 탐색과 재연결 기능을 얹는 래퍼다. 2026-10-15 AWS 공식 저장소 문서 기준, `failover2`는 중앙 토폴로지 모니터가 새 Writer를 확인하고 대기 중인 연결이 재연결하도록 한다. DB의 승격 자체와 앱의 복구 시간을 구분해야 하며, 다른 언어의 래퍼에 JDBC의 예외 처리나 설정을 그대로 적용하지 않는다.

**연결 복구 성공도 예외로 전달된다.** 같은 날짜의 Failover Plugin 문서 기준으로 다음 SQLState를 구분한다.

| SQLState | 의미 | 애플리케이션 처리 |
| --- | --- | --- |
| `08S02` | 트랜잭션 밖에서 연결이 바뀌었고 재연결 성공 | 같은 논리 Connection을 재사용할 수 있다. 필요한 세션 설정을 복원하고 실패 쿼리의 재실행 여부를 판단한다 |
| `08007` | 트랜잭션 중 연결 장애, 트랜잭션 결과 불명 | rollback 시도도 실패할 수 있다. 연결 재사용과 업무 트랜잭션 재시작을 별도로 판단한다 |
| `08001` | 새 인스턴스로의 연결 실패 | 기존 Connection을 재사용하지 않고 장애 원인과 재접속 가능 여부를 확인한다 |

재시도 설계 제안: 연결 복구를 업무 처리 성공으로 간주하지 않는다. 결과가 불명확한 쓰기는 처리 결과 조회와 멱등성 키 같은 중복 방지 조건을 확인한 뒤 재실행한다. `08S02`나 `08007`만 보고 모든 쓰기를 무조건 반복하지 않는다.

커넥션 풀이 모든 SQL 예외에서 연결을 폐기하면 래퍼가 이미 복구한 연결도 버릴 수 있다. HikariCP에서는 공식 문서의 `exceptionOverrideClassName=software.amazon.jdbc.util.HikariCPSQLException` 연동을 확인한다. 실제 사용하는 풀과 ORM이 예외를 어떻게 전달하고 연결을 회수하는지도 시험한다.

### 복구 시험은 애플리케이션까지 이어간다

검증 제안: 언어, 프레임워크와 ORM, 드라이버와 래퍼 버전, 풀, DB 엔진 조합별로 기존 구성과 변경 구성을 비교한다. 정상 부하에서 읽기와 쓰기를 계속 보내며 시험 DB의 failover를 일으키고 다음을 기록한다.

- DB 승격 완료 시점과 앱의 읽기, 쓰기 성공 회복 시점을 따로 측정한다. 수동 앱 재시작 없이 복구되는지 확인한다.
- 트랜잭션 밖의 조회, 쓰기 도중 연결 단절, 결과를 받기 전 commit 연결 단절을 나누고 중복 반영 여부를 확인한다.
- 재연결 뒤 세션 설정, 풀의 연결 폐기, 재시도 횟수와 요청의 전체 제한 시간을 확인한다.
- 정상 상태의 지연과 자원 사용량도 비교한다. FailoverConfigurationGuide는 공격적으로 짧은 제한 시간이 실제 장애 외의 timeout 실패를 늘릴 수 있다고 설명한다. 예제 값을 그대로 운영 기본값으로 쓰지 않는다.

이 목록은 검증 절차 제안이며 이 문서에서 실제 DB 장애 시험을 수행한 결과는 아니다. 특정 환경의 수 초 복구 사례를 모든 드라이버와 서비스의 보장 시간으로 일반화하지 않는다.

## Endpoint/스케일링 관리는 플랫폼화

Endpoint 멤버십, 제외 대상, Auto Scaling 정책, 알람 연결은 CLI로 직접 조작할 수 있지만 수동 실행의 실수가 서비스 장애로 이어질 수 있다. 반복 작업은 내부 플랫폼이나 자동화 도구에 검증 절차와 함께 넣어 기억에 의존하는 단계를 줄인다. DB 운영 자동화 일반론은 [[Database-Operations-Automation|DB 운영 자동화]].

## 면접 체크포인트

- 단일 클러스터의 Endpoint 4종(Writer/Reader/Custom/Instance)과 Global writer endpoint의 구분
- Writer Endpoint를 읽기에 쓰는 경우(read-your-own-writes, Lag 민감)
- Reader Endpoint가 지능형 LB가 아닌 점, Reader 부재 시 Writer 폴백의 위험
- 프록시의 DNS 캐시가 Reader Endpoint의 연결 분산을 무력화하는 이유와 대안(캐시 끄기, Instance Endpoint 등록, Aurora 토폴로지 자동 탐지)
- 앱의 Writer/Reader 분기와 Endpoint 분산이 겹칠 때의 부하 비대칭과 `ANY` Custom Endpoint
- Custom Endpoint로 OLTP/배치를 격리하는 이유(캐시 밀림, CPU/I/O 경합)와 `READER`, `ANY` 유형의 failover 뒤 멤버 차이
- Failover에서 연결 끊김 vs 역할만 바뀜의 차이와 read-only transaction 오류
- AWS Advanced JDBC Wrapper의 목적, SQLState별 복구와 재시도, 풀 연동과 도입 전 부하 테스트

## 출처
- [Amazon Aurora User Guide, Connecting to Amazon Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-connecting.html)
- [Amazon Aurora User Guide, Amazon RDS event categories and event messages for Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_Events.Messages.html)
- [Aurora Endpoint와 Auto Scaling 운영 (YouTube)](https://www.youtube.com/watch?v=qzjx24vJ350&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=2)
- [Amazon Aurora User Guide, Aurora MySQL isolation levels](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.IsolationLevels.html)
- [Amazon Aurora User Guide, Reader endpoints](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html)
- [ProxySQL Documentation, DNS Cache](https://proxysql.com/documentation/dns-cache/)
- [ProxySQL Documentation, MySQL Monitor Variables](https://proxysql.com/documentation/global-variables/mysql-monitor-variables/)
- [ProxySQL Documentation, AWS Aurora](https://proxysql.com/documentation/aws-aurora-configuration/)
- [인프런, Real MySQL 시즌 1 - Part 2, 커넥션 관리](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226586)
- [Amazon Aurora User Guide, Custom endpoints](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Custom.html)
- [Amazon Aurora User Guide, Considerations for custom endpoints](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Custom.Considerations.html)
- [Amazon Aurora User Guide, Replication with Aurora MySQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Replication.html)
- [높은 가용성과 성능 향상을 위한 Amazon Aurora 및 ElastiCache 활용 팁 (YouTube)](https://www.youtube.com/watch?v=bDDfVQkOcQM)
- [Amazon Aurora User Guide, Cluster endpoints](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Cluster.html)
- [AWS Advanced JDBC Wrapper, Failover Plugin](https://github.com/aws/aws-advanced-jdbc-wrapper/blob/main/docs/using-the-jdbc-driver/using-plugins/UsingTheFailoverPlugin.md)
- [AWS Advanced JDBC Wrapper, Failover Plugin v2](https://github.com/aws/aws-advanced-jdbc-wrapper/blob/main/docs/using-the-jdbc-driver/using-plugins/UsingTheFailover2Plugin.md)
- [AWS Advanced JDBC Wrapper, Failover Configuration Guide](https://github.com/aws/aws-advanced-jdbc-wrapper/blob/main/docs/using-the-jdbc-driver/FailoverConfigurationGuide.md)

## 관련 문서
- [[RDS-Aurora-AutoScaling|Aurora Auto Scaling 운영]] — Reader 스케일링, Flapping, Cache Warming
- [[RDS-Aurora-Architecture|Aurora 아키텍처]] — 공유 스토리지, 클러스터 기초
- [[RDS-Operational-Pitfalls|RDS 운영 함정]] — failover 죽은 소켓, 복제 지연, 커넥션 고갈
- [[Read-Replica-Routing|Read Replica 라우팅]] — 앱 레이어 읽기 분기 전략
- [[Database-Operations-Automation|DB 운영 자동화]] — 반복 운영의 플랫폼화
