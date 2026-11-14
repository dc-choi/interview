---
tags: [ai, harness, agent, workflow, spec-driven]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["BMad Method", "BMAD-METHOD", "비매드 메소드"]
---

# BMad Method

BMad Method(Breakthrough Method for Agile AI Driven Development)는 AI 코딩 에이전트에게 분석, 기획, 설계, 구현과 리뷰를 역할별 skill과 에이전트로 나눠 맡기는 오픈소스 개발 방법론이다. 애자일의 epic과 story 단위로 일감을 쪼개고, 각 단계의 산출물을 파일로 남겨 다음 단계의 입력으로 쓴다. MIT 라이선스이며 `BMad`와 `BMAD-METHOD`는 BMad Code, LLC의 상표다.

하네스 관점에서 보면 [[Harness-Adoption-Ladder|도입 계단]]의 조사, 계획, 실행, 리뷰 단계와 대응하는 기성 워크플로우다. 다만 계획 승인은 조건부이고 실행 게이트를 스스로 강제하지는 않는다. 직접 하네스를 만들기 전에 비교해 볼 후보이며, 그대로 쓰지 않고 자기 검증 규칙을 덧붙여 확장의 출발점으로 삼을 수도 있다.

## 버전 상황 (2026-11-14 기준)

방법론이 v6에서 v7로 넘어가는 중이라 자료마다 명령과 파일 이름이 다르다. 검색 결과에는 v4 시절의 문서와 비공식 사본이 많으므로 공식 저장소와 문서 사이트를 먼저 본다.

- **안정판**: v6.12 계열이며 npm 설치기 `npx bmad-method install`로 설치한다. Node.js 20.12 이상, Python 3.10 이상과 uv가 필요하다. 버그 수정 외에는 동결됐다. 2026-11-14에 확인한 최신 릴리스는 v6.12.4다.
- **미리보기**: v7은 preview alpha이며 공식 저장소는 정식 출시를 2026년 11월 중순으로 예고했다. `npx skills add`로 skill 묶음을 설치한 뒤 `bmad` skill에 `bmad setup`을 요청한다. 문서 사이트(docs.bmad-method.org)는 이미 v7 흐름을 설명한다.
- **v6.11의 변화**: 구현 단계를 `bmad-sprint-planning`, `bmad-build`, `bmad-code-review`의 한 사슬로 묶었다. `bmad-quick-dev`는 `bmad-build`로 바뀌었고, `bmad-create-story`와 `bmad-dev-story`는 폐기 예정이 되어 이름으로 부를 때만 동작하다가 v7에서 빠진다. v6.12.0부터 새 설치에서는 폐기 예정 shim이 기본으로 빠지고 `--shims`를 줘야 유지된다. 릴리스 노트가 대상 shim을 나열하지 않아 이 두 skill이 포함되는지는 확인하지 못했다.

따라서 story 파일을 Scrum Master가 만들고 Dev가 구현한다는 설명은 v4에서 v6 초기의 흐름이다. 지금 문서를 읽을 때는 어느 버전 기준인지부터 확인한다.

## 반복 구조

모든 규모의 작업이 같은 반복을 돈다. 무엇을 할지 분명히 하고(Clarify), 계획하고(Plan), 만들고 검증하며(Build and verify), 결과에서 배워 조정한다(Learn and adjust).

계획 skill은 분석, 기획, 설계 순으로 묶여 있지만 문서는 이를 반드시 거쳐야 하는 단계가 아니라 필요한 것만 고르는 도구라고 설명한다. 각 문서는 `<type>-<slug>/` 폴더로 만들어진다. 활성 initiative가 있으면 그 폴더 안에, epic의 문서는 그 epic 폴더에, 활성 initiative가 없으면 출력 폴더(기본 `_bmad-output`)에 바로 놓인다.

| 역할 (skill) | 주요 산출물 |
|---|---|
| Analyst Mary (`bmad-agent-analyst`) | 제품 brief, PRFAQ, BRD |
| Product Manager John (`bmad-agent-pm`) | `prd-<slug>.md`와 관련 기획 문서 |
| UX Designer Sally (`bmad-agent-ux-designer`) | `DESIGN.md`, `EXPERIENCE.md` 등 UX 문서 |
| Architect Winston (`bmad-agent-architect`) | `architecture-<slug>.md` |
| Product Owner Sofia (`bmad-agent-po`) | epic과 story의 요구사항, 순서를 정한 `tickets.toml` |
| Developer Amelia (`bmad-agent-dev`) | 구현, 테스트, 리뷰, 회고 |

v7 문서 기준으로 Scrum Master 역할은 목록에 없고, 전체 Test Architect는 별도 모듈이다. 프로젝트 규칙은 v6.11부터 `bmad-project-context`가 `AGENTS.md` 안의 검증된 블록 하나로 남긴다.

## Story 단위 구현

v7 문서의 구현 흐름은 다음과 같다.

