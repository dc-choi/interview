---
tags: [database, sqlite, replication, raft, crdt, distributed-systems, edge]
status: done
verified_at: 2026-10-27
category: "Database - RDBMS"
aliases: ["Distributed SQLite", "분산 SQLite", "SQLite Replication", "SQLite 복제", "rqlite", "Litestream", "LiteFS", "libSQL"]
---

# 분산 SQLite: 합의, 스트리밍, 병합

SQLite는 별도 서버 프로세스 없이 애플리케이션 안에서 디스크 파일을 직접 읽고 쓰는 임베디드 DB 엔진이다. SQLite 프로젝트는 원본을 한 시점의 스냅샷으로 복제본에 맞추는 `sqlite3_rsync` 복사 도구를 제공하지만, 노드 사이의 지속 복제와 장애 조치는 SQLite 밖의 구현이 맡는다. 이런 구현은 쓰기를 누가 받는지와 장애 때 무엇을 잃는지로 세 갈래로 나뉜다.

## 세 갈래

| 갈래 | 쓰기 | 복제와 손실 경계 | 대표 구현 | 맞는 질문 |
|---|---|---|---|---|
| 합의 | 리더 하나가 받고 과반이 승인한 뒤 반영한다 | 네트워크가 분할되면 과반 쪽만 쓰기를 받는다(CP). 과반에 기록된 쓰기는 소수 노드를 잃어도 남는다 | rqlite(별도 서버), dqlite(내장 라이브러리), SQLite Cloud(관리형) | 과반에 기록한 쓰기를 보존하며 자동 장애 조치해야 한다 |
| 스트리밍 | 단일 writer | WAL 또는 트랜잭션 단위 변경을 비동기로 복사한다. 마지막 복사 이후의 쓰기는 잃을 수 있고 복구는 복원이나 primary 전환이다 | Litestream(백업과 복원), LiteFS(읽기 복제본과 primary 전환) | 복원 또는 primary 전환 시간과 비동기 손실 창을 허용한다 |
| 병합 | 여러 writer가 독립적으로 쓴다 | 각자 쓴 내용을 나중에 병합해 최종적으로 수렴한다(AP) | cr-sqlite | 기기마다 오프라인으로 써야 한다 |

CAP와 PACELC의 일반 개념은 [[CAP-Theorem|CAP 정리]]에서, 서버형 RDBMS의 로그 기반 복제는 [[Transaction-Logs-Replication-CDC|트랜잭션 로그와 복제]]에서 다룬다.

## 합의 계열: rqlite의 운영 경계

rqlite 문서 기준(2026-10-27 확인)이다.

- 아무 노드에 쓰기를 보내도 되지만 실제 변경은 리더만 한다. 리더가 아닌 노드는 요청을 리더로 전달하고, 리더와 연결되지 않으면 쓰기는 오류로 끝난다.
- 목적은 가용성과 내결함성이지 쓰기 확장이 아니다. 합의에는 노드 간 통신과 Raft 로그 기록이 더해져 쓰기 성능은 단독 SQLite보다 낮다. Raft 로그가 모든 쓰기를 직렬화하므로 SQLite가 동시 쓰기를 지원하더라도 이득이 없다.
- Raft는 CP 프로토콜이라 분할되면 과반 노드가 있는 쪽만 쓰기를 받는다. 3노드 중 2노드를 잃은 클러스터는 단일 노드 클러스터가 아니라 quorum이 없어 멈춘 3노드 클러스터다.
- 읽기는 DB를 바꾸지 않아 합의가 필요 없으므로 일관성 수준을 요청마다 고른다.

| 수준 | 동작 | 경계 |
|---|---|---|
| Weak(기본) | 받은 노드가 로컬 상태로 자신이 리더인지 확인하고 로컬 SQLite를 읽는다. 리더가 아니면 리더로 전달한다 | 리더가 바뀐 직후의 짧은 창(기본 설정에서 1초 미만)에 오래된 값을 읽을 수 있어 linearizable이 아니다 |
| Linearizable | commit index를 기록하고 follower quorum의 heartbeat 응답을 받은 뒤, 그 index까지 적용되기를 기다려 읽는다(Raft 박사 학위논문(Ongaro, 2014) 6.4절 방식) | Weak보다 느리지만 Raft 로그는 거치지 않는다 |
| None | 받은 노드가 아무 확인 없이 로컬 DB를 읽는다 | 가장 빠르지만 오래된 값일 수 있다. `freshness`로 리더와 마지막 접촉 이후 허용 시간을, `freshness_strict`로 데이터 자체의 지연을 제한한다(노드 간 시계 차이의 영향을 받는다) |
| Strong | 질의를 Raft 로그에 태운다 | 느리고 클러스터에 부하를 줘 운영 비권장, 테스트용 |
| Auto | read replica면 None, 그 밖에는 Weak을 고른다 | 수준이 아니라 선택 규칙이다 |

