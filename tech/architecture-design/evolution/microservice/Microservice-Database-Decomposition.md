---
tags: [architecture, microservices, database, migration, database-per-service, strangler-fig, cdc]
status: done
verified_at: 2026-10-14
category: "Architecture - 진화"
aliases: ["Microservice Database Decomposition", "Database Decomposition", "모놀리식 DB 분리", "서비스별 DB 이관"]
---

# 모놀리식 DB를 서비스별 DB로 나누는 이관

공유 DB를 서비스별 DB로 나누는 일은 테이블 복사가 아니라 도메인 하나의 기준 시스템(system of record)을 옮기는 일이다. 전체를 한 번에 옮기지 않고 도메인마다 초기 적재, 동기화와 검증, 기준 전환, 레거시 객체 제거를 반복한다. 소유권 원칙과 교차 서비스 조회는 [[Microservice-Data-Ownership-and-Queries|데이터 소유권과 교차 서비스 조회]], DB 엔진 단위의 복제와 컷오버 함정은 [[RDS-Zero-Downtime-Migration|무중단 RDS 마이그레이션]]에서 다룬다.

## 통째로 옮기기 전에 확인할 것

공유 DB를 구조 그대로 옮기는 리호스팅은 가장 빠른 선택지처럼 보이지만 다음 조건에서는 막히거나 효과가 작다.

- 현재 DB가 이미 최대 사양 장비에서 scale-up으로 버티고 구조상 scale-out이 어렵다면, 옮긴 뒤에도 다음 확장 수단이 없다.
- 대상 관리형 DB가 현재 피크를 받는 사양을 제공하지 않으면 전용 장비나 직접 운영하는 DB로 가야 한다. 이때 관리 권한, HA 구성과 상용 DB 라이선스 비용을 다시 계산한다.
- 수백, 수천 개 테이블과 저장 프로시저가 얽힌 DB는 옮겨도 장애 전파, 변경 영향 분석과 테스트 비용이 그대로 남는다.

이 조건에서는 DB를 서비스 단위로 먼저 나누고 나눈 단위로 옮기는 것이 이전 전략이 된다. Rehost와 Refactor의 범위 구분은 [[Cloud-Migration-Strategies|클라우드 마이그레이션 전략]]을 본다.

## 도메인 하나를 옮기는 순서

1. **서비스 경계를 정한다.** 같은 기능을 하는 모듈 단위가 흔한 출발점이지만 고정 규칙은 아니며 사업 방향에 따라 다시 조정한다. 판단 기준은 [[Microservice-Service-Decomposition|서비스 분해]]를 따른다.
2. **소유할 핵심 데이터를 목록으로 만든다.** 테이블 단위로 나뉘기도 하고, 한 테이블 안에서 행 단위로 소유자가 갈리기도 한다. 그 데이터를 읽고 쓰는 저장 프로시저, 뷰, 트리거, 배치와 직접 SQL 호출부도 함께 적는다.
3. **새 서비스가 요청부터 맡는다.** 새 서비스가 자기 도메인의 요청을 처리하되 데이터는 아직 모놀리식 DB의 해당 테이블에서 읽고 쓴다. 다른 도메인은 레거시가 계속 처리한다.
4. **도메인 DB를 만들고 동기화한다.** 해당 테이블과 과거 데이터를 초기 적재한 뒤 CDC로 모놀리식 DB의 변경을 따라잡는다. 새 서비스가 두 DB에 함께 쓰는 구성도 있다. 전환 전에 두 DB의 일관성을 검증한다.
5. **기준을 전환한다.** 검증이 끝나면 새 DB를 그 도메인의 기준 시스템으로 삼고 모든 읽기와 쓰기를 새 DB로 보낸다.
6. **레거시 객체와 코드를 제거한다.** 모놀리식 DB의 해당 테이블, 저장 프로시저와 의존성을 지우고, 쓰지 않게 된 레거시 코드와 쓰레기 데이터도 정리한다. 이를 정리해야 다음 도메인을 옮길 때 분석과 이관 범위가 줄어든다.
7. **다음 도메인으로 반복한다.** 서비스 특성, 사업 우선순위와 이관 범위에 따라 여러 도메인의 이관을 각자의 일정으로 동시에 진행할 수 있다.

## 롤백 가능 구간

| 구간 | 기준 시스템 | 되돌리는 방법 |
|---|---|---|
| 동기화와 검증 중 | 모놀리식 DB | 새 DB 경로를 끈다 |
| 기준 전환 직후, 레거시 테이블과 동기화가 남아 있을 때 | 새 DB | 연결을 모놀리식 DB로 되돌린다. 전환 뒤 새 DB에만 생긴 변경이 모놀리식 DB에도 반영되고 있어야 한다 |
| 레거시 객체 제거 뒤 | 새 DB | 객체를 복원하고 데이터 변경을 재생해야 해 비용과 위험이 크게 늘어난다 |

