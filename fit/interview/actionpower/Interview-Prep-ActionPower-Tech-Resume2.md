---
tags: [fit, interview, actionpower]
status: done
category: "Interview - Fit"
aliases: ["ActionPower 이력서 기술 질문 2", "액션파워 MQ·Docker 질문"]
---
# 액션파워 1차 — 이력서 기반 기술 질문 (2/3): 이벤트 기반 MQ·Docker 경량화

> 상위 TOC: [[Interview-Prep-ActionPower|액션파워 1차 면접 준비]]

---

### EventBridge+SQS 선택 이유? Kafka와 차이?
> 관련: [[MQ-Kafka|MQ·Kafka]], [[Messaging-Patterns|메시징패턴]], [[Delivery-Semantics|전달보장]]

**이벤트 기반이 필요한 이유는 아키텍처 전환 섹션 참고** — 핵심은 발주(핵심 도메인)와 후속 처리(부수 효과)를 분리하여 실패 격리 + 독립 확장 + 복구 가능한 구조를 만드는 것

**그렇다면 왜 EventBridge+SQS인가? (도구 선택)**
- 실제 비용 비교: MSK $574/월 vs EventBridge+SQS $0~18/월 (월 10만 발주 × 5액션 = 50만 SQS 메시지, Free Tier 범위)
- 발주라는 도메인 특성상 실시간 처리 불필요 + 최종 일관성이면 충분
- 이벤트 플로우: 발주 → SQS → 수주처리 → SQS → 카톡/이메일/발주서 각각 병렬 처리
- 채널별 DLQ 설정(카톡: 잘못된 번호 시 실패 처리, 이메일: 무조건 재시도)
- Kafka가 필요한 시점: 이벤트 리플레이, 순서 보장, 초당 수만건 이상
- 꼬리:
  - "SQS 메시지 유실 가능성은?" → SQS는 at-least-once 보장. 소비자가 처리 완료 후 삭제해야 함. 중복 수신 가능 → 소비자 측 멱등성 필수. **실무에서 이렇게 구현:**
    - 발주 ID를 멱등성 키로 사용 (비즈니스 고유 식별자)
    - 발주 테이블에 status 컬럼 + `processing_started_at` 타임스탬프로 상태 머신 설계
    - 상태 흐름: `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED`
    - **워커 처리 흐름:**
      1. SQS 메시지 수신 (발주 ID 포함)
      2. 발주 레코드를 `SELECT FOR UPDATE`로 잠그고 status 확인
      3. `COMPLETED` → 이미 처리됨, 메시지 삭제 후 skip
      4. `PENDING` / `FAILED` → status를 `PROCESSING`으로, `processing_started_at`을 현재 시각으로 갱신 후 비즈니스 로직 실행
      5. `PROCESSING` → **processing_started_at 확인**: 일정 시간(예: visibility timeout의 2배) 초과 시 이전 워커가 crash한 것으로 판단 → `FAILED`로 변경 후 재처리. 미초과 시 다른 워커가 정상 처리 중이므로 skip
      6. 성공 시 `COMPLETED` + SQS 메시지 삭제
      7. 실패 시 `FAILED` + 메시지 삭제하지 않음 → visibility timeout 만료 후 SQS가 재전달
      8. SQS maxReceiveCount(예: 3회) 초과 시 DLQ로 이동 → 알림 발송 + 수동 확인
    - **visibility timeout 설정**: 발주 처리 평균 시간의 6배로 설정. 너무 짧으면 정상 처리 중에 메시지가 다시 노출되어 불필요한 중복, 너무 길면 실패 후 재처리까지 대기 시간이 김
    - **알림 채널 중복 방지**: 알림 로그 테이블에 `(발주_id, channel)` UNIQUE 제약 → 카톡/이메일/발주서 이중 발송 원천 차단
    - 재고 갱신에서 이미 `SELECT FOR UPDATE NO WAIT`를 쓰고 있었기 때문에, 같은 패턴을 발주 상태 관리에도 자연스럽게 확장
  - "SQS 소비자로 Lambda를 안 쓴 이유?" → Lambda + SQS event source mapping이 일반적인 패턴인 건 맞음. 하지만 우리 상황에서는 ECS 워커가 더 적합했음:
    - NestJS 앱 안에서 SQS 폴링을 구현하여 **도메인 로직(Prisma 모델, 발주 비즈니스 로직)을 그대로 재사용**. Lambda로 분리하면 코드 중복이나 별도 배포 파이프라인 필요
    - Prisma Client는 DB 커넥션 풀을 유지하는데, Lambda는 요청마다 cold start → **커넥션 풀 관리가 어려움** (RDS Proxy로 해결 가능하지만 추가 비용+인프라)
    - 이미 ECS Fargate 인프라가 구축되어 있어 추가 인프라 비용 없이 워커 구현 가능
    - 소규모 팀에서 **단일 코드베이스+단일 배포 파이프라인** 유지가 운영 효율적
    - Lambda가 더 나은 경우: 트래픽이 불규칙하고 유휴 시간이 긴 워크로드, 도메인 로직이 단순해서 별도 패키지로 분리 가능할 때, 초당 수천 건 이상 급격한 스케일아웃이 필요할 때
  - "visibility timeout이 뭔가?" → 소비자가 메시지를 가져간 뒤 일정 시간 내 삭제하지 않으면 다시 큐에 노출. 처리 시간보다 넉넉하게 설정해야 중복 처리 방지
  - "이벤트 순서 보장이 필요하면?" → SQS FIFO 큐(MessageGroupId 기반 순서 보장, 초당 300 TPS 제한) 또는 Kafka(파티션 내 순서 보장)
  - "Pub/Sub과 SQS 차이?" → Pub/Sub은 topic 기반 팬아웃(1:N), SQS는 큐 기반 point-to-point(1:1). 다글로에서 Pub/Sub을 쓴다면 여러 서비스가 같은 이벤트를 구독하는 구조

