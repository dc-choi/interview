---
tags: [senior, product, design, kickoff, one-pager, ideation, handoff]
status: done
verified_at: 2026-10-01
category: "Senior - 커뮤니케이션"
aliases: ["Design Process Stages", "디자인 프로세스 단계", "킥오프 원페이저", "One-pager"]
---

# 디자인 단계별 산출물: 킥오프 원페이저에서 개발 가이드까지

[[Product-Design-Workflow-and-Handoff|프로덕트 디자인 워크플로와 개발 핸드오프]]의 구간표를 단계별 산출물과 판단 규칙으로 풀어 쓴다. 단계는 질문으로 구분한다. 킥오프는 왜 하는가(Why), 아이디어는 문제를 어떻게 풀 것인가(How), 상세 디자인은 결정한 해법이 무엇인가(What), 가이드는 어떻게 전달할 것인가(How)에 답한다.

## 킥오프: 원페이저로 Why를 합의한다

킥오프 문서의 목적은 이해관계자가 짧은 시간에 문제와 핵심 내용을 파악하고 합의하게 만드는 것이다. 한 페이지로 요약하는 원페이저가 흔한 형식이다. 항목 이름은 강의가 든 원페이저 구조이고, TL;DR의 뜻 외에 각 항목에 담는 내용은 이 문서의 정리 제안이다.

| 항목 | 담는 내용 |
|---|---|
| TL;DR | 긴 글을 읽지 않을 사람을 위한 한두 줄 요약 |
| Why | 누구의 어떤 문제를 왜 지금 푸는가와 그 근거 |
| What | 바꾸려는 결과, 성공 기준과 제외 범위 |
| How | 접근 방향, 가설과 알려진 제약 |
| Next Step | 다음 결정과 담당자, 시점 |

- 작성과 진행의 owner는 보통 PM이지만 문제 정의는 engineering, PO, design lead가 처음부터 함께한다. 해법이 정해진 뒤에 합류하면 구현 제약과 사용성 통찰이 늦게 나와 되돌리는 비용이 커진다.
- 원페이저는 킥오프 회의 아젠다([[Project-Management|프로젝트 관리]])와 상세 PRD([[RFC-Writing|RFC/PRD 작성]]) 사이의 가벼운 사전 문서다. 합의 뒤에는 PRD의 첫 장이 되고, 이후 단계의 user flow와 기능 명세가 뒤에 붙는다. 화면은 Figma, 문제와 목표는 PRD처럼 출처가 나뉘어도 project index가 둘을 잇는다.
- 원페이저를 전 세계 표준이자 아마존에서 시작된 문화로 소개하는 설명이 있지만, 그 기원과 표준이라는 주장은 아마존 공식 자료로 확인되지 않는다. 한 페이지 문서 자체는 아마존 문서 문화 안에 있다. 아마존 면접 안내 글에 따르면 아마존은 슬라이드 대신 서술형 메모를 회의 시작에 함께 읽고, 이 문서는 보통 1~6페이지로 프로젝트 목표, 해결 접근, 결과와 다음 단계를 담는다. 공식 자료는 6페이지 메모(2017년 주주 서한)와, 1페이지 미만의 보도자료와 5페이지 이하의 FAQ로 이뤄진 PR/FAQ도 설명한다. 형식의 기원보다 짧은 시간에 합의를 만드는지가 기준이다.

## 아이디어: 발산한 뒤 결정으로 좁히고 prototype한다

아이디어 단계는 리서치, 아이디에이션, prototype 순서로 진행하고, 사고는 시작, 발산, 수렴의 형태를 띤다.

