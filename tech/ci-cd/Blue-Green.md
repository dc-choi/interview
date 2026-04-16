---
tags: [cicd, deployment, blue-green, zero-downtime, rollback]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Blue-Green Deployment", "Blue-Green 배포", "블루 그린 배포"]
---

# Blue-Green 배포

운영 환경을 **동일한 두 그룹(Blue·Green)** 으로 복제해 두고, 배포 시 한쪽에만 새 버전을 올린 뒤 **로드밸런서 트래픽을 순간 전환**하는 방식. 무중단 배포와 **빠른 롤백**이 가장 큰 장점. 반대편 개념으로 같은 서버를 그대로 업데이트하는 **In-Place Deployment**가 있다.

## 핵심 명제

- **두 벌의 동일 환경**을 유지해 한쪽을 안전한 상태로 두고 다른 쪽을 배포
- **트래픽 스위치 = 배포 순간** — 빌드·워밍업·검증은 이미 완료된 상태에서 포인터만 옮김
- **롤백 = 스위치 원상복구** — 이전 버전이 살아 있으므로 초단위 복구
- **비용**: 잠시나마 서버 2배 필요 → 클라우드·컨테이너 환경이 아니면 부담
- **DB 스키마·공유 상태**는 전환의 난이도를 올리는 복병

## 동작 흐름

1. **Blue가 현재 프로덕션**, 전체 트래픽 수신
2. **Green을 생성**(또는 대기 중) 상태에서 새 버전 배포·자동 테스트·워밍업
3. **로드밸런서를 Green으로 전환** — 트래픽이 순간에 이동
4. **관측** — 오류율·지연·비즈니스 지표 모니터링
5. 이상 없으면 Blue를 **유휴 상태로 유지**(다음 배포의 Green이 됨)
6. 이상 있으면 **LB를 Blue로 되돌림** → 즉시 롤백

## In-Place vs Blue-Green

| 축 | In-Place | Blue-Green |
|---|---|---|
| 추가 자원 | 없음(기존 서버 재사용) | 두 벌 필요 |
| 배포 중 부하 | 업데이트 중 용량↓ | 100% 유지 |
| 롤백 속도 | 같은 과정 반복(분~시간) | LB 전환(초) |
| DB 스키마 변경 | 비교적 단순(한 버전) | 두 버전 동시 공존 호환 필요 |
| 적합 환경 | 온프레미스·고정 서버 | 클라우드·컨테이너·오토스케일 |
| 트래픽 단절 | 짧게 존재하거나 용량 저하 | 없음 |

**선택 기준**: 자원이 유연하고 빠른 롤백이 중요하면 Blue-Green. 물리 서버·비용 제약이 크고 스키마 변경이 빈번하면 In-Place가 현실적.

## 관련 무중단 배포 전략

| 전략 | 핵심 아이디어 | 특징 |
|---|---|---|
| **Blue-Green** | 두 그룹 전환 | 순간 전환, 빠른 롤백 |
| **Canary** | 새 버전에 **일부 트래픽부터** 점진 이동 | 장애 범위 제한, A/B 테스트 가능 |
| **Rolling Update** | 인스턴스를 **하나씩 교체** | 추가 자원 최소, K8s 기본 |
| **Shadow/Dark Launch** | 새 버전에 **읽기 트래픽만 미러** | 프로덕션 데이터로 검증, 응답은 버림 |

Blue-Green은 "전환이 0-1 binary"인 반면 Canary는 "연속적". 둘은 결합 가능(Green을 Canary처럼 비중 조절).

## 구현 패턴

### DNS 스위치

- 도메인의 A 레코드를 Blue → Green 엔드포인트로 교체
- **단점**: DNS TTL·클라이언트 캐시로 전환이 즉시 완료되지 않음
- 낮은 TTL로도 분 단위 지연 가능 → 권장되지 않음

### 로드밸런서 스위치(권장)

- ALB/NLB·Nginx·HAProxy가 두 타겟 그룹 가중치를 0/100으로 조정
- AWS ALB의 Weighted Target Groups, Kubernetes Service의 selector 교체, Istio VirtualService 가중치

### Kubernetes 방식

- **Service selector 교체** — `app=myapp-v2` 라벨로 selector 변경
- **Ingress 백엔드 교체** — v1 Service에서 v2 Service로 라우트 전환
- **Argo Rollouts / Flagger** — CRD로 Blue-Green·Canary 자동화

## DB 스키마·공유 상태의 난제

두 버전이 동시에 같은 DB를 바라보므로 **스키마는 전·후방 호환**이어야 한다.

- **Expand-Contract**(=Parallel Change) 패턴:
  1. **Expand** — 새 컬럼·테이블을 추가(둘 다 읽기 가능)
  2. **Migrate** — 새 버전을 배포하면서 새 필드에 쓰기
  3. **Contract** — 옛 버전이 사라진 후 옛 컬럼 제거
- `NOT NULL` 추가·컬럼 삭제·타입 변경 같은 **breaking change는 여러 배포에 걸쳐** 수행
- 메시지 큐·캐시 키·파일 포맷도 동일 원칙

## 트래픽 전환 시 주의

- **세션 sticky** — Blue에 로그인한 사용자가 Green으로 넘어가면 세션 소실. Redis 등 외부 저장소 사용
- **WebSocket·SSE 장기 연결** — 전환 즉시 끊기면 UX 저하. graceful drain(기존 연결 완료까지 Blue 유지)
- **연결 풀 워밍업** — Green이 막 뜬 순간엔 커넥션 풀이 비어 있어 P99가 튐. 트래픽 분 단위로 warm-up
- **캐시 재생성 비용** — Green의 로컬 캐시·JIT 프로파일이 비어 있어 cold start
- **외부 서비스 rate limit** — 두 버전이 동시 호출할 수 있으므로 한도 산정 주의

## 흔한 실수

- **DB 스키마를 breaking change로 한 번에 변경** → Blue가 깨짐. 반드시 Expand-Contract
- **Blue를 즉시 삭제** → 롤백 창 상실. 최소 수 시간~1일 유지
- **트래픽 전환 후 모니터링 공백** → 오류 감지 지연으로 롤백 타이밍 놓침. 전환 직후 집중 모니터링 + 자동 롤백 조건
- **자동 테스트 없이 스위치** → 빠른 배포의 이점이 빠른 장애로 변환
- **두 환경 드리프트** — 한쪽에만 긴급 패치하면 구성이 어긋남. IaC로 양쪽 동일 유지

## 면접 체크포인트

- Blue-Green과 Canary의 개념 차이와 결합 가능성
- DB 스키마 변경 시 Expand-Contract가 필요한 이유
- DNS 전환이 LB 전환보다 열악한 이유(TTL·클라이언트 캐시)
- WebSocket·sticky session에서의 전환 이슈
- Kubernetes에서 Service selector로 Blue-Green을 구현하는 방법

## 출처
- [ninanung gist — 서버 무중단 배포 방식(In-Place vs Blue-Green)](https://gist.github.com/ninanung/9d63304cb0d070642e89f9b94b6fe24b)

## 관련 문서
- [[CICD-Basics|CI/CD 기초]]
- [[Canary|Canary 배포]]
- [[Zero-Downtime-Deployment|Zero-downtime deployment]]
- [[Rollback|Rollback 전략]]
- [[DB-Migration|DB migration 전략]]
- [[Load-Balancer|Load Balancer]]
