---
tags: [senior, product, design, collaboration, figma, handoff, ssot]
status: done
verified_at: 2026-08-04
category: "Senior - 커뮤니케이션"
aliases: ["Product Design Workflow", "Design Handoff", "프로덕트 디자인 핸드오프", "Figma SSOT"]
---

# 프로덕트 디자인 워크플로와 개발 핸드오프

좋은 디자인 프로세스는 Figma file 구조가 아니라 **문제 정의부터 출시 검증까지 정보가 손실되지 않는 협업 계약**이다. 조직, 제품 위험과 팀 역량이 바뀌면 프로세스도 달라져야 하며, 도구는 그 계약을 보이게 만드는 수단이다.

## 프로세스는 단계보다 feedback loop다

| 구간 | 핵심 질문 | 최소 산출물 | 다음 구간 진입 조건 |
|---|---|---|---|
| Framing, kickoff | 누구의 어떤 문제를 왜 지금 푸는가 | 문제, 목표, metric, scope, DRI | 이해관계자가 성공과 제외 범위에 합의 |
| Discovery, ideation | 어떤 근거와 대안이 있는가 | research evidence, user flow, option과 tradeoff | 검증할 가설과 선택 이유가 있음 |
| Detail, review | 정상과 예외에서 어떻게 동작하는가 | prototype, 상태별 화면, copy, open issue | 정책과 기술 제약의 미결 사항이 보임 |
| Handoff, implementation | 무엇이 구현 준비 상태인가 | acceptance criteria, annotation, asset, contract link | owner가 ready 상태와 version을 확인 |
| Release, learning | 실제로 문제를 풀었는가 | rollout 상태, metric, feedback, follow-up | 유지, 반복, rollback 결정 |

직선으로 한 번만 흐르지 않는다. 개발 중 발견된 기술 제약은 detail로, 사용자 관찰은 discovery로 돌아간다. 변경을 실패로 보지 말고 **누가 상태를 바꾸고 영향을 통지하는지**를 정한다.

## 조직 형태는 숫자로 결정하지 않는다

기능 조직은 전문성 표준화와 사람의 성장에 유리하고, cross-functional squad는 목표별 의사결정과 feedback을 가까이 둔다. 회사 인원 수만으로 어느 구조가 맞는다고 정할 수 없다.

- 제품 영역 사이 의존성과 공유 platform의 비중
- 목표와 metric을 독립적으로 소유할 수 있는 정도
- designer, engineer, analyst 같은 희소 역량의 분포
- 일관된 design system과 engineering standard를 유지할 장치
- 팀을 자주 재편할 때 생기는 context 손실

matrix나 chapter/guild를 섞는 hybrid 구조도 가능하다. 중요한 것은 보고선 이름이 아니라 **결정권, 의존성 조정, 품질 기준과 성과 책임이 명확한가**다.

모두가 ownership을 가진다는 말도 최종 결정권자가 없다는 뜻은 아니다. 각 결과물마다 DRI, approver, consulted, informed를 구분하고 충돌 시 결정 시한과 escalation 경로를 둔다.

## SSOT는 한 도구가 아니라 출처 계약이다

모든 정보를 Figma에 복사하면 Figma와 code, analytics, API 문서 중 무엇이 최신인지 다시 모호해진다. artifact마다 authoritative source를 하나 정하고 **project index가 그 출처를 연결**하게 한다.

| 정보 | 권장 authoritative source 예시 |
|---|---|
| 문제, 목표, scope, metric | PRD 또는 project brief |
| 화면, interaction, design state | Figma design file |
| API와 event contract | versioned schema, API documentation |
| 구현 동작 | code와 automated test |
| 일정, owner, 진행 상태 | issue tracker |
| 실제 성과 | analytics/dashboard |
| 결정 이유 | decision log 또는 RFC |

Index에는 owner, 목표, 현재 lifecycle state, authoritative link, last reviewed date와 주요 open issue만 둔다. 같은 본문을 여러 도구에 복제하지 않는다. Figma를 시작 화면으로 써도 다른 출처를 가리키는 hub여야 한다.

## Figma file을 상태가 보이게 구성한다

Figma의 page와 section은 milestone, 탐색안, review 대상, handoff 대상을 구분하는 데 쓸 수 있다. 팀에 맞는 naming convention을 정하되 폴더 구조 자체를 업무 완료 증거로 삼지 않는다.

```text
00 Index, scope, owner, links
10 Discovery, research, rejected options
20 In review
30 Ready for development
40 Released reference
90 Archive
```

- file을 매 변경마다 복제하면 검색과 최신성 판단 비용이 커진다. version history, branch, milestone copy 중 변경 규모와 plan에 맞는 방식을 선택한다.
- 탐색안과 출시 기준 master를 분리하고, master에는 실제 release된 상태만 반영한다.
- frame과 section에 stable 이름과 issue link를 붙여 design, ticket, code를 추적한다.
- branch와 Dev Mode status는 plan과 seat에 따라 제공 범위가 다르므로 workflow가 특정 유료 기능에만 의존하지 않게 한다.

