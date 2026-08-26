---
tags: [fit, interview, xiilab]
status: done
category: "Interview - Fit"
aliases: ["XIILab 이력서 기반 기술 질문", "씨이랩 이력서 Tech"]
---

# 씨이랩 (XIILab) 면접 준비 — 이력서 기반 기술 질문

> 상위 문서: [[Interview-Prep-XIILab|씨이랩 면접 준비]]
> 범위: 트라이포드랩, 시솔지주, 이썸테크에서 직접 수행한 작업에 대한 예상 기술 질문

---

## 이력서 기반 기술 질문

### DB Lock으로 Race Condition 해결 — 어떤 Lock? 왜? Optimistic vs Pessimistic?

**문제 상황**
- 850대 IoT 환경에서 여러 디바이스가 같은 품목 재고를 동시에 갱신 → Lost Update 발생
- 예: 재고 100개인 품목에 디바이스 A(-5), B(-3)가 동시 도착 → 둘 다 100을 읽고 각각 95, 97로 갱신 → 최종 97 (정상: 92)

**Pessimistic Lock 선택 이유**
- `SELECT FOR UPDATE NOWAIT`로 품목 단위 Exclusive Row Lock 획득
- 재고 읽기+갱신을 원자적 처리 (읽은 값 기반으로 갱신하므로 Lost Update 원천 차단)
- `NOWAIT` 옵션: lock 획득 실패 시 즉시 에러 반환 → 100ms 간격 최대 3회 재시도 (최악 1초 이내 완료)

**Optimistic Lock을 선택하지 않은 이유**
- 같은 품목 경합이 반복되는 구간에서는 Optimistic 재시도 비용이 커질 수 있어 비관적 잠금을 선택
- Pessimistic은 변경 전에 충돌을 조정해 NOWAIT 실패 시 잠금 획득 단계부터 제한 재시도 vs Optimistic은 충돌을 늦게 감지해 **전체 트랜잭션을 재실행할 수 있음**

| 기준 | Optimistic | Pessimistic |
|------|-----------|-------------|
| 충돌 빈도 | 낮을 때 유리 | 높을 때 유리 |
| 충돌 시 비용 | 전체 트랜잭션 재실행 | Lock 대기 (NOWAIT면 즉시 실패 후 재시도) |
| Lock 보유 시간 | 선점 없음. 조건부 UPDATE의 X Lock은 커밋까지 보유 | 트랜잭션 동안 보유 |
| 데드락 위험 | 낮음. 여러 행이나 자원 갱신이 얽히면 가능 | 있음. 순서 통일로 발생 가능성을 낮춤 |

**트랜잭션 범위 최소화**
- 디바이스 정보 조회와 검증은 트랜잭션 **밖**에서 수행 (lock 보유 시간 줄이기)
- Lock 순서 통일: 항상 **품목 ID 오름차순**으로 lock 획득 → 교차 대기(데드락) 가능성을 낮춤

**Redis 분산락을 선택하지 않은 이유**
- 보호할 재고가 같은 DB 트랜잭션 안에 있으면 DB row lock이면 충분하며, 앱 인스턴스 수는 이 판단을 바꾸지 않음
- 여러 독립 DB, shard 또는 외부 시스템 경계를 하나의 트랜잭션으로 묶을 수 없을 때에만 분산 조정을 검토. Redis 락은 단순히 멀티 인스턴스라는 이유로 추가하지 않으며 TTL, fencing과 복구 설계가 함께 필요

**꼬리 질문 대비**
- "NOWAIT 대신 SKIP LOCKED는?" → SKIP LOCKED는 잠긴 행을 건너뛰고 다음 행을 읽음. 큐 패턴에 적합하지만, 재고 갱신처럼 **특정 행을 반드시 처리해야 하는** 경우에는 NOWAIT가 맞음
- "ECS 멀티 인스턴스에서도 DB Lock으로 충분한가?" → 보호할 재고가 같은 DB에 있으면 충분. 여러 DB, shard나 외부 자원을 하나의 트랜잭션으로 묶을 수 없을 때 분산 조정을 검토하며, 샤딩이나 인스턴스 수만으로 Redis 락을 자동 선택하지 않음
- "Optimistic Lock이 나은 상황은?" → 읽기 중심 서비스, 충돌 빈도 낮은 경우 (예: 게시글 수정, 설정 변경)
- "데드락 발생 시 처리?" → InnoDB Wait-for Graph로 자동 탐지 → 비용 적은 TX 자동 rollback → 앱에서 catch 후 재시도

