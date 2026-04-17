---
tags: [performance, scalability, monitoring, case-study]
status: done
category: "Performance & Scalability"
aliases: ["Traffic Scaling Playbook", "트래픽 스케일링 실전"]
---

# 서버 증설 없이 트래픽 스케일링

"더 많은 서버"는 가장 비싸고 느린 해결책. **모니터링 → 병목 식별 → 소규모 최적화 → 카나리 배포** 사이클을 반복하면 같은 인프라로 수~수십 배 트래픽을 처리할 수 있다. 큰 증설 한 번보다 **작은 반복**이 안전하고 빠름.

## 전제: 모니터링 없이는 스케일링 없음

개선의 첫 단계는 **어디가 막히는지 보는 것**. 대시보드 없이 튜닝하면 맞지도 않는 곳을 고치게 됨.

관찰해야 할 4축:
- **애플리케이션 서버**: CPU·메모리·스레드·GC·Event Loop 지연
- **Redis / 캐시**: QPS·hit rate·메모리·evicted keys
- **DB**: 쿼리 시간·Lock 대기·커넥션 풀 사용률·slow query
- **메시지 큐·Kafka**: 컨슈머 lag·처리량·실패 건수
- **비즈니스 지표**: 응답 성공률·주문·가입·결제 전환

**SLO 알림**이 울리면 어떤 축이 먼저 튀는지로 병목 식별.

## 반복 사이클

```
모니터링
  ↓
문제 식별 (어느 지표가 튀는가)
  ↓
원인 분석 (왜 튀는가)
  ↓
소규모 수정 (한 번에 하나)
  ↓
카나리 배포 (소수 트래픽에 먼저)
  ↓
지표 확인 (개선됐나·부작용 없나)
  ↓ (OK면 전체 배포)
모니터링
```

**한 번에 하나씩**이 핵심. 동시에 여러 개 바꾸면 어느 게 효과인지 모름.

## 3대 공통 병목과 처방

### 1. Redis·캐시 과부하

**증상**: Redis CPU 100% 근접, latency 상승, QPS 임계 도달.

**원인**:
- 모든 요청이 Redis 직행 → hot key 발생
- 큰 value 전송 (memory + network 부담)
- Pub/Sub 구독자가 많을 때

**처방**:
- **로컬 캐시 + Redis Pub/Sub 동기화**: 공용(universal) 데이터는 **앱 메모리에 복제**, Redis는 갱신 이벤트만 발행
- **데이터 구분**: Universal(모든 사용자 공통) vs User-Specific(사용자별) — 전자는 로컬 캐시가 강함
- **DTO 압축**: 자주 읽는 user-specific 데이터는 gzip·protobuf로 용량 축소
- **Pipeline·MGET**: 다중 key 조회 시 round-trip 감소
- **Read Replica**: Redis 6+에서 read 분산

### 2. DB 병목 (쓰기 경합)

**증상**: DB CPU·디스크 I/O 포화, Lock wait 증가, 커넥션 풀 대기.

**원인**:
- 포인트·잔액·재고 같은 **hot row** 동시 UPDATE
- 중복 요청 (같은 유저가 여러 번 누름)
- N+1 쿼리 폭증
- 커넥션 풀 사이즈 ≠ DB 처리 용량

**처방**:
- **분산 락 + Redis 1차 처리**: RedLock으로 중복 방지, 결과는 Redis에 즉시 반환(사용자 빠른 피드백), DB 영속은 Kafka 비동기로
- **Consumer Throttling**: Kafka 컨슈머가 DB 쓰기 속도 조절 → QPS 스파이크 평탄화
- **Batch INSERT**: 초당 1만 건을 1초에 한 번 10000건 묶어서 쓰기
- **N+1 제거**: Fetch Join·DataLoader
- **Connection Pool 재조정**: Little's Law 기반 ([[Connection-Pool]])

### 3. API 게이트웨이·네트워크 혼잡

**증상**: 게이트웨이 QPS 한계, bandwidth 포화, 불필요 요청 누적.

**원인**:
- 클라이언트가 중복 요청·polling 과다
- 한 화면을 그리는 데 여러 API 개별 호출
- 헤더 크기 과대
- HTTPS handshake 반복

