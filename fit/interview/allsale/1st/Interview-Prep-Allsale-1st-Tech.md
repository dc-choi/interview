---
tags: [fit, interview, allsale]
status: active
verified_at: 2026-10-01
category: "Interview - Fit"
aliases: ["올세일 기술과 서비스 설계 예상 질문"]
---

# 올세일, JD와 서비스 설계 12문항

지원 전 예상 1차 대비로 실제 일정/형식은 미정이다. JD 기반 7개, 서비스 맥락 5개다. 제품 버전과 아래 공식 자료는 2026-10-01 기준이며 회사의 버전, 구현과 API 제품은 미확인이다. 설계형 답변은 회사 구현이 아니라 가정 연습이다. 규모/한도를 확인하고 가장 작은 안전한 흐름부터 설명한다.

## JD 기반 7문항

### J1. NestJS에서 API 입력과 권한을 어떻게 보호하나요?

- **의도**: TypeScript 타입과 런타임 검증, 인증과 인가를 구분하는지 본다.
- **핵심 답변/골격**: 외부 입력은 런타임에서 구조/값을 검증하고 인증된 사용자와 소속을 확인한다. 요청의 tenant ID를 신뢰하지 않고 해당 자원에 대한 접근 권한을 검사한다. Controller는 입력/응답 경계를 맡고 업무 규칙은 서비스/도메인에 둔다. 외부 데이터도 검증 뒤 내부 모델로 변환한다. 기존 NestJS 경험을 연동 API 경계에 적용할 수 있다.
- **오답/대안**: DTO 타입 선언만으로 JSON이 검증되지 않는다. Guard의 경로 권한만으로 자원 소유권 검사가 끝나지 않는다. 모든 CRUD에 계층을 늘리기보다 독립적으로 변하는 외부 연동 경계를 분리한다.
- **검증/꼬리**: 다른 tenant의 ID, 누락/초과 필드, 잘못된 enum, 워커 재처리도 같은 업무 검증을 통과하는가? → HTTP뿐 아니라 배치/워커 진입의 검증과 권한 맥락도 확인한다.
- **출처**: [[Clean-Architecture-NestJS-Layers]], [NestJS, Pipes](https://docs.nestjs.com/pipes), [NestJS, Authorization](https://docs.nestjs.com/security/authorization).

### J2. MySQL 경험을 PostgreSQL에 어떻게 옮기겠나요?

- **의도**: 같은 ORM에서도 DB 계약과 운영이 달라지는 지점을 본다.
- **핵심 답변/골격**: 정합성 불변식과 실제 쿼리부터 확인한다. PostgreSQL의 기본 READ COMMITTED에서는 문장마다 스냅샷이 달라질 수 있어 기존 격리 가정을 다시 확인한다. 계획의 추정/실제 행 수, loops와 buffer 접근을 비교하고 데이터 분포를 본다. VACUUM과 연결 풀도 운영 대상이다. Prisma 생성 SQL과 필요한 컬럼/페이지네이션을 함께 측정한다.
- **오답/대안**: PostgreSQL이 항상 빠르거나 ORM을 쓰면 이관이 끝난다고 하지 않는다. `EXPLAIN ANALYZE`는 실제로 실행하므로 쓰기 쿼리의 부작용을 고려한다. 기본 격리는 설정으로 바뀔 수 있다.
- **검증/꼬리**: 특정 tenant만 느리면? → 대표 파라미터별 계획, 추정/실제 행 차이와 통계, 인덱스/정렬을 비교한다. 성능 조건을 맞춰 전후 p95/p99와 쓰기 비용을 함께 본다.
- **출처**: [[MySQL-vs-PostgreSQL]], [[Execution-Plan-PostgreSQL]], [PostgreSQL 18, SET TRANSACTION](https://www.postgresql.org/docs/18/sql-set-transaction.html), [PostgreSQL 18, EXPLAIN](https://www.postgresql.org/docs/18/sql-explain.html).

### J3. Supabase RLS면 멀티테넌트 격리가 끝나나요?

- **의도**: 권한 모델과 실제 접속 역할, 우회 경계를 이해하는지 본다.
- **핵심 답변/골격**: 사용자-조직 멤버십, 역할과 자원 소속을 모델링하고 앱의 조회/변경 조건에 tenant 범위를 둔다. RLS를 보강할 경우 읽기 대상과 변경 후 값을 각각 정책으로 검증한다. API/Prisma/워커가 어떤 DB 역할로 접속하는지 확인해야 하며 우회 권한의 연결에는 앱의 검증이 필요하다. 직접 운영 경험은 없고 권한 경계 경험을 이 계약에 맞춰 보강하겠다.
- **오답/대안**: Supabase secret key가 사용하는 `service_role`은 RLS 우회 권한이 있다. 클라이언트 초기화 키만 보지 말고 사용자 토큰/실제 역할도 확인한다. 관리 키를 브라우저에 보내지 않는다. 역할 이름만 확인하는 RBAC는 자원 소속을 대신하지 않는다.
- **검증/꼬리**: tenant A의 사용자가 B의 행을 읽고 변경하면? worker에서 요청 사용자 맥락이 없으면? → SELECT/INSERT/UPDATE/DELETE 허용과 거부, 멤버십 변경, 실제 접속 역할별로 검증한다.
- **출처**: [Supabase, Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [NestJS, Authorization](https://docs.nestjs.com/security/authorization).

### J4. BullMQ 작업은 재시도만 설정하면 안전한가요?

- **의도**: 큐 재실행과 업무 효과의 중복을 분리하는지 본다.
- **핵심 답변/골격**: 일시 오류만 제한 attempts와 backoff/jitter로 재시도한다. 작업이 stalled 상태에서 다시 처리될 수 있으므로 안정적인 업무 키와 상태 전이로 중복 효과를 막는다. DB 업무 변경과 처리 기록을 한 트랜잭션에 묶고 외부 쓰기는 제공자의 멱등성 계약이나 상태 조회/대사로 닫는다. 이는 SQS 경험에서 전이되는 설계 원리이며 BullMQ 직접 운영 경험은 없다.
- **오답/대안**: job ID 중복 억제만으로 외부 API 효과가 한 번이라고 보장할 수 없다. lock 갱신이 지연되는 CPU 작업은 stalled를 유발할 수 있다. 오류를 삼켜 성공 처리하지 않고 영구 오류는 실패/격리 상태로 남긴다.
- **검증/꼬리**: 외부 호출 성공 후 워커가 죽으면? → 같은 키 재호출이 허용되는지 확인하고 결과 불명확 건은 상태 조회/수동 확인한다. DB 변경/완료 기록 전후의 중단을 재현한다.
- **출처**: [[Delivery-Semantics]], [BullMQ, Retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs), [BullMQ, Idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs), [BullMQ, Stalled Jobs](https://docs.bullmq.io/guide/workers/stalled-jobs).

### J5. SQS와 BullMQ의 역할은 어떻게 나누겠나요?

- **의도**: 이미 있는 도구와 운영 책임을 기준으로 선택하는지 본다.
- **핵심 답변/골격**: 실제 작업 계약과 기존 역할부터 확인한다. AWS 관리형 큐와 서비스 연결이 맞는 작업은 SQS, 애플리케이션의 작업 지연/재시도/상태 관리가 맞고 Redis 운영이 준비된 작업은 BullMQ를 비교한다. 두 큐를 임의로 직렬 연결하지 않고 하나의 업무에 책임 큐와 재처리 정본을 정한다. 생산자의 DB 커밋/발행 틈도 별도로 다룬다.
- **오답/대안**: 도구가 두 개 있으니 모든 이벤트를 둘 다 보내자는 답은 피한다. Outbox는 발행 누락을 줄이는 설계이며 소비 중복을 제거하지 않는다. SQS visibility와 BullMQ lock 갱신은 같은 설정이 아니다.
- **검증/꼬리**: 큐는 비었는데 미완료 작업이 남으면? → DB 접수/완료 상태와 큐 진행을 대사한다. SQS는 작업 효과 커밋 후 삭제, 실패/장시간 작업의 visibility와 DLQ를 검증한다.
- **출처**: [[SQS]], [[Delivery-Semantics]], [AWS, Visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html), [AWS, Transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html), [BullMQ, Going to production](https://docs.bullmq.io/guide/going-to-production).

### J6. 외부 연동 워커를 ECS와 Lambda 중 어디서 실행하나요?

- **의도**: 실행시간, 자원과 운영 방식의 대가를 비교하는지 본다.
- **핵심 답변/골격**: 기존 NestJS 코드/상시 연결 풀을 재사용하고 장시간 진행을 제어할 필요가 크면 ECS 워커가 맞을 수 있다. 짧고 독립적인 작업, 불규칙한 유입에는 Lambda를 비교한다. 어느 쪽도 동시성은 외부 quota와 DB 연결 예산으로 제한하고 종료/재실행을 설계한다. Lambda/SQS 배치는 부분 실패 응답 설정과 반환 계약을 같이 적용한다.
- **오답/대안**: 자동 확장은 하위 API/DB 한도를 없애지 않는다. Lambda에서 함수 전체 예외를 던지면 부분 실패 반환과 다르다. 컨테이너를 선택하면 태스크 배포/종료 책임도 따른다.
- **정량/검증/꼬리**: 가정상 유입 20건/초, 평균 처리 0.2초면 안정 상태 평균 동시 진행은 약 4건이다(`λ×W`). 이는 용량 목표가 아니며 tail, 재시도, 연결과 quota로 실제 상한을 측정한다. 오래된 작업 대기와 종료 중 재전달을 어떻게 확인할까?
- **출처**: [[My-Tech-Cards-Ops]], [AWS Lambda, Handling SQS errors](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html), [AWS ECS, Task definition parameters](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html).

### J7. Redis 캐시와 BullMQ를 함께 쓸 때 무엇이 위험한가요?

- **의도**: 보조 읽기 데이터와 복구해야 할 작업 상태의 차이를 본다.
- **핵심 답변/골격**: 캐시는 원본에서 재생성 가능한 데이터지만 큐 상태가 지워지면 작업이 사라질 수 있다. BullMQ용 Redis는 persistence와 메모리/eviction 정책을 확인하고 캐시의 자원 경쟁과 장애 영향을 분리한다. 조회는 Cache-Aside, TTL과 쓰기 뒤 무효화의 실패 경계를 정하고 고객/권한 범위가 포함된 키를 사용한다.
- **오답/대안**: 캐시처럼 LRU로 큐 키를 지우면 안 된다. BullMQ 공식 운영 안내는 `noeviction`을 요구한다. AOF를 켰다는 사실만으로 모든 장애에서 무손실을 주장하지 않는다. 큐/캐시의 인스턴스 분리는 비용 대신 장애 범위를 줄이는 선택이다.
- **검증/꼬리**: Redis 장애 시 DB fallback이 폭주하면? → 요청 병합/동시성/연결 풀로 원본을 보호하고 캐시 미스와 큐 적체를 따로 관찰한다. 원본에서 미완료 작업 복구가 가능한지도 확인한다.
- **출처**: [[Cache-Strategies]], [[My-Tech-Cards-Ops#카드 8, Cache-Aside와 스탬피드 방어]], [BullMQ, Going to production](https://docs.bullmq.io/guide/going-to-production).

## 서비스 맥락 5문항

### S1. 여러 외부 플랫폼의 데이터 수집 파이프라인을 설계해 주세요.

- **의도**: SaaS 데이터 신선도와 부분 실패를 사용자 결과로 연결하는지 본다.
- **핵심 답변/골격**: 먼저 사용할 API 제품, 데이터 범위, 권한과 갱신 기대를 확인한다. `계정/소스별 진행 상태 → 제한된 수집 → 런타임 검증 → 정규화 저장 → 파생 조회`로 나눈다. 커서와 마지막 성공 시각을 남기고 스키마/값/집합 이상은 반영 전 격리한다. 재처리는 업무 키로 멱등하게 하고 목록의 완전성을 확인한 범위에서만 부재 삭제를 검토한다.
- **대안/한계**: 단순 폴링은 구현이 쉽지만 갱신이 늦고 quota를 쓴다. 웹훅은 빠를 수 있지만 지원 이벤트/중복/누락을 확인하고 대사를 둔다. 비계약 스크래핑 경험과 공식 API 연동은 계약이 다르다.
- **검증/꼬리**: 한 페이지 실패, 빈 결과, 커서 재실행, 소스별 데이터 나이를 재현한다. UI에 마지막 성공/부분 실패를 어떻게 표시할까? → 성공률과 별개로 데이터 신선도를 알린다.
- **출처**: JD, [[External-Collection-Pipeline-Reliability]], [[External-API-Integration-Patterns]], [TikTok, Rate Limits](https://developers.tiktok.com/docs/en/tiktok-api-v2-rate-limit).

### S2. 고객이 TikTok 계정을 연결/해제할 때 안전하게 처리하려면?

- **의도**: 권한 위임과 연결 수명주기, 오래된 작업의 접근을 본다.
- **핵심 답변/골격**: 사용하는 API 제품의 동의/스코프/토큰 계약부터 확인한다. 연결은 인증된 고객/조직과 검증된 콜백에 묶고 필요한 권한만 받는다. 토큰은 서버에서 보호해 저장하고 로그/작업 payload에 원문을 넣지 않는다. 갱신은 연결별로 충돌을 제어하고 해제는 새 작업 중지, 로컬 접근 중단과 제공자 폐기 절차로 나눈다. 워커는 실행 때 연결 상태/버전을 다시 확인한다.
- **대안/한계**: OAuth는 권한 위임이며 자체 SaaS 자원 인가를 대신하지 않는다. PKCE, 갱신 토큰 교체와 폐기 동작은 클라이언트/제품의 지원 계약을 확인한다. 이미 외부에서 실행 중인 호출까지 로컬 취소로 되돌린다고 보장하지 않는다.
- **검증/꼬리**: 해제 뒤 재연결 중 이전 워커가 새 토큰을 덮으면? → 연결 버전/조건부 갱신으로 오래된 결과를 거부한다. 권한 철회, 갱신 경쟁, 재연결과 로그 마스킹을 검증한다.
- **출처**: [[OAuth2]], [TikTok, User Access Token Management](https://developers.tiktok.com/docs/en/oauth-user-access-token-management), [IETF, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html).

### S3. 웹훅이 중복되거나 순서가 바뀌면 어떻게 하나요?

- **의도**: 빠른 수신 응답과 내구성, 상태 반영을 구분하는지 본다.
- **핵심 답변/골격**: 제공자 계약의 서명과 시간 허용 범위를 확인하고 검증한 원문을 내구성 있게 접수한 뒤 신속히 응답한다. 이벤트 ID 등 안정적인 키가 제공되는지 확인해 접수를 중복 제거하고 처리는 별도 워커에서 한다. 역순은 제공자의 버전/시각 계약으로 판정하거나 현재 상태 조회/대사로 닫는다. DB 업무 변경과 처리 기록은 같은 트랜잭션으로 확정한다.
- **대안/한계**: 메모리에 받자마자 200을 보내면 프로세스 중단 시 유실된다. 서명을 재직렬화한 JSON으로 확인하지 않고 계약의 원문을 보존한다. TikTok 개발자 웹훅 안내의 중복 가능성을 TikTok Shop 등 다른 제품의 계약으로 일반화하지 않는다.
- **검증/꼬리**: 동일 사건 재전송, 순서 역전, 접수 후 중단, 오래된/위조 서명을 재현한다. 안정적 이벤트 ID가 없으면? → 제공자 계약에 맞는 키와 재조회 경로를 확인하고 임의로 완전한 중복 제거를 약속하지 않는다.
- **출처**: [[Delivery-Semantics]], [TikTok, Webhooks Overview](https://developers.tiktok.com/docs/en/webhooks-overview), [TikTok, Webhooks Verification](https://developers.tiktok.com/docs/en/webhooks-verification).

### S4. 글로벌 크리에이터 성과 대시보드가 느리면 어떻게 개선하나요?

- **의도**: 읽기 모델의 선택과 지표 의미/신선도를 함께 보는지 본다.
- **핵심 답변/골격**: 대시보드 존재를 가정한 연습이다. 고객이 판단할 지표와 소스별 정의, 기간/시간대를 먼저 정하고 실행 계획과 SQL 수를 측정한다. tenant/기간/정렬 조건에 맞춘 인덱스와 필요한 필드를 먼저 조정한다. 반복 집계가 병목이면 원본과 별개로 갱신 시각/집계 버전을 가진 요약 테이블을 비교한다. 원본에서 파생 결과를 다시 만들 수 있어야 한다.
- **대안/한계**: 실시간 계산은 신선하지만 비용이 크고 사전 집계는 지연/재계산 책임이 생긴다. 누적 값의 새 스냅샷을 매번 더하면 이중 집계될 수 있다. 외부 API의 실제 성과 지표나 환산 정책을 확인하지 않고 모델을 고정하지 않는다.
- **검증/꼬리**: 지연 도착/수정된 데이터와 중복 수집은 집계에 어떻게 반영할까? → 소스 키/버전별 교체나 재계산을 정하고 화면 지표를 원본 대사로 검증한다.
- **출처**: JD의 외부 데이터 SaaS, [[Execution-Plan-PostgreSQL]], [[Prisma-Query-Performance]], [Prisma v7, Relation queries](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/relation-queries).

### S5. 한 고객의 대량 백필이 다른 고객을 지연시키면?

- **의도**: SaaS의 공정성, 외부 호출 예산과 확장 한계를 본다.
- **핵심 답변/골격**: 실제 quota의 단위(앱/계정/엔드포인트), 고객별 신선도 요구와 작업 우선순위를 확인한다. 실시간과 백필의 큐/워커/DB 자원뿐 아니라 외부 요청 예산도 나눈다. 고객별 제한과 남는 예산을 쓰는 낮은 우선순위를 비교하고 429에 무제한 재시도하지 않는다. 처리량보다 오래된 작업 대기와 신선도 위반을 관찰한다.
- **정량/대안**: 가정상 1,000페이지, 유효 예산 50요청/분, 페이지당 1요청이면 실패 없는 처리 하한도 20분이다. 10분마다 완전 갱신 요구는 이 가정에서 불가능해 갱신 범위/주기나 허용 지연을 조정해야 한다. 워커를 늘려 quota를 넘길 수는 없다.
- **오답/검증/꼬리**: BullMQ OSS의 오래된 `groupKey` 예제를 현재 동작으로 쓰지 않는다(3.0 이후 제거 안내). 실제 에디션/버전의 기능과 별도 예산 관리 필요를 확인한다. 다중 워커, 429, 백필/실시간 경쟁에서 고객별 처리 공정성이 유지되는지 재현한다.
- **출처**: [[External-Collection-Pipeline-Reliability]], [BullMQ, Rate limiting](https://docs.bullmq.io/guide/rate-limiting), [TikTok, Rate Limits](https://developers.tiktok.com/docs/en/tiktok-api-v2-rate-limit). 개발자 API 한도를 회사가 쓸 모든 API의 공통 한도로 적용하지 않는다.

## 연습 순서와 확인 범위

J3/J4/J7부터 직접 경험과 설계 제안을 구분해 말하고 S1 → S2 → S3 → S5로 한 연동 흐름을 연결한다. 기술을 나열하기보다 접수, 외부 실행, 저장/완료, 재시작과 고객 표시를 끝까지 설명한다. 라이브 코딩/영어/시스템 설계 전형은 확정되지 않아 전형 사실로 기록하지 않는다. 형식이 정해지면 그 범위로 연습 깊이를 조정한다.

## 관련 문서

- [[Allsale-1st|차수별 목차]]
- [[Interview-Prep-Allsale-1st|회사 분석과 체크리스트]]
- [[Interview-Prep-Allsale-1st-Experience-FIT|경험과 FIT 12문항]]