레거시 객체 제거는 도메인마다 의도한 마지막 단계로 두고 새 시스템의 검증이 끝난 뒤에만 한다. 기존 DB 연결과 동기화는 롤백이 필요 없다고 판단할 만큼 운영한 뒤 걷어낸다.

## 무중단 전환: 이중 쓰기에서 읽기와 쓰기를 따로 옮긴다

운영 중 쓰기가 멈추지 않는 도메인은 저장소를 바꾸는 단계를 나눠 기준을 옮긴다.

1. 기존 저장소와 새 저장소에 함께 쓰고(dual write), 기존 데이터는 백필한다. 백필 대상 탐색처럼 무거운 작업은 운영 DB 대신 스냅샷 기반 오프라인 작업으로 돌릴 수 있다.
2. 읽기 경로를 새 저장소로 바꾼다. 바꾸기 전에 두 경로의 읽기 결과를 비교해 불일치를 경보로 받고, 결과가 맞을 때 전환한다.
3. 쓰기 경로를 새 저장소로만 바꾼다. 2단계와 3단계 사이에는 기존 저장소도 계속 갱신되므로 읽기를 되돌릴 수 있다.
4. 낡은 데이터 모델에 의존하는 데이터와 코드를 지운다.

- 두 저장소 쓰기는 하나의 트랜잭션이 아니어서 한쪽만 성공할 수 있다. 단계마다 어느 쪽이 기준인지 명시하고 대사로 불일치를 찾아 기준 쪽 값으로 맞춘다. 이벤트 발행과 DB 갱신을 함께 보장해야 하면 [[Transactional-Outbox|Transactional Outbox]]를 검토한다.
- 대상 DB가 기존 장비보다 작은 사양이면 데이터뿐 아니라 성능도 검증한다. 이중 쓰기로 쓰기 부하는 이미 대상에 걸리고, 읽기 요청도 대상에 보내 결과는 쓰지 않는 dark launching으로 실제 부하 아래 지연을 볼 수 있다. 이 방식은 보통 기존 시스템의 수정이 필요하다. 미러링의 부수효과 차단과 샘플링은 [[Shadow-Traffic|섀도 트래픽]]을 따른다.

## 과도기 동기화가 남기는 결합

- 레거시의 다른 모듈이 아직 옮긴 테이블을 읽으면 새 DB의 변경을 모놀리식 DB로 되돌려 보내야 한다. 이 동기화가 남은 동안 모놀리식 DB는 여전히 통합 지점이어서 장애 전파와 데이터 증가 문제가 완전히 사라지지 않는다.
- 새 시스템과 레거시가 함께 쓰는 서비스와 저장소는 두 시스템이 동시에 접근할 수 있게 하고, 서로 호출하는 의존은 Anti-corruption Layer로 의미를 변환한다.
- 저장 프로시저 중심이라 애플리케이션 코드를 고치기 어려운 레거시는 DB 자체가 새 서비스에 메시지를 보내게 하거나 트랜잭션 로그를 읽는 CDC로 변경을 전달할 수 있다.
- 동기화 경로는 교체가 끝나면 걷어낼 과도기 구조로 보고 제거 조건을 둔다([[Legacy-Modernization-Strategies|레거시 현대화 전략]]의 Transitional Architecture).

## 중단을 허용하는 빠른 이전

운영 시간이 정해진 서비스나 내부 업무 시스템처럼 멈출 수 있는 서비스는 쓰기를 멈춘 뒤 한 번에 옮기는 stop-the-world 전환이 단순하다. 변경이 생기지 않으므로 CDC나 이중 쓰기 없이 전체 적재만으로 옮길 수 있다.

- 동종 엔진: AWS DMS로 데이터를 옮긴다. DMS는 테이블과 기본 키 수준의 기본 스키마만 만들고 보조 인덱스, 외래 키와 사용자 계정은 만들지 않으므로, 엔진의 네이티브 도구로 스키마를 따로 준비한다.
- 이기종 엔진: 스키마와 코드 객체를 대상 엔진에 맞게 변환한 뒤 DMS로 데이터를 옮긴다. 2026-10-14 확인한 DMS 모범 사례는 이기종 스키마 변환에 DMS Schema Conversion을 안내하며, 데스크톱 도구인 AWS SCT 사용자 가이드도 계속 제공된다. 세부는 [[DMS|AWS DMS]].
- 중단 전환은 리허설 없이 진행했다가 크게 실패하는 사례가 있고, 업무를 재개할 때 큰 부하 피크가 생길 수 있다. 문제나 시간 초과에 대비한 롤백 계획과 재개 직후의 부하를 함께 준비한다.

## 분리 뒤 달라지는 것

| 얻는 것 | 남는 비용 |
|---|---|
| 서비스가 느슨하게 결합되고 한 서비스의 DB 변경이 다른 서비스에 영향을 주지 않는다 | 여러 서비스에 걸친 업무 트랜잭션은 별도 설계가 필요하다 |
| 서비스마다 맞는 저장소 종류를 고를 수 있다 | 여러 DB에 흩어진 데이터를 join하는 조회가 어려워진다 |
| 서비스별로 확장 방식과 DB 파라미터를 따로 조정할 수 있다 | 여러 SQL과 NoSQL DB를 운영하는 복잡도가 늘어난다 |

