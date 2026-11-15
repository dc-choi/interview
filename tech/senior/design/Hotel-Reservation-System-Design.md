---
tags: [senior, system-design, reservation, inventory, concurrency, idempotency, postgresql]
status: done
verified_at: 2026-11-15
category: "시니어역량(SeniorEngineer)"
aliases: ["Hotel Reservation System Design", "Booking System Design", "호텔 예약 시스템 설계", "숙박 예약 설계"]
---

# 호텔 예약 시스템 설계

호텔 예약은 조회가 쓰기보다 훨씬 많지만, 같은 날짜의 마지막 객실을 두 사람이 동시에 잡는 순간에는 강한 일관성이 필요하다. 그래서 검색과 탐색은 최종 일관성으로 빠르게 처리하고, 예약 확정은 관계형 DB의 트랜잭션 하나에서 재고를 확인하고 차감하도록 두 경로를 나눈다. 단순한 조회 후 삽입(select then insert)으로 만들면 이중 예약과 이중 결제, 환불 처리가 뒤따른다.

## 요구사항과 일관성 경계

| 영역 | 일관성 | 이유 |
| --- | --- | --- |
| 예약 생성, 변경, 취소 | 강한 일관성 | 같은 객실 유형의 같은 날짜를 재고보다 많이 팔면 안 된다 |
| 검색, 목록, 상세 조회 | 최종 일관성 허용 | 잠시 남은 객실이 보여도 예약 단계에서 DB로 다시 확인한다 |
| 알림, 검색 색인 갱신 | 비동기 | 예약 확정 응답을 늦추지 않는다 |

먼저 확인할 질문은 플랫폼 내 결제 여부, 웹과 앱의 요금 차이, 취소와 초과 예약(overbooking) 허용 여부, 날짜와 수요에 따른 동적 가격, 관리자 기능 포함 여부다. 지연 목표는 검색과 예약 확정을 따로 둔다. 예를 들어 검색은 500ms 안, 예약 확정은 2~3초 안처럼 경로별로 다르게 잡는다.

## 용량 추정 예시

연간 예약량에서 쓰기를, 방문 퍼널에서 읽기를 계산한다. 아래 입력값은 면접에서 주어지는 가정이다.

- 쓰기: 연간 객실박(room night) 11억 ÷ 평균 2박 = 연 5.5억 건, ÷ 365 = 하루 약 150만 건, ÷ 86,400 = 초당 약 17건
- 읽기: 월 방문 5억 ÷ 30 = 하루 약 1,700만 방문, ÷ 86,400 = 초당 약 200 방문, 방문당 백엔드 읽기 5회를 곱하면 초당 약 1,000건

읽기와 쓰기의 비가 수십 배라 읽기 경로는 검색 엔진과 캐시로 넓히고, 쓰기 경로는 정합성을 지키는 데 집중한다. 퍼널의 대부분은 예약하지 않고 둘러보는 사용자라 읽기 용량을 따로 잡아야 한다.

## 구성

- **API Gateway**: 인증, rate limiting, 서비스 라우팅과 인스턴스 부하 분산을 맡는다. 이미지와 정적 자산은 CDN에서 응답한다.
- **Hotel 서비스**: 호텔과 객실 유형 정보다. 거의 바뀌지 않아 캐시하기 좋다.
- **Search 서비스**: Elasticsearch로 위치 반경, 가격대, 평점과 텍스트 검색을 처리한다. DB 변경이 뒤늦게 반영되는 최종 일관성 저장소다.
- **Reservation 서비스**: 재고 확인, 예약 생성과 취소, 동시성 제어를 맡는 핵심 경로다.
- **Rate 서비스**: 날짜와 수요에 따른 동적 가격을 계산한다.
- **Payment, Notification 서비스**: 결제 대행사 연동과 이메일, 푸시 알림이다. 결제 완료 같은 사건은 메시지 큐로 알림과 검색 색인 갱신에 전달한다.

서비스는 나누되 강하게 엮인 데이터(호텔, 객실 유형, 재고, 예약)는 한 DB에 둔다. 서비스마다 DB를 나누면 예약이 참조하는 호텔과 객실 유형, 결제처럼 서비스 경계를 넘는 정합성을 분산 트랜잭션이나 보상 흐름으로 맞춰야 하고, 단일 모놀리스는 트랜잭션은 쉽지만 큰 조직에서 독립 배포가 어렵다. 공유 DB로 로컬 ACID 트랜잭션을 쓰는 절충은 서비스 간 스키마 결합을 대가로 치른다.

## 데이터 모델

예약 단위는 물리 객실이 아니라 객실 유형이다. 호수는 체크인 때 배정한다.

