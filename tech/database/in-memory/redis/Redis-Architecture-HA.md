---
tags: [database, redis, valkey, replication, sentinel, high-availability]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["Redis HA", "Redis Replication", "Redis Sentinel", "Valkey Sentinel", "복제와 Sentinel"]
---

# Redis 복제와 Sentinel 고가용성

서버 한 대에 캐시, 세션, 장바구니, 랭킹과 재고 카운터가 모두 있으면 그 서버가 단일 장애점(SPOF)이다. 디스크에 RDB나 AOF가 남아 있어도 프로세스가 다시 뜰 때까지 서비스는 멈추고, 캐시가 통째로 비면 원본 DB로 요청이 몰려 [[Cache-Stampede|stampede]]가 사이트 전체로 번진다. 복제는 같은 데이터를 가진 서버를 여러 대 두는 수단이고, Sentinel은 primary가 죽었을 때 승격과 재구성을 자동화한다. 두 기능은 Redis와 Valkey에서 같은 모델로 동작한다. 한 대의 메모리와 쓰기 처리량을 넘는 확장은 [[Redis-Cluster-Sharding|Cluster]]가 맡는다.

## replication
마스터와 복제본을 따로 두는 방식이다. 복제 메커니즘은 비동기로 동작해 마스터가 명령마다 복제본의 처리를 기다리지 않는다. 다만 복제본이 처리한 오프셋을 주기적으로 비동기 ACK하므로 마스터는 각 복제본의 처리 위치를 안다. `WAIT`와 `min-replicas-to-write`가 이 정보를 사용한다.

HA 기능이 없어서 마스터 장애 시 수동 변경 필요. 복제본에 직접 접속해서 복제를 끊고 애플리케이션 연결 설정도 변경해서 배포해야 함.

- replica는 `REPLICAOF <host> <port>`(시작 옵션 `--replicaof`)로 primary를 따라가고, `REPLICAOF NO ONE`으로 복제를 끊어 독립 primary가 된다. 수동 승격 명령은 한 줄이지만 가장 많이 따라온 replica를 고르고 나머지 replica와 애플리케이션 연결을 다시 맞추는 일까지 사람이 해야 해서, 새벽 장애 때 중단이 길어진다
- 처음 연결하면 full sync가 일어난다. primary가 백그라운드로 RDB를 만들어 보내고 replica가 받아 적재할 때까지 `INFO replication`의 `master_link_status`는 `down`일 수 있으므로, 기동 직후에는 `master_sync_in_progress`와 함께 보고 판단한다
- `INFO replication`의 `role` 값은 Redis와 Valkey 모두 `master`와 `slave`이고 primary 쪽 replica 수는 `connected_slaves`다. Valkey 문서와 새 명령은 primary, replica 용어를 쓰지만 이 필드 값은 호환을 위해 그대로다
- replica는 기본 읽기 전용(`replica-read-only yes`)이다. replica에 쓰면 primary와 데이터가 어긋나므로 공식 문서는 writable replica를 권하지 않는다
- 상품, 랭킹, 장바구니 조회처럼 읽기가 압도적인 요청을 replica로 보내면 primary는 쓰기에 집중한다. 대신 아래 stale data를 감수한다

## 레플리카와 Stale Data

레플리카는 **비동기식 복제**. 동기 방식은 너무 느림.

- 마스터 데이터가 특정 순간 레플리카와 다를 수 있음
- 마스터 장애 → 레플리카 승격 시 오래된 데이터일 수 있음 (Stale Data)
- 쓰기는 마스터, 읽기는 레플리카라면 Stale Data를 읽을 수 있음

### Stale Data 대응
- WAIT 명령어로 복제 완료 확인 가능. 하지만 느림. 지정한 수의 복제본 ACK를 확인할 뿐 여러 인스턴스를 강한 일관성 시스템으로 만들지는 않는다
- 마스터에서 쓰기 후 변경된 값을 반환받았다면 그 값을 그대로 사용 (레플리카에서 다시 읽지 않음)
- 단순 읽기 요청은 오래된 데이터를 읽을 수 있음을 인정
- 무조건 최신 데이터가 필요하면 마스터에서 읽어야 함

### OK를 받은 쓰기도 사라질 수 있다

primary가 클라이언트에 OK를 돌려준 직후 복제 전에 죽으면 그 쓰기는 승격된 replica에 없다. 캐시와 랭킹은 이 손실을 감수할 수 있지만 결제 기록처럼 잃으면 안 되는 데이터는 트랜잭션 DB를 정본으로 둔다. primary에서 얻은 분산 락도 같은 경로로 failover 뒤 중복 획득될 수 있다 ([[Distributed-Lock|분산 락]]).

## sentinel
일반 노드들을 모니터링하는 센티넬 노드를 추가한 방식.

- 마스터가 죽으면 자동 페일오버 발생 → 복제본이 마스터로 승격
- 애플리케이션에서 연결 설정 변경 불필요 (센티넬이 변경된 마스터 정보로 매핑)
- 센티넬은 견고한 배포를 위해 **최소 3대**를 권장한다. 홀수는 요구사항이 아니며 공식 문서에도 4대 구성이 있다. **과반수 이상 동의** 시 페일오버 진행

### quorum과 과반 승인은 다르다

