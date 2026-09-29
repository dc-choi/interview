---
tags: [fit, interview, techlabs]
status: active
category: "Interview - Fit"
aliases: ["TechLabs Interview Prep 1st Tech JD", "테크랩스 1차 JD 기반 기술 질문"]
---

# 테크랩스 1차 JD 기반 기술 질문

> [[Interview-Prep-TechLabs-1st|메인 문서]]로 돌아가기. JD 자격요건과 우대사항에서 나올 질문이다. 사실형은 핵심 답변, 흔한 오답, 꼬리를, 설계형은 골격, 대안, 트레이드오프를 둔다. 버전 민감 내용은 끝줄에 기준을 적었다.

## J1. Spring MVC에서 요청이 들어와 응답이 나가기까지 (사실형)

- 질문 의도: MVC 필수 요건의 기본기. 최근 NestJS 경력자에게 확인 질문으로 나올 가능성이 높다.
- 핵심 답변: 서블릿 컨테이너의 스레드가 요청을 받아 Filter 체인을 거쳐 `DispatcherServlet`에 전달한다. `HandlerMapping`이 컨트롤러 메서드를 찾고, `HandlerAdapter`가 `ArgumentResolver`로 파라미터를 바인딩하고 검증한 뒤 메서드를 호출한다. 그 앞뒤로 `HandlerInterceptor`가 실행된다. `@RestController`의 반환값은 `HttpMessageConverter`가 JSON으로 직렬화하고, 예외는 `@ControllerAdvice`의 `@ExceptionHandler`가 응답으로 바꾼다.
- NestJS 대응: Filter와 Interceptor는 Nest의 middleware, guard, interceptor에, `@ControllerAdvice`는 exception filter에, `ArgumentResolver`와 검증은 pipe에 대응한다. 다만 실행 모델이 다르다. Spring MVC 기본은 요청당 스레드이고 Node.js는 이벤트 루프라 블로킹 호출이 주는 영향이 다르다.
- 흔한 오답: Filter와 Interceptor를 같은 것으로 설명한다. Filter는 서블릿 컨테이너 수준, Interceptor는 Spring MVC 핸들러 실행 주변이다.
- 꼬리: 스레드 풀이 고갈되면 어떤 증상이 보이나, 외부 API가 느리면 타임아웃과 벌크헤드를 어떻게 두나. Java 21 이후 가상 스레드를 켜면 요청당 스레드 비용은 줄지만 DB 커넥션 풀 같은 하위 자원 한도는 그대로다.
- 학습 정본: [[Spring-MVC]], [[Spring-MVC-Essentials]]

## J2. `@Transactional`이 동작하지 않는 경우 (사실형)

- 질문 의도: 트랜잭션 프록시 경계와 롤백 규칙.
- 핵심 답변: 선언적 트랜잭션은 AOP 프록시가 메서드 호출을 가로채 시작하고 끝낸다. 같은 객체 안에서 `this.inner()`로 부르면 프록시를 통과하지 않아 `inner()`의 설정이 적용되지 않는다. 기본 롤백 대상은 `RuntimeException`과 `Error`이고 checked exception은 커밋된다. 예외를 잡아 삼키면 인터셉터가 롤백할 수 없다.
- 흔한 오답: `readOnly = true`면 쓰기가 막힌다고 답한다. 드라이버와 ORM에 전달하는 힌트일 뿐 무결성 장치가 아니다.
- 꼬리: `REQUIRES_NEW`로 감사 로그를 남길 때의 커넥션 소비, 트랜잭션 커밋 뒤에 이벤트를 발행하려면 `@TransactionalEventListener(AFTER_COMMIT)`를 쓰지만 커밋 뒤 발행 전에 중단되면 유실될 수 있어 outbox를 검토한다.
- 학습 정본: [[Spring-Transactional]], [[Spring-Transaction-Events]]
- 기준: Spring Framework 6 이후 class 기반 프록시는 protected와 package-visible 메서드도 대상이 될 수 있다.

## J3. JPA 영속성 컨텍스트와 N+1 (사실형)

