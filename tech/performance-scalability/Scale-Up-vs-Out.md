---
tags: [performance, scalability, scale-up, scale-out]
status: done
category: "Performance & Scalability"
aliases: ["Scale Up vs Scale Out", "수직 vs 수평 확장"]
---

# Scale Up vs Scale Out

서비스 부하가 늘 때 확장하는 두 방향. **Scale Up(수직 확장)** 은 한 대의 서버를 더 강하게, **Scale Out(수평 확장)** 은 서버 수를 늘리는 것. 단순히 성능 차이가 아니라 **운영·비용·가용성 철학**이 다름.

## 정의

### Scale Up (수직 확장)
**단일 서버의 하드웨어 스펙을 올림**. CPU·메모리·디스크 업그레이드.

- 예: AWS EC2 `t3.medium` → `t3.xlarge` → `m5.2xlarge`
- 혹은 물리 서버 RAM 32GB → 128GB 교체

### Scale Out (수평 확장)
**비슷한 스펙의 서버 수를 늘리고 로드 밸런싱으로 분산**.

- 예: 1대 → 4대 → 10대, 앞단에 ALB 배치
- 각 서버는 상태를 공유 안 하거나, 세션 스토어 같은 외부 저장소 사용

## 비교표

| 축 | Scale Up | Scale Out |
|---|---|---|
| 방법 | 단일 서버 스펙 업 | 서버 수 증가 + LB |
| 구현 복잡도 | 낮음 (단순 스펙 변경) | 높음 (LB·세션 분리·분산 고려) |
| 상한선 | **있음** (하드웨어 한계) | **사실상 없음** (더 붙이면 됨) |
| 비용 곡선 | 고사양일수록 **비선형 급증** (최상위 CPU가 두 배인데 가격은 5배) | 거의 선형 |
| 가용성 | **없음** — 1대 죽으면 전체 다운 | 있음 — N-1대 생존해도 서비스 지속 |
| 재시작 | 전체 다운타임 | 롤링 재시작 가능 |
| 애플리케이션 변경 | 불필요 | **Stateless 설계 + 세션 외부화** 필요 |
| 데이터베이스 적합성 | 높음 (DB는 일반적으로 Up 선호) | 낮음 (복제·샤딩 필요) |

## 언제 Scale Up을 선택

- **상태 공유가 본질적인 시스템** — RDB 마스터, 인메모리 DB, 단일 노드 큐
- **애플리케이션이 아직 Stateless가 아님** — 세션을 서버 로컬에 저장
- **빠른 임시 대응 필요** — 인스턴스 타입만 바꾸면 끝
- **트래픽이 예측 가능하고 경계가 있음** — 중소 규모 내부 시스템
- **비용보다 운영 단순성 우선** — 1대면 모니터링·배포·디버깅 모두 쉬움

### 한계
- 하드웨어 물리 한계 (세계 최고 사양도 결국 한계)
- 최고 사양은 **가격 대비 성능이 매우 나쁨**
- 장애 격리 0 — 1대 다운 = 100% 영향
- 재시작 = 다운타임

## 언제 Scale Out을 선택

- **트래픽이 예측 불가 / 급격한 스파이크** — Auto Scaling으로 탄력 대응
- **고가용성 요구** — 한 대 죽어도 서비스 지속
- **장기 성장 계획** — 트래픽 증가를 선형적으로 따라감
- **MSA·컨테이너 기반** — 수평 확장이 자연스러운 구조
- **전 세계 사용자** — 멀티 리전·엣지 배포

### 전제 조건
- **Stateless 애플리케이션** — 어느 서버가 요청을 받아도 동일 처리
- **세션 외부화** — Redis·DB·JWT (Session.md 참고)
- **로드 밸런서 설계** — L4/L7·알고리즘·헬스체크
- **데이터 계층 대응** — DB 복제·샤딩·캐시 레이어

### 한계
- 초기 설계 비용 (LB·세션·모니터링)
- 분산 시스템 특유의 복잡도 (CAP·네트워크 분할·일관성)
- 많아진 노드만큼 운영 비용 증가 (모니터링·배포·보안 패치)

## 혼합 패턴 (실무)

단일 축으로만 가는 경우는 드물고 **조합**이 일반적.

### Up → Out 전환
초기엔 Up으로 빠르게 대응, 한계가 보이면 Out으로 전환. 서비스 초기~중기에 흔한 패턴.

### Web는 Out, DB는 Up
웹/앱 서버는 Scale Out(Stateless라 쉬움), DB는 Scale Up + Read Replica 조합. 전통적 구조.

### 계층별 다른 전략
- 프런트엔드: CDN + Scale Out
- API 서버: Scale Out + Auto Scaling
- DB 쓰기: Scale Up (마스터)
- DB 읽기: Scale Out (Read Replica)
- 캐시: Scale Out (Redis Cluster)

## 흔한 오해

### "Scale Out이 항상 낫다"
아님. 팀 운영 역량·애플리케이션 설계·데이터 계층 복잡도 고려 필요. Scale Up이 더 효율적인 구간이 분명히 있음.

### "클라우드니까 무조건 Out"
클라우드도 인스턴스 타입 자체를 키우는 Up을 지원. 무작정 Out보다 **비용·복잡도 균형** 고려.

### "Auto Scaling = Scale Out"
Auto Scaling은 **자동화된 Scale Out**. 수동으로 Out 할 수도 있고, Auto Scaling이 없어도 Out 가능.

## 면접 체크포인트

- Scale Up과 Scale Out의 기본 차이를 한 문장으로
- Scale Out 도입 시 애플리케이션이 충족해야 할 전제 (Stateless·세션 외부화)
- DB를 Scale Out 하기 어려운 이유 (상태·일관성·샤딩 복잡도)
- 웹 서버는 Out, DB는 Up이 일반적인 이유
- Scale Up의 "비선형 비용 급증" 구체 예시

## 출처
- [매일메일 — 스케일 업과 스케일 아웃](https://www.maeil-mail.kr/question/128)

## 관련 문서
- [[Load-Balancer|Load Balancer]]
- [[Replication|Replication]]
- [[Sharding|Sharding]]
