---
tags: [senior, product, design, collaboration, figma, handoff, ssot]
status: done
verified_at: 2026-09-30
category: "Senior - 커뮤니케이션"
aliases: ["Product Design Workflow", "Design Handoff", "프로덕트 디자인 핸드오프", "Figma SSOT"]
---

# 프로덕트 디자인 워크플로와 개발 핸드오프

좋은 디자인 프로세스는 Figma file 구조가 아니라 **문제 정의부터 출시 검증까지 정보가 손실되지 않는 협업 계약**이다. 조직, 제품 위험과 팀 역량이 바뀌면 프로세스도 달라져야 하며, 도구는 그 계약을 보이게 만드는 수단이다.

마찰이 어느 체계의 빈틈에서 오는지와 조직 형태, 업무 루프, 오너십 범위의 판단은 [[Product-Design-Workflow-and-Handoff-Organization|프로덕트 조직 구조와 업무 루프]], 단계별 산출물과 판단 규칙은 [[Product-Design-Workflow-and-Handoff-Stages|디자인 단계별 산출물]]에서 다룬다.

## 프로세스는 단계보다 feedback loop다

| 구간 | 핵심 질문 | 최소 산출물 | 다음 구간 진입 조건 |
|---|---|---|---|
| Framing, kickoff | 누구의 어떤 문제를 왜 지금 푸는가 | 문제, 목표, metric, scope, DRI | 이해관계자가 성공과 제외 범위에 합의 |
| Discovery, ideation | 어떤 근거와 대안이 있는가 | research evidence, user flow, option과 tradeoff | 검증할 가설과 선택 이유가 있음 |
| Detail, review | 정상과 예외에서 어떻게 동작하는가 | prototype, 상태별 화면, copy, open issue | 정책과 기술 제약의 미결 사항이 보임 |
| Handoff, implementation | 무엇이 구현 준비 상태인가 | acceptance criteria, annotation, asset, contract link | owner가 ready 상태와 version을 확인 |
| Release, learning | 실제로 문제를 풀었는가 | rollout 상태, metric, feedback, follow-up | 유지, 반복, rollback 결정 |

앞의 네 구간은 차례로 왜 하는가(Why), 문제를 어떻게 풀 것인가(How), 결정한 해법이 무엇인가(What), 어떻게 전달할 것인가(How)에 답한다. 킥오프 원페이저, 발산과 수렴, 구현 중 새 아이디어의 처리는 [[Product-Design-Workflow-and-Handoff-Stages|디자인 단계별 산출물]]을 따른다.

직선으로 한 번만 흐르지 않는다. 개발 중 발견된 기술 제약은 detail로, 사용자 관찰은 discovery로 돌아간다. 변경을 실패로 보지 말고 **누가 상태를 바꾸고 영향을 통지하는지**를 정한다.

## 결정권은 결과물마다 정한다

모두가 ownership을 가진다는 말도 최종 결정권자가 없다는 뜻은 아니다. 각 결과물마다 DRI, approver, consulted, informed를 구분하고 충돌 시 결정 시한과 escalation 경로를 둔다. 조직 형태의 판단과 직군별 오너십 범위는 [[Product-Design-Workflow-and-Handoff-Organization|프로덕트 조직 구조와 업무 루프]]에서 다룬다.

## SSOT는 한 도구가 아니라 출처 계약이다

모든 정보를 Figma에 복사하면 Figma와 code, analytics, API 문서 중 무엇이 최신인지 다시 모호해진다. artifact마다 authoritative source를 하나 정하고 **project index가 그 출처를 연결**하게 한다. 출처가 흩어진 채 방치되면 어느 문서가 최신인지 되묻는 확인 대화와 도구 사이의 context switching이 반복되고, 오래된 문서를 근거로 한 재작업이 생긴다.

| 정보 | 권장 authoritative source 예시 |
|---|---|
| 문제, 목표, scope, metric | PRD 또는 project brief |
| 화면, interaction, design state | Figma design file |
| API와 event contract | versioned schema, API documentation |
| 구현 동작 | code와 automated test |
| 일정, owner, 진행 상태 | issue tracker |
| 실제 성과 | analytics/dashboard |
| 결정 이유 | decision log 또는 RFC |

