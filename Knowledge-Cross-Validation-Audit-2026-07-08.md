---
status: audit
created: 2026-07-08
scope: repo-wide
---

# Knowledge Cross-Validation Audit 2026-07-08

## 요약

검증 기준일: 2026-07-08

1차 루프는 레포 전체를 카테고리별로 나눠 읽기 전용 교차검증을 수행했고, 이후 이 보고서의 P0 항목 상당수를 실제 문서에 반영했다. 자동 스캔과 서브에이전트 검증을 함께 사용했으며, 클라우드, 보안, 웹 표준, 런타임, AI 도구처럼 변동성이 큰 영역은 공식 문서 기준으로 일부 재확인했다.

자동 스캔 결과:

- Markdown 문서: 1,179개
- 미들돗 발견: 0개
- 200줄 초과 규칙 위반 후보: 1개, `fit/growth/hiring-market/IT-Downturn-Career-Strategy.md`
- 위키링크 미해결 후보: 260개, 다수는 인덱스 TODO 링크라 실제 깨진 링크와 백로그를 분리해야 함
- 중복 파일명 후보: 스킬 파일의 `SKILL.md`만 확인됨

즉시 조치 완료:

- 본인 처우 금액, 비대면 미팅 URL, 개인 이메일, 레퍼리 식별 단서를 최소 범위로 제거했다.
- 수정 파일: `fit/salary-negotiation/Salary-Negotiation-Guide-Process.md`, `fit/job-search/Job-Search-Tracker-2024-2026-Kinolights.md`, `fit/seminar/career/Han-Keeyong-Career-Seminar.md`, 일부 면접 준비 문서의 회의 링크와 연락처

## 우선순위

### P0, 면접에서 바로 틀릴 수 있는 내용

- [tech/web/http/HTTP-Status-Code.md](tech/web/http/HTTP-Status-Code.md): `fetch`가 4xx, 5xx에서 에러를 던진다는 설명은 틀림. Fetch는 HTTP 오류 상태에서도 resolve되고 `response.ok`를 확인해야 한다.
- [tech/computer-science/js/Promise-Async.md](tech/computer-science/js/Promise-Async.md): `resolve()`를 성공과 fulfilled 전환으로 단정하면 안 된다. thenable이나 rejected promise로 resolve하면 최종 rejected가 될 수 있다.
- [tech/computer-science/ts/TypeScript-Type-Compatibility.md](tech/computer-science/ts/TypeScript-Type-Compatibility.md): `satisfies`가 초과 속성을 허용한다는 설명은 반대에 가깝다. TS 4.9 문서는 초과 키를 잡으면서 원래 추론을 보존하는 예시를 든다.
- [tech/computer-science/ts/TypeScript-Type-Compatibility.md](tech/computer-science/ts/TypeScript-Type-Compatibility.md): 유니온 할당 설명의 방향이 틀림. 유니온 값을 대상 타입에 넣으려면 모든 구성원이 대상에 들어가야 하고, 값을 유니온 타입에 넣는 경우는 구성원 중 하나에 들어가면 된다.
- [tech/computer-science/ts/type-level-programming/TypeScript-Type-Level-Programming-Advanced.md](tech/computer-science/ts/type-level-programming/TypeScript-Type-Level-Programming-Advanced.md): 조건부 타입 꼬리 재귀 제거를 TS 4.1로 적은 것은 틀림. 공식 릴리스 노트 기준 TS 4.5다.
- [tech/web/http/api/gRPC.md](tech/web/http/api/gRPC.md): gRPC 서버 스트리밍을 HTTP/2 server push와 연결한 설명은 부정확하다.
- [tech/web/http/api/graphql/GraphQL.md](tech/web/http/api/graphql/GraphQL.md): GraphQL은 모두 POST라 URL 캐시가 무력화된다는 단정은 과함. query는 GET도 허용될 수 있다.
- [tech/web/http/URI-URL-URN.md](tech/web/http/URI-URL-URN.md): URN을 표준 제안 수준으로 둔 설명은 틀림. URN은 RFC 8141 Standards Track이다.
- [tech/web/network/Browser-URL-Flow.md](tech/web/network/Browser-URL-Flow.md): 주소창 navigation 단계에서 CORS 사전 정책을 확인한다는 설명은 틀리기 쉽다. CORS preflight는 주로 Fetch, XHR의 cross-origin 비단순 요청 맥락이다.
- [tech/architecture-design/oop/OOP.md](tech/architecture-design/oop/OOP.md): `Car`를 `SuperCar`로 다운캐스팅하는 예시는 Java에서 런타임 `ClassCastException`이 나는 반례다.

