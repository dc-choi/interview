---
tags: [cs, algorithm, game-ai, scheduling]
status: done
category: "CS - 알고리즘"
aliases: ["NPC 공격 스케줄링", "NPC Attack Scheduling", "Belgian AI"]
---

# NPC 공격 스케줄링

실시간 전투에서 접근할 적과 실행할 공격을 예산으로 조절한다. 적의 수만 제한하면 공격 강도의 차이를 반영하기 어렵다.

## 접근과 공격 예산을 나눈다

Game AI Pro 28장의 Belgian AI 사례에서는 중앙 stage manager가 위치와 허가를 관리한다.

| 예산 | 소비 단위 | 역할 |
| --- | --- | --- |
| Grid capacity | 적별 grid weight | 접근 가능한 적의 조합 제한 |
| Attack capacity | 공격별 attack weight | 동시에 실행할 공격의 조합 제한 |

접근 예산 12를 가중치 4의 병사와 8의 트롤이 채우면 추가 병사는 기다린다. 공격 예산 10에서 돌진이 6을 쓰면 병사는 비용 5의 찌르기 대신 3의 휘두르기를 선택한다. 두 판정은 별개다.

## 위치와 허가 수명을 함께 관리한다

- 접근 원과 공격 원을 나눠 즉시 위협인 적을 드러낸다.
- 자리를 반환해 공격 기회를 순환시키되, 실행 중인 공격의 배정은 보호한다.
- 같은 공격의 집중은 개별, 적 종류별, 전역 쿨다운으로 추가 제한한다.

## 적용할 때 확인할 것

예산을 높이면 허용 조합이 달라진다. 모든 게임의 표준은 아니며 실제 난이도는 플레이로 검증한다. 구현 점검 제안: 취소와 사망 때 예산 누수와 중복 반환을 검사한다.

## 출처

- [Beyond the Kung-Fu Circle: A Flexible System for Managing NPC Attacks — Game AI Pro, Michael Dawe](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter28_Beyond_the_Kung-Fu_Circle_A_Flexible_System_for_Managing_NPC_Attacks.pdf) — 28.3~28.6의 사례 설명을 2026-11-04 대조

## 관련 문서

- [[Adversarial-Search|게임 상태의 적대적 탐색]]
- [[Constraint-Based-Resource-Placement|제약 기반 자원 배치]]