**처방**:
- **API 통합 (`/view` 엔드포인트)**: 한 화면의 3~4개 API 호출을 서버에서 조합해 1번에 응답 → 피크 시 50% 감소 흔함
- **중복 요청 분석·제거**: 클라이언트 코드 점검, 같은 화면 진입 시 중복 트리거 제거
- **HTTP/2·HTTP/3**: multiplexing으로 connection 수 절감
- **Connection Keep-Alive**: handshake 재활용
- **CDN 앞단**: 정적 자원·캐시 가능 API 응답

## 실전 루프 (라이브 커머스 사례)

분당 수십만 명, 초당 수십만 건 트래픽을 서버 증설 없이 처리한 사례:

1. **모니터링 셋업 먼저** — 앱·Redis·DB·Kafka 전부 대시보드화
2. **Redis 병목**: 로컬 캐시 + Pub/Sub 동기화로 해결
3. **DB 병목**: Redis 선처리 + Kafka 비동기 영속으로 해결
4. **게이트웨이 혼잡**: 3개 API를 `/view` 하나로 통합, 50% 트래픽 감소
5. **각 개선 후 카나리 배포**로 검증

핵심: **"서버 더 달자"는 유혹을 참고 병목을 하나씩 제거**. 비용·복잡도 증가 없이 처리량이 배가.

## 스케일 업 vs 최적화 판단

```
트래픽 2배 증가 예상
  ↓
현재 리소스 사용률 < 50%?
  ├─ YES → 자연 성장 가능. 일단 관찰
  └─ NO
      ↓
    특정 지표만 튀는가?
      ├─ YES → 해당 병목만 최적화 (최우선 선택)
      └─ NO (전체 부하)
          ↓
        수평 확장 구조인가?
          ├─ YES → Scale Out (단기 대응) + 원인 분석
          └─ NO → Stateless 리팩토링 + Scale Out 준비
```

최적화가 장기적으로 싸고, 증설은 단기 해결책에 가깝다. 단, 급박한 장애 상황엔 증설 먼저 + 근본 원인은 이후.

## 카나리 배포의 가치

**소수 트래픽(예: 5%)에 먼저 배포**해서 지표를 관찰. 문제 있으면 **95%는 영향 없음**.

- 새 코드의 실제 영향을 작은 블라스트 반경에서 측정
- 지표가 좋으면 점진 확대 (5% → 25% → 50% → 100%)
- 문제 발견 즉시 롤백

대규모 최적화 시 카나리 없이 전체 배포는 도박.

## 흔한 실수

- **모니터링 없이 최적화** → 방향 못 잡음
- **여러 개 동시 변경** → 어느 게 효과인지 불명
- **하드웨어부터 늘림** → 병목은 그대로, 비용만 증가
- **로컬 캐시를 user-specific 데이터에 적용** → 메모리 폭발
- **Consumer throttling 없이 Kafka로 DB에 쓰기** → DB 피크 여전
- **API 통합 없이 클라가 각자 호출** → 게이트웨이 병목 지속

## 면접 체크포인트

- 모니터링이 왜 스케일링의 전제인가
- Universal 데이터 vs User-Specific 데이터 캐시 전략 차이
- Redis 선처리 + Kafka 비동기 영속 패턴의 역할
- API 통합(`/view`)이 주는 실제 효과
- 카나리 배포가 최적화에 필수인 이유
- "서버 증설은 마지막 수단"이라는 주장의 근거

## 출처
- [Toss Tech — 서버 증설 없이 처리하는 대규모 트래픽](https://toss.tech/article/monitoring-traffic)
- [Toss Tech — 대규모 트래픽 처리 (27600)](https://toss.tech/article/27600)
- [F-Lab — 대용량 트래픽 처리를 위한 개발자 가이드](https://f-lab.kr/insight/handling-high-traffic)
- [F-Lab — 대규모 트래픽 시스템 설계 전략](https://f-lab.kr/insight/system-design-for-large-scale-traffic)

## 관련 문서
- [[Scale-Up-vs-Out|Scale Up vs Scale Out]]
- [[Cache-Strategies|Cache Strategies]]
- [[Cache-Stampede|Cache Stampede]]
- [[Distributed-Lock|분산 락]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[Logs-vs-Metrics|로그·메트릭·트레이스]]