### P0, 보안과 인증

- [tech/security/crypto/Password-Hashing.md](tech/security/crypto/Password-Hashing.md): 암호화를 NP 문제로 일반화한 설명은 부정확하다. 현대 암호는 NP 일반 문제가 아니라 수론 난제, 대칭키 설계, 해시 안전성 같은 구체 가정 위에 선다.
- [tech/security/crypto/Password-Hashing.md](tech/security/crypto/Password-Hashing.md): 같은 입력이 같은 출력을 만든다는 설명은 해시 충돌이 아니다. 충돌은 서로 다른 입력이 같은 출력으로 매핑되는 경우다.
- [tech/security/crypto/Password-Hashing.md](tech/security/crypto/Password-Hashing.md): bcrypt를 현재 기준 안전하지 않다고 단정한 것은 과함. OWASP는 Argon2id 우선, scrypt 대안, bcrypt는 레거시 조건부 허용으로 설명한다.
- [tech/security/auth/JWT.md](tech/security/auth/JWT.md): JWT header는 암호화할 해싱 알고리즘이 아니라 JWS 서명 알고리즘 등 메타데이터를 담는다. signature도 항상 비밀키 해싱이 아니다.
- [tech/security/auth/FIDO-Seminar.md](tech/security/auth/FIDO-Seminar.md): `Attestation: none이면 안됨`은 일반 서비스 기준 과함. WebAuthn에서 `none`은 명시된 선택지이며 enterprise attestation과 구분해야 한다.
- [tech/security/crypto/RSA-Encryption.md](tech/security/crypto/RSA-Encryption.md): `M^(e, d)` 표기는 수식 오류다. 의도는 `M^(ed) mod n` 계열 설명으로 보인다.

### P0, 클라우드와 비용

- [tech/fin-ops/Storage-Tiering.md](tech/fin-ops/Storage-Tiering.md): S3 Intelligent-Tiering 128KB 미만 객체가 모니터링비만 나간다는 설명은 반대다. 128KB 미만은 모니터링되지 않고 자동 티어링 대상도 아니며 Frequent Access에 남는다.
- [tech/infrastructure-cloud/network/CDN.md](tech/infrastructure-cloud/network/CDN.md), [tech/infrastructure-cloud/aws/networking/CloudFront.md](tech/infrastructure-cloud/aws/networking/CloudFront.md): CloudFront 무료 전송량 50GB 설명은 최신 가격표의 Free plan 100GB와 충돌한다.
- [tech/infrastructure-cloud/aws/ec2/EC2-Network-Access.md](tech/infrastructure-cloud/aws/ec2/EC2-Network-Access.md), [tech/infrastructure-cloud/aws/ec2/EC2-Checkpoints.md](tech/infrastructure-cloud/aws/ec2/EC2-Checkpoints.md): 실행 중 EC2에 연결된 EIP 1개 무료 설명은 2024-02-01 이후 틀림. AWS는 모든 퍼블릭 IPv4에 시간당 과금한다.
- [tech/infrastructure-cloud/aws/data/Redshift.md](tech/infrastructure-cloud/aws/data/Redshift.md): Redshift가 Single-AZ만 지원한다는 설명은 outdated. RA3 또는 RG provisioned 클러스터는 Multi-AZ를 지원한다.
- [tech/infrastructure-cloud/aws/data/DynamoDB.md](tech/infrastructure-cloud/aws/data/DynamoDB.md): DynamoDB Streams 소비자 수 제한 없음은 틀림. 샤드당 동시 reader 제한을 고려해야 한다.
- [tech/infrastructure-cloud/aws/networking/API-Gateway.md](tech/infrastructure-cloud/aws/networking/API-Gateway.md): API Gateway burst를 동시성 제한으로 설명한 것은 오류다. burst는 token bucket burst capacity다.
- [tech/infrastructure-cloud/aws/rds/rds-operations/RDS-Connection-Credentials.md](tech/infrastructure-cloud/aws/rds/rds-operations/RDS-Connection-Credentials.md): RDS 비용 절감 수단에 Savings Plans를 넣은 것은 부정확하다. Compute Savings Plans 적용 대상과 분리해야 한다.
- [tech/fin-ops/AWS-Cost-Optimization.md](tech/fin-ops/AWS-Cost-Optimization.md): Aurora Serverless v2 idle 최소 0.5 ACU 고정 설명은 최신 문서와 다르다. 조건부로 minimum 0 ACU 자동 pause가 가능하다.
- [tech/fin-ops/ECR-Cost-Reduction.md](tech/fin-ops/ECR-Cost-Reduction.md): `describe-repositories`의 `repositorySizeInBytes` 필드는 ECR Repository API에 없다. 이미지 크기는 `DescribeImages`의 `imageSizeInBytes` 쪽이다.
- [tech/infrastructure-cloud/aws/security/KMS.md](tech/infrastructure-cloud/aws/security/KMS.md): customer managed key 자동 rotation을 연 1회로만 설명한 것은 불완전하다. 현재는 90일에서 2560일 사이 커스텀 주기를 지정할 수 있다.
- [tech/infrastructure-cloud/aws/s3/S3-Features-Management.md](tech/infrastructure-cloud/aws/s3/S3-Features-Management.md): S3 Select는 신규 고객에게 더 이상 제공되지 않는다는 caveat가 필요하다.