read replica로 읽기를 늘릴 때는 None을 쓴다. 다른 수준으로 읽으면 replica가 요청을 리더로 전달해 읽기 확장 이득이 사라진다. 리더 교체 중의 오래된 읽기가 문제인 경로에만 Linearizable을 쓰는 식으로 경로별로 고른다([[Read-Replica-Routing|읽기 복제본 라우팅]]).

같은 합의 계열이라도 배포 단위가 다르다.

- dqlite는 애플리케이션에 내장하는 C 라이브러리로 Raft로 복제한다. libuv 이벤트 루프 위의 비동기 단일 스레드 구현이고 SQLite 기본 요소에 맞춘 자체 wire protocol을 쓴다. Linux에서만 동작하며 커널의 native async I/O가 필요하다. rqlite는 HTTP API로 접근하는 별도 서버다.
- SQLite Cloud는 맞춤형 Raft를 쓰는 관리형 서비스다. 리더가 모든 쓰기를 처리하고, follower는 읽기를 받으며 선거에 참여하고(분할 투표를 피하려 홀수를 권장), learner는 선거에 참여하지 않고 읽기 용량만 늘린다. 리더를 늘려 쓰기를 확장할 수는 없다.
- ActorDB는 actor마다 SQLite DB를 두고 Raft로 복제하며 MySQL 프로토콜로 접속한다. 샤딩을 숨기지 않고 actor 단위로 드러내는 설계다(README 기준, 저장소의 마지막 갱신은 2022-11).

## 합의를 써도 쓰기마다 과반 승인을 받는 것은 아니다

Expensify의 Bedrock은 Paxos로 연결된 노드 가운데 우선순위가 가장 높은 노드를 리더로 세우고, quorum이 모이지 않으면 아무도 리더가 되지 않아 split brain을 피한다. 쓰기는 리더로 올라가 리더가 자기 DB에 커밋한 뒤 follower로 스트리밍하는데, follower의 확인을 기다리지 않는다. 그래서 쓰기 처리량이 노드 간 왕복 시간의 역수를 넘을 수 있지만, 리더가 커밋을 넘기기 전에 죽으면 그 커밋은 사라지고 트랜잭션별로 더 강한 보장을 요청하는 방법은 없다고 공식 문서가 명시한다. 2026-10-28 main `f24e21b85ddb`의 `SQLiteNode`, `BedrockCommand`와 server 소스에서도 과거의 `writeConsistency`, `ConsistencyLevel`, `quorumCheckpoint` 인터페이스를 찾지 못했다. 과거 버전의 QUORUM 옵션을 현재 지원으로 가정하지 않는다. 리더 선출에 합의를 쓰는지와 각 쓰기를 과반에 기록한 뒤 응답하는지는 따로 확인한다.

## 스트리밍 계열: 단일 writer와 손실 창

- Litestream은 별도 백그라운드 프로세스로 WAL 페이지를 다른 파일이나 S3로 계속 복사하는 재해 복구 도구다. 긴 읽기 트랜잭션으로 다른 프로세스의 체크포인트를 막고 체크포인트를 직접 호출해 WAL을 넘겨받으며, 새 WAL 페이지를 LTX 파일로 묶어 보낸다. 데이터베이스마다 복제 대상은 하나다. 원본 DB에 `_litestream_lock` 테이블을 만들어 쓰기 잠금을 조율하므로 적용 전과 바이트 단위로 같다고 기대하지 않는다.
- LiteFS는 FUSE 기반 패스스루 파일시스템으로 SQLite 쓰기를 가로채 트랜잭션 경계를 찾고 변경을 LTX 파일로 기록한다. primary 선출은 Consul 세션 기반의 시간 lease가 맡아, 정상 종료 때는 바로, 비정상 종료 때는 TTL이 끝난 뒤 새 primary가 정해진다. 복제가 비동기라 primary에만 기록된 트랜잭션은 장애 때 잃을 수 있고, 새 primary보다 앞서 있던 replica의 트랜잭션도 버려질 수 있다. 저장소는 beta 상태로 표기한다. 2026-10-28 GitHub 최신 릴리스 메타데이터는 v0.5.14(2025-04-22)다.
- 두 도구 모두 쓰기는 한 곳이 받는다. 복제본을 늘려 읽기와 복구를 개선해도 쓰기 확장이나 무손실 장애 조치가 되지는 않는다. 복구 목표와 손실 허용 범위의 설계는 [[DR-Strategy|DR 전략]]을 따른다.

