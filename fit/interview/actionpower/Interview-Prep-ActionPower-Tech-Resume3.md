---
tags: [fit, interview, actionpower]
status: done
category: "Interview - Fit"
aliases: ["ActionPower 이력서 기술 질문 3", "액션파워 아키텍처·모니터링 질문"]
---
# 액션파워 1차 — 이력서 기반 기술 질문 (3/3): 아키텍처 전환·GPL 모니터링

> 상위 TOC: [[Interview-Prep-ActionPower|액션파워 1차 면접 준비]]

---

### CloudFront+ECS 전환 — 왜? 어떤 문제가 있었나?
> 관련: [[Load-Balancer|로드밸런서]], [[Docker|Docker]], [[Messaging-Patterns|메시징패턴]]

**Before: 단일 EC2의 한계**
- Nginx + NestJS 앱이 하나의 EC2에서 동시 구동
- 문제 1: **스케일링 불가** — 트래픽 급증 시 CPU/메모리가 한 서버에 집중, 수천 대 IoT + 웹 트래픽이 같은 인스턴스를 공유
- 문제 2: **배포 시 서비스 중단** — 앱 재시작 동안 요청 유실, IoT 디바이스 연결 끊김
- 문제 3: **장애 격리 불가** — 앱 장애 = 서비스 전체 중단, 복구 수단이 SSH 접속 후 수동 재시작뿐
- 문제 4: **동기 결합** — 발주 생성 → 수주 처리 → 카톡/이메일/발주서 발송이 하나의 API 요청 안에서 순차 실행
  - 카톡 API 3초 → 사용자가 발주 버튼 누르고 3초+ 대기
  - 카톡 API 장애 → **발주 자체가 실패** (발주는 성공했어야 하는데 알림 때문에 롤백)
  - 새 알림 채널(슬랙 등) 추가 → 발주 API 코드를 직접 수정해야 함 (발주와 알림이 결합)
  - 핵심: **"발주를 생성하라"(명령)와 "발주가 생성되었다"(이벤트)가 분리되지 않음**

**왜 이벤트 기반 아키텍처가 답인가**
- 발주 도메인을 분석하면, "발주 생성" 이후의 후속 처리(수주, 카톡, 이메일, 발주서)는 **서로 의존하지 않는 독립적인 반응**
  - 카톡 실패해도 이메일은 보내야 함
  - 수주 처리와 알림 발송은 서로 기다릴 이유가 없음
  - 각 채널마다 실패 모드가 다름 (카톡: 번호 오류, 이메일: 서버 다운) → 재시도 정책도 달라야 함
- 발주 생성 = **핵심 도메인** (반드시 성공해야 함) vs 후속 처리 = **부수 효과** (실패해도 나중에 복구 가능)
- 이 둘을 이벤트로 분리하면:
  - 발주 API는 DB에 발주 저장 + 이벤트 발행만 하고 즉시 응답 → 사용자 경험 개선
  - 후속 처리는 각자 독립적으로 소비 → 실패 격리, 개별 확장, 채널 추가 시 발주 코드 수정 불필요
  - 실패해도 큐에 메시지가 남아있으므로 **복구 가능한 구조**

**전환 과정 (점진적, 3단계)**

**1단계: 컨테이너화 + 로드밸런서 분리**
- Docker 컨테이너화 → ECS Fargate로 이전 (서버 관리 제거, 오토스케일링 확보)
- ALB(웹 트래픽, L7 HTTP/HTTPS) + NLB(IoT 디바이스, L4 TCP 고정 IP) 이중 구성
  - IoT 디바이스가 펌웨어에 IP를 하드코딩하여 통신 → NLB의 고정 IP(Elastic IP) 필요
- CloudFront로 정적 리소스 캐싱 → 오리진 서버 부하 감소
- Rolling Update로 무중단 배포 확보

**2단계: 이벤트 기반 아키텍처로 전환 (발주 자동화)**
- 기존: 발주 API 하나에 수주+카톡+이메일+발주서 동기 처리 → 응답 시간 수 초, 채널 실패 시 전체 실패
- 전환: EventBridge + SQS로 비동기 분리
  - 발주 생성(API) → EventBridge 이벤트 발행 → SQS 큐 → 수주 워커 처리
  - 수주 완료 → SQS → 카톡/이메일/발주서 각 채널 **병렬** 처리
- 효과:
  - 발주 API는 이벤트만 발행하고 즉시 응답 → **응답 시간 대폭 단축**
  - 채널별 독립 실패/재시도 — 카톡 실패해도 이메일은 정상 발송
  - 채널별 DLQ로 실패 격리 — 카톡(잘못된 번호 시 실패 처리), 이메일(무조건 재시도)
  - 수기 발주 1시간 → 완전 자동화, 수기 재고관리 4시간 → 10분(95.8% 절감)

**3단계: DB 읽기/쓰기 분리**
- 대형 고객사 PoC 진행 중 조회 트래픽 증가 → RDS Read Replica 도입
- 쓰기(발주/재고 갱신) → Primary, 조회(대시보드/리포트) → Replica
- 결과: 조회 API 40% 향상, DB CPU 30% 감소
- Prisma에서 `datasources`로 Primary/Replica 연결 분리