### P0, OS 런타임과 Spring

- [tech/os-runtime/spring/JPA-Persistence-Context.md](tech/os-runtime/spring/JPA-Persistence-Context.md): Dirty checking이 변경 필드만 SQL에 포함한다고 되어 있음. Hibernate 기본 업데이트는 보통 전체 업데이트 가능 컬럼을 쓰며 변경 컬럼만 쓰려면 `@DynamicUpdate` 같은 기능이 필요하다.
- [tech/os-runtime/spring/JPA-Persistence-Context.md](tech/os-runtime/spring/JPA-Persistence-Context.md): Lazy loading을 기본값처럼 설명함. Jakarta Persistence 기준 `@ManyToOne` 기본은 `EAGER`, `@OneToMany` 기본은 `LAZY`다.
- [tech/os-runtime/spring/Servlet-vs-Spring-Container.md](tech/os-runtime/spring/Servlet-vs-Spring-Container.md), [tech/os-runtime/spring/Spring-Request-Lifecycle.md](tech/os-runtime/spring/Spring-Request-Lifecycle.md): DispatcherServlet 기본 매핑을 `/*`로 설명함. 일반적인 Spring MVC와 Boot 매핑은 `/`이며 `/*`와 정적 리소스 처리 의미가 다르다.
- [tech/os-runtime/nodejs/worker-threads/Worker-Threads-Core.md](tech/os-runtime/nodejs/worker-threads/Worker-Threads-Core.md): Worker마다 libuv thread pool을 가진다고 되어 있음. libuv threadpool은 모든 event loop가 공유하는 전역 풀이다.
- [tech/os-runtime/nodejs/async/Async-Internals-Mechanism.md](tech/os-runtime/nodejs/async/Async-Internals-Mechanism.md): 이미 resolve된 Promise는 즉시 계속 실행된다고 되어 있음. `await` 재개는 fulfilled Promise라도 microtask로 비동기 재개된다.
- [tech/os-runtime/nodejs/event-loop/Event-Loop-Phases.md](tech/os-runtime/nodejs/event-loop/Event-Loop-Phases.md): async I/O가 libuv thread pool로 간다고 일반화함. 파일, DNS 일부, crypto, zlib 등은 맞지만 네트워크 소켓은 보통 OS readiness 기반이다.
- [tech/os-runtime/runtime/Thread-vs-Event-Loop.md](tech/os-runtime/runtime/Thread-vs-Event-Loop.md): 프로세스 간 메모리 공유가 불가능하다는 설명은 과함. 기본 주소 공간은 분리되지만 shared memory, mmap 등으로 공유할 수 있다.
- [tech/os-runtime/os-fundamentals/virtual-memory/Virtual-Memory-Allocation.md](tech/os-runtime/os-fundamentals/virtual-memory/Virtual-Memory-Allocation.md): fixed partition을 non-contiguous allocation으로 분류함. 고정 파티션은 연속 할당 계열이다.
- [tech/os-runtime/os-fundamentals/storage-and-filesystem/Storage-and-FileSystem-Files.md](tech/os-runtime/os-fundamentals/storage-and-filesystem/Storage-and-FileSystem-Files.md): 모든 파일 시스템이 FAT 개념을 가진다고 설명함. FAT은 특정 설계다.

### P0, RDBMS와 동시성

