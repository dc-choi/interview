---
tags: [palantir, pilot, agent, react, seed-data]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pilot 생성 앱과 seed data의 경계"]
---

# 생성 앱과 seed data의 경계

Pilot은 요구에서 Ontology, design specification과 React OSDK 앱을 만드는 개발 workflow다. 2026년 3월 beta 도입 계약이며 생성된 앱의 업무 정확성, 인가와 배포 성공을 직접 시험한 기록은 아니다.

## 생성 단계마다 다른 계약을 검토한다

Ontology builder는 object/action/link를 구성하고 Designer는 layout/typography/form과 interaction spec을 만든다. App builder는 OSDK hook, data loading과 Action form을 구현한다. Structured task와 live preview는 변경을 추적하는 표면이며 모델링의 적합성과 서버 submission criteria를 자동 보증하지 않는다.

Seed data는 격리 container의 local datastore에 있어 production 데이터를 바꾸지 않고 조작을 시험하는 경로다. 가상 사례가 통과해도 실제 데이터의 null/권한/동시성/규모 조건을 검증한 것은 아니다. 가상 데이터를 실제 관측이나 운영 label과 구분한다.

## Preview에서 release로 넘긴다

Guided deploy는 Foundry Branching의 Ontology 변경, Developer Console app, CI check와 release tag를 거쳐 subdomain에 hosting하는 단계다. Preview 표시, branch merge와 실제 사용자에게 열린 site를 각각 확인한다. Environment 치환과 Ontology API-name 충돌, OAuth redirect와 CSP도 설치 target에서 검증한다.

Builder의 수동 table LLM 생성도 notional data를 만드는 별도 경로다. 2026년 3월에는 다른 column을 prompt에서 참조하고 10행 preview, column lock으로 재생성 범위를 제어했다. Lock은 현재 값을 보존하는 옵션이며 합성값의 정확성 인증이나 production write 차단 정책이 아니다.

## 출처

- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)

## 관련 문서

- [[Palantir-AI-FDE-and-Skills|개발 agent의 승인과 문맥]]
- [[Palantir-Branching-and-Packaging-Boundaries|배포와 환경 mapping]]
- [[Palantir-Workshop-Applications|상태와 Action 인가]]