| 테이블 | 핵심 컬럼 | 역할 |
| --- | --- | --- |
| hotel | id, name, address, location | 같은 브랜드의 여러 호텔은 별도 id로 두거나 hotel_group으로 묶는다 |
| room_type | id, hotel_id, name, capacity | 호텔 1 : N 객실 유형 |
| room_type_rate | room_type_id, plan, price | 기본, 조식 포함, 전망처럼 요금제별 가격 |
| room | id, hotel_id, room_type_id, floor, number, status | 체크인 때 배정하는 실제 객실 |
| room_type_inventory | hotel_id, room_type_id, date, total_inventory, total_reserved | 호텔, 객실 유형, 날짜마다 한 행 |
| reservation | id, hotel_id, room_type_id, guest_id, start_date, end_date, status | 예약 본체 |
| reservation_transaction | id, reservation_id, type, amount | 신규, 날짜 변경 차액, 환불을 부호 있는 금액으로 쌓는다 |

재고를 날짜별 행으로 두면 날짜 범위 조회와 일괄 재고 조정, 요금 계산과 초과 예약 계산이 단순해진다. 행은 예약 가능 기간(예: 2년)만큼 미리 만들어 두고 매일 배치가 새 날짜를 더한다. 결제 이력을 예약과 분리하면 날짜 변경이나 취소로 생기는 추가 결제와 환불을 덮어쓰지 않고 남길 수 있다.

예약 가능 조건은 숙박 날짜마다 다음을 만족하는 것이다.

```text
total_reserved + 예약할_객실_수 <= total_inventory × (1 + 초과_예약_비율)
```

초과 예약 비율을 10%로 두면 재고 100실에 110실까지 받는다. 취소로 빠질 몫을 미리 파는 운영 정책이므로 비율은 호텔별 설정으로 둔다.

## 동시성 제어

### 같은 사용자의 중복 제출

더블 클릭이나 재전송으로 같은 예약이 두 번 들어오는 경우다. 클라이언트가 예약 시도마다 예약 id(UUID)를 한 번 만들어 보내고 DB 고유 제약으로 막는다. 두 번째 요청은 고유 키 위반이 나므로 새로 만들지 않고 기존 예약을 돌려준다. 호텔, 객실 유형, 사용자 조합만으로 키를 만들면 같은 사용자의 정당한 다음 예약까지 막으므로 날짜나 시도 식별자를 포함해야 한다. 일반 원리는 [[Idempotency-Key|멱등성 키]]를 따른다.

### 서로 다른 사용자의 마지막 객실 경합

Read Committed에서 재고를 읽고(check) 확인한 뒤 갱신하는(act) 사이에 다른 트랜잭션이 끼어들 수 있다. 두 트랜잭션이 모두 남은 1실을 보고 조건을 통과하면 둘 다 예약에 성공한다. PostgreSQL의 기본 격리 수준이 Read Committed이므로 별도 장치가 없으면 이 경합이 그대로 열려 있다.

| 방법 | 동작 | 맞는 상황 | 대가 |
| --- | --- | --- | --- |
| `SELECT ... FOR UPDATE` 후 갱신 | 숙박 날짜의 재고 행을 잠그고 읽은 뒤 같은 트랜잭션에서 검증과 갱신을 끝낸다. 같은 행을 잠그려는 다른 트랜잭션은 끝날 때까지 기다린다 | 경합이 특정 호텔과 날짜에 몰리는 기본 선택 | 대기 시간, 여러 행을 다른 순서로 잠그면 교착 상태 |
| 조건부 `UPDATE` | `UPDATE ... SET total_reserved = total_reserved + :n WHERE ... AND total_reserved + :n <= 한도`로 확인과 차감을 한 문장에서 하고, 갱신된 행 수가 숙박일 수와 다르면 롤백한다 | 검증 조건이 재고 행 안에서 끝날 때 | 조건이 다른 테이블에 걸리면 표현하기 어렵다, 여러 날짜 행을 갱신하므로 교착 상태 가능 |
| Serializable | 직렬 실행과 다른 결과가 될 수 있는 트랜잭션을 실패시킨다 | 경합이 드물고 검증 로직이 복잡할 때 | 재시도 로직 필수, 같은 행 쓰기는 여전히 대기, 실패율이 높아지면 처리량이 떨어진다 |

PostgreSQL 기준 세부 동작(18 문서 기준):

- Read Committed에서 `UPDATE`나 `SELECT FOR UPDATE`가 다른 트랜잭션이 고친 행을 만나면 그 트랜잭션이 끝날 때까지 기다린다. 커밋되면 갱신된 행에 대해 `WHERE` 조건을 다시 평가한다. 그래서 조건부 `UPDATE`는 앞선 예약이 반영된 값으로 한도를 다시 확인한다.
- 행 잠금은 같은 행의 쓰기와 잠금만 막고 일반 조회는 막지 않는다. 다른 호텔이나 날짜의 예약은 병렬로 진행된다.
- Serializable이 더하는 predicate lock(SSI 감시)은 블로킹하지 않아 Repeatable Read보다 더 블로킹하지 않는다. 대신 직렬화 실패(SQLSTATE `40001`)로 트랜잭션을 되돌리므로 애플리케이션이 트랜잭션 전체를 다시 실행해야 한다. 다만 같은 재고 행을 갱신하는 두 트랜잭션은 Repeatable Read와 같이 뒤 트랜잭션이 앞 트랜잭션의 종료를 기다리고, 앞이 커밋하면 뒤는 직렬화 실패로 끝난다. Serializable이 트랜잭션을 하나씩 실행한다고 보는 설명은 PostgreSQL의 동작과 맞지 않는다.
- 교착 상태는 명시적 잠금 없이 행 잠금만으로도 생길 수 있고, 여러 객체의 잠금을 모든 트랜잭션이 같은 순서로 잡아 피한다. 날짜 범위는 `SELECT ... ORDER BY date FOR UPDATE`로 날짜 오름차순으로 먼저 잠근 뒤 갱신한다.

