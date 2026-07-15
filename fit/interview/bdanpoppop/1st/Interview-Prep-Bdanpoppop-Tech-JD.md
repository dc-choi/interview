---
tags: [fit, interview, bdanpoppop]
status: done
category: "Interview - Fit"
aliases: ["Bdanpoppop JD 기반 기술 질문", "비단팝팝 JD 기반 기술 질문"]
---
# 비단팝팝 1차 — JD 기반 기술 질문

> 상위 TOC: [[Interview-Prep-Bdanpoppop|비단팝팝 1차 면접 준비]]

JD에 "우대"로 적힌 항목 중 약/중 매칭은 면접에서 깊이 들어올 가능성. **블록체인, Redis, Kafka, K8s, 대용량 트래픽** 5개를 우선 정리.

---

## 1. RESTful API 설계 — 자격요건 (강 매칭)

- REST 원칙: 자원 중심 URI, HTTP 메서드 의미 일관성, 무상태성, HATEOAS는 실무에서는 거의 안 씀
- 멱등성: GET, PUT, DELETE 멱등, POST 비멱등. 결제나 교환 같은 비멱등 작업은 **Idempotency-Key 헤더**로 멱등 보장
- 버전 관리: URI(`/v1/...`) vs 헤더(`Accept: application/vnd.api+json;version=1`). URI 방식이 단순하고 가시성 높음
- 에러 응답: HTTP 상태 코드 + RFC 9457 (Problem Details for HTTP APIs) 권장
- 꼬리: "REST vs GraphQL vs gRPC" — 외부 공개 API는 REST(접근성), 내부 마이크로서비스는 gRPC(성능, 타입), 프론트 BFF는 GraphQL(over-fetch 회피)

---

## 2. DB 설계(ERD) 및 쿼리 최적화 — 우대 (강 매칭)

- 정규화 vs 역정규화 트레이드오프: 정규화는 무결성과 저장공간, 역정규화는 조회 성능. 읽기 부하 큰 도메인(상품권 매물 검색)은 검색 전용 역정규화 테이블 검토
- 외래키 제약: 무결성 보장하지만 lock 범위 확대, 삭제 cascade 성능 이슈. 대규모 트래픽에서는 애플리케이션 레벨 검증으로 빼기도 함
- 인덱스 설계 원칙: WHERE/JOIN/ORDER BY/GROUP BY 컬럼 후보. 카디널리티, 선택도 분석 필수
- 슬로우쿼리 디버깅: `EXPLAIN ANALYZE` (실제 실행 비용, rows 확인) → filesort/temporary table 발견 시 인덱스 추가
- 꼬리: "MySQL InnoDB vs PostgreSQL 차이" → InnoDB는 클러스터드 인덱스(PK 기준), PostgreSQL은 힙 + 별도 인덱스. PG는 JSONB, CTE, Window 함수가 더 강력. 트랜잭션 격리 기본값도 다름(InnoDB RR, PG RC)

---

## 3. Redis 캐시 — 우대 (중 매칭)

**팝팝에서 캐시가 효과적인 데이터**
- 상품권 시세, 교환 매물 리스트 (조회는 빈번, 쓰기는 드뭄)
- 사용자 세션, 인증 토큰
- 핫 상품권 (인기 브랜드 상위 N개)
- API rate limit 카운터

**캐시 패턴**
- **Cache-Aside (Look-aside)**: 앱이 캐시 먼저 조회 → miss 시 DB → 캐시에 저장. 가장 흔하고 단순
- **Write-Through**: DB와 캐시 동시 갱신. 일관성 ↑, 쓰기 비용 ↑
- **Write-Behind (Write-Back)**: 캐시 우선 쓰고 DB 비동기. 성능 ↑, 데이터 유실 위험
- **TTL + LRU eviction**: 메모리 한정 → 사용 패턴 기반 만료

**문제 패턴**
- **Cache Stampede**: TTL 만료 직후 다수 요청이 동시에 DB로 → DB 폭주. 해결: 락(Mutex)으로 1개만 DB 조회, 나머지는 stale 반환. 또는 PER (Probabilistic Early Recomputation)
- **Cache Penetration**: 존재하지 않는 키 반복 조회 → DB 매번 hit. 해결: Bloom Filter + null 캐싱
- **Cache Avalanche**: 다수 키가 동시에 만료 → 일제히 DB로. 해결: TTL에 jitter