**현재 진행 중: 이벤트 기반 아키텍처 고도화**
- SQS 소비자 멱등성 강화 (발주 ID 기반 상태 머신 + processing_started_at 타임아웃)
- 이벤트 흐름 전체의 관측성(observability) 개선 — 발주 생성부터 알림 발송까지 TraceId 연계
- 채널별 재시도 정책 세분화

**꼬리 질문 대비**
- "한 번에 전환했나?" → 아니다. 서비스 운영 중이라 점진적으로. 1단계(컨테이너+LB) → 2단계(이벤트 분리) → 3단계(DB 분리) 순서. 각 단계에서 안정화 확인 후 다음 단계 진행
- "ALB vs NLB 차이?" → ALB는 L7(HTTP/HTTPS, 경로 기반 라우팅), NLB는 L4(TCP/UDP, 고정 IP, 초저지연). IoT 디바이스가 IP 기반으로 통신하므로 NLB 필요
- "Rolling Update vs Blue/Green?" → Rolling은 점진적 교체(리소스 절약, 배포 중 구/신 버전 공존), Blue/Green은 새 환경 준비 후 즉시 전환(빠른 롤백, 리소스 2배 필요). 비용 고려해 Rolling 선택
- "오토스케일링 기준은?" → API 서버: CPU 70% or 요청 수 기반, 큐 워커: SQS ApproximateNumberOfMessagesVisible(큐 depth) 기반
- "동기 → 비동기 전환 시 가장 어려웠던 점?" → 기존에 하나의 트랜잭션으로 묶여있던 로직을 분리하면서 **데이터 정합성 보장**이 핵심 과제. 발주 상태 머신 + 멱등성 키 + DLQ로 "실패해도 복구 가능한 구조"를 우선 설계
- "이벤트 유실은 어떻게 방지?" → 두 가지 레벨로 나눠서 답변:
  - **소비자 측(SQS → 워커)**: SQS at-least-once + 소비자 측 멱등성으로 중복은 허용하되 유실은 방지. DLQ로 최종 실패 메시지 보관
  - **생산자 측(API → 큐)**: 이 부분이 핵심. DB에 발주를 저장하고 EventBridge에 이벤트를 발행하는 건 **서로 다른 시스템에 대한 두 번의 쓰기(Dual Write)**. 앱이 DB 저장 후 이벤트 발행 전에 crash하면 이벤트가 유실됨 → **Transactional Outbox Pattern**으로 해결
    - 발주 INSERT + outbox 테이블 INSERT를 **같은 DB 트랜잭션**으로 묶음 → 원자적 보장
    - 별도 Relay 프로세스가 outbox를 폴링하여 EventBridge/SQS에 발행 후 processed 마킹
    - Relay가 crash해도 outbox 레코드가 남아있으므로 재시작 후 재발행 → at-least-once 발행 보장
    - 소비자 측 멱등성과 짝을 이루어 **end-to-end 신뢰성** 확보
    - 구현: NestJS `@Cron('*/5 * * * * *')`으로 5초 간격 폴링. 월 10만 발주 규모에서는 CDC(Debezium) 대비 폴링이 단순하고 충분
    - outbox 테이블: `(id, aggregate_type, aggregate_id, event_type, payload JSONB, created_at, processed_at)` — processed_at이 NULL이면 미발행
  - "Dual Write 말고 다른 방법은?" → CDC(Change Data Capture): DB WAL을 읽어 실시간 이벤트 발행. 지연 최소화지만 Debezium+Kafka Connect 등 인프라 복잡도 증가. 현재 규모에서는 과함
- "Replication Lag 문제는?" → 발주 직후 조회하면 Replica에 아직 반영 안 될 수 있음. 쓰기 직후 조회가 필요한 API는 Primary에서 읽도록 분기. 대시보드/리포트 같은 약간의 지연이 허용되는 조회만 Replica 사용
- "Graceful Shutdown은?" → ECS 태스크 종료 시 SIGTERM → 진행 중 요청 완료 대기 → 새 요청 거부 → 타임아웃 후 SIGKILL. NestJS의 `enableShutdownHooks()`로 구현. SQS 워커는 현재 처리 중인 메시지 완료 후 종료 — 미완료 메시지는 visibility timeout 만료 후 SQS가 재전달

---

## 관련 문서
- [[Interview-Prep-ActionPower|1차 면접 TOC]]
- [[Interview-Prep-ActionPower-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-ActionPower-Tech-Resume1|이력서 기술 질문 1 (DB/ORM)]]
- [[Interview-Prep-ActionPower-Tech-Resume2|이력서 기술 질문 2 (MQ·Docker)]]
- [[Interview-Prep-ActionPower-Tech-Resume4|이력서 기술 질문 4 (GPL 모니터링)]]
- [[Interview-Prep-ActionPower-Tech-JD|JD 기반 기술 질문]]
- [[Interview-Prep-ActionPower-Service|서비스 맥락 + 컬처핏 + 역질문]]
- [[Interview-Prep-ActionPower-Checklist|면접 준비 체크리스트]]