- **리서치**: 시장, 사용자, 제품 리서치로 나눈다. 제품 리서치 가운데 화면 리서치는 흐름, layout과 component, 기능과 UX를 살피며 대부분의 과제에 필요하다. 경쟁사만이 아니라 그 기능을 가장 잘하는 서비스까지 보고, 조사는 우리 서비스 적용안으로 끝낸다([[Competitive-Analysis#벤치마킹 실무|벤치마킹 실무]]).
- **발굴**: 완전히 새로운 해법은 드물다. 리서치 결과에서 적용할 아이디어를 적극적으로 가져오되, 사용자가 이미 익힌 흐름을 깨지 않는 기준은 [[Metoo-Strategy|Me-too 서비스 기획]]과 같다.
- **발산**: 정성, 정량 데이터를 확보하고, 없으면 확보하는 노력부터 한다. 가능한 한 많은 안을 내고 자기 안에 관대하지 않게 스스로 반증한다.
- **수렴**: 모든 안을 prototype으로 만들면 속도가 떨어진다. 결정으로 후보를 좁힌 뒤 prototype한다.

가장 흔한 실패는 기능 목록이 이미 정해진 상태에서 아이디에이션을 시작하는 것이다. 기능이 먼저 정해지면 발산이 사실상 사라지고 논의가 화면 배치로 좁아진다. 기능보다 문제와 아이디어를 먼저 고민한다는 원칙은 [[Problem-Discovery|문제 발견]]과 같은 축이다.

## 상세 디자인: 결정을 지키고 새 생각은 다음 iteration으로

상세 디자인은 결정한 해법을 화면으로 구현하는 What이다.

- 결정된 안을 최대한 따른다. 작업 중 떠오른 새 생각이 전체 방향을 바꾸지 않으면 기존 안대로 진행하고, 새 생각은 다음 iteration 후보로 backlog나 decision log에 남긴다. 전체 방향을 바꾸는 발견만 앞 단계로 되돌리고, 그때는 영향 issue와 owner에게 통지한다.
- 이 기준은 속도와 리소스가 빠듯한 조직일수록 중요하다. 좋은 생각이 떠오를 때마다 범위를 다시 열면 일정이 계속 밀린다.
- 속도는 design system에서 나온다. system을 갖추기 어려운 환경이면 공용 component를 모은 file library라도 만든다.
- 디자인이 끝나면 review deck으로 이해관계자 review를 연다. deck에는 문제와 목표, 선택한 안과 기각한 안, 남은 open issue를 담는다.

## 가이드: 전달 방식도 설계한다

가이드는 전달의 How다. user flow와 기능 명세를 함께 두는 구성, interaction 분리, section별 flow map, 이번 범위만 담는 명세는 [[Product-Design-Workflow-and-Handoff#Ready for development 계약|Ready for development 계약]]에 정리했다. 프로젝트 상태는 index에서 `in progress`, `handoff` 순서로 옮기고, 배포 뒤에는 [[Product-Design-Workflow-and-Handoff#Review와 rollout|Review와 rollout]]에 맞춰 `released`, `iterate`, `rollback` 중 하나로 정한다. 강의는 실험 결과에 따라 Roll-out 또는 Roll-back으로 옮기는 예시를 들며, 여기서 Roll-out은 `released`에 해당한다.

## AI 코딩 도구가 단계 구분을 흔드는 지점

위 단계는 리서치와 발견, 발산과 수렴, 시안, 반복을 거친 뒤 구현으로 넘어가는 순서를 전제한다. 엔지니어가 코딩 에이전트로 동작하는 초안을 빠르게 만들게 되면 이 순서가 그대로 유지되기 어렵다. 아래는 AI 제품 회사 디자인 리드의 2026년 공개 인터뷰에서 나온 실무 관찰이며, 모든 조직에 적용되는 결론은 아니다. 같은 관찰을 발표했을 때 발견 단계를 뺄 수 없다는 반론도 컸다고 한다.

- **디자인 작업이 두 갈래로 나뉜다.** 하나는 구현과 실행 지원이다. 시안을 먼저 그릴 시간이 없을 만큼 초안이 먼저 나오므로, 디자이너는 동작하는 초안을 써 보며 다듬고 마지막 마감(polish)을 직접 코드로 구현하거나 엔지니어와 붙어 마무리한다. 다른 하나는 방향 제시다. 여러 사람이 각자 기능을 만들어 내는 환경일수록 같은 방향을 가리킬 기준이 필요하다. 다만 기술 변화가 빨라 수년짜리 비전 대신 3~6개월 앞을 보는 방향을 그리고, 때로는 덱 대신 prototype으로 보여 준다.
- **단계가 사라지기보다 시간 배분이 바뀐다.** 같은 인터뷰에서 사용자 리서치, 시안과 prototype은 계속하며, 시안과 prototype에 쓰던 시간이 예전 약 60~70%에서 30~40%로 줄고 엔지니어와 직접 맞춰 보는 일과 구현의 몫이 늘었다고 했다. 캔버스 도구에서 여러 방향을 넓게 펼쳐 보는 탐색은 여전히 중요하고, 코딩 도구는 한 방향을 따라가는 데 더 맞는다고 봤다.
- **비결정적인 AI 기능은 시안으로 상태를 다 그릴 수 없다.** 모델 출력이 매번 달라 클릭 prototype으로도 경험을 재현하기 어렵다. 실제 모델 위에 만든 prototype을 사용자가 자기 용도로 써 보는 모습을 보면서 쓰임새를 발견한다.
- **이른 공개는 개선을 보여 줄 때만 신뢰를 지킨다.** 이미 사용자에게 가치가 있는 기능이라면 완성도가 낮아도 research preview처럼 미리 표시하고 공개할 수 있다. 이때 사용자 피드백에 응답하고 개선을 계속 출시하겠다는 약속을 실제로 지켜야 한다. 이르게 공개하고 아무 변화가 없을 때 품질 신뢰와 브랜드가 깎인다.
- **이해하기 어려운 아이디어를 읽어 내는 일도 디자인이다.** 내부에서 에너지가 몰리는데 왜인지 아직 설명되지 않는 prototype을 찾아, 그 안에서 사람들이 유용해한 정보(에이전트의 계획, 할 일, 참조한 파일과 맥락 등)를 제품의 형태로 옮긴다. 인터뷰에서는 창업자와 아이디어를 각각 이해되는(legible) 것과 이해되지 않는(illegible) 것으로 나눈 한 투자자의 2x2 틀을 빌려 설명했다. 둘 다 이해되는 아이디어는 이미 누군가 하고 있을 가능성이 높다는 관점이다.

다음은 이 문서의 적용 제안이다. 모델 출력에 기대는 화면은 실제 모델 위의 prototype이 필요하므로, 아이디어 단계의 prototype을 결정 뒤로 미루는 위 원칙과 충돌한다. 결과가 결정적인 화면과 모델 출력에 기대는 화면을 나눠 판단한다. 또 단계를 없애기보다 어느 단계를 동작하는 초안으로 대체할 수 있는지 고른다. 킥오프의 Why 합의와 상세 디자인의 결정 기록은 초안이 빨리 나올수록 오히려 방향을 맞추는 기준이 된다.

## 적용 점검

- 킥오프 문서만 읽고 문제, 성공 기준, 제외 범위와 다음 결정을 말할 수 있는가
- 아이디에이션을 시작할 때 기능 목록이 이미 확정되어 있지 않은가
- prototype 전에 후보를 좁힌 결정 기록이 있는가
- 구현 중 보류한 아이디어가 다음 iteration 후보로 남아 있는가
- 모델 출력에 기대는 기능을 정적 시안만으로 판단하고 있지 않은가

## 출처

- [2017 Letter to Shareholders — About Amazon](https://www.aboutamazon.com/news/company-news/2017-letter-to-shareholders)
- [What's it like to work at Amazon? — About Amazon](https://www.aboutamazon.com/news/workplace/an-insider-look-at-amazons-culture-and-processes)
- [What's it like to interview at Amazon? — About Amazon](https://www.aboutamazon.com/news/workplace/whats-it-like-to-interview-at-amazon)
- [인프런, 디자인 프로세스 제로투원, 디자인 프로세스 구조화](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329387)
- [인프런, 디자인 프로세스 제로투원, Q&A 무엇이든 물어보세요](https://www.inflearn.com/courses/lecture?courseId=338233&unitId=329390)
- [The design process is dead. Here’s what’s replacing it. — Lenny's Podcast, Jenny Wen](https://www.youtube.com/watch?v=eh8bcBIAAFo) — 2026-03 공개 인터뷰, AI 제품 회사 디자이너의 실무 관찰

## 관련 문서

- [[Product-Design-Workflow-and-Handoff|프로덕트 디자인 워크플로와 개발 핸드오프]]
- [[Product-Design-Workflow-and-Handoff-Organization|프로덕트 조직 구조와 업무 루프]]
- [[Project-Management|프로젝트 관리 (킥오프 아젠다)]]
- [[RFC-Writing|RFC와 PRD 작성]]
- [[PRD-Writing|PRD 작성법]]
- [[Cross-Functional-Product-Collaboration|직군 간 프로덕트 협업]]