Index에는 역할별 담당자(owner, PM 또는 PO, design, engineering, 분석 담당), 소속 domain이나 squad, 이 프로젝트가 기여하는 Objective와 KR, KR을 움직일 Initiative, 현재 lifecycle state, authoritative link, last reviewed date와 주요 open issue만 둔다. KR은 시작값과 목표값을 함께 적는다([[OKR-Writing#Key Result 작성|OKR 작성법]]). 같은 본문을 여러 도구에 복제하지 않는다.

Hub는 아이디에이션부터 개발 가이드까지 모든 직군이 가장 자주 여는 작업 도구에 둔다. 디자인 중심 조직에서는 Figma가 될 수 있지만 data와 개발 문서처럼 담기 어려운 정보는 원래 출처에 두고 링크한다. Figma를 시작 화면으로 써도 다른 출처를 가리키는 hub여야 한다.

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

- file을 매 변경마다 복제하면 검색과 최신성 판단 비용이 커진다. version history, branch, milestone copy 중 변경 규모와 plan에 맞는 방식을 선택한다. 어느 방식이든 목적은 문제가 생겼을 때 언제 어떤 결정과 화면이 바뀌었는지 역추적하는 것이므로 이전 상태를 기록 없이 덮어쓰지 않는다.
- 탐색안과 출시 기준 master를 분리하고, master에는 실제 release된 상태만 반영한다. master는 서비스 영역(section)별 최신 file 목록으로 구성하고, 갱신할 때마다 언제, 어떤 rollout으로, 누가 바꿨는지 log를 남긴다.
- archive는 domain이나 squad 같은 담당 축, 분기 같은 시간 축으로 자를 수 있다. 팀이 파일을 담당 영역으로 찾는지 시점으로 찾는지에 맞춰 고르고, 운영하며 조정한다.
- frame과 section에 stable 이름과 issue link를 붙여 design, ticket, code를 추적한다.
- branch와 Dev Mode status는 plan과 seat에 따라 제공 범위가 다르므로 workflow가 특정 유료 기능에만 의존하지 않게 한다. Figma Help 기준으로 branch는 Organization과 Enterprise plan의 Full seat, Dev Mode는 유료 plan의 Full 또는 Dev seat이 필요하고, Dev Mode의 Ready for dev status는 Dev Mode가 있는 plan에서, Completed status는 Organization 이상에서 제공된다.

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

전달물은 항목 목록보다 개발자가 한 번에 따라갈 수 있는 묶음으로 만든다.

- 화면 간 흐름(user flow)과 화면 안 정보(기능 명세)를 한곳에 함께 둔다. 둘이 다른 문서에 있으면 version이 어긋난다. user flow 작성 단계는 [[PRD-Writing#유저플로우 (User Flow)|PRD 작성법의 유저플로우]]를 따른다.
- flow chart는 분기가 복잡할 때 이해를 돕는 선택 도구다.
- interaction은 제품 품질을 좌우하지만 정적 명세에 섞으면 읽기 어려워지므로 따로 정리해 링크한다.
- 서비스 전체 flow map은 회원가입, 온보딩처럼 section별로 자르고, 전체 흐름에서 화면 단위까지 깔때기처럼 내려가며 관리한다. 그래야 전체와 세부를 한 번에 오갈 수 있다.
- 명세에는 이번 개발 범위만 담고, 개발에 영향이 없는 참고 화면은 review 때만 표시한다. 오류, 빈 상태와 권한 같은 예외 상태는 범위 안이므로 빼지 않는다.
- 간격과 속성 같은 세부 값은 Dev Mode에서 직접 확인하게 해 별도 spec 문서를 줄일 수 있다. 이때는 개발자에게 Dev Mode를 쓸 seat이 있는지 먼저 확인한다.

개발자가 반복해서 묻는 질문을 case로 기록하면 handoff template의 빠진 상태를 찾을 수 있다. 질문 수를 사람 평가에 쓰지 말고 누락 유형, 재작업 시간과 defect로 개선 효과를 본다.

## Design system은 제한 목록이 아니라 product다

Design system은 color와 component library만이 아니라 principle, token, pattern, accessibility rule, documentation, code counterpart와 contribution process를 포함한다.

1. 현재 design과 code를 함께 audit한다.
2. 반복 문제와 목표를 정하고 작은 foundation/component부터 시작한다.
3. design component와 code component의 이름, state, property를 mapping한다.
4. exception을 무조건 금지하지 않고 사용 사례와 승인 근거를 기록한다.
5. adoption, override, accessibility defect, update lead time을 보며 개선한다.

강한 제약은 일관성을 높이지만 새로운 product need를 막을 수 있다. 반대로 자유로운 override는 system을 무력화한다. 기본 경로는 쉽게, 예외 경로는 명시적 review와 환류가 가능하게 만든다.

통제 수준은 두 방식 사이에서 고른다. 최소 규칙만 두고 열어 두는 방식은 제품 요구가 빠르게 바뀌는 초기에 새 pattern을 막지 않는다. 디자이너가 system 안에서만 작업하도록 강하게 제한하는 방식은 디자이너 수와 제품 영역이 많아 개인 편차가 품질 문제의 주원인일 때 일관성을 지키기 쉽다. 어느 쪽이든 예외로 만든 화면은 빨리 system으로 편입하거나 정리해 예외가 쌓이지 않게 한다.

System 개선은 디자이너끼리 먼저 좋았던 점, 불편한 점, 바꿀 점을 모은 뒤 platform designer, product designer, engineer가 함께 review해 code component와 맞춘다. 개발자에게 익숙한 방식과 도구를 존중하면 구현 속도가 오른다.

## Review와 rollout

- design review는 시각적 취향보다 문제, 사용자 flow, 접근성, 기술 제약과 metric을 기준으로 한다.
- 가벼운 office hour는 빠른 feedback에, 기록이 필요한 decision review는 비동기 문서와 decision log에 적합하다. 동료 feedback을 무거운 회의에서 주고받으면 평가처럼 느껴져 공유가 줄어든다. 동료 feedback은 office hour에서 자유롭게 나누고, 평가와 성장 대화는 매니저와의 [[People-Leadership|1:1]]로 나눈다.
- 구현 중 design 변경은 silently overwrite하지 않고 영향 issue와 owner에게 통지한다.
- 배포 뒤 실제 metric과 support feedback을 확인하고 `released`, `iterate`, `rollback` 중 상태를 고른다.
- 회고 action에는 owner와 due date를 붙인다. 구조가 완벽해지는 것이 아니라 반복 비용이 줄어드는지 본다.

## 교정해야 할 단정

- one-pager는 유용한 형식이지 전 세계 공통 표준이 아니다.
- Figma 하나에 모든 문서를 넣는 것이 SSOT의 조건은 아니다.
- file 복제는 history를 남기는 유일한 방법이 아니다.
- Dev Mode가 behavior, error state와 acceptance criteria를 자동 완성하지 않는다.
- design system의 강한 제한은 디자이너와 제품 영역이 많을수록 일관성 유지에 유리하지만, 규모와 무관하게 품질을 보장하지는 않는다.

## 면접 체크포인트

- handoff를 파일 전달이 아니라 ready 조건과 변경 계약으로 설명한다.
- SSOT를 single tool이 아닌 artifact별 authority와 index로 설계한다.
- designer와 engineer가 design system을 공동 product로 운영하는 방식을 말한다.
- 개발 중 변경과 출시 후 학습이 앞 단계로 돌아가는 loop를 설명한다.

## 출처

- [Figma, Guide to Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode)
- [Figma, Guide to branching](https://help.figma.com/hc/en-us/articles/360063144053-Guide-to-branching)
- [Figma, Explore design files](https://help.figma.com/hc/en-us/articles/15297425105303-Explore-design-files)
- [Figma, Welcome to design systems](https://help.figma.com/hc/en-us/articles/14552802134807-Lesson-1-Welcome-to-design-systems)
- [Figma, Build a design system](https://www.figma.com/blog/design-systems-102-how-to-build-your-design-system/)
- [인프런, 디자이너에게 구조가 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329388)
- [인프런, 프로덕트 조직의 구조](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329391)
- [인프런, SSOT와 Figma 중심 구조](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329389)
- [인프런, 디자인 프로세스 구조화](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329387)
- [인프런, 디자인 프로세스 Q&A](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329390)
- [인프런, 마무리: 완벽한 구조는 없다](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329392)

## 관련 문서

- [[Product-Design-Workflow-and-Handoff-Stages|디자인 단계별 산출물 (킥오프 원페이저에서 개발 가이드까지)]]
- [[Product-Design-Workflow-and-Handoff-Organization|프로덕트 조직 구조와 업무 루프]]
- [[Cross-Functional-Product-Collaboration|직군 간 프로덕트 협업]]
- [[RFC-Writing|RFC와 PRD 작성]]
- [[PRD-Writing|PRD 작성법 (유저플로우, 화면 명세)]]
- [[Project-Management|프로젝트 관리]]
- [[OKR-Writing|OKR 작성법 (KR의 시작값과 목표값)]]
- [[People-Leadership|사람 리더십 (1:1)]]
- [[Inclusive-Design-Principles|포용적 디자인 원칙]]
- [[Code-Review-Culture|코드 리뷰 문화]]
