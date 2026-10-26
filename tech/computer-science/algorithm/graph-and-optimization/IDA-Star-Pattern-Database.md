---
tags: [cs, algorithm, search, heuristic, ida-star, pattern-database]
status: done
verified_at: 2026-10-26
category: "CS - 알고리즘"
aliases: ["IDA*", "Iterative Deepening A*", "Pattern Database", "패턴 데이터베이스", "루빅스 큐브 최적해", "Kociemba Two-Phase Algorithm", "2단계 알고리즘"]
---

# IDA*와 패턴 데이터베이스

상태 공간이 큰 퍼즐에서는 맞춘 칸 수보다 목표까지 남은 비용의 하한이 탐색에 유용하다. 최적해를 찾는 시간, 탐색 노드를 저장하는 공간과 실제 로봇의 실행 시간은 서로 다른 목표다.

## 상태 공간과 수의 정의

3×3×3 루빅스 큐브의 도달 가능한 상태는 43,252,003,274,489,856,000개다. 각 면의 90도, 180도, 270도 회전을 각각 한 수로 세는 half-turn metric에서는 매번 18가지 수가 있다. 길이 10인 수열은 `18^10 = 3,570,467,226,624`개지만 같은 상태에 닿는 중복 경로가 포함된다.

같은 면의 연속 회전을 합치고, 교환 가능한 마주 보는 면 회전의 순서를 고정하면 중복을 줄일 수 있다. 한 번의 회전이 여러 조각을 함께 움직이므로 맞춘 조각 수를 늘리는 탐욕법만으로 최적해를 보장하지 않는다.

모든 합법 상태의 최단 해 중 가장 긴 길이는 half-turn metric에서 20수, 180도를 두 수로 세는 quarter-turn metric에서는 26수다. 각각 2010년과 2014년 계산 증명 결과다. 같은 큐브라도 비용 정의가 달라지면 최적 길이가 달라진다.

## IDA*: 비용 한계를 늘리는 깊이 우선 탐색

`f(n) = g(n) + h(n)`에서 g는 누적 비용, h는 남은 비용의 하한이다. 큐브처럼 모든 이동 비용이 1인 경우 g는 둔 수와 같다.

1. 시작 상태의 h를 첫 비용 한계로 정한다.
2. 깊이 우선으로 탐색하되 f가 한계를 넘으면 해당 가지를 중단한다.
3. 해를 못 찾으면 한계를 넘었던 f 중 최솟값을 다음 한계로 삼아 다시 탐색한다.

유한 분기와 양의 이동 비용 하한을 전제로, h가 남은 비용을 과대평가하지 않고 목표에서 0이면 최적 비용을 건너뛰지 않는다. 한계 검사를 통과한 목표를 찾을 때 종료한다. 같은 경로의 순환을 제거하되 최적 경로까지 잘라내는 임의 가지치기는 하지 않는다.

현재 경로와 탐색 상태만 보관하는 IDA*는 고정 분기 수에서 탐색 깊이에 비례하는 메모리를 쓴다. 별도 패턴 표와 중복 상태 캐시를 추가하면 그 공간도 계산해야 한다. 앞선 반복의 노드를 다시 만드는 비용이 있고, 비용 한계가 조금씩 늘면서 탐색량은 거의 늘지 않는 문제에서는 반복 비용이 커질 수 있다.

## 패턴 데이터베이스: 부분 문제의 정확한 거리

조각 일부만 남긴 완화 문제의 최단 거리는 전체 문제의 최단 거리보다 크지 않다. 목표에서 역방향 BFS를 수행해 부분 상태의 거리를 미리 저장하고, 탐색 중 표를 조회해 h로 사용한다. 아래는 Korf의 1997년 큐브 실험 구성이다.

| 부분 문제 | 항목 수 | 항목당 저장량 |
| --- | --- | --- |
| 꼭짓점 조각 8개 | `8! × 3^7 = 88,179,840` | 4비트 |
| 모서리 조각 6개 | `12!/6! × 2^6 = 42,577,920` | 4비트 |
| 나머지 모서리 조각 6개 | 42,577,920 | 4비트 |

세 표의 최댓값을 h로 쓴다. 각 값이 하한이면 최댓값도 하한이다. 한 회전이 여러 부분 문제를 함께 해결할 수 있으므로 단순 합은 이동 비용을 중복 계산할 수 있다. 이 구성의 합계는 86,667,840바이트, 약 82.65 MiB다(항목 수와 4비트에서 계산). 탐색 스택과 별도의 저장 비용이다.

표를 크게 만들면 사전 계산과 메모리 비용이 늘어난다. 더 강한 하한이 탐색량을 줄일 수 있지만 실제 이득은 문제 분포와 조회 비용을 함께 측정한다.

## Kociemba 2단계 탐색

