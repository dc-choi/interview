---
tags: [aws, documentdb, ttl, database, performance]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["DocumentDB TTL 운영", "DocumentDB 만료 데이터 정리"]
---

# DocumentDB TTL과 만료 데이터 운영

DocumentDB의 TTL 인덱스는 시간 조건을 만족한 문서를 백그라운드에서 삭제한다. 관리형 데이터베이스를 사용해도 만료 시점의 업무 규칙, 삭제 부하와 실제 쿼리의 호환성은 애플리케이션에서 검증해야 한다.

## 만료와 삭제 완료는 다른 상태다

2026-10-07 공식 문서 기준으로 TTL 삭제는 best effort이며 특정 시간 안의 삭제를 보장하지 않는다. 인스턴스 크기, 자원 사용률, 문서 크기와 처리량 등에 따라 삭제 시점이 달라진다.

따라서 만료된 쿠폰이나 세션처럼 즉시 사용을 막아야 하는 데이터에서는 업무 처리 경로가 만료 시각을 확인하도록 설계한다. 이는 TTL의 지연 삭제 특성에서 도출한 적용 원칙이다. 문서가 아직 존재한다는 사실을 유효성 판단으로 사용하지 않는다.

## 일괄 만료는 별도 부하 시나리오다

TTL 구현은 컬렉션 중 일부 문서를 지속적으로 삭제하는 사용에 최적화되어 있다. 기존 컬렉션에 TTL 인덱스를 새로 만들 때는 이미 만료된 문서를 먼저 정리하도록 AWS가 안내한다. 대량의 문서가 한꺼번에 만료되면 평소와 다른 삭제 I/O 부하가 생길 수 있다.

검증은 평균 적재량만 재현하지 않고 다음 조건을 나누어 수행한다.

| 조건 | 확인할 결과 |
|---|---|
| 만료 시각이 분산된 정상 유입 | 지속적인 삭제 처리와 온라인 요청 지연 |
| 이벤트 종료 등으로 만료 시각이 몰린 데이터 | CPU, 메모리, IOPS, 요청 오류와 삭제 지연 |
| 기존 만료 데이터가 누적된 상태 | 정리 속도와 서비스 부하, TTL 도입 전 정리 계획 |
| 인덱스 수나 문서 크기가 다른 상태 | 같은 건수에서도 달라지는 자원 사용량 |

이 표는 운영 테스트 제안이다. 다른 시스템의 특정 삭제 건수나 CPU 비율을 자기 workload의 안전 한도로 사용하지 않는다. 통과 조건은 실제 요청 지연, 오류율과 허용 가능한 정리 지연으로 정한다.

## 시간별 컬렉션과 비교한다

TTL은 문서별 만료 시각을 적용하기 편하다. 반면 같은 기간의 데이터를 한꺼번에 버릴 수 있다면 일별 또는 주별 컬렉션을 만들고 보존 기간 뒤 컬렉션을 삭제하는 구조를 비교할 수 있다.

AWS는 시간별 컬렉션 삭제를 문서별 TTL 삭제보다 I/O 부담이 작은 대안으로 설명한다. 비용 판단에서는 현재 스토리지 구성의 I/O 과금 여부도 확인한다. 컬렉션을 나누면 조회 범위와 인덱스 관리가 달라지므로 삭제 비용만으로 선택하지 않는다.

## MongoDB 호환성과 운영 검증

DocumentDB는 MongoDB API를 지원하지만 전용 엔진을 사용하며 쿼리 계획과 `explain()` 결과가 다를 수 있다. 드라이버 연결 성공만으로 기능, 성능과 운영 동작이 같다고 판단하지 않는다. 실제로 쓰는 쿼리, 정렬, 인덱스와 재시도 설정을 대상 엔진 버전에서 확인한다.

데이터 이전 자체의 검증은 [[DMS|DMS 마이그레이션]], 캐시 엔진의 선택과 호환성은 [[ElastiCache-Engine-Deployment|ElastiCache 엔진 선택]]과 연결한다. 관리형 서비스의 채택과 AI가 만든 운영 스크립트의 정확성도 별도 검증 대상이다.

## 출처

- [Amazon DocumentDB, How it works](https://docs.aws.amazon.com/documentdb/latest/devguide/how-it-works.html)
- [Amazon DocumentDB, Best practices](https://docs.aws.amazon.com/documentdb/latest/devguide/best_practices.html)
- [Amazon DocumentDB, Functional differences with MongoDB](https://docs.aws.amazon.com/documentdb/latest/devguide/functional-differences.html)

## 관련 문서

- [[DMS|데이터베이스 마이그레이션]]
- [[ElastiCache-Engine-Deployment|캐시 엔진 선택과 운영]]
- [[DynamoDB|DynamoDB TTL과 비동기 삭제 비교]]