**꼬리 질문 대비**
- "캐시 무효화 전략?" → 데이터 변경 시 invalidate 또는 update. 분산 환경에서는 Pub/Sub으로 다른 노드 캐시 무효화 신호 전파
- "Redis vs Memcached?" → Redis는 자료구조(List, Sorted Set, Hash, Stream) 풍부 + 영속성. Memcached는 단순 key-value, 멀티스레드. 팝팝의 매물 정렬 큐(Sorted Set), rate limit(Increment)는 Redis가 적합

---

## 4. 메시지 큐 (Kafka, RabbitMQ) — 우대 (중 매칭)

**EventBridge+SQS 경험을 어떻게 Kafka/RabbitMQ에 매핑하나**

| 기준 | SQS | Kafka | RabbitMQ |
|------|-----|-------|----------|
| 모델 | 큐(point-to-point) | 로그(파티션 기반) | Exchange + Queue (라우팅) |
| 순서 보장 | FIFO 큐에서 MessageGroupId 단위 보장. 일반 FIFO는 파티션당 비배치 300 API TPS, 최대 10개 배치 시 초당 3,000개 메시지다. 고처리량은 리전별 서비스 할당량과 MessageGroupId 분산을 확인 | 파티션 내 보장 | 큐 내 FIFO |
| 메시지 보관 | 최대 14일 | 기간 설정(영구도 가능) | 소비 시 삭제 |
| 리플레이 | 불가 | 오프셋 리셋으로 가능 | 불가 |
| 처리량 | 표준 큐는 매우 높음 | 매우 높음 (수십만~수백만 TPS) | 중간 |
| 도입 비용 | 관리형, 거의 없음 | 클러스터 운영 필요(MSK 권장) | 단일 노드 단순, 클러스터링 복잡 |

**팝팝에서 Kafka가 필요해질 시점**
- 교환 이벤트를 분석/리포팅에 활용 (이벤트 소싱, CQRS)
- 체인 이벤트 리스너에서 누락 없는 처리 (오프셋 기반 재시작)
- 초당 수천~수만 교환 이벤트 트래픽

**꼬리 질문 대비**
- "exactly-once delivery?" → SQS, Kafka 모두 기본은 at-least-once. exactly-once는 Kafka transactional producer + idempotent consumer로 가능하지만 비용 높음. **현실적으로는 at-least-once + 멱등 소비자**가 표준
- "RabbitMQ는 어떤 경우?" → 라우팅 규칙이 복잡(여러 exchange, binding) + 처리량 중간 + 단순 운영. 팝팝 케이스에서는 SQS, Kafka가 더 일반적

---

## 5. 대용량 트래픽 처리와 튜닝 — 우대 (중 매칭)

**트래픽이 증가했을 때 백엔드 단계별 대응**
1. **수직 확장**: 인스턴스 사양 ↑ — 단순하지만 한계와 SPOF
2. **수평 확장**: ECS/K8s replica ↑ + ALB로 분산. **stateless 설계 필수**
3. **DB 부하 분산**: Read Replica로 읽기 분리, 쓰기는 마스터 단일
4. **캐시 도입**: Redis로 hot data 메모리 hit
5. **CDN**: 정적 자산, 이미지, 상품권 썸네일은 CloudFront로 엣지 캐싱
6. **이벤트 기반 비동기화**: 결제, 체인 기록 같은 무거운 작업 SQS로 분리
7. **DB 샤딩**: 트래픽이 한 DB의 한계를 넘으면. 샤드 키 설계와 재샤딩 비용이 큼

**팝팝 시나리오 — 신상품권 발매나 이벤트 시 트래픽 스파이크**
- 사전 알림 + Rate limit + 큐 대기 페이지 (선착순 처리)
- Auto-scaling으로 ECS replica 동적 증감 — Target tracking(CPU, 요청 수)
- Hot 상품권은 Redis 캐싱 + 매물 큐는 Sorted Set
- 결제는 외부 API라 응답 지연 시 큐로 흡수

**꼬리 질문 대비**
- "내 경험 한계는?" → 트라이포드랩 트래픽은 진성 대용량(수만 RPS) 수준은 아님. 다만 **트래픽 증가 시 단계별 옵션과 트레이드오프는 알고 있고**, 실제 적용 단계에서 메트릭 기반으로 단계 결정 가능
- "단일 인스턴스 → ECS 전환 경험?" → 트라이포드랩에서 단일 EC2 → ECS Fargate + ALB 전환. 무중단 배포(Blue-Green), Auto-scaling 정책 적용

---

## 6. Docker / Kubernetes (K8s) — 우대 (중 매칭)

**ECS 경험을 K8s 개념으로 매핑**

