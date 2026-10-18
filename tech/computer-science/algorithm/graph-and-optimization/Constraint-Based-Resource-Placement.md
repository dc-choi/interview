---
tags: [algorithm, optimization, constraints, scheduling, rebalancer]
status: done
verified_at: 2026-10-16
category: "CS - 알고리즘"
aliases: ["Constraint-Based Resource Placement", "제약 기반 자원 배치", "Rebalancer"]
---

# 제약 기반 자원 배치

자원 배치는 객체를 컨테이너에 할당하면서 용량과 정책을 만족하고 비용을 낮추는 최적화 문제다. 서버의 작업, 저장 장치의 shard와 지역별 workload가 그 예다.

## 제약과 목적을 분리한다

- 하드 제약은 용량 상한이나 장애 도메인 분리처럼 위반을 허용하지 않는 규칙이다.
- 목적 함수는 부하 편차, 이동량이나 비용처럼 더 좋은 배치를 고르는 기준이다.
- 목적 간 우선순위와 가중치를 명시한다. 이동 비용을 빼면 작은 개선을 위해 대규모 재배치가 발생할 수 있다.

해가 없을 때 제약을 몰래 완화하지 않고 어떤 규칙들이 충돌하는지 확인한다. 계산된 배치안과 실제 시스템의 이동 실행도 별도 단계다.

## 지역 탐색과 MIP

| 방식 | 쓰임 | 경계 |
| --- | --- | --- |
| 지역 탐색 | 객체를 이동하거나 교환하며 빠르게 개선 | 큰 문제에 맞지만 전체 최적해 보장 없음 |
| 혼합 정수 계획법(MIP) | 정수 및 연속 변수와 제약으로 모델링 | 작은 문제에서 최적성 증명에 적합, 실행 시간과 종료 상태 확인 필요 |

제한 시간에 멈춘 solver의 feasible solution을 증명된 최적해로 부르지 않는다. 필요하면 best bound와 optimality gap을 함께 기록한다.

## Rebalancer 사례

Meta의 Rebalancer는 배치 문제를 DSL로 정의하고 solver를 바꾸어 비교하는 도구다. C++ 코어와 Python 바인딩, 지역 탐색 및 MIP 계열을 제공한다. 2026-10-14 입력은 25개 이상의 목표와 제약을 조합하고 Meta의 대규모 문제 대부분을 지역 탐색으로 처리한다고 소개한다. 이번 공식 소개 대조에서는 두 solver 계열과 역할을 확인했으며, 구성요소 개수와 운영 비중은 별도 확인 대상이다.

## 적용 점검

1. 현재 배치와 입력의 시점을 고정한다.
2. 제약 충족 여부와 기존 배치 대비 개선량을 각각 검증한다.
3. 이동 비용, 장애 중 용량과 되돌리는 절차를 포함한다.
4. 실행 시간과 해의 품질을 같은 문제에서 비교한다.

공식 소개와 설치 안내를 대조했으며 solver 실행이나 운영 규모 재현은 하지 않았다.

## 출처

- [Rebalancer, Introduction](https://facebook.github.io/rebalancer/docs/intro/)
- [Rebalancer, Installation](https://facebook.github.io/rebalancer/docs/getting-started/installation/)
- [Rebalancer — GitHub, Meta](https://github.com/facebook/rebalancer)

## 관련 문서

- [[Graph-Optimization-Algorithms|Greedy, MST와 최대 유량]]
- [[Capacity-Planning|캐퍼시티 플래닝]]