### Docker 이미지 43% 경량화 — 어떻게?
> 관련: [[Multi-Stage-Build|멀티스테이지빌드]]

- NestJS 이미지가 909MB(Spring 수준)로 비정상
- .dockerignore로 불필요 파일 제외 + 멀티스테이지 빌드(build stage → production stage에 필요 파일만 복사)
- 결과: 909MB → 513MB(43.6%), 배포 시간 3분10초 → 2분20초(26.3% 단축)
- ECR 저장 비용도 절감
- 꼬리:
  - "alpine 이미지로 더 줄일 수 있지 않나?" → 가능하지만 native 모듈(bcrypt, sharp 등) 호환성 문제 발생 가능. musl libc vs glibc 차이. 안정성과 경량화의 트레이드오프
  - "distroless 이미지는?" → Google이 제공하는 최소 런타임 이미지. 셸이 없어 보안 강화되지만 디버깅이 어려움. 프로덕션에 적합
  - "더 최적화할 수 있는 방법?" → node_modules 대신 번들러(esbuild) 사용, 불필요한 devDependencies 제거 확인, Docker layer 캐싱 최적화(자주 변경되는 레이어를 뒤에 배치)

---

## 관련 문서
- [[Interview-Prep-ActionPower|1차 면접 TOC]]
- [[Interview-Prep-ActionPower-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-ActionPower-Tech-Resume1|이력서 기술 질문 1 (DB/ORM)]]
- [[Interview-Prep-ActionPower-Tech-Resume3|이력서 기술 질문 3 (아키텍처 전환)]]
- [[Interview-Prep-ActionPower-Tech-Resume4|이력서 기술 질문 4 (GPL 모니터링)]]
- [[Interview-Prep-ActionPower-Tech-JD|JD 기반 기술 질문]]
- [[Interview-Prep-ActionPower-Service|서비스 맥락 + 컬처핏 + 역질문]]
- [[Interview-Prep-ActionPower-Checklist|면접 준비 체크리스트]]