| ECS | K8s 대응 | 비고 |
|-----|---------|------|
| Task | Pod | 컨테이너 단위 실행 |
| Task Definition | Deployment / StatefulSet | 배포 정의 |
| Service | Service + Deployment | 로드 밸런싱, replica 관리 |
| Cluster | Cluster | 노드 그룹 |
| Auto-scaling | HPA / VPA / Cluster Autoscaler | 수평, 수직, 노드 |
| ALB Target Group | Ingress + Service | 외부 노출 |

**K8s를 직접 안 다뤄봤을 때 어필 포인트**
- ECS Fargate에서 컨테이너 오케스트레이션, 서비스 디스커버리, 롤링 업데이트, 헬스체크 모두 다뤄봤음
- K8s 진입 비용은 manifest 작성, 운영 도구(kubectl, helm, argocd) 학습. 개념은 동일
- 솔직하게 "K8s는 학습 진행 중"이라고 말하면서 **ECS에서 풀어본 운영 문제(블루-그린 배포, 롤백, 로깅, 메트릭)**를 매핑해 보이는 게 안전

**꼬리 질문 대비**
- "Helm 써봤나?" → 직접 운영 안 해봤음. 개념(템플릿 + values 분리)은 알고 있음. ECS 환경에서는 Terraform, CloudFormation으로 동등 역할
- "Pod 간 통신은?" → ClusterIP Service로 내부 DNS, 외부 노출은 Ingress + LoadBalancer

---

## 7. 블록체인(Web3) 연동 — 우대 (약 매칭, 핵심 학습 포인트)

> 도메인 갭 보완용 — 면접 전 반드시 정리

**비단팝팝의 자체 블록체인 web3 서비스 연동 = 어떤 작업인가**
- 상품권 교환과 소유권 이전을 체인에 기록 (감사 추적, 신뢰성)
- STO 연계: 토큰화된 상품권을 토큰증권으로 발행하고 이전 (전자증권법상 분산원장)
- 사용자 지갑 연동 (Web3 지갑 주소 매핑, 서명 검증)

**백엔드 엔지니어가 다루게 될 패턴**
- **RPC 호출**: Web3.js / Ethers.js (TypeScript에서는 Ethers.js가 표준). RPC 노드(Infura, Alchemy 또는 자체 노드) 호출
- **이벤트 리스닝**: 컨트랙트 이벤트 구독 — `eth_subscribe`(WebSocket) 또는 폴링이나 Webhook
- **트랜잭션 라이프사이클**: signed tx → pool → mined → confirmed (N블록). 폴링 + 재시도 + nonce 관리
- **gas fee 관리**: gas price oracle 활용, EIP-1559 (base fee + priority fee)
- **nonce 관리**: 같은 주소에서 동시 트랜잭션 발행 시 nonce 충돌 → DB로 nonce 시퀀스 관리, lock으로 직렬화
- **멱등성**: 트랜잭션 해시 기반 중복 처리 방지
- **리오그(reorg) 대응**: 12블록 확정 전 데이터는 잠정. confirmation depth 정책

**백엔드 패턴은 트라이포드랩 경험과 동일**
- 외부 API 호출(체인 RPC) = 결제와 발행사 API 호출 패턴
- 비동기 워커 + 재시도, DLQ = SQS 발주 워커 패턴
- 멱등성 키, status 머신 = 발주 처리 패턴
- **즉 도메인 지식만 학습하면 백엔드 인프라는 그대로 옮겨 쓸 수 있다**고 어필

**꼬리 질문 대비**
- "어떤 체인을 쓰나?" → 비단팝팝은 "자체 블록체인" 명시. 이더리움 호환 체인(EVM)일 가능성 높음. KDX 컨소시엄 인프라(분산원장)와 연동 추정. **면접에서 어떤 체인과 노드 구성인지 역질문**
- "트랜잭션이 mined 안 되면?" → gas price 부족, nonce 충돌, 노드 장애. 모니터링 + 재발행 로직 필요
- "지갑 서명 검증?" → EIP-712 typed data 서명 → 백엔드에서 ecrecover로 주소 복원 후 검증

**학습 우선순위 (면접 전 1주)**
1. Ethers.js 기본 사용법 (Provider, Wallet, Contract)
2. EVM 트랜잭션 라이프사이클, gas, nonce
3. EIP-1559, EIP-712 (서명 표준)
4. STO와 ERC-1400 (Security Token Standard)

---

## 관련 문서

- [[Interview-Prep-Bdanpoppop|1차 면접 TOC]]
- [[Interview-Prep-Bdanpoppop-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-Bdanpoppop-Tech-Resume|이력서 기술 질문]]
- [[Interview-Prep-Bdanpoppop-Service|서비스 맥락 + 컬처핏 + 역질문]]