## 병합 계열: 여러 writer와 수렴

cr-sqlite는 SQLite와 libSQL에 런타임으로 불러오는 확장으로, 각자 독립적으로 쓴 DB를 병합한다. CRDT와 인과 순서 이벤트 로그로 multi-master 복제와 분할 내성을 더하며 기기 간 동기화, 실시간 협업과 오프라인 편집을 대상으로 한다. 충돌 없이 수렴한다는 것은 자료구조 수준의 보장이므로, 재고가 음수가 되면 안 되는 것 같은 업무 불변식은 따로 설계해야 한다(검토 포인트). 2026-10-28 GitHub 최신 릴리스는 v0.16.3(2024-01-17)이므로 신규 도입 때 유지보수와 호환성을 따로 확인한다. local-first 앱에서 저장, 상태와 동기화의 역할을 나누는 방법은 [[Expo-Integrations-Local-First|Expo local-first 저장과 동기화]]를 참고한다.

## 포크와 관리형 서비스

- SQLite는 오픈소스지만 open-contribution이 아니다. 퍼블릭 도메인 상태를 지키려고, 기여를 퍼블릭 도메인에 헌정한다는 진술서를 내지 않은 사람의 패치를 받지 않는다. 엔진 내부를 바꾸려는 쪽은 포크를 택하게 된다.
- libSQL은 Turso가 만들고 유지하는 open-contribution SQLite 포크다. 앱 안의 embedded replica, 원격 접근용 libSQL server, `ALTER TABLE` 확장 등을 더했지만 single-writer 모델 같은 SQLite의 근본 제약은 이어받는다. 같은 팀의 Turso database는 SQLite 포크가 아니라 Rust로 새로 구현한 SQLite 호환 DB로, 동시 쓰기와 오프라인 양방향 동기화를 내세우며 beta 상태다. libSQL 저장소는 새 프로젝트에 Turso를 권하고 새 기능은 Turso 쪽에서 개발한다고 밝힌다(2026-10-27 확인).
- Cloudflare D1은 SQLite의 SQL 의미를 쓰는 관리형 서버리스 DB로 재해 복구를 내장하고 Worker와 HTTP API로 접근한다. 전역 read replica로 읽기 지연과 처리량을 개선할 수 있다. 객체마다 SQLite 저장소를 두는 Durable Objects는 [[Cloudflare-Durable-Objects|Durable Objects]]에서 다룬다.
- 2026-10-02 Supabase는 Turso 인수를 발표했다. 공지 제목이 진행형(is acquiring)이라 거래 종결 여부는 이 공지로 확인되지 않는다. 공지는 기존 사용자에게 바뀌는 것이 없고 Supabase는 Postgres, Turso는 SQLite 작업을 이어 간다고 밝힌다. 인수 이유로는 에이전트가 요구에 따라 대량으로 만드는 소형 DB를 들며, 한 서버가 수백만 개의 DB를 필요할 때 불러오고 쓰지 않을 때 멈추는 Turso의 구조와 Supabase가 주당 100만 개가 넘는 DB를 만든다는 수치는 회사의 설명이다.

## 선택 질문

- 복구 목표 시간과 손실 허용량은 각각 얼마인가. Litestream은 백업 복원, LiteFS는 lease 만료와 primary 전환을 기다린다. 자동 장애 조치가 필요하다는 이유만으로 합의 계열로 한정하지 않고, 승인한 쓰기의 보존 조건까지 함께 비교한다.
- 마지막 몇 초의 쓰기를 잃어도 되는가. 복제본의 확인을 기다리지 않는 비동기 복제(Litestream, LiteFS, Bedrock)는 손실 창이 있다.
- 쓰기 처리량을 늘려야 하는가. 단일 합의 그룹이나 스트리밍 DB는 writer 하나가 한계지만 ActorDB처럼 actor별로 샤딩하면 쓰기를 여러 그룹으로 나눈다. 샤딩과 그 트랜잭션 경계나 분산 SQL([[SingleStore|SingleStore 분산 SQL]] 등)을 검토한다.
- 여러 곳에서 오프라인으로 써야 하는가. 그렇다면 병합 계열과 업무 충돌 규칙을 함께 설계한다.
- 라이브러리로 내장할지(dqlite), 별도 서버를 운영할지(rqlite), 관리형을 쓸지(D1, Turso Cloud, SQLite Cloud). 관리형은 장애 때의 손실 범위와 복구 방식을 공급자 문서로 확인한다.

## 연혁 (사례)

