---
tags: [ai, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM 평가, 신뢰성", "LLM Eval & Reliability"]
---

# AI 모델 평가, 신뢰성, 캘리브레이션

LLM 출력의 평가와 모른다고 말하는 능력, 비전 모델의 합성 데이터와 관측 피드백을 다룬다. 평가 철학에서 시작해 개발 프로세스(EDD), 채점 장치(루브릭과 게이트, LLM 판정기), 데이터셋과 배포 관문, 배포 뒤 서빙 모델 감시로 내려간다. 상위: [[AI엔지니어링(AIEngineering)|AI 시대 엔지니어링]].

## 목차
- [x] [[AI-Consciousness-Evidence|AI 의식의 증거]] — 자기보고와 행동, 내부 구조 지표와 기능 검증의 구분
- [x] [[Benchmark-Coverage-and-Workplace-Performance|벤치마크 평가 범위와 업무 성과]] — 과업 매핑, 모델 점수와 사람의 완료 결과, 표본 선택과 위임 측정의 구분
- [x] [[Synthetic-Vision-Data-Evaluation|합성 비전 데이터 평가]] — 생성과 인식 모델의 분리, 라벨 검수와 실제 데이터 평가
- [x] [[Model-Feedback-Loop-and-Validation|모델 피드백 루프와 검증]] — 실험 결과 환류, shadow 비교와 실제 행동의 구분
- [x] [[LLM-Sycophancy-Evaluation|LLM 아첨 편향 평가]] — 정답 훼손, 정정 수용과 선호만 바꾼 쌍 비교
- [x] [[Review-Moderation-Pipeline|리뷰 검수 자동화]] — 정책별 판정, 정밀도와 재현율, 사람 재검토와 결과 버전
- [x] [[LLM-Eval-Strategy|LLM 평가 전략 (Pass@k, 성능 비고정성, Multi-gate 데이터 품질, CSAT vs 사실정확도)]]
- [x] [[LLM-Abstention|LLM Abstention (모른다고 말하는 능력, 정확도와 독립, AbstentionBench의 세 결과, 이진 채점이 추측을 보상, 확신 목표와 behavioral calibration, 과잉 거부, needs_review, alignment 재설계)]]
- [x] [[LLM-Hallucination-Verification|LLM 환각 유형과 검증 (사실성과 충실성 두 축, 사전학습과 채점의 원인, Chain-of-Verification 변형과 한계, 설명은 증거가 아니다, 행동 주장과 실행 기록, 규칙은 코드로, 인용의 존재와 적용과 지지 검사, 평가 사례)]]
- [x] [[Evaluation-Driven-Development|평가 주도 개발 EDD (Generator와 Evaluator 두 축, Eval과 테스트의 차이, 성숙도 Lv.0에서 Lv.5, 하네스 부품의 승격, 회귀와 이행과 품질 순서, 실행 기록과 최종 결과 대조, GEPA 개선 후보 평가)]]
- [x] [[Eval-Rubric-and-Score-Gate|루브릭과 점수 게이트 (채점기 3종, 결정론과 LLM-as-Judge와 사람의 3층, 규칙의 결정론 번역, 거부권 배점, 미달 항목 루프와 3중 안전장치, 실행 불가 판정과 중단 출구, 완료 선언 차단과 fail-closed, 점수 의심 순서)]]
- [x] [[Eval-LLM-Judge|LLM 판정기 LLM-as-a-Judge (참조 기반 지표의 한계, 판정 입력과 출력, 판정 방식 넷, 위치와 장황함과 자기 선호 편향, 사람 라벨 교정과 kappa, 판정기 교체와 grader hacking)]]
- [x] [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문 (프롬프트와 Eval의 앞뒷면, 실패 20~50건으로 시작, 문항 구성과 홀드아웃, 베이스라인과 표류, 배포 세 관문과 카나리, 가드레일 회귀, promptfoo, 안티패턴 5)]]
- [x] [[Eval-Model-Drift-Monitoring|서빙 모델 드리프트 감시 (같은 이름 아래 바뀌는 네 층, 스냅샷 고정이 막는 것과 못 막는 것, 동결 기준점과 정답률, 토큰, 비용의 분리 판정, 반복과 연속 확인 경보, 공개 추적 보드 읽는 법, 경보 시 원인 분리 순서)]]
- [x] [[Agent-Recovery-Evaluation|에이전트 복구 평가]] — 같은 상태에서 가른 복구와 무복구 갈래, 구제와 훼손 4분류, 순효과, 훼손 가중 개입 규칙
- [x] [[AI-Research-Innovation-Evaluation|AI 연구와 알고리듬 혁신 평가]] — InnovationEval의 기준선, 계산 예산과 연구 신규성, 연구 에이전트 산출물의 주장 원장, 단계별 재검증과 적대적 검토
- [x] [[Neural-Circuit-Interpretability|뉴런과 회로 해석]] — 원래 좌표 해석 가설, 관찰과 인과 개입의 구분
