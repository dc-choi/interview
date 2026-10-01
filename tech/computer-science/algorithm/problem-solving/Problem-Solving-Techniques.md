---
tags: [cs, algorithm, coding-test, problem-solving]
status: index
category: "CS - 알고리즘"
aliases: ["Problem Solving Techniques", "코딩 테스트 문제 해결 기법"]
---

# 코딩 테스트 문제 해결 기법

문제 해결 기법은 이름으로 고르는 것이 아니라 입력 제약과 상태 전이의 성질로 고른다. 먼저 단순한 풀이를 세우고 병목을 찾은 다음, 반복 계산이나 탐색 범위를 줄이는 구조를 적용한다.

## 목차

- [x] [[Prefix-Sum-and-Range-Queries|누적합과 구간 질의]]
- [x] [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]
- [x] [[Greedy-Sweep-and-Two-Pointers|Greedy, line sweep와 two pointers]]
- [x] [[Binary-Search-and-LIS|이분탐색, 매개변수 탐색과 LIS]]
- [x] [[Fenwick-Tree|Fenwick tree]]
- [x] [[Simulation-Implementation|시뮬레이션과 구현 (진법 열거, 배열 회전과 전치, 동시 갱신, 방향과 상태 인코딩)]]
- [x] [[String-Matching-KMP|문자열 매칭과 KMP (실패 함수)]]
- [x] [[Number-Theory-Basics|정수론 기초 (소수, 체, 팩토리얼의 소인수, 최대공약수, 나머지 연산, 연립합동방정식, 이항계수)]]

## 선택 질문

| 관찰 | 우선 검토 |
|---|---|
| 같은 구간 합을 반복해서 묻고 값이 거의 안 바뀜 | prefix sum |
| 가능한 상태 수가 작고 모든 답을 확인해야 함 | exhaustive search |
| 일부 선택을 버려도 최적해가 보존됨을 증명 가능 | greedy |
| event 좌표만 중요하고 좌표 범위가 큼 | line sweep |
| pointer 이동 방향이 되돌아가지 않음 | two pointers |
| 답에 대한 판정이 단조로움 | parametric search |
| point update와 prefix/range sum이 반복됨 | Fenwick tree |
| 규칙은 명확하지만 구현이 길고 독립 선택의 조합을 모두 봐야 함 | simulation, 진법 열거 |
| 같은 시각에 여러 칸이 바뀌거나 방향만 다른 같은 규칙이 반복됨 | simulation (temp 반영, 판 회전과 전치) |
| 요청 순서 전체를 알고 교체 횟수를 줄임 | greedy (다음 사용이 가장 먼 항목 교체) |
| 긴 텍스트에서 패턴 위치를 최악 보장으로 찾음 | KMP |
| 소수, 약수, 나머지, 경우의 수를 다룸 | 정수론 기초 (√n 경계, 체, 유클리드 호제법) |

## 관련 문서

- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Algorithm-Practice|문제풀이 루프와 반례]]
- [[Algorithm-Complexity|복잡도 분석]]
- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]
- [[Algorithm-DP|동적 프로그래밍]]