### 슬로우 쿼리 99.3% 개선 — 측정 방법? EXPLAIN 분석?

- 디바이스 최신 상태 조회 서브쿼리 2000ms+ 소요
- 테이블 100만 건, 850대 디바이스, 디바이스당 평균 1,240건 균등 분포
- EXPLAIN ANALYZE로 `ORDER BY created_at DESC, id DESC` 후 약 9,000행 filesort 확인
- 카디널리티 분석: 디바이스 번호 선택도 약 0.12% → 복합 인덱스 `(device_number, created_at DESC, id DESC)` 설계
- 인덱스 스캔만으로 최상단 레코드 즉시 접근. Prisma `@@index`로 선언
- 결과: 쿼리당 15.4ms → 0.1ms. 동등 조건 뒤 최신 1건을 읽어 스캔 범위를 좁혔지만, 데이터와 디바이스가 늘면 B-Tree 깊이, 캐시, I/O와 데이터 분포를 포함해 다시 측정
- 꼬리:
  - "복합 인덱스 컬럼 순서 기준?" → 동등 조건(=) 컬럼을 앞에, 범위 조건은 뒤에. 카디널리티 높은 컬럼이 앞에
  - "인덱스를 많이 만들면?" → SELECT는 빨라지지만 INSERT/UPDATE/DELETE 시 인덱스도 갱신 → 쓰기 성능 저하
  - "커버링 인덱스란?" → 쿼리에 필요한 모든 컬럼이 인덱스에 포함되어 테이블 접근 없이 결과 반환

### Prisma 쿼리 증가 문제 — 구체적으로? ORM vs Raw Query 전환 기준?

- Prisma는 lazy loading이 없어 전통적 N+1은 아님
- 문제는 app-level join 방식 — include 시 SQL JOIN이 아니라 관계마다 별도 쿼리를 발생시켜, 조인 엔티티가 늘어날수록 쿼리가 N개씩 증가
- 기존 평균 100ms → 1000ms까지 저하
- 로그 분석으로 4개 개별쿼리 확인 → 공식 문서 검토하여 relationLoadStrategy: 'join' 발견
- DB-level JOIN 전환만으로 82~90% 성능 개선
- 꼬리:
  - "ORM을 왜 쓰나?" → 타입 안전성, 마이그레이션 관리, 생산성. 성능 크리티컬한 부분만 Raw Query로 전환
  - "Raw Query 전환 기준은?" → EXPLAIN으로 실행 계획 확인 후 ORM 생성 쿼리가 비효율적일 때
  - "Prisma 말고 다른 ORM은?" → 출석부 프로젝트에서는 Prisma + Kysely 조합 사용. Prisma로 스키마/마이그레이션 관리, Kysely로 복잡한 쿼리를 타입세이프하게 작성

### EventBridge+SQS 선택 이유? Kafka와 차이?

- 당시 비용 비교: MSK Provisioned의 브로커와 스토리지 고정비를 EventBridge+SQS 사용량 과금과 비교했다. MSK 산정액은 브로커 유형과 수, 스토리지, 데이터 전송 가정이 남아 있지 않아 정확한 금액으로 인용하지 않는다. 월 10만 발주 × 5액션은 약 50만 메시지고, 비배치 성공 처리라면 Send, Receive, Delete로 약 150만 SQS API 요청이 발생한다. 2026-08-21 서울 리전 표준 큐의 월 100만 요청 Free Tier 기준 SQS 초과분은 약 $0.20이며 EventBridge는 별도 과금이다. 배치, 빈 폴링, 재시도, payload 크기, 리전과 기준일에 따라 총비용은 달라진다.
- 발주라는 도메인 특성상 실시간 처리 불필요 + 최종 일관성이면 충분
- 이벤트 플로우: 발주 → SQS → 수주처리 → SQS → 카톡/이메일/발주서 각각 병렬 처리
- 채널별 오류 분류와 DLQ 설정: 잘못된 번호와 주소 같은 영구 오류는 재시도하지 않고, 일시 오류만 제한 재시도한 뒤 긴급 알림과 수동 처리
- Kafka가 필요한 시점: 이벤트 리플레이, 순서 보장, 초당 수만건 이상
- 꼬리:
  - "SQS 메시지 유실 가능성은?" → at-least-once 보장. 소비자 측 멱등성 필수. 발주 ID 기반 상태 머신으로 중복 처리 방지
  - "이벤트 순서 보장이 필요하면?" → SQS FIFO 큐(MessageGroupId 기반. 일반 FIFO 기본 한도는 API 작업별 초당 300회, 최대 10개 배치 시 API 작업별 초당 3,000개 메시지다. 고처리량은 리전별 서비스 할당량과 MessageGroupId 분산을 확인한다) 또는 Kafka(파티션 내 순서 보장)