1. Product Owner가 epic을 `tickets/tickets.toml`의 항목으로 나눈다. 계획만 된 항목에는 story 파일이 필요 없다.
2. `bmad-build`에 story를 지정하면 항목과 epic을 읽어 인수 조건을 담은 `story-<slug>-plan.md`를 만든다. 조사 결과 의도의 공백, 되돌릴 수 없는 동작이나 변경 범위에 걸리는 점이 있으면 전체 plan을 먼저 쓰고 사용자가 승인한 뒤 구현한다. 셋 다 해당하지 않으면 최소 plan으로 같은 세션에서 구현하고 뒤에 리뷰한다.
3. 상태는 plan 파일이 소유한다. Build는 `built`에서 끝나고, `done` 처리는 사용자나 상위 orchestrator가 결정한다.
4. `bmad-code-review`는 plan 파일에 날짜를 붙인 리뷰 블록을 덧붙이고 ticket 상태는 바꾸지 않는다. 기본 깊이는 thorough이며 운영 영향이 있는 작업에 권장된다. `bmad-build` 안의 리뷰는 기본이 reviewer 하나의 quick이다.
5. 범위 밖 목표나 무관한 문제는 `deferred-work.md`로 미룬다. 요구사항이 바뀌면 Product Owner의 REPLAN이 영향받는 epic을 다시 나누고 날짜가 붙은 결정 줄을 남긴다. 이미 만든 결과를 고쳐 쓰지는 않는다.

Build와 리뷰는 각각 새 대화에서 시작하라고 안내한다. 다른 워크플로우의 세션을 재사용하면 맥락이 섞이기 때문이다. 리뷰어는 추가하거나 끌 수 있고 일부를 다른 모델로 돌릴 수 있다. 해석하면, 같은 모델이 쓰고 검사하는 자기 확인을 줄이는 데 쓸 수 있는 선택지다.

규모는 단순 수정, 한 세션, epic 크기, 프로젝트 크기의 네 단계로 가늠한다. 한 세션은 테스트를 빼고 약 500줄의 추가나 변경이 기준이며, 프로젝트 크기는 여러 epic이나 대략 20세션 이상이다. 작은 일에 전체 계획 문서를 강제하지 않으려는 구분이다.

## 무인 실행으로 확장할 때

공식 문서는 무인 작업을 ticket마다 `bmad-build-auto`를 한 번씩 호출하는 방식으로 설명한다(v6.11에서 `bmad-dev-auto`가 이 이름으로 바뀌었다). README는 BMad Loop 모듈의 목표를 epic 하나를 무인으로 구현, 검증하고 회고하는 것으로 소개한다. 그러나 2026-11-14 기준 Autonomous Development Loops 문서는 선택형 `bmad-loop` orchestrator가 아직 v7 ticket 트리에서 작업을 보내지 못하며 그 문서는 앞으로 따를 계약이라고 밝힌다. 회고도 orchestrator가 권할 수 있을 뿐 `bmad-retrospective`가 따로 수행한다.

아래는 한 실무자가 BMad를 직접 하네스로 확장한 사례다. 강의 운영자의 채널에 올라온 수강생 인터뷰(2026-10, 강의 홍보 포함)의 음성 전사에서 정리했다. 사례가 쓴 버전은 확인하지 못했으나 correct-course와 done 처리를 언급해 v6 흐름으로 보이며, story별 worker는 BMad orchestrator가 아니라 본인이 LangGraph로 만든 구성에서 돌린다. 한 사례의 실천일 뿐 일반화된 패턴은 아니며 효과와 비용 수치는 검증하지 않았다.

- **story마다 새 컨텍스트**: 메인 에이전트가 story를 서브에이전트에 위임하고 끝나면 그 서브에이전트를 버린다. 메인 컨텍스트가 쌓이지 않아 중간 compact나 clear 없이 여러 story를 연달아 돌릴 수 있다고 설명한다. 공식의 ticket당 한 번 호출과 같은 방향이다.
- **실행 전 결정 공백 제거**: 무인 실행을 걸기 전에 대기 중인 story들에 대해 에이전트가 사용자를 인터뷰하게 해 정해지지 않은 사항을 없앤다. 사례는 이를 story 10~15개를 쉬지 않고 돌리는 핵심으로 꼽았고, 루프는 주로 요구가 바뀌거나 세부를 다듬으려고 본인이 개입할 때 멈추고, 실행을 이어갈 수 없어 멈추는 경우는 거의 없다고 했다. 실행 중 생긴 질문이 루프를 세운다는 이유는 이 문서의 해석이다.
- **사람 확인을 모델 검증으로 대체**: 하네스 이전에는 UI의 브라우저 자동화 테스트, 시드 데이터를 넣은 종단 간 테스트와 사람의 직접 확인을 차례로 거쳤다. 하네스에서는 사람의 확인을 모델이 수행하는 검증으로 바꾸고 그 검증을 여러 단계로 겹쳤다. 사례는 이를 측정 결과가 아니라 충분히 신뢰할 수 있다는 믿음으로 설명했다. 검증 단계를 늘리면 토큰 소비가 늘 수 있고, 모델과 역할별 선택으로 이를 줄일 수 있다고 했다. 공식 흐름은 `done` 처리를 사용자에게 남기고 [[Harness-Adoption-Ladder|도입 계단]]의 배포 게이트도 사람이 증거를 확인하므로, 이 항목은 그대로 옮기기 가장 위험하다.
- **역할별 모델 지정**: 오케스트레이션에는 상위 모델, 코드 작성에는 더 저렴한 모델을 지정해 비용을 맞춘다. 어느 역할에 어느 모델이 충분한지는 작업마다 평가해야 한다는 점은 이 문서의 보완이다 → [[Harness-Component-Evaluation]].
- **진행 상황 관측**: 각 루프의 단계, 실패와 실패 이유를 브라우저 화면에 띄워 사람이 자리를 비운 사이의 진행을 나중에 확인한다.
- **요구사항 분석 비중**: 외주 프로젝트에서는 기능, 비기능과 법무 요구를 인터뷰로 모은 뒤 모델로 세분화하고 정합성을 다시 검사한다. 사례에서는 계약 기간의 절반 가까이를 이 단계에 썼다.