- [tech/database/rdbms/transactions-locks/Isolation-Level.md](tech/database/rdbms/transactions-locks/Isolation-Level.md): MVCC 풀네임이 틀림. `Multi Version Concurrency Consistency`가 아니라 `Multi-Version Concurrency Control`이다.
- [tech/database/rdbms/transactions-locks/Isolation-Level.md](tech/database/rdbms/transactions-locks/Isolation-Level.md): RR에서 일반 `SELECT`가 읽은 행을 다른 트랜잭션이 갱신, 삭제하지 못한다는 설명은 틀림. 일반 조회는 스냅샷 반복 읽기이고 차단은 locking read, `UPDATE`, `DELETE`에서 따로 봐야 한다.
- [tech/database/rdbms/mysql/MySQL-Gap-Lock.md](tech/database/rdbms/mysql/MySQL-Gap-Lock.md): 일반 `SELECT`가 Gap Lock으로 INSERT를 차단한다고 설명함. InnoDB RR의 plain nonlocking `SELECT`는 스냅샷을 읽으며 락을 잡지 않는다.
- [tech/database/rdbms/mysql/MySQL-Gap-Lock.md](tech/database/rdbms/mysql/MySQL-Gap-Lock.md): `binlog_format=ROW`로 Gap Lock을 회피한다는 주장은 위험하다. Gap Lock 비활성화는 주로 `READ COMMITTED` 격리 수준에서 검색, 인덱스 스캔에 적용되고 FK와 duplicate-key 검사에는 여전히 쓰인다.
- [tech/database/rdbms/transactions-locks/Lock.md](tech/database/rdbms/transactions-locks/Lock.md): `NO WAIT` 표기는 MySQL, PostgreSQL 면접 답변으로 오답 위험이 크다. MySQL locking read 옵션은 `NOWAIT`다.
- [tech/database/rdbms/race-condition-patterns/Race-Condition-Patterns-DB-Distributed.md](tech/database/rdbms/race-condition-patterns/Race-Condition-Patterns-DB-Distributed.md): 빈 예약 슬롯에 `SELECT ... FOR UPDATE`를 하면 확실하다는 설명은 DB별로 틀림. PostgreSQL은 없는 row를 row lock으로 잠글 수 없고, MySQL도 인덱스와 격리 수준, range locking 조건이 필요하다.
- [tech/database/rdbms/race-condition-patterns/Race-Condition-Patterns-DB-Distributed.md](tech/database/rdbms/race-condition-patterns/Race-Condition-Patterns-DB-Distributed.md): Redis 락 해제를 `DEL lock-key`와 fencing token으로 설명한 부분은 부정확하다. 안전 해제는 소유 값 비교 후 삭제이고 fencing token은 후속 저장소가 작은 토큰의 쓰기를 거부하도록 만드는 별도 장치다.

### P0, Redis와 메시징

- [tech/database/in-memory/TTL.md](tech/database/in-memory/TTL.md), [tech/database/in-memory/Operations.md](tech/database/in-memory/Operations.md): `allkeys-lru`가 TTL 없는 데이터부터 지운다는 설명은 틀림. `allkeys-lru`는 TTL 여부와 무관하게 모든 키 중 LRU 후보를 지우고, TTL 있는 키만 대상으로 삼는 것은 `volatile-*` 계열이다.
- [tech/database/nosql/opensearch/OpenSearch.md](tech/database/nosql/opensearch/OpenSearch.md): Elasticsearch 기본 보안 기능이 유료라는 설명은 오래됐다. core security는 6.8.0, 7.1.0부터 Basic 무료다.
- [tech/database/nosql/ClickHouse.md](tech/database/nosql/ClickHouse.md): ClickHouse 트랜잭션 미지원 절대 표현은 부정확하다. OLTP 대체 부적합은 맞지만 단일 블록 INSERT ACID와 실험적 트랜잭션 caveat가 필요하다.
- [tech/messaging-data-pipeline/brokers/sqs/SQS.md](tech/messaging-data-pipeline/brokers/sqs/SQS.md): SQS 메시지 최대 크기 256KB는 최신 공식 문서와 다르다. 현재 최대는 1MiB다.
- [tech/messaging-data-pipeline/brokers/sqs/SQS.md](tech/messaging-data-pipeline/brokers/sqs/SQS.md): SQS FIFO 300 TPS, 배치 3,000 TPS를 고정 한도처럼 쓰면 high throughput FIFO와 충돌한다. 리전별로 훨씬 큰 한도가 있다.
- [tech/messaging-data-pipeline/brokers/Kinesis.md](tech/messaging-data-pipeline/brokers/Kinesis.md): Kinesis Data Firehose 명칭은 Amazon Data Firehose로 최신화해야 한다.
- [tech/messaging-data-pipeline/brokers/Kinesis.md](tech/messaging-data-pipeline/brokers/Kinesis.md): Kinesis Data Analytics for SQL은 2026-01-27부터 운영 불가 및 삭제 시작으로 표시해야 한다.
- [tech/messaging-data-pipeline/cdc-outbox/cdc-debezium/CDC-Debezium-Setup.md](tech/messaging-data-pipeline/cdc-outbox/cdc-debezium/CDC-Debezium-Setup.md): Debezium 스냅샷 행을 CREATE 이벤트로 발행한다는 설명은 기본값과 다르다. MySQL connector snapshot event op는 기본 READ, 즉 `op: r`이다.
- [tech/messaging-data-pipeline/brokers/kafka/MQ-Kafka-Consumer.md](tech/messaging-data-pipeline/brokers/kafka/MQ-Kafka-Consumer.md): KafkaJS `eachBatch` 예제는 `resolveOffset`, `heartbeat`, 커밋 처리 설명이 빠져 유실, 중복 처리 오해 위험이 있다.

