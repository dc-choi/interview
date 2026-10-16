---
tags: [fit, interview, questions, database, concurrency, reliability]
status: done
category: "Interview - Fit"
aliases: ["Common Interview Questions DB Operations", "DB와 운영 기본 질문"]
verified_at: 2026-10-14
---

# 자주하는 면접 질문 — DB와 운영 기본

## Q10. 인덱스는 왜 빠르고, 언제 풀 스캔이 더 유리한가?

**질문 의도**: 자료구조와 실제 데이터 접근 비용을 연결하고 InnoDB 저장 구조를 구분하는지 본다.

**핵심 답변**: B-tree 계열 인덱스는 정렬된 키와 페이지 계층으로 검색 범위를 줄인다. InnoDB clustered index의 리프에는 행 데이터가 있고, secondary index에는 인덱스 키와 clustered key가 있어 필요한 행을 다시 찾는다. 필요한 컬럼을 인덱스가 덮으면 추가 행 조회를 줄일 수 있다. 작은 테이블이나 많은 행을 읽는 조회에서는 인덱스 탐색과 반복 행 조회보다 테이블 스캔이 저렴할 수 있다.

**흔한 오답**: 인덱스가 있으면 모든 조회가 빨라진다. Secondary index가 행의 물리 주소를 저장한다. 일정 비율을 넘으면 반드시 풀 스캔한다.

**꼬리질문**: PK가 없으면 clustered key는 어떻게 정하는가? 인덱스 추가가 쓰기와 저장 공간에 미치는 비용은 무엇인가?