같은 사례는 진행 중 사소한 요구 변경을 기존 story에 덧대며 이어가면 epic 하나의 story가 처음의 5~10개에서 80개까지 늘었다고 말한다. 해석하면, 변경 이력이 story로 남는 장점과 epic을 다시 나눌 때가 됐다는 신호를 함께 볼 수 있다.

## 트레이드오프

- **장점**: 역할과 산출물이 정해져 있어 기획부터 리뷰까지 같은 형식의 기록이 남는다. 계획 승인과 리뷰 기록이 파일에 남아 [[Harness-Gate-Placement|게이트]]의 근거로 쓸 수 있다.
- **비용**: 역할 수와 문서가 많아 작은 작업에는 과하다. 공식 문서도 규모별로 계획 깊이를 줄이게 한다. 검증 단계를 겹칠수록 토큰 비용이 늘 수 있다.
- **변동성**: 메이저 버전 사이뿐 아니라 v6의 마이너 릴리스(6.11, 6.12)에서도 skill 이름, 파일 구조와 상태 관리 위치가 바뀌었다. 팀 문서와 자동화가 특정 버전의 파일 이름에 묶이면 업그레이드 때 깨진다.
- **강제력**: 방법론의 지시는 대부분 프롬프트 계층이다. 꼭 지켜야 하는 검사는 훅이나 CI 같은 강제 층에 따로 둔다.

## 면접 체크포인트

- 역할별 에이전트와 파일 산출물로 단계를 나누는 이유와 그 비용
- story마다 새 컨텍스트로 실행할 때 얻는 것과 잃는 것(공유 맥락, 프롬프트 캐시)
- 무인 루프가 멈추는 지점을 줄이려면 실행 전에 무엇을 확정해야 하는가
- 같은 모델의 자기 리뷰를 피하는 방법과 다른 모델 리뷰의 한계

## 출처

- [BMAD-METHOD — GitHub, bmad-code-org](https://github.com/bmad-code-org/BMAD-METHOD)
- [BMAD-METHOD Releases — GitHub, bmad-code-org](https://github.com/bmad-code-org/BMAD-METHOD/releases)
- [BMAD-METHOD v6.11.0 Release Notes — GitHub, bmad-code-org](https://github.com/bmad-code-org/BMAD-METHOD/releases/tag/v6.11.0)
- [BMAD-METHOD v6.12.0 Release Notes — GitHub, bmad-code-org](https://github.com/bmad-code-org/BMAD-METHOD/releases/tag/v6.12.0)
- [BMad Method Docs, Choose a Planning Path](https://docs.bmad-method.org/plan/choose-a-planning-path/)
- [BMad Method Docs, Skills and Agents](https://docs.bmad-method.org/reference/skills-and-agents/)
- [BMad Method Docs, Break Work into Stories and Track It](https://docs.bmad-method.org/plan/break-work-into-stories-and-track-it/)
- [BMad Method Docs, Build a Change](https://docs.bmad-method.org/build/build-a-change/)
- [BMad Method Docs, Review a Change](https://docs.bmad-method.org/build/review-a-change/)
- [BMad Method Docs, Autonomous Development Loops](https://docs.bmad-method.org/build/autonomous-development-loops/)
- [양실장에게 바이브코딩 배우고 2개월만에 1억 매출 만든 수강생의 BMad 기반 하네스 노하우 전격 공개 — YouTube, 양실장의 바이브코딩대학](https://www.youtube.com/watch?v=Hbkan02wEQ4) — 2026-10-31 업로드, 강의 홍보를 겸한 수강생 인터뷰, 음성 전사 기준

## 관련 문서

- [[Harness-Adoption-Ladder|하네스 도입 계단 (다섯 단계 파이프라인과 네 게이트)]]
- [[Harness-Gate-Placement|게이트 배치 (요청 층과 강제 층)]]
- [[Harness-Component-Evaluation|코딩 에이전트 하네스 구성요소 평가]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법 (검증 가능한 완료 기준)]]
- [[Claude-Code-Dynamic-Workflows|Claude Code 동적 워크플로우]]