### P0, Biz와 Econ

- [biz/commerce/korea-history/Commerce-Korea-History-1996-2003.md](biz/commerce/korea-history/Commerce-Korea-History-1996-2003.md): `1994 | Amazon, eBay 등장`은 부정확하다. Amazon 공개 판매와 eBay 시작은 1995년이다.
- [biz/commerce/In-App-Purchase.md](biz/commerce/In-App-Purchase.md): Open App Markets Act가 2022년 상원을 통과했다는 설명은 오류다. 상원 법사위 통과와 상원 본회의 통과를 구분해야 한다.
- [biz/product-strategy/Platform-Power.md](biz/product-strategy/Platform-Power.md): 카카오톡 DAU 약 4,900만은 DAU가 아니라 MAU 계열 수치로 보인다.
- [biz/commerce/korea-history/Commerce-Korea-History-2003-2009.md](biz/commerce/korea-history/Commerce-Korea-History-2003-2009.md): PayPal을 에스크로 결제로 부르는 것은 부정확하다. 결제, 전자지갑, 구매자 보호 모델로 분리해야 한다.
- [biz/commerce/Commerce-Order.md](biz/commerce/Commerce-Order.md): 구매확정 후 반품과 교환 불가라는 표현은 청약철회권과 플랫폼 정책을 섞은 단정이다.
- [econ/investing/Asset-Allocation-Diversification.md](econ/investing/Asset-Allocation-Diversification.md): 자산배분이 성과 대부분을 정한다는 문장은 Brinson류 연구 오독 위험이 있다. 수익률 수준과 변동 설명력을 구분해야 한다.

### P1, 최신성 기준일이 필요한 내용