> 적용 전제: MySQL 8.4 InnoDB의 B-tree 계열 구조다. PK가 없으면 모든 컬럼이 NOT NULL인 첫 UNIQUE 인덱스, 그것도 없으면 숨은 clustered index를 쓴다. 실제 유불리는 실행 계획, 반환 행 수와 측정으로 확인한다.
> 학습 정본/출처: [[Index]], [[Covering-Index]], [MySQL 8.4, Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html), [MySQL 8.4, Avoiding Full Table Scans](https://dev.mysql.com/doc/refman/8.4/en/table-scan-avoidance.html)

## Q11. 트랜잭션으로 묶으면 동시 수정도 안전한가?

**질문 의도**: 원자성과 격리, 업무 불변식을 별개로 설명하는지 본다.

**핵심 답변**: 원자성은 한 트랜잭션의 변경을 모두 확정하거나 되돌리는 성질이다. 두 트랜잭션이 같은 값을 읽고 계산한 결과를 덮어쓰는 문제까지 자동으로 해결하지 않는다. 재고처럼 한 행의 조건으로 표현할 수 있으면 `UPDATE stock SET quantity = quantity - 1 WHERE id = ? AND quantity > 0`과 갱신 행 수 확인으로 검증과 변경을 한 문장에 묶는다. 여러 행의 불변식은 잠금, 버전 검사와 제약 조건의 보호 범위를 따로 정한다.

**흔한 오답**: BEGIN과 COMMIT 사이에 있으므로 다른 요청이 끼어들지 못한다. 원자성은 동시에 한 요청만 실행한다는 뜻이다.

**꼬리질문**: 재고가 1일 때 두 요청이 동시에 차감하면 어떻게 되는가? 같은 트랜잭션인데 저장소마다 다른 커넥션을 쓰면 무엇이 깨지는가?

> 적용 전제: 위 SQL은 이미 존재하는 InnoDB 행을 대상으로 한다. 없는 행의 동시 생성에는 UNIQUE 제약 등 별도 보호가 필요하며 외부 API 작업은 DB rollback으로 되돌아가지 않는다.
> 학습 정본/출처: [[Transactions#ACID|트랜잭션 ACID]], [[Lock#MVCC와 Lock의 관계|MVCC와 잠금]], [MySQL 8.4, Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)

## Q12. READ COMMITTED와 REPEATABLE READ의 일반 SELECT는 무엇이 다른가?

**질문 의도**: 읽기 스냅샷의 기준 시점과 잠금 읽기를 구분하는지 본다.

**핵심 답변**: InnoDB의 일반 비잠금 조회에서 RC는 조회마다 새 스냅샷을 읽으므로 그사이 다른 트랜잭션이 커밋하면 재조회 결과가 달라질 수 있다. RR은 기본적으로 첫 consistent read가 만든 스냅샷을 같은 트랜잭션에서 재사용한다. FOR UPDATE 같은 잠금 읽기와 쓰기는 그 스냅샷 조회와 다른 규칙을 쓰며, 자신의 변경은 같은 트랜잭션에서 보인다.

**흔한 오답**: RR은 반드시 BEGIN 순간의 값을 읽는다. RC는 커밋하지 않은 변경도 읽는다. RR의 모든 SELECT가 행 잠금을 건다.

**꼬리질문**: 다른 세션이 값을 커밋한 뒤 두 번 조회하면 RC와 RR에서 무엇이 보이는가? FOR UPDATE를 섞으면 왜 같은 스냅샷 설명을 쓸 수 없는가?

> 적용 전제: MySQL 8.4 InnoDB의 명시적 트랜잭션, 일반 consistent nonlocking read 기준이다. WITH CONSISTENT SNAPSHOT과 SERIALIZABLE은 별도 조건이며 같은 이름의 격리 수준도 DBMS별 구현이 다르다.
> 학습 정본/출처: [[Isolation-Level]], [[Lock#MVCC와 Lock의 관계|MVCC와 잠금]], [MySQL 8.4, Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)

## Q13. 낙관적 잠금과 비관적 잠금은 충돌을 어떻게 처리하는가?

**질문 의도**: 이름만 설명하지 않고 충돌 검출, 대기와 실패 정책까지 연결하는지 본다.

**핵심 답변**: 비관적 방식은 FOR UPDATE 등으로 먼저 잠금을 얻고 같은 트랜잭션에서 읽고 수정한다. 낙관적 방식은 읽은 version을 조건에 넣어 `UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?`를 실행하고 갱신 실패를 처리한다. 충돌 빈도, 잠금 시간과 재계산 비용으로 선택하며, 사용자 편집 충돌은 최신본 비교와 병합 또는 재확인이 필요하다.

**흔한 오답**: 낙관적 잠금은 DB 잠금을 전혀 쓰지 않는다. 실패하면 최신 버전으로 오래된 입력을 무조건 다시 저장한다. 비관적 잠금은 데드락을 없앤다.

**꼬리질문**: 갱신 행 수 0이 언제나 버전 충돌인가? 충돌률이 높으면 제한된 재시도와 잠금 대기 중 무엇이 유리한가?

> 적용 전제: version 방식의 낙관적 제어와 InnoDB 잠금 읽기 예시다. 조건부 UPDATE 자체는 쓰기 잠금을 쓰고, 0행은 삭제나 다른 조건 불충족도 가능하다. 비관적 잠금의 조회와 수정은 같은 트랜잭션/커넥션에서 수행한다. 낙관적 방식은 이전 요청이나 트랜잭션에서 읽은 version도 조건부 UPDATE에서 검사할 수 있다.
> 학습 정본/출처: [[Lock#Lock의 두 가지 전략|잠금 전략]], [MySQL 8.4, Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)

## Q14. 데드락은 왜 생기고 어떻게 줄이며 복구하는가?

**질문 의도**: 긴 대기와 순환 대기를 구분하고 실패한 트랜잭션의 복구를 설명하는지 본다.

**핵심 답변**: 서로 잠금을 보유한 채 상대의 자원을 기다리는 순환이 생기면 데드락이다. A행 다음 B행, B행 다음 A행을 잠그는 순서 역전이나 공유 잠금의 쓰기 잠금 승격이 원인이 될 수 있다. 접근 순서를 통일하고 트랜잭션을 짧게 하며 적절한 인덱스로 잠금 범위를 줄인다. 데드락으로 취소된 트랜잭션은 원인을 기록하고 전체 작업을 새 트랜잭션에서 제한적으로 재시도한다.

**흔한 오답**: 오래 기다리면 모두 데드락이다. 잠금 순서만 통일하면 모든 데드락이 사라진다. 실패한 SQL 한 문장만 이어서 재실행하면 된다.

**꼬리질문**: 데드락과 lock wait timeout은 rollback 범위가 어떻게 다른가? SHOW ENGINE INNODB STATUS에서 어떤 자원과 SQL을 확인하는가?

> 적용 전제: MySQL 8.4 InnoDB 기준이다. 감지 설정과 오류 유형을 확인하며, 재시도에는 횟수 제한, backoff와 외부 부수효과의 중복 방지가 필요하다. 낙관적 제어의 UPDATE에서도 데드락은 가능하다.
> 학습 정본/출처: [[Lock-Deadlock]], [MySQL 8.4, How to Minimize and Handle Deadlocks](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html)

## Q15. DB CPU가 50%를 넘으면 캐시를 도입해야 하는가?

**질문 의도**: 단일 수치를 보편 기준으로 삼지 않고 캐시의 효과와 정합성 비용을 판단하는지 본다.

**답변 골격**: CPU 50% 자체로 도입을 결정하지 않는다. 사용자 지연 목표, 피크 부하와 DB 쿼리/대기 지표로 병목을 찾고 원본 경로의 실행 계획과 인덱스를 먼저 점검한다. 같은 결과가 반복 조회되고 허용 신선도 안에서 재사용된다면 예상 적중률, 절감 비용, 무효화와 장애 시 원본 부하를 비교해 도입한다.

**대안과 트레이드오프**: 쿼리 개선은 원본 경로도 개선한다. 로컬 캐시는 단순하지만 인스턴스별 값이 달라질 수 있고, 분산 캐시는 공유 대신 네트워크와 운영 비용을 더한다.

**흔한 오답**: CPU가 특정 비율을 넘으면 Redis가 정답이다. TTL만 두면 정합성 문제는 해결된다.

**꼬리질문**: 캐시 장애나 동시 만료 때 DB를 어떻게 보호하는가? 가격 표시와 주문 확정에 같은 캐시 정책을 써도 되는가?

> 적용 전제: 반복 읽기 캐시의 판단 카드다. CPU 임계값은 워크로드와 용량 계획의 운영 기준일 수 있으나 캐시 도입의 절대 기준은 아니다.
> 학습 정본/출처: [[Cache-Decision]], [[Common-Interview-Questions-Tech-Scale#Q5. 초기 DAU 1만, 모바일 출시로 사용자 폭증|트래픽 대응]], [AWS Builders' Library, Caching challenges and strategies](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/)

## Q16. Graceful shutdown은 무엇을 보호하며 어떤 순서로 종료하는가?

**질문 의도**: 종료 훅 호출뿐 아니라 라우팅, 진행 중 작업과 자원 정리를 연결하는지 본다.

**핵심 답변**: 배포와 종료 시 진행 중인 요청과 작업을 가능한 범위에서 끝내고 자원을 정리하는 절차다. 새 트래픽과 작업 유입을 줄이고 라우팅 전파를 고려한 뒤, 정해진 시간 안에 진행 중 작업을 기다리고 DB/브로커 연결과 타이머를 정리한다. 미완료 작업은 선택한 전달 보장에 맞춰 복구 정책을 정한다. 재전달을 택하면 멱등성과 중복 위험을 확인하고, at-most-once이면 재호출하지 않는 구간과 유실 가능성을 설명한다. NestJS는 시그널로 종료 훅을 실행하려면 enableShutdownHooks를 켜야 한다.

**흔한 오답**: SIGTERM을 받자마자 process.exit를 호출한다. 종료 훅만 있으면 모든 HTTP 요청과 백그라운드 작업이 자동으로 끝난다.

**꼬리질문**: 로드밸런서가 아직 옛 인스턴스로 요청을 보내면 어떻게 되는가? DB를 닫기 전에 기다려야 하는 작업은 무엇인가?

> 적용 전제: 컨테이너에서 시그널을 받는 장기 실행 서비스 기준이다. 유입 차단과 drain 순서는 배포 플랫폼에 맞추고, 제한 시간과 강제 종료 후 복구를 별도로 정한다.
> 학습 정본/출처: [[Graceful-Shutdown]], [[NestJS-Lifecycle-Shutdown]], [NestJS, Lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events), [Kubernetes, Pod termination flow](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)

## Q17. DB 잠금 해제, await와 HTTP 응답 대기는 어떤 관계인가?

**질문 의도**: DB 세션의 잠금 수명과 애플리케이션 실행 흐름, 응답 계약을 구분하는지 본다.

**핵심 답변**: InnoDB 트랜잭션의 행 잠금은 COMMIT이나 ROLLBACK으로 해제된다. JavaScript await는 Promise 완료까지 해당 비동기 함수의 이어지는 실행을 멈출 뿐 DB 잠금을 해제하지 않는다. 트랜잭션 안에서 외부 호출을 await하면 그동안 잠금이 유지될 수 있다. DB commit을 끝내고 외부 호출을 기다리면 행 잠금은 풀려도 HTTP 응답 지연은 남는다.

**흔한 오답**: async/await를 쓰면 HTTP 응답을 기다리지 않는다. await 동안 DB 잠금이 풀린다. await를 빼면 작업이 안전하게 백그라운드로 처리된다.

**꼬리질문**: 응답 전 필수 작업과 응답 뒤 작업은 어떻게 나누는가? 작업을 큐로 넘긴다면 접수 상태, 전달 실패와 중복 처리를 어떻게 표현하는가?

> 적용 전제: JavaScript Promise와 InnoDB 트랜잭션 행 잠금 기준이다. await 자체는 메인 스레드를 붙잡는 블로킹 호출이 아니지만 앞뒤 CPU 작업은 막을 수 있다. Named Lock 등 세션 잠금의 해제 규칙은 별도다.
> 학습 정본/출처: [[Sync-Async-Blocking]], [[Transactions]], [[Common-Interview-Questions-Tech-Scale#Q8. 강결합 구조에서 트래픽 몰림 문제와 개선|서비스 비동기화]], [MySQL 8.4, autocommit, Commit, and Rollback](https://dev.mysql.com/doc/refman/8.4/en/innodb-autocommit-commit-rollback.html), [ECMAScript, Await](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#await)

## Q18. 성능 변경은 어떤 근거로 검증하며 Lambda timeout은 어떻게 설명하는가?

**질문 의도**: 성능 가설과 관측 결과, 함수 설정과 서비스 한도를 구분하는지 본다.

**답변 골격**: 같은 데이터와 부하 조건에서 변경 전후 p95/p99, 처리량과 오류율을 비교하고 병목 지표가 실제로 개선됐는지 확인한다. 측정하지 않은 효과는 가설로 남긴다. Lambda는 해당 함수의 실제 Timeout 설정, 실행 시간 분포와 외부 의존 지연을 확인한다. 일반 함수의 최대 900초와 실제 설정값은 다른 숫자이며 timeout 증가는 느린 원인을 없애지 않는다.

**대안과 트레이드오프**: 처리량 개선, 작업 분할과 timeout 조정을 비교한다. 대기 한도를 늘리면 완료 가능성 대신 자원 점유와 비용, 사용자 대기 시간이 커질 수 있다.

**흔한 오답**: 최대 실행 시간이 15분이므로 이 함수도 15분 기다린다. timeout을 늘렸으니 성능이 개선됐다. 모든 Lambda 실행 모델의 상한이 같다.

**꼬리질문**: 평균 실행 시간이 한도보다 짧아도 timeout이 나는 이유는 무엇인가? 호출자와 함수의 timeout이 다르면 어떤 결과가 가능한가?

> 적용 전제: 2026-10-14 공식 문서의 일반 Lambda 함수 기준으로 최대 900초다. Managed Instances의 일부 비동기/이벤트 소스 호출은 5,400초를 지원하는 별도 예외이므로 실행 모델과 호출 유형을 확인한다.
> 학습 정본/출처: [[Common-Interview-Questions-Tech-Basics#Q4. 성능 테스트 이유 / 대상 화면 / 성능 지표|성능 테스트]], [[AWS-Lambda-Execution-Model]], [AWS Lambda, Configure function timeout](https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html)

## 출처

각 카드 끝줄에 적용 전제, 기존 학습 정본과 직접 대조한 공식 매뉴얼/명세를 함께 표기했다. 제품 동작은 MySQL 8.4 및 2026-10-14 조회 기준이다.

## 관련 문서

- [[Common-Interview-Questions-Pool|일반 질문 풀 인덱스]]
- [[Common-Interview-Questions-Tech-Basics|기술 질문 기본]]
- [[Common-Interview-Questions-Tech-Scale|기술 질문 확장성]]