| 시점 | 사건 | 확인 수준 |
|---|---|---|
| 2014-01 | ActorDB 저장소 생성 | 저장소 메타데이터. 초기 버전의 복제 방식은 미확인 |
| 2014-08 | rqlite 저장소 생성. SQLite 앞에 Raft 로그를 두고 모든 쓰기를 클러스터에 복제 | 저장소 메타데이터와 저자 회고 |
| 2016-09 | Expensify Bedrock 공개 저장소 생성 | 저장소 메타데이터 |
| 2017-05 | Canonical dqlite 저장소 생성. 저자 회고는 LXD와 이후 MicroK8s에 etcd 없이 내장 복제 저장소를 주려던 것이라고 설명 | 저장소 메타데이터. 용도는 회고 기준이며 Canonical 문서와 미대조 |
| 2020-10 | Litestream 저장소 생성(회고는 2021년 초 공개로 기록) | 저장소 메타데이터 |
| 2022 | Cloudflare D1 발표(5월), LiteFS(4월), cr-sqlite(7월), libSQL(9월) 저장소 생성 | Cloudflare 발표 글과 저장소 메타데이터 |
| 2026-10 | Supabase의 Turso 인수 발표 | Supabase 공지 |

rqlite 저자는 rqlite를 Raft와 SQLite를 결합한 첫 오픈소스 시스템으로 보지만, ActorDB 저장소가 먼저 만들어졌고 그 초기 복제 방식을 확인하지 않았으므로 최초 여부는 판단하지 않는다. 세 갈래가 합의, 스트리밍, 병합 순서로 나왔고 자본은 관리형 서비스로 갔다는 정리도 같은 회고의 해석이다.

## 출처

- [Twelve years of distributed SQLite — Philip O'Toole](https://philipotoole.com/twelve-years-of-distributed-sqlite/) — 2026-10-23 rqlite 저자의 회고, 연혁과 세 갈래 분류의 출발점
- [SQLite, About SQLite](https://www.sqlite.org/about.html)
- [SQLite, Database Remote-Copy Tool For SQLite](https://sqlite.org/rsync.html)
- [SQLite, SQLite Copyright](https://www.sqlite.org/copyright.html)
- [rqlite, FAQ](https://rqlite.io/docs/faq/) — 2026-10-28 대조. FAQ의 두 번 왕복은 계수 기준이 불명확해 일반 Raft 커밋의 왕복 수로 옮기지 않음
- [rqlite, Read Consistency](https://rqlite.io/docs/api/read-consistency/)
- [canonical/dqlite — GitHub](https://github.com/canonical/dqlite)
- [SQLite Cloud Docs, Architecture](https://docs.sqlitecloud.io/docs/architecture)
- [biokoda/actordb — GitHub](https://github.com/biokoda/actordb)
- [Bedrock, Synchronization](https://bedrockdb.com/synchronization.html) — 2026-10-28 follower 확인과 쓰기 손실 조건 대조
- [Bedrock SQLiteNode — Expensify](https://github.com/Expensify/Bedrock/blob/f24e21b85ddb75ded1922225affbb4e1da14de35/sqlitecluster/SQLiteNode.cpp) — 2026-10-28 main 고정, 현재 동기화 구현 대조
- [Litestream, How it works](https://litestream.io/how-it-works/)
- [benbjohnson/litestream — GitHub](https://github.com/benbjohnson/litestream)
- [superfly/litefs ARCHITECTURE.md — GitHub](https://github.com/superfly/litefs/blob/main/docs/ARCHITECTURE.md)
- [vlcn-io/cr-sqlite — GitHub](https://github.com/vlcn-io/cr-sqlite)
- [tursodatabase/libsql — GitHub](https://github.com/tursodatabase/libsql)
- [Cloudflare Docs, D1](https://developers.cloudflare.com/d1/)
- [Announcing D1: our first SQL database — Cloudflare Blog](https://blog.cloudflare.com/introducing-d1/) — 2022-05-11 발표
- [Supabase is acquiring Turso — Supabase](https://supabase.com/blog/supabase-is-acquiring-turso) — 2026-10-02 공지
- [분산 SQLite의 12년 - rqlite에서 클라우드 서비스까지 — GeekNews](https://news.hada.io/topic?id=35911) — 2026-10-24 소개 글, 원문 식별에 사용

## 관련 문서

- [[CAP-Theorem|CAP 정리]]
- [[Transaction-Logs-Replication-CDC|트랜잭션 로그와 복제, PITR, CDC]]
- [[Read-Replica-Routing|읽기 복제본 라우팅]]
- [[DR-Strategy|DR 전략]]
- [[SingleStore|SingleStore 분산 SQL]]
- [[Cloudflare-Durable-Objects|Durable Objects]]
- [[Expo-Integrations-Local-First|Expo local-first 저장과 동기화]]