여러 서비스에 걸친 상태 변경은 [[Saga-Pattern|Saga]], 교차 조회는 [[Microservice-Data-Ownership-and-Queries|API Composition과 CQRS projection]]으로 다룬다.

## 사례: 배달 플랫폼의 서비스별 DB 이관 (발표 기준, 2020)

우아한형제들의 배달의민족은 가게, 메뉴, 회원, 주문 같은 여러 도메인이 IDC에 둔 메인 DB 하나에 의존하는 구조에서 출발했다. 점심과 저녁의 트래픽이 다른 시간대의 수십 배 가까이 됐고, 작은 이슈가 공유 DB를 타고 전체 장애로 번졌다.

- 2016년 일부 서비스 DB를 AWS에 두었지만 여러 도메인이 엮여 있어 메인 DB로의 데이터 동기화를 유지했다. 그래서 IDC와 AWS로 나뉜 네트워크, 늘어나는 데이터 크기와 장애 전파 문제가 남았다.
- 2018년에는 메인 DB를 구조 그대로 클라우드로 옮기려다 중단했다. 메인 DB가 클라우드에서 수용 가능한 사양을 이미 넘어 전용 장비가 필요했고, 관리 권한 제약, HA 구성의 복잡도와 Microsoft SQL Server 라이선스 비용이 걸렸다. 이미 최고 사양 장비를 쓰고 있어 옮긴 뒤 scale-up 여지도 없었다.
- 이후 마이크로서비스 단위 DB 이관에 집중해 약 4년에 걸쳐 수십 개 서비스의 DB를 분리했고, 발표 시점에는 서비스별 DB 수백 대가 운영되고 있었다.
- 서비스를 멈출 수 없는 이관은 무중단 방식을 가장 많이 썼다. 특정 시점 기준으로 데이터를 옮긴 뒤 두 DB에 함께 적재하며 변경분을 따라가 대사했고, 기존 DB를 기준으로 둔 채 양쪽에 같은 트래픽을 주어 데이터와 성능을 검증했다. 기존 장비보다 낮은 사양의 인스턴스에서도 성능이 유지되는지 확인한 뒤 연결을 전환했고, 롤백에 대비해 기존 DB 연결을 충분한 기간 유지한 뒤 제거했다.
- 운영 시간이 제한되거나 내부 업무용이라 멈출 수 있는 서비스는 AWS SCT와 DMS로 빠르게 옮겼다.
- 분리 뒤 스키마 변경이 자유로워지고 장애 전파가 크게 줄었으며, 남은 전파 경로에는 서킷 브레이커를 적용하기 쉬워졌다. 서비스별 DB 파라미터 튜닝과 scale-up, scale-out을 적용했고, CloudWatch와 Lambda를 연계해 수백 대 DB에 모니터링을 빠짐없이 적용했다.

## 면접 체크포인트

- 공유 DB를 통째로 옮기지 않고 도메인별로 나눠 옮기는 이유와 리호스팅이 막히는 조건
- 초기 적재, 동기화와 검증, 기준 전환, 레거시 객체 제거의 순서와 구간별 롤백 방법
- 이중 쓰기에서 읽기 경로와 쓰기 경로를 따로 옮기는 이유와 부분 실패의 대사
- 과도기 동기화가 남기는 결합과 제거 조건
- 다운타임 허용 여부에 따른 무중단 이관과 중단 이관의 선택

## 출처

- [변화와 혁신을 위한 클라우드 마이그레이션 — Amazon Web Services Korea](https://www.youtube.com/watch?v=iFktTPfD0dg)
- [Microsoft, Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)
- [Online migrations at scale — Stripe, Jacqueline Xu](https://stripe.com/blog/online-migrations)
- [Dark Launching (Patterns of Legacy Displacement) — martinfowler.com](https://martinfowler.com/articles/patterns-legacy-displacement/dark-launching.html)
- [Stop the World cutover (Patterns of Legacy Displacement) — martinfowler.com](https://martinfowler.com/articles/patterns-legacy-displacement/stop-the-world.html)
- [Microservices Pattern: Database per service — microservices.io](https://microservices.io/patterns/data/database-per-service.html)
- [AWS DMS, Best practices for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html)
- [AWS SCT, What is the AWS Schema Conversion Tool?](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Welcome.html)

## 관련 문서

- [[Microservice-Data-Ownership-and-Queries|데이터 소유권과 교차 서비스 조회]]
- [[Microservice-Service-Decomposition|마이크로서비스 서비스 분해]]
- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
- [[RDS-Zero-Downtime-Migration|무중단 RDS 마이그레이션]]
- [[DMS|AWS DMS]]
- [[Cloud-Migration-Strategies|클라우드 마이그레이션 전략]]
