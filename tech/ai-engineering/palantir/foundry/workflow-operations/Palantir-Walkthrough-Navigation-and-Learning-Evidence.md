---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Walkthrough 탐색과 학습 증거"]
---

# Walkthrough 탐색과 학습 증거

## Resource 연결과 권한

Walkthrough는 여러 앱에 걸친 단계별 안내다. Resource Viewer 접근이 필요하며 연결된 리소스 권한이 없으면 해당 대상으로 안내하지 않고 접근 부족 메시지를 보여 준다. Project Editor는 그 project에 walkthrough를 만들 수 있지만 안내를 게시한다고 참조 리소스를 공유하지는 않는다.

Sidebar에는 직접 참조한 resource의 walkthrough만 나타나며 embedded resource에 자동 전파되지 않는다. Carbon workspace를 primary로 참조하고 내부 module을 secondary로 넣는 방식으로 배포 경계를 명시한다. Workshop highlight는 top-level widget만 지원하며 개별 button/tab 같은 subcomponent는 지원하지 않는다.

Multiple-resource type은 각 step의 primary resource로 이동한다. Single-resource type은 같은 앱에 머물고 URL suffix가 있는 step 외에는 자동이동하지 않으며 Files/secondary resource를 사용자에게 숨긴다. Type 전환 시 primary가 달라질 수 있어 각 step의 target을 다시 확인한다. Secondary가 숨겨져도 embedding/highlighting 설정에는 쓰일 수 있다.

## 저장, 발행과 측정

Preview는 editor 변경을 실시간 반영하며 Save와 Publish는 다른 단계다. 본문은 CommonMark 일부만 지원해 다른 Foundry 앱의 Markdown 기능과 동일하지 않다. AIP 번역은 제안이며 언어별 의미 정확성을 별도 확인한다.

Aggregate metrics는 항상 제공되지만 metrics tab은 walkthrough Owner만 볼 수 있다. 개인별 progress는 별도로 Enable user metric collection을 켜야 수집하며 사용자는 확인 dialog를 본다. Checkpoint는 그 내용을 조정한다. 단계를 지나갔다는 기록은 실제 이해/권한 적합성/업무 수행 능력의 증거가 아니다.

개인별 수집은 민감한 사용 기록을 만들 수 있어 목적상 필요성과 접근 제한을 먼저 정하라는 공식 문서의 조건을 유지한다. 실제 tracking 활성화나 walkthrough 생성/발행은 하지 않았다.

## 출처

- [Palantir walkthroughs, walkthroughs](https://www.palantir.com/docs/foundry/walkthroughs)
- [Palantir walkthroughs, create-a-walkthrough](https://www.palantir.com/docs/foundry/walkthroughs/create-a-walkthrough)
- [Palantir walkthroughs, overview](https://www.palantir.com/docs/foundry/walkthroughs/overview)
- [Palantir walkthroughs, walkthrough-metrics](https://www.palantir.com/docs/foundry/walkthroughs/walkthrough-metrics)
- [Palantir walkthroughs, walkthrough-types](https://www.palantir.com/docs/foundry/walkthroughs/walkthrough-types)
- [Palantir walkthroughs, workshop-integration](https://www.palantir.com/docs/foundry/walkthroughs/workshop-integration)

## 관련 문서

- [[Palantir-Workflow-Operations]]