빠르게 짧은 해를 구하려면 먼저 다루기 쉬운 부분군으로 이동한 뒤 그 안에서 푸는 방법을 사용할 수 있다.

1. 1단계: `G1 = <U, D, R2, L2, F2, B2>`에 진입한다. 완성 상태에서 위아래 면 회전과 나머지 면의 반 바퀴 회전으로 도달하는 부분군이다. 꼭짓점과 모서리 방향을 맞추고, 가운데 층 모서리 4개를 그 층에 배치한다.
2. 2단계: G1의 이동만 사용해 각 조각의 순열을 맞춘다.

IDA*와 하한 표를 사용하고, 첫 해 이후에도 다른 1단계 경로에서 2단계를 시도해 전체 길이를 줄인다. 1단계만 짧게 만드는 것이 전체 최적화와 같지는 않다. 예를 들어 10+12수보다 11+5수가 짧다.

Kociemba의 설명에 나온 구현은 G1에 들어갔다가 다시 나오는 일부 최적 경로를 탐색하지 않는다. 따라서 짧은 해를 얻었다는 사실과 최적성을 증명했다는 사실을 구분한다. 최적성 증명에는 별도 최적 탐색이 필요하다.

공개 Python 구현의 `solve(cubestring, 19, 2)`는 목표 길이 19수와 시간 한도 2초를 받는다. 시간 한도에 도달하면 목표 길이를 넘더라도 찾은 해 중 가장 짧은 것을 반환할 수 있다. 목표 길이를 모든 입력의 보장으로 해석하지 않는다(2026-10-26 README 확인, 로컬 실행 미검증).

## 로봇 기록과 탐색 성능의 구분

2026-10-26 Guinness 기록 페이지 확인 기준, 가장 빨리 퍼즐 큐브를 푼 로봇의 기록은 2025-04-21 세운 0.103초다. 이 기록만으로 IDA*나 Kociemba 알고리즘을 썼다고 추정할 수 없다. 풀이 수, 해를 찾는 계산 시간과 기계의 회전 시간을 구분해 비교한다.

## 선택과 이해 확인

| 선택 | 장점 | 비용과 조건 |
| --- | --- | --- |
| A* | 최저 f 후보를 우선 탐색 | frontier와 방문 상태를 저장. consistent h를 쓰는 일반 graph search에서는 확정 상태를 다시 확장할 필요가 없음 |
| IDA* | 작은 탐색 메모리 | 반복 탐색 비용, 별도 표 공간 |
| 패턴 데이터베이스 | 부분 문제의 정확한 하한 재사용 | 사전 계산과 저장 공간, 비용 정의 일치 |
| 2단계 탐색 | 제한된 시간에 짧은 해 탐색 | 일부 최적 경로 제외, 최적성 별도 증명 |

- 패턴 표 두 값을 더하면 왜 하한이 깨질 수 있는가?
- IDA*의 탐색 메모리와 표 메모리는 어떻게 다른가?
- 이동 수가 적은 해가 로봇에서도 가장 빠른지 판단하려면 무엇을 측정해야 하는가?

## 출처

- [Finding Optimal Solutions to Rubik's Cube Using Pattern Databases — AAAI-97, Richard E. Korf](https://cdn.aaai.org/AAAI/1997/AAAI97-109.pdf)
- [Depth-First Iterative-Deepening: An Optimal Admissible Tree Search — Artificial Intelligence, Richard E. Korf](https://cse.sc.edu/~mgv/csce580f11/gradPres/korf_IDAStar_1985.pdf)
- [God's Number is 20 — cube20.org, Tomas Rokicki 외](https://www.cube20.org/)
- [God's Number is 26 in the Quarter-Turn Metric — cube20.org, Tomas Rokicki 외](https://www.cube20.org/qtm/)
- [The Two-Phase-Algorithm — Herbert Kociemba](https://kociemba.org/twophase.htm)
- [RubiksCube-TwophaseSolver — GitHub, Herbert Kociemba](https://github.com/hkociemba/RubiksCube-TwophaseSolver)
- [Fastest robot to solve a puzzle cube — Guinness World Records](https://www.guinnessworldrecords.com/world-records/fastest-robot-to-solve-a-rubiks-cube)
- [큐브 공식은 사실 더 느리다?? — YouTube, 조코딩 JoCoding](https://www.youtube.com/watch?v=dqZQf-AQk6s) — 학습 계기. 탐색 방식과 기록 수치는 위 1차 출처로 대조

## 관련 문서

- [[Graph-Traversal-and-Shortest-Path-Variants|최단 경로 변형 패턴]] — A*와 admissible, consistent heuristic
- [[Exhaustive-Search-and-Backtracking|상태 공간 탐색]] — 상태 BFS와 백트래킹
- [[Adversarial-Search|적대적 탐색]] — 깊이 제한과 반복 심화
- [[Graph-Algorithms-and-Optimization|그래프 알고리즘 인덱스]]
