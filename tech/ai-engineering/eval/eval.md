---
tags: [ai, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM 평가, 신뢰성", "LLM Eval & Reliability"]
---

# LLM 평가, 신뢰성, 캘리브레이션

LLM 출력의 평가와 모른다고 말하는 능력 — 신뢰할 수 있는 AI 시스템의 검증 축. 평가 철학에서 시작해 개발 프로세스(EDD), 채점 장치(루브릭과 게이트), 데이터셋과 배포 관문으로 내려간다. 상위: [[AI엔지니어링(AIEngineering)|AI 시대 엔지니어링]].

## 목차
- [x] [[LLM-Eval-Strategy|LLM 평가 전략 (Pass@k, 성능 비고정성, Multi-gate 데이터 품질, CSAT vs 사실정확도)]]
- [x] [[LLM-Abstention|LLM Abstention (모른다고 말하는 능력, 정확도와 독립, alignment 재설계)]]
- [x] [[Evaluation-Driven-Development|평가 주도 개발 EDD (Generator와 Evaluator 두 축, Eval과 테스트의 차이, 성숙도 Lv.0에서 Lv.5, 하네스 부품의 승격, 회귀와 이행과 품질 순서)]]
- [x] [[Eval-Rubric-and-Score-Gate|루브릭과 점수 게이트 (채점기 3종, 결정론과 LLM-as-Judge와 사람의 3층, 규칙의 결정론 번역, 거부권 배점, 미달 항목 루프와 3중 안전장치, 완료 선언 차단과 fail-closed, 점수 의심 순서)]]
- [x] [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문 (프롬프트와 Eval의 앞뒷면, 실패 20~50건으로 시작, 베이스라인과 표류, 배포 세 관문과 카나리, 가드레일 회귀, promptfoo, 안티패턴 5)]]