## Ready for development 계약

Dev Mode는 간격, 속성, asset, component와 annotation을 보여 주지만 제품 명세 전체를 대신하지 않는다. 다음 항목을 함께 확인한다.

- **범위**: 이번 release에 포함/제외되는 flow와 platform
- **상태**: loading, empty, error, disabled, permission denied, partial success
- **전이**: 진입 조건, 뒤로 가기, 취소, 중복 제출, 새로 고침과 deep link
- **반응형**: breakpoint, 긴 text, locale, 작은/큰 data set
- **접근성**: semantic role, keyboard/focus order, label, contrast와 motion 대안
- **copy**: 확정 문구와 localization owner
- **데이터**: field source, validation, API/event contract, 개인정보와 보존 경계
- **관측**: analytics event, 성공 metric, 오류와 rollout 확인법
- **승인**: design version, DRI, ready 시각, 남은 open issue와 변경 알림 방식

개발자가 반복해서 묻는 질문을 case로 기록하면 handoff template의 빠진 상태를 찾을 수 있다. 질문 수를 사람 평가에 쓰지 말고 누락 유형, 재작업 시간과 defect로 개선 효과를 본다.

## Design system은 제한 목록이 아니라 product다

Design system은 color와 component library만이 아니라 principle, token, pattern, accessibility rule, documentation, code counterpart와 contribution process를 포함한다.

1. 현재 design과 code를 함께 audit한다.
2. 반복 문제와 목표를 정하고 작은 foundation/component부터 시작한다.
3. design component와 code component의 이름, state, property를 mapping한다.
4. exception을 무조건 금지하지 않고 사용 사례와 승인 근거를 기록한다.
5. adoption, override, accessibility defect, update lead time을 보며 개선한다.

강한 제약은 일관성을 높이지만 새로운 product need를 막을 수 있다. 반대로 자유로운 override는 system을 무력화한다. 기본 경로는 쉽게, 예외 경로는 명시적 review와 환류가 가능하게 만든다.

## Review와 rollout

- design review는 시각적 취향보다 문제, 사용자 flow, 접근성, 기술 제약과 metric을 기준으로 한다.
- 가벼운 office hour는 빠른 feedback에, 기록이 필요한 decision review는 비동기 문서와 decision log에 적합하다.
- 구현 중 design 변경은 silently overwrite하지 않고 영향 issue와 owner에게 통지한다.
- 배포 뒤 실제 metric과 support feedback을 확인하고 `released`, `iterate`, `rollback` 중 상태를 고른다.
- 회고 action에는 owner와 due date를 붙인다. 구조가 완벽해지는 것이 아니라 반복 비용이 줄어드는지 본다.

## 교정해야 할 단정

- 특정 인원 수가 기능 조직과 squad의 정답을 결정하지 않는다.
- one-pager는 유용한 형식이지 전 세계 공통 표준이 아니다.
- Figma 하나에 모든 문서를 넣는 것이 SSOT의 조건은 아니다.
- file 복제는 history를 남기는 유일한 방법이 아니다.
- Dev Mode가 behavior, error state와 acceptance criteria를 자동 완성하지 않는다.
- design system을 강하게 제한하는 것이 모든 규모에서 품질을 보장하지 않는다.

## 면접 체크포인트

- handoff를 파일 전달이 아니라 ready 조건과 변경 계약으로 설명한다.
- SSOT를 single tool이 아닌 artifact별 authority와 index로 설계한다.
- designer와 engineer가 design system을 공동 product로 운영하는 방식을 말한다.
- 조직 구조는 규모보다 dependency, decision latency와 전문성 공유로 판단한다.
- 개발 중 변경과 출시 후 학습이 앞 단계로 돌아가는 loop를 설명한다.

## 출처

- [Figma, Guide to Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode)
- [Figma, Explore design files](https://help.figma.com/hc/en-us/articles/15297425105303-Explore-design-files)
- [Figma, Welcome to design systems](https://help.figma.com/hc/en-us/articles/14552802134807-Lesson-1-Welcome-to-design-systems)
- [Figma, Build a design system](https://www.figma.com/blog/design-systems-102-how-to-build-your-design-system/)
- [인프런, 디자이너에게 구조가 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329388)
- [인프런, 프로덕트 조직의 구조](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329391)
- [인프런, SSOT와 Figma 중심 구조](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329389)
- [인프런, 디자인 프로세스 구조화](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329387)
- [인프런, 디자인 프로세스 Q&A](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329390)

## 관련 문서

- [[Cross-Functional-Product-Collaboration|직군 간 프로덕트 협업]]
- [[RFC-Writing|RFC와 PRD 작성]]
- [[Project-Management|프로젝트 관리]]
- [[Inclusive-Design-Principles|포용적 디자인 원칙]]
- [[Code-Review-Culture|코드 리뷰 문화]]