### CloudFront+ECS 전환 — 왜? 어떤 문제?

- 단일 EC2에서 Nginx+App 동시 구동 → 트래픽 급증 시 CPU/메모리 집중+배포 시 서비스 중단 위험
- CloudFront(정적 리소스 캐싱) + ALB(웹 트래픽) + NLB(IoT 디바이스 고정 IP 통신) + ECS Fargate(오토스케일링) + Rolling Update 무중단 배포
- IoT 디바이스의 IP 기반 통신 요구사항 때문에 NLB를 별도 구성
- 꼬리:
  - "ALB vs NLB 차이?" → ALB는 L7(HTTP/HTTPS, 경로 기반 라우팅), NLB는 L4(TCP/UDP, 고정 IP, 초저지연)
  - "Rolling Update vs Blue/Green?" → Rolling은 점진적 교체(리소스 절약), Blue/Green은 즉시 전환(빠른 롤백). 비용 고려해 Rolling 선택

### Docker 이미지 43% 경량화 방법?

- NestJS 이미지가 909MB(Spring 수준)로 비정상
- .dockerignore로 불필요 파일 제외 + 멀티스테이지 빌드(build stage → production stage에 필요 파일만 복사)
- 결과: 909MB → 513MB(43.6%), 배포 시간 3분10초 → 2분20초(26.3% 단축)
- ECR 저장 비용도 절감
- 꼬리:
  - "alpine 이미지로 더 줄일 수 있지 않나?" → 가능하지만 native 모듈 호환성 문제. musl libc vs glibc 차이
  - "더 최적화 방법?" → esbuild 번들러 사용, Docker layer 캐싱 최적화(자주 변경되는 레이어를 뒤에 배치)

### Grafana/Prometheus/Loki — 무엇을 모니터링? 알림 기준?

**왜 GPL 자체 호스팅?**
- 기존 CloudWatch+SNS+Lambda 구조의 한계: AWS 리소스 메트릭은 충분했지만, 커스텀 비즈니스 메트릭 비용과 고카디널리티 제약, PromQL 수준의 다차원 쿼리 부재, Logs Insights UX 한계, SNS+Lambda로 알림 라우팅과 디듀프 수동 구현 부담
- 당시 TCO, 메트릭 생태계와 벤더 종속 회피를 비교해 GPL 선택. 일부 평가 축만 남아 총점은 재현하지 않음

**아키텍처 구성**
- Prometheus+Thanos(메트릭, S3 장기 보관) + Loki(로그, Promtail+FireLens) + Grafana(통합 시각화)
- 이름은 TraceIdMiddleware였지만 실제 값은 `x-request-id`였고, HttpLoggingInterceptor와 함께 요청 단위 로그를 연결
- 메트릭 카디널리티 관리: route 정규화, userId/traceId를 라벨에 절대 포함하지 않음

**당시 정적 임계 알림**
- Error rate 1% `for:5m`
- Slow SQL 500ms+ 3회 지속
- Event Loop Lag 100ms 3분 지속
- RDS CPU 75% 5분
- Replica Lag 5초 3분

**꼬리 질문 대비**
- "ELK 대신 Loki인 이유?" → ELK는 운영 복잡도와 비용이 큼. Loki는 인덱스 최소화 설계라 저장 비용 낮음
- "고유 ID를 라벨에 넣으면 왜 안 되나?" → requestId나 traceId 같은 고유값은 카디널리티를 폭발시킬 수 있음. 당시 requestId는 로그 본문에 기록하고 LogQL로 검색했으며, 분산 추적을 추가하면 traceId는 로그와 exemplar로 연결
- "Prometheus pull 방식의 한계?" → 짧은 수명 작업은 스크래핑 전 사라질 수 있음. 서비스 수준 batch job에는 Pushgateway를 제한적으로 검토하고, 일반 컨테이너는 service discovery와 수집 주기, 필요하면 remote write 또는 OpenTelemetry 경로를 설계

---

## 관련 문서
- [[Interview-Prep-XIILab|씨이랩 면접 준비 (인덱스)]]
- [[Interview-Prep-XIILab-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-XIILab-Tech-JD|JD 기반 기술, 서비스, 컬처핏 질문]]
- [[Interview-Prep-XIILab-Questions|역질문 & 체크리스트]]
