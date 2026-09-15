---
tags: [ai, agent, spec, guardrails, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Instruction Design", "에이전트 지시 설계"]
---

# 에이전트 지시 설계

코딩 에이전트에게 무엇을, 어디까지, 어떻게 만들게 할지 지시로 고정하는 설계 — 스펙 6대 영역, 행동 교정 4원칙, YAGNI 사다리 주입, 검증 행동 교정. 상위: [[agent|에이전트 심화]].

- [[Agent-Spec-Writing|에이전트 스펙 작성법]]: 6대 영역, 지시의 저주, Always/Ask/Never 3단계 경계, 숨은 결정 축 인터뷰, LLM-as-a-Judge
- [[Agent-Coding-Guardrails|LLM 코딩 가드레일]]: 실패 패턴과 교정 4원칙 — 가정 표면화, 최소 코드, 수술적 변경, 성공 기준 검증 루프, 우회 처방 경계, CLAUDE.md와 스킬, Cursor rule 주입
- [[Agent-Overengineering-Guard|에이전트 과잉설계 방지]]: YAGNI 사다리 7칸, 게으름 vs 태만, 안전 100% 유지, 상시 룰셋 주입, 다중 에이전트 이식성
- [[Agent-Test-Verification-Behavior|에이전트 검증 행동]]: 기법 이름 지시는 행동을 바꾸지 않음, 자기 작성 테스트의 대칭 입력과 출력 박제, 효과 있는 것과 없는 것, 스킬 비용의 곱셈, 행동 교정 스킬 5원칙, 벤치마크 방법론 주의

## 함께 볼 문서

- [[agent|에이전트 심화]]