- [tech/web/http/api/api-conventions/API-Conventions-Response.md](tech/web/http/api/api-conventions/API-Conventions-Response.md): Problem Details는 RFC 7807보다 RFC 9457을 최신 기준으로 둬야 한다.
- [tech/web/http/versions/HTTP-2.md](tech/web/http/versions/HTTP-2.md): HTTP/2 기준 RFC 7540은 RFC 9113으로 대체되었다.
- [tech/web/http/HTTP-Chunked-Transfer.md](tech/web/http/HTTP-Chunked-Transfer.md): HTTP/1.1 메시징 최신 기준은 RFC 9112다.
- [tech/computer-science/js/Promise-Async.md](tech/computer-science/js/Promise-Async.md): `return await`가 불필요한 마이크로태스크를 만든다는 설명은 최신 ESLint 문서와 어긋난다.
- [tech/os-runtime/nodejs/event-loop/Event-Loop-Phases.md](tech/os-runtime/nodejs/event-loop/Event-Loop-Phases.md): Node 20 이후 libuv 1.45 변경으로 timers 실행 위치가 바뀌었으므로 Node 20 이전과 이후를 분리해야 한다.
- [tech/os-runtime/jvm/JVM-Architecture.md](tech/os-runtime/jvm/JVM-Architecture.md): `jaotc` 설명은 JDK 17 이후 상태와 맞춰야 한다.
- [tech/os-runtime/jvm/JVM-Architecture.md](tech/os-runtime/jvm/JVM-Architecture.md): Project Panama FFM API는 JDK 22 finalized 기준을 반영해야 한다.
- [tech/os-runtime/jvm/JVM-GC.md](tech/os-runtime/jvm/JVM-GC.md): ZGC, Shenandoah는 JDK 버전별 caveat가 필요하다.
- [tech/senior/ai-engineering/tools/Codex-CLI.md](tech/senior/ai-engineering/tools/Codex-CLI.md): Codex CLI 설치 명령을 `npm i -g @openai/codex`로 단정한 부분은 현재 공식 문서의 standalone installer 안내와 맞춰야 한다.
- [tech/senior/ai-engineering/tools/claude-code/Claude-Code-Operations.md](tech/senior/ai-engineering/tools/claude-code/Claude-Code-Operations.md): `--bare`가 스킬과 MCP를 전부 스킵한다고 단정한 내용은 현재 로컬 도움말과 충돌한다.
- [tech/senior/ai-engineering/tools/Harness-Engineering.md](tech/senior/ai-engineering/tools/Harness-Engineering.md): OpenAI가 2026년 초 정의했다는 주장은 공식 원문 URL과 날짜가 필요하다.
- [tech/senior/ai-engineering/org-role/Developer-Role-AI-Era.md](tech/senior/ai-engineering/org-role/Developer-Role-AI-Era.md): AI 도입 실패율 95에서 96% 수치는 실패 정의와 원 보고서가 필요하다.
- [tech/senior/ai-engineering/org-role/AX-Transformation.md](tech/senior/ai-engineering/org-role/AX-Transformation.md): METR 19% slower 주장은 실험 조건을 함께 적어야 한다.
- [tech/security/age-identity-verification/Age-Verification-Regulation.md](tech/security/age-identity-verification/Age-Verification-Regulation.md): 법규와 시행일은 관할별 변동성이 크므로 1차 규제기관 링크와 조회일이 필요하다.
- [tech/infrastructure-cloud/aws/saa-c03-exam-summary/AWS-SAA-C03-Exam-Summary.md](tech/infrastructure-cloud/aws/saa-c03-exam-summary/AWS-SAA-C03-Exam-Summary.md): 시험 요약 계열은 상단에 검증 기준일이 필요하다.
- [tech/database/rdbms/mysql/MySQL-vs-PostgreSQL.md](tech/database/rdbms/mysql/MySQL-vs-PostgreSQL.md): MySQL 스레드 풀, 복제 방식, PostgreSQL JSONB 속도, BLOOM 인덱스 등은 버전, 에디션, 확장 여부를 분리해야 한다.
- [tech/database/rdbms/schema-design/Schema-Migration-Large-Table.md](tech/database/rdbms/schema-design/Schema-Migration-Large-Table.md): Online DDL, INSTANT 가능 작업 목록은 MySQL 마이너 버전과 조건을 많이 타므로 락 없음 표현을 완화해야 한다.
- [tech/database/in-memory/redis/Redis-Valkey-Migration.md](tech/database/in-memory/redis/Redis-Valkey-Migration.md): Redis에서 Valkey로 클라이언트 코드 변경 없이 전환 가능하다는 표현은 Redis OSS 7.2 이하 중심으로 제한해야 한다.
- [tech/messaging-data-pipeline/brokers/eventbridge/EventBridge.md](tech/messaging-data-pipeline/brokers/eventbridge/EventBridge.md): PutEvents TPS는 리전별 수치로 표기해야 한다. 2026-07-08 확인 기준 ap-northeast-2는 600/sec이고 target per rule은 5개다.

## 내부 정합성 후보