격리 수준별 이상 현상은 [[Isolation-Level|트랜잭션 격리 수준]](MySQL InnoDB 중심), PostgreSQL의 Read Committed 재평가와 Repeatable Read 직렬화 실패는 [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]], 이중 예약 같은 경합 유형은 [[Race-Condition-Patterns-DB-Distributed|DB와 분산 환경의 경쟁 조건 패턴]]에서 다룬다.

## 확장

### 샤딩

대부분의 질의가 호텔을 먼저 고르므로 `hotel_id`를 샤드 키로 두면 한 호텔의 객실 유형, 재고, 예약이 한 샤드에 모인다. 예약 트랜잭션이 샤드 안에서 끝나 로컬 트랜잭션을 유지한다. 반대로 사용자별 예약 내역처럼 호텔을 가로지르는 조회는 여러 샤드를 읽거나 사용자 기준의 별도 조회 모델이 필요하다.

샤드 수가 자주 바뀌지 않으면 `hash(hotel_id) mod N`으로 시작한다. 예를 들어 16개 샤드면 부하가 고르게 나뉜다고 가정한 평균으로 샤드당 초당 읽기 약 60건, 쓰기 약 1건이다. 해시는 호텔 수를 나눌 뿐 인기 호텔에 몰린 부하는 나누지 못한다. 이 정도 쓰기량 자체는 샤딩의 이유가 되지 않으므로, 도입 시점은 데이터 크기와 단일 노드의 쓰기 한계로 정한다. 샤드를 늘릴 일이 잦으면 데이터 이동이 적은 [[Consistent-Hashing|일관된 해싱]]으로 옮긴다. 일반 전략은 [[Sharding|샤딩]]에 있다.

### 캐시와 검색

- 캐시 키는 `호텔:객실 유형:날짜`, 값은 `total_inventory`와 `total_reserved`다. 초과 예약 비율은 설정값이라 캐시하지 않는다.
- 검색은 cache-aside로 읽고 TTL(예: 5분)을 둔다. 캐시가 틀려도 예약 단계에서 DB로 다시 확인하므로 과판매로 이어지지 않는다.
- 예약이 커밋되면 영향받은 날짜의 캐시 키를 무효화한다. 무효화가 늦어도 사용자는 남은 객실을 보고 들어왔다가 예약 단계에서 거절당할 뿐이다.
- Elasticsearch는 DB 변경을 비동기로 받는다. 결제 직후 검색에는 아직 예약 가능으로 보일 수 있으므로 화면 문구와 예약 실패 처리를 이 지연에 맞춘다.

## 점검 질문

- 예약 확정 경로의 모든 판단이 캐시나 검색 엔진이 아닌 DB 트랜잭션 안에서 끝나는가
- 재고 행을 잠그는 순서가 모든 코드 경로에서 같은가
- Serializable을 쓴다면 `40001` 재시도와 재시도 상한이 있는가
- 결제가 성공했는데 예약 커밋이 실패하거나 그 반대인 경우의 보상 흐름이 있는가. 사건 발행은 [[Transactional-Outbox|트랜잭셔널 아웃박스]]로 DB 커밋과 묶는다
- 인기 날짜에 몰리는 예약 시도를 입장 단계에서 줄일 필요가 있는가. 대기열 방식은 [[Virtual-Waiting-Room-Architecture-Admission-Reservation|가상 대기실 입장과 예약]]을 참고한다

## 출처

- [freeCodeCamp.org, Hayk Simonyan, Design Software Systems Like a Senior Engineer – Complete Course](https://www.youtube.com/watch?v=soTfFFIQQ8U)
- [PostgreSQL 18 Documentation, 13.2 Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL 18 Documentation, 13.3 Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html)

## 관련 문서

- [[System-Design-Interview|시스템 설계 인터뷰 대응]]
- [[System-Design-Quality-Attribute-Decision|시스템 설계 품질 속성과 의사결정 증거]]
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[Race-Condition-Patterns-DB-Distributed|DB와 분산 환경의 경쟁 조건 패턴]]
- [[Idempotency-Key|멱등성 키]]
- [[Sharding|샤딩]]
- [[Consistent-Hashing|일관된 해싱]]
- [[Transactional-Outbox|트랜잭셔널 아웃박스]]
- [[Virtual-Waiting-Room-Architecture-Admission-Reservation|가상 대기실 입장과 예약]]
