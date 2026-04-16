---
tags: [performance, database, connection-pool, hikari, scalability]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["Connection Pool", "Connection Pool Sizing", "DB 커넥션 풀", "HikariCP"]
---

# DB 커넥션 풀 · 사이징

데이터베이스 커넥션은 **열고 닫는 비용이 비싸다** — TCP 핸드셰이크, 인증(암호 해시 비교·TLS), 세션 변수 초기화까지. 요청마다 새로 열면 지연이 누적되고 DB 측 자원도 금방 고갈. **미리 일정 개수를 열어 두고 재사용**하는 구조가 커넥션 풀이다. 크기 설정이 전체 처리량의 상한을 결정한다.

## 왜 필요한가

- **연결 수립 비용**: 수십 ms ~ 수백 ms (지리적으로 멀거나 TLS 포함 시)
- **DB 측 한계**: MySQL `max_connections` 기본 151, PostgreSQL 기본 100. 수천 커넥션은 메모리·컨텍스트 스위칭으로 DB 자체가 느려짐
- **웹 서버 동시성**: 스레드 풀과 독립적 — **DB 커넥션 풀이 실질 동시성 상한**
- **예측 가능한 지연**: 풀에서 즉시 꺼내므로 지연 분포가 좁아짐

## 구성 요소

| 축 | 역할 |
|---|---|
| **Min Pool Size** | 최소 유지 커넥션. idle 상태여도 유지 |
| **Max Pool Size** | 최대 허용 커넥션 |
| **Connection Timeout** | 풀에서 꺼내기 대기 한도 |
| **Idle Timeout** | 유휴 커넥션 반납·종료 시간 |
| **Max Lifetime** | 커넥션 최대 생존 시간 (DB 측 kill 대비) |
| **Validation Query** | 커넥션 살아있는지 확인용 (`SELECT 1`) |

## 대표 구현

| 라이브러리 | 언어·생태계 | 특징 |
|---|---|---|
| **HikariCP** | Java · Spring Boot 기본 | 가장 빠름, 경량, 튜닝 단순 |
| **Apache DBCP** / **Tomcat JDBC** | Java 레거시 | Tomcat 내장 |
| **c3p0** | Java 구식 | 복잡·느림, 지금은 비권장 |
| **pgBouncer** | PostgreSQL 프록시 | **외부 프로세스**로 앱 풀 앞단에 배치 |
| **node-postgres pool** | Node.js | 프로세스별 풀 |
| **MySQL2 pool** | Node.js | 동일 |

## 사이징: 큰 수가 항상 좋은 건 아님

직관과 달리 **풀을 키우면 오히려 느려질 수 있다.** DB CPU·디스크 I/O·락 경합이 한정돼 있어 동시 처리 능력이 하드웨어로 제한되기 때문.

### HikariCP 공식 가이드

$$pool\_size = (core\_count \times 2) + effective\_spindle\_count$$

- `core_count`: DB 서버 CPU 코어 수
- `effective_spindle_count`: 디스크 스핀들 수 (SSD는 1로 간주 가능)
- 예: 8코어 + SSD → 약 17개 권장

실무 관찰: **대부분의 OLTP에서 한 DB 당 10~30개면 충분**. "1,000 동시 요청을 받으려면 풀도 1,000"이 아니라, **DB 자체 TPS가 300이면 풀은 20으로도 300 TPS를 낼 수 있다** — 대기 큐가 조금 쌓일 뿐.

### 왜 크면 더 나빠지는가