- `sentinel monitor <name> <host> <port> <quorum>`의 quorum은 장애 판정에만 쓰인다. quorum 수의 Sentinel이 도달 불가에 동의하면 primary를 객관적 다운(ODOWN)으로 본다
- 실제 failover는 Sentinel 하나가 리더로 뽑히고 전체 Sentinel 프로세스 과반의 투표를 받아야 시작된다. 3대에 quorum 2면 Sentinel 1대가 죽어도 판정과 승인이 모두 가능하다
- `sentinel down-after-milliseconds <name> <ms>`가 무응답을 의심하는 기준이다. 감지, 합의, 승격, 재구성까지 쓰기가 멈추는 시간을 장애 훈련으로 측정해 두어야 다운타임을 예측할 수 있다

### 운영 규칙

- Sentinel은 발견한 replica와 다른 Sentinel, 승격 이력을 자기 설정 파일에 다시 쓴다. 설정 파일이 없거나 쓸 수 없으면 시작을 거부하므로 컨테이너에서는 읽기 전용 원본을 쓰기 가능한 경로로 복사해 실행한다
- 클라이언트는 고정 주소 대신 `SENTINEL GET-MASTER-ADDR-BY-NAME <name>`으로 현재 primary를 묻는다. Valkey 8.0+는 같은 역할의 `SENTINEL GET-PRIMARY-ADDR-BY-NAME`도 제공한다
- Docker 포트 매핑은 Sentinel끼리의 자동 발견과 replica 주소 보고를 깨뜨린다. `sentinel announce-ip`, `sentinel announce-port`를 쓰거나 host networking으로 띄우고, 재시작 때 IP가 바뀌는 환경이면 고정 IP나 hostname 설정(`resolve-hostnames`, `announce-hostnames`)을 검토한다
- 장애가 났던 primary가 돌아오면 새 primary의 replica로 재구성된다. 분할 동안 옛 primary가 받은 쓰기는 이때 버려진다. `min-replicas-to-write 1`, `min-replicas-max-lag 10`처럼 설정하면 replica와 끊긴 primary가 쓰기를 거부해 유실 구간을 줄인다

## 페일오버 시 클라이언트 전환

Sentinel, Cluster가 없거나 직접 HA를 구성하는 경우, 페일오버의 본질은 **클라이언트가 새 Primary를 바라보게 만드는 것**이다. 세 가지 방식이 있다.

| 방식 | 동작 | 트레이드오프 |
|---|---|---|
| 코디네이터 구독 | ZooKeeper, etcd, Consul에 현재 Primary 정보를 저장하고 애플리케이션이 구독해 변경을 감지 | 정확하고 빠름. 코디네이터 인프라와 클라이언트 연동 필요 |
| VIP 이동 | 장애 시 가상 IP를 새 Primary로 넘김 | 클라이언트 DNS 캐시 문제를 피함. 외부 서비스, 다양한 클라이언트 환경에 안정적. 네트워크 레벨 제어 필요 |
| DNS 변경 | DNS 레코드를 새 Primary로 갱신 | 관리 단순. 단 클라이언트나 런타임이 DNS를 오래 캐싱하면 전환이 늦어짐 (→ [[DNS]] TTL, 캐시 주의) |

Sentinel과 Cluster는 이 전환을 자동화한 것이다. Sentinel은 클라이언트가 Sentinel에 새 Primary를 질의하고, Cluster는 MOVED 리다이렉션으로 슬롯의 새 위치를 알린다. 직접 구성할 때는 위 셋 중 하나로 전환 경로를 명시적으로 설계해야 한다.

## 선택 기준

- 데이터와 쓰기 처리량이 primary 한 대로 충분하면 복제와 Sentinel로 가용성을 해결한다. 복제는 사본을 늘릴 뿐 한 대의 메모리와 쓰기 상한을 늘리지 않으므로 그 한계를 넘을 때 [[Redis-Cluster-Sharding|Cluster]]로 간다
- 복제와 failover를 전담할 인력이 없으면 관리형 서비스를 쓰되, 승격 시간과 유실 조건은 같은 원리로 이해해 둔다 ([[ElastiCache-Engine-Deployment|ElastiCache 엔진과 클러스터 구조]])

## 면접 체크포인트

- 복제, Sentinel, Cluster가 각각 푸는 문제 (사본과 읽기 분산, 자동 승격, 용량과 쓰기 확장)
- 비동기 복제에서 OK를 받은 쓰기가 사라지는 경로와 `WAIT`의 한계
- Sentinel quorum과 과반 승인의 차이
- 옛 primary가 돌아올 때의 쓰기 유실과 `min-replicas-to-write`
- 클라이언트가 새 primary를 찾는 방식 (Sentinel 질의, MOVED, 코디네이터, VIP, DNS)

## 출처

- [Valkey 공식 문서, Replication](https://valkey.io/topics/replication/)
- [Valkey 공식 문서, High availability with Valkey Sentinel](https://valkey.io/topics/sentinel/)
- [Valkey 공식 문서, INFO](https://valkey.io/commands/info/)
- [Valkey 8.0 release notes — valkey-io/valkey](https://github.com/valkey-io/valkey/blob/8.0/00-RELEASENOTES)
- [Redis Documentation, Replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- [Redis Documentation, High availability with Redis Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- [우아한테크세미나 191121 우아한레디스 — 우아한테크](https://www.youtube.com/watch?v=mPB2CZiAkKM)
- [인프런, Hong, SPOF(단일 장애지점)을 어떻게 해결하는가?? 그리고 레플리카라는 관점까지](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481460)
- [인프런, Hong, Redis에서도 유효한 Sentinel과 Failover를 활용한 자동 복구 설계](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481461)

## 관련 문서

- [[Redis-Architecture|Redis architecture]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding]]
- [[Persistence]]
- [[Distributed-Lock|분산 락]]
- [[Redis-Valkey-Migration|Redis에서 Valkey로]]
- [[DNS|DNS (TTL, 캐시)]]