- 질문 의도: JPA 사용 시 성능 문제의 원인과 해결을 아는지.
- 핵심 답변: 영속성 컨텍스트는 트랜잭션 안에서 엔티티의 1차 캐시, 동일성 보장, 변경 감지와 쓰기 지연을 제공한다. N+1은 목록을 조회한 뒤 각 엔티티의 지연 로딩 연관을 접근할 때 연관마다 추가 쿼리가 나가는 현상이다. fetch join, `@EntityGraph`, batch fetch size로 줄인다.
- 흔한 오답: EAGER로 바꾸면 해결된다. 컬렉션 fetch join과 페이징을 함께 써도 된다.
- 내 경험 연결: Prisma에서 관계 조회가 여러 쿼리로 나가던 것을 생성 SQL과 실행 계획으로 확인하고 단일 쿼리로 바꾼 경험(R4). 도구가 달라도 생성 SQL을 먼저 본다는 원칙은 같다.
- 꼬리: 대량 집계나 정산처럼 엔티티 변경 감지가 필요 없는 작업은 JPA 대신 JDBC 배치나 Querydsl 프로젝션, MyBatis처럼 SQL을 직접 통제하는 방식을 고려한다.
- 학습 정본: [[JPA-Persistence-Context]], [[JPA-Loading-and-Cascade]]

## J4. MySQL 설계와 운영: 격리 수준과 인덱스, 대용량 테이블 (사실형 + 설계형)

- 질문 의도: RDBMS 설계와 운영 필수 요건.
- 핵심 답변: InnoDB 기본 격리 수준은 REPEATABLE READ이고, 일반 조회는 MVCC 스냅숏을 읽는다. 잠금 읽기와 범위 조건에서는 next-key lock이 삽입을 막을 수 있다. 인덱스는 실제 쿼리의 동등 조건, 범위, 정렬 순서로 컬럼 순서를 정하고 실행 계획으로 확인한다(R3).
- 설계형 골격, 광고 이벤트처럼 계속 쌓이는 테이블: 원본 이벤트는 쓰기 위주로 단순하게 두고 시간 기준 파티셔닝으로 보존 기간 관리와 삭제 비용을 낮춘다. 조회는 사전 집계 테이블로 분리한다. 큰 스키마 변경은 호환 컬럼 추가, 백필, 읽기 전환, 구 컬럼 제거 순으로 하고 복제 지연을 관측한다.
- 트레이드오프: 파티셔닝은 파티션 키가 조건에 없으면 전체 파티션을 읽는다. 인덱스와 집계 테이블은 쓰기 비용과 정합성 관리 비용을 늘린다.
- 꼬리: RC로 낮추면 무엇이 바뀌나(gap lock 대부분이 사라지지만 Non-Repeatable Read와 Phantom 허용), 데드락 분석 방법.
- 학습 정본: [[MySQL-Gap-Lock]], [[MySQL-Partitioning]], [[Schema-Migration-Large-Table]]

## J5. RESTful API 설계에서 고려하는 점 (사실형)

- 질문 의도: 자격요건의 RESTful API 설계.
- 핵심 답변: 리소스 중심 URI, HTTP 메서드 의미 보존(GET 안전과 멱등, PUT 멱등, POST는 기본적으로 멱등이 아니므로 필요하면 Idempotency Key), 일관된 상태 코드와 오류 포맷(RFC 9457 Problem Details), 커서 기반 페이지네이션, 버저닝, 캐시 헤더, 인증과 rate limit.
- 흔한 오답: REST를 URI에 동사를 쓰지 않는 규칙으로만 설명한다.
- 꼬리: 리워드 적립 API를 제휴 플랫폼이 재시도하면 어떻게 중복을 막나(요청 단위 멱등성 키를 받아 결과를 저장하고 같은 키에는 같은 결과를 반환). PUT과 PATCH 구분.
- 학습 정본: [[REST]], [[Idempotency-Key]]

## J6. Redis를 어디에 어떻게 쓰나 (설계형)

- 질문 의도: 우대사항의 캐시 DB를 용도에 맞게 쓰는지.
- 답변 골격: 캐시는 원본의 대체물이 아니라 읽기 부하를 줄이는 보조 경로다. 조회 캐시는 Cache-Aside와 쓰기 뒤 무효화, TTL은 안전망이다. 원자 연산(`INCR`, Lua)은 빈도 제한과 실시간 카운터에, Sorted Set은 순위에, Set은 중복 제거에 맞다.
- 대안과 트레이드오프: Redis 카운터는 빠르지만 영속성과 정확성 보장이 DB보다 약하다. 정산에 쓰는 숫자는 Redis에 두지 않고 원본 이벤트나 DB 원장에서 다시 계산한다. 인기 키가 함께 만료되면 원본에 몰리므로 TTL 지터와 요청 병합을 쓴다.
- 내 경험 연결: 외부 메타데이터를 매 요청 조회하던 경로에 초기 적재 캐시를 적용한 경험(카드 8). 운영 규모는 과장하지 않는다.
- 꼬리: 캐시 장애 시 원본 보호(연결 풀 제한과 요청 제어), 분산 락을 Redis로 할 때의 한계(락 만료 뒤 늦은 쓰기를 막으려면 fencing 토큰).