- DB는 Lock·Latch·Cache Line 경합이 커질수록 개별 쿼리가 느려짐
- 더 많은 커넥션 → 더 많은 컨텍스트 스위칭·메모리 사용
- 결과: 처리량 곡선이 정점을 찍고 하락(Little's Law)

## Little's Law로 본 적정 풀 크기

$$L = \lambda \times W$$

- L: 시스템 내 평균 요청 수(≈ 필요한 커넥션 수)
- λ: 도착률(RPS)
- W: 평균 응답 시간(초)

예: 500 RPS × 40ms = 20 커넥션이면 이론적으로 포화 직전 처리 가능. 안전 마진 1.5~2배로 30~40.

## 대기 큐와 타임아웃

풀이 다 차면 요청은 **대기**. 이 대기 시간도 지연에 포함.

- **`connectionTimeout`**(HikariCP 기본 30초): 이 시간 내 획득 실패면 예외
- 너무 길면 부하 상황에서 스레드가 계속 쌓임 → OOM
- **짧게(1~3초) + 명확한 실패**가 장애 전파 방지에 낫다(Fail Fast)

## 연결 검증과 Max Lifetime

DB나 중간 네트워크(방화벽·LB)가 **유휴 커넥션을 끊어버리는** 경우가 있다. 죽은 커넥션을 풀에서 꺼내면 첫 쿼리가 실패.

- **Validation Query/Ping** — 꺼내기 전 `SELECT 1` (HikariCP는 JDBC4 `isValid()` 기본)
- **Max Lifetime** — DB 측 `wait_timeout`보다 짧게 설정(예: MySQL 8h → Hikari 30min)
- **Keep-alive Time** — 유휴 커넥션을 주기적으로 검증해 네트워크 끊김 방지

## 고려할 워크로드 패턴

- **트랜잭션 길이** — 긴 트랜잭션·배치는 커넥션을 오래 점유 → 별도 풀 권장
- **Read replica 분리** — 쓰기·읽기 풀 분리로 경합 완화
- **쓰기 집중** — Lock 경합이 병목. 풀 키우지 말고 쿼리 최적화·샤딩
- **Serverless (Lambda)** — 프로세스 폭증으로 커넥션 폭주. **RDS Proxy·pgBouncer** 필수 → [[AWS-Lambda]]

## Sidecar Proxy (pgBouncer·ProxySQL)

앱 풀과 별개로 **DB 앞단에 경량 프록시**를 두어 커넥션을 재사용.

- **Transaction-level pooling**: 요청 → 커넥션 획득 → 트랜잭션 종료 시 반환 → 다음 요청에 재할당
- PostgreSQL처럼 연결 비용이 큰 DB에서 효과 큼
- 제약: prepared statement·세션 변수 사용에 주의

## 흔한 실수

- **풀을 크게 하면 빨라진다고 오해** → 오히려 DB 포화로 악화
- **`connectionTimeout`을 길게** → 장애 시 스레드 누적 → OOM
- **`maxLifetime` 미설정** → 네트워크 idle kill로 간헐 오류
- **스프링 Tomcat 스레드 200 + 풀 10** → 대기 큐 쌓임. 균형 조정 필요
- **단일 풀로 배치·OLTP 공유** → 배치가 풀을 점령해 OLTP 지연
- **Lambda에서 각 인스턴스가 풀 생성** → 수천 커넥션 생성 → DB 폭주. RDS Proxy

## 튜닝 체크리스트

- 평균 쿼리 지연과 목표 RPS로 Little's Law 계산 → 후보 크기
- HikariCP 공식 가이드(코어 × 2 + 스핀들) 비교
- 부하 테스트(k6·JMeter)로 풀 크기를 10→20→30→40으로 점증하며 **TPS·P99** 측정 — 정점 파악
- 정점 이후 하락 구간이 나오면 **그보다 약간 낮은 값** 선택
- `connectionTimeout` 1~3초, `maxLifetime` DB 타임아웃보다 짧게
- DB 측 `max_connections` 대비 **앱 서버 수 × 풀 크기 합**이 초과하지 않는지

## 면접 체크포인트

- 커넥션 풀이 필요한 이유와 연결 비용의 구성 요소(TCP·인증·TLS)
- 풀 크기를 키우면 **오히려 느려질 수 있는** 이유(하드웨어 동시 처리 한계)
- HikariCP 권장 공식(`core × 2 + spindle`)의 배경
- Little's Law로 풀 크기를 추산하는 방법
- `maxLifetime`을 DB `wait_timeout`보다 짧게 두어야 하는 이유
- Serverless(Lambda)에서 커넥션 풀이 문제되는 시나리오와 RDS Proxy 해법

## 관련 문서
- [[Latency-Optimization|레이턴시 최적화]]
- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
- [[AWS-Lambda|AWS Lambda]]
- [[Transaction-Lock-Contention|트랜잭션 경합과 Lock 문제]]
- [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]