- [tech/security/crypto/Password-Hashing.md](tech/security/crypto/Password-Hashing.md)와 [tech/security/auth/Auth-Method-Selection.md](tech/security/auth/Auth-Method-Selection.md): bcrypt 평가가 충돌한다. Argon2id 우선, scrypt 대안, bcrypt 레거시 조건부 허용으로 통일한다.
- [tech/testing-quality/Transactional-Test-Antipattern.md](tech/testing-quality/Transactional-Test-Antipattern.md)와 [tech/testing-quality/NestJS-Testing.md](tech/testing-quality/NestJS-Testing.md): 테스트 트랜잭션 롤백에 대한 톤이 충돌한다. Spring JPA 안티패턴과 NestJS, TypeORM 격리 전략을 분리해야 한다.
- [tech/os-runtime/spring/Spring-Data-JPA-Essentials.md](tech/os-runtime/spring/Spring-Data-JPA-Essentials.md): Spring Data JPA를 Hibernate wrapper라고 설명하면서 같은 파일에서 EclipseLink, OpenJPA 가능성을 말한다. repository abstraction과 provider를 분리한다.
- [tech/os-runtime/spring/JPA-Persistence-Context.md](tech/os-runtime/spring/JPA-Persistence-Context.md)와 [tech/os-runtime/spring/Spring-Data-JPA-Essentials.md](tech/os-runtime/spring/Spring-Data-JPA-Essentials.md): `persist` 지연 insert 설명과 IDENTITY 즉시 insert 예외를 맞춰야 한다.
- [tech/os-runtime/nodejs/process-model/Single-vs-Multi-Thread.md](tech/os-runtime/nodejs/process-model/Single-vs-Multi-Thread.md)와 [tech/os-runtime/nodejs/worker-threads/Worker-Threads-Core.md](tech/os-runtime/nodejs/worker-threads/Worker-Threads-Core.md): JS main thread 설명과 worker thread 설명을 기준별로 분리해야 한다.
- [tech/senior/ai-engineering/tools/Context-Engineering.md](tech/senior/ai-engineering/tools/Context-Engineering.md)와 [CLAUDE.md](CLAUDE.md): 이 저장소는 auto memory 금지인데, 노트는 MEMORY.md 자동 주입을 일반 원칙처럼 설명한다. 제품 일반 설명과 이 vault 적용 규칙을 분리해야 한다.
- [tech/ci-cd/Blue-Green.md](tech/ci-cd/Blue-Green.md): 연결 끊김 없음이라는 설명은 WebSocket, SSE, sticky session caveat와 충돌한다.
- [tech/senior/design/System-Design-Interview.md](tech/senior/design/System-Design-Interview.md): ICS 공개 링크의 긴 TTL과 signed token 짧은 TTL 설명은 구독 URL 수명과 캐시 TTL로 분리해야 한다.
- [tech/database/rdbms/transactions-locks/Transactions.md](tech/database/rdbms/transactions-locks/Transactions.md), [tech/database/rdbms/transactions-locks/Lock.md](tech/database/rdbms/transactions-locks/Lock.md), [tech/database/rdbms/mysql/MySQL-Gap-Lock.md](tech/database/rdbms/mysql/MySQL-Gap-Lock.md): 일반 `SELECT`가 락을 잡는지에 대한 설명이 충돌한다.
- [tech/database/rdbms/schema-design/Schema-Design.md](tech/database/rdbms/schema-design/Schema-Design.md)와 [tech/database/rdbms/mysql/MySQL-Enum-Antipattern.md](tech/database/rdbms/mysql/MySQL-Enum-Antipattern.md): DB enum 권장과 참조 테이블 권장 톤이 충돌한다.
- [tech/database/rdbms/schema-design/Schema-Design.md](tech/database/rdbms/schema-design/Schema-Design.md): DB는 `snake_case`라고 쓰지만 같은 문서에 DB 인덱스 문맥의 `deletedAt` 같은 camelCase가 섞인다.
- [tech/messaging-data-pipeline/brokers/sqs/SQS.md](tech/messaging-data-pipeline/brokers/sqs/SQS.md)와 [tech/messaging-data-pipeline/delivery-guarantees/Delivery-Semantics.md](tech/messaging-data-pipeline/delivery-guarantees/Delivery-Semantics.md): FIFO를 exactly-once processing으로 읽히게 쓰는 부분과 소비자 측 at-least-once 설명이 충돌한다.
- [tech/messaging-data-pipeline/cdc-outbox/Transactional-Outbox.md](tech/messaging-data-pipeline/cdc-outbox/Transactional-Outbox.md): Outbox가 DB 쓰기와 브로커 발행 전체를 원자적으로 보장한다고 읽힐 수 있다. Debezium to Kafka 기본 at-least-once 설명과 맞춰야 한다.

## 링크와 구조 정리 후보

- [fit/growth/hiring-market/it-downturn-career-strategy/IT-Downturn-Career-Strategy.md](fit/growth/hiring-market/it-downturn-career-strategy/IT-Downturn-Career-Strategy.md): 211줄로 200줄 규칙 초과. Parent-as-TOC 패턴으로 분할 후보.
- [tech/os-runtime/OS&런타임(OS&Runtime).md](tech/os-runtime/OS&런타임(OS&Runtime).md): `Page-Cache`, `File-Descriptor-Limit`, `Epoll-Kqueue`, `Heap-Snapshot`, `Flamegraph`는 의도된 TODO인지 실제 누락인지 분리 필요.
- [tech/os-runtime/nodejs/v8/V8-Hidden-Class.md](tech/os-runtime/nodejs/v8/V8-Hidden-Class.md): `[[Value]]`, `[[Writable]]`, `[[Enumerable]]`, `[[Configurable]]`는 JS descriptor 필드가 Obsidian wikilink로 잘못 인식되는 형태다.
- [tech/os-runtime/nodejs/debugging-profiling/Debugging-Profiling-Tools.md](tech/os-runtime/nodejs/debugging-profiling/Debugging-Profiling-Tools.md): escaped pipe가 들어간 위키링크가 깨질 가능성이 크다.
- 인덱스 파일의 미작성 링크는 대부분 지식 백로그로 보인다. TODO 링크는 `status: todo` 문서 생성, 일반 텍스트, 체크박스 백로그 중 하나로 규칙을 정해야 한다.

