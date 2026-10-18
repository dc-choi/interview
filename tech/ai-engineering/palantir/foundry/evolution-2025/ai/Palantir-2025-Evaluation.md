---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 AIP Evals의 관찰 단위와 실패 분석

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 최종 답변만 평가할 때 놓치는 것

- 2월 25일 Logic block 출력을 intermediate parameter로 노출해 평가하거나 관찰할 수 있게 했다. 결과 dataset 자동 쓰기는 **project-scoped execution mode**에서 설정한 dataset으로 실행한다.
- 2월 26일 object set test case에 linked object type 입력을 추가했다. 7월에는 여러 object set과 수동 test case를 결합하고 static column을 둘 수 있게 됐다.
- 8월 6일 linked property 지원은 OSv2에 한정됐고 linked object set에서 가져오는 값은 최대 100개였다. 전체 연결 그래프가 자동 test case가 된다는 뜻이 아니다.
- 6월 19일 metric objective는 Boolean의 기대 true/false, 수치 방향과 선택 임계값을 정의했다. 이는 평가 통과 기준이며 그 자체가 배포를 차단하는 gate는 아니다.
- 8월에는 상태/metric 필터, 10월에는 debug string output과 평가 metric을 분리한 표시, run 비교의 scroll lock과 test selector가 추가됐다.
- 11월 12일 optional undefined metric은 No Value로 표시하고 aggregate 계산에서 제외한다. 0점과 동일시하지 않는다.

## 생성, 실험과 분석의 다른 역할

- 9월 11일 Logic 기반 evaluation 생성 베타는 test case와 evaluator 초안을 만들었다. 9월 29일 관련 객체 범위가 IO 외 참조 객체까지 확대됐다. 생성 결과는 수정하고 다시 실행해야 하며 품질 검증 완료를 뜻하지 않는다.
- 10월 8일 Marketplace evaluator는 먼저 설치한 다음 suite 생성에 사용한다.
- 10월 9일 Experiments는 선택 인자들의 조합마다 별도 run을 만들고 최대 4개를 비교했다. Logic, Agents as Functions와 Functions on Objects를 대상으로 품질, 비용과 지연을 함께 평가한다.
- 11월 5일 Logic과 code Function에서 suite 생성 경로가 추가됐다. 11월 18일 results analyzer는 실패한 단일 run의 test case를 묶어 원인을 찾고 prompt 수정을 제안했다. 당시 Logic 중심이며 agent/FoO 확대는 계획이었다.
- 12월 17일 개별 실패 test에 대한 LLM failure analysis와 모델 선택이 추가됐다. 분석 모델의 설명은 재실행 검증을 대체하지 않는다.

## Debugger 공지의 불일치

10월 1일 기록은 native Evals app debugger 통합을 이미 제공한다고 적지만, 10월 7일 장문은 native Evals debugger를 향후 작업이라고 설명한다. 7일은 Logic/Agent sidebar와 native Logic debugger의 코드, 입력과 reasoning 접근을 설명한다. 두 기록의 날짜와 상충 상태를 유지하며 실제 enrollment 화면의 지원을 별도 확인한다.

새로운 evaluator, intermediate output과 자동 원인 분석은 서로 다른 실패 위치를 드러낸다. test case 입력 권한, 실행 주체, 결과 dataset 권한과 metric 결측 의미를 함께 확인해야 결과를 운영 판단에 재사용할 수 있다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [October 9, 2025, Optimize AI performance and cost with experiments in AIP Evals — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#d16a916b-dbc6-4a50-8093-dc6ff158e043)
- [November 18, 2025, Automated failure analysis and prompt optimization in AIP Evals — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#98991908-08d5-4091-ac75-4bcd13a3c873)
- [October 7, 2025, Debug view for AIP Evals now available in AIP Logic and Agent Studio sidebars — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#5e6667ef6215dc81fa5cca2a5c6cb20f6a5699b71596084a9f95dfb20410d456)
- [September 11, 2025, Automatically generate test cases and evaluators for AIP Logic functions — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#ea40c532-78cb-4017-b365-af2a9ff03b53)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-2025-Agent-State]]