## J7. Kafka와 RabbitMQ, SQS는 언제 무엇을 고르나 (설계형)

- 질문 의도: 우대사항의 메시지 큐를 선택 기준으로 이해하는지.
- 답변 골격: 작업 분배와 짧은 보존이면 큐(SQS, RabbitMQ), 같은 이벤트를 여러 소비자가 독립적으로 읽고 다시 읽어야 하면 로그 기반(Kafka). RabbitMQ는 라우팅 규칙이 유연한 브로커, Kafka는 파티션 단위 순서와 오프셋 리플레이, 컨슈머 그룹이 강점이다.
- 트레이드오프: Kafka는 파티션 설계, 리밸런싱, 컨슈머 랙 모니터링 같은 운영 부담이 있다. 파티션을 늘리면 키와 파티션 매핑이 바뀌어 이후 메시지 순서 범위가 달라진다. 어느 쪽이든 전달은 기본적으로 적어도 한 번이므로 소비자는 멱등해야 한다.
- 정직한 경계: Kafka와 RabbitMQ를 운영한 경험은 없다. SQS와 EventBridge로 멱등 소비, DLQ, 재시도 분류를 다뤘다(R2).
- 꼬리: exactly-once를 주장할 수 있나(Kafka 트랜잭션은 입력 오프셋과 출력 레코드를 함께 커밋할 수 있지만 외부 DB와 API 부수효과까지 원자적으로 묶지는 않는다). 컨슈머 랙이 늘면 처리 시간 단축, 배치 소비, 파티션 증설 순으로 본다.
- 학습 정본: [[Messaging-Broker-Comparison]], [[MQ-Kafka]], [[Delivery-Semantics]]

## J8. Java 기본기: 동시성과 JVM 메모리 (사실형)

- 질문 의도: Java 필수 요건의 기본기.
- 핵심 답변: 여러 스레드가 공유 상태를 바꾸면 가시성과 원자성 문제가 생긴다. `synchronized`와 `Lock`은 상호 배제, `volatile`은 가시성만, `AtomicLong`과 `ConcurrentHashMap`은 특정 연산의 원자성을 준다. Spring 빈은 기본 싱글톤이라 필드에 요청별 상태를 두면 안 된다. JVM 힙은 GC가 관리하고, 지연이 튀면 GC 로그와 힙 사용 추세를 먼저 본다.
- 흔한 오답: `volatile`이면 `count++`이 안전하다. 읽기와 쓰기가 나뉜 복합 연산이라 안전하지 않다.
- 꼬리: `equals`와 `hashCode`를 함께 재정의해야 하는 이유, 여러 서버에서의 동시성은 JVM 락으로 막을 수 없어 DB나 외부 저장소의 원자 연산이 필요하다는 점(R1과 연결).
- 준비: 이 질문은 최근 실무 공백이 드러나는 곳이다. [사용자 확정 필요: 면접 전 Java 동시성과 컬렉션 기본을 한 번 복습했는지]

## J9. Kubernetes, IaC 경험이 없는데 (갭형)

- 질문 의도: 우대 기술 공백을 어떻게 다루는지.
- 답변 골격: ECS Fargate에서 서비스, 태스크 정의, 롤링 배포, 오토스케일링, 비밀 주입을 운영했다. Kubernetes는 운영하지 않았다. 대응 개념은 Deployment와 Service, 리소스 요청과 제한, readiness와 liveness probe로 옮겨지고, 직접 운영해 보지 않은 부분은 팀 표준부터 배우겠다. IaC도 기재 경험이 없다. 콘솔 수동 변경은 재현과 리뷰가 어렵다는 점을 알고 있고, Terraform이라면 plan을 리뷰 대상으로 삼고 상태 파일을 원격 잠금으로 관리하는 기본부터 익히겠다.
- 꼬리: ECS와 Kubernetes 중 무엇을 고르나(운영 인력, 워크로드 수, 트래픽 라우팅 요구로 판단).

## 관련 문서

- [[Interview-Prep-TechLabs-1st|메인 문서]]
- [[Interview-Prep-TechLabs-1st-Tech-Resume|이력서 기반 기술 질문]]
- [[Common-Interview-Questions-Tech-Basics]], [[Common-Interview-Questions-Tech-Scale]]