## 다음 수정 루프 제안

1. 웹, JS, TS 확정 오류 수정: `fetch`, Promise resolve, `satisfies`, 유니온 할당, TS 4.5 꼬리 재귀, gRPC server push, GraphQL GET caveat.
2. 보안 확정 오류 수정: Password hashing, JWT, FIDO attestation, OAuth2 최신 BCP, ACME와 ACM 최신 조건.
3. AWS와 FinOps 수정: EIP 과금, CloudFront 무료 플랜, S3 Intelligent-Tiering 128KB, Aurora Serverless v2 0 ACU, Redshift Multi-AZ, DynamoDB Streams reader, ECR API 필드.
4. OS 런타임 수정: Node 20 event loop, libuv threadpool, `await` microtask, JPA 기본 fetch, Hibernate dirty checking, DispatcherServlet 매핑.
5. RDBMS 동시성 수정: 일반 `SELECT`, locking read, `UPDATE`, `DELETE`, MySQL, PostgreSQL, Oracle 기준으로 isolation, gap lock, race condition 문서를 다시 맞춘다.
6. Redis와 메시징 수정: Redis eviction, SQS quota, EventBridge quota, Kinesis 명칭과 지원 상태, Debezium snapshot mode, KafkaJS `eachBatch` 예제를 맞춘다.
7. Biz와 Econ 수정: 에스크로와 청약철회, 인앱결제 규제, 한국 이커머스 연표, 투자 조언성 문장에 기준일과 출처를 붙인다.
8. AI 도구 문서 수정: Codex CLI, Claude Code `--bare`, MCP, model 관련 파일에 `as of YYYY-MM-DD`와 공식 출처 추가.
9. 구조 정리: 200줄 초과 파일 분할, 위키링크 TODO와 실제 깨진 링크 분리, 고위험 문서 상단에 검증 기준일 필드 추가.

## 운영 규칙 제안

새 지식 문서에는 다음 기준을 적용한다.

- AWS, OpenAI, Anthropic, Node, TypeScript, Kubernetes, DB 제품, 보안 규격 문서는 `검증 기준일`을 상단에 둔다.
- 가격, quota, support policy, 시험 범위, 모델명, 버전명은 공식 문서 링크와 조회일 없이는 단정하지 않는다.
- `항상`, `무조건`, `제한 없음`, `지원 종료`, `무료`, `동일`, `완전` 같은 단어는 정책 문서 또는 공식 출처가 있을 때만 쓴다.
- 면접 답변용 문서는 정확성보다 말하기 쉬운 단순화가 필요하더라도, 단순화의 조건을 끝줄에 남긴다.
- 인덱스 TODO 링크는 실제 문서가 없다는 점을 명시하거나, 빈 문서라도 생성해 링크 검증에서 분리한다.

## 출처

- [Amazon S3 storage classes - AWS Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [Amazon CloudFront pricing - AWS](https://aws.amazon.com/cloudfront/pricing/)
- [New AWS Public IPv4 Address Charge - AWS News Blog](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/)
- [Aurora Serverless v2 capacity settings - AWS Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html)
- [Node.js event loop, timers, and nextTick - Node.js](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [TypeScript 4.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
- [TypeScript 4.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html)
- [Password Storage Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Codex CLI - OpenAI Developers](https://developers.openai.com/codex/cli)
- [InnoDB transaction isolation levels - MySQL Documentation](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [InnoDB locking - MySQL Documentation](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)
- [InnoDB locking reads - MySQL Documentation](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [Amazon SQS message quotas - AWS Documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)
- [Amazon SQS queue quotas - AWS Documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-queues.html)
- [Amazon Data Firehose - AWS Documentation](https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html)
- [Kinesis Data Analytics for SQL Applications - AWS Documentation](https://docs.aws.amazon.com/kinesisanalytics/latest/dev/what-is.html)
- [Amazon EventBridge quotas - AWS Documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-quota.html)
