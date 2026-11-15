---
tags: [ai, harness, workflow, spec-driven, sdlc, aws]
status: done
verified_at: 2026-11-15
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI-DLC", "AI-Driven Development Life Cycle", "AI 주도 개발 수명주기", "aidlc-workflows"]
---

# AI-DLC (AI-Driven Development Life Cycle)

AI-DLC는 AWS가 2025-07-31 블로그 글로 소개한 소프트웨어 개발 방법론이다. 기존 SDLC에 AI 도구를 덧붙이는 대신, 모든 개발 활동을 AI가 계획을 세우고 질문으로 맥락을 모은 뒤 사람이 검증한 다음에만 구현하는 반복으로 다시 짠다. 같은 글은 AI가 사람을 돕는 AI-assisted 방식과 AI에게 통째로 맡기는 AI-autonomous 방식이 모두 속도와 품질에서 기대에 못 미쳤다고 평가한다. 사람의 검증을 반복마다 두는 점에서 두 방식 사이에 놓인다고 읽을 수 있다(해석).

하네스 관점에서는 [[BMad-Method|BMad Method]]처럼 단계와 산출물을 정한 기성 워크플로우다. 눈에 띄는 차이는 product owner, 아키텍트와 개발자가 협업 공간에 모여 함께 결정하는 의식(ritual)을 방법론 안에 넣었다는 점이다(해석). 보안과 컴플라이언스 담당자까지 참여시키는 운영은 아래 발표에서 나온 설명이다.

## 두 축과 기본 반복

| 축 | 내용 |
|---|---|
| 사람 감독 아래의 AI 실행 | AI가 상세 작업 계획을 만들고, 모르는 것을 묻고, 중요한 결정은 사람에게 넘긴다 |
| 동적 팀 협업 | 팀이 협업 공간에 모여 실시간으로 문제를 풀고 결정을 내린다 |

반복은 계획, 확인 질문, 사람의 검증, 구현 순서다. AI가 단계마다 계획, 요구사항과 설계 산출물을 프로젝트 저장소에 저장해 여러 세션에 걸쳐 맥락을 이어 간다. 앞 단계의 산출물이 다음 단계의 입력이 된다.

## 세 단계

| 단계 | AI가 하는 일 | 팀이 하는 일 |
|---|---|---|
| Inception | 업무 의도를 요구사항, story와 unit으로 바꾼다 | Mob Elaboration에서 AI의 질문과 제안을 함께 검증한다 |
| Construction | 논리 아키텍처, 도메인 모델, 코드와 테스트를 제안한다 | Mob Construction에서 기술과 아키텍처 결정을 실시간으로 내린다 |
| Operations | 앞 단계의 맥락으로 IaC와 배포를 관리한다 | 운영을 감독한다 |

용어도 바꾼다. 몇 주 단위의 sprint 대신 몇 시간이나 며칠 단위의 짧은 주기인 bolt를 쓰고, epic 대신 Unit of Work를 쓴다.

## 실행 도구: aidlc-workflows

awslabs의 `aidlc-workflows` 저장소는 방법론을 도구 중립 코어와 엔진(`aidlc` CLI), 도구별 통합으로 구현한다. 2026-11-15에 확인한 README(버전 배지 2.11.4) 기준이며 빠르게 바뀌는 저장소라 버전마다 다시 확인한다.

- **도구 중립:** 하나의 코어를 Claude Code, Kiro CLI, Kiro IDE, Codex CLI, Cursor, opencode, GitHub Copilot에서 쓴다. 설치 뒤 `aidlc config --harness <도구>`와 `aidlc doctor`로 설정을 점검하고, Claude Code에서는 `/aidlc <요청>`으로 시작한다.
- **적응형 흐름:** 요청을 보고 workflow를 고르고, 빠진 결정을 묻고, 승인 게이트에서 멈춘 뒤 다음으로 간다. README는 11개 workflow profile(Classic, Express 포함)과 14개 에이전트(도메인 전문가 11, 리뷰어 2, 흐름을 짜는 composer 1)를 든다.
- **기록:** 사람 승인 게이트와 원천에 묶인 리뷰 증거, 감사 기록, 지속 상태, 팀 지식과 학습한 규칙을 남긴다고 설명한다.
- **단계 수:** README는 초기화부터 운영까지 5개 phase와 33개 stage를 말한다. 블로그의 세 단계와 수가 다르므로 어느 자료의 구분인지 밝혀 인용한다. 다섯 phase의 이름은 확인하지 않았다.
- **라이선스:** MIT-0이다.

## 발표에서 나온 운영 관점

아래는 AWS 팟캐스트(2026-11-04 업로드)에서 AWS 기술 임원과 AI 엔지니어링 조직 책임자가 말한 내용이다. 발표자 소속 회사의 방법론 홍보를 겸하며, 수치와 사례는 독립 검증하지 않았다.

- **코딩 시간만 줄이면 효과가 작다.** 한 내부 팀의 분석으로 개발자 시간의 약 50%가 조율과 요구사항 확인, 30%가 코딩, 20%가 기타였다고 소개했다. 이 비율이면 코딩 속도를 두 배로 높여도 전체 시간은 15% 줄어드는 데 그친다(계산). 그래서 조율과 번역에 드는 비용을 줄이는 쪽을 겨냥한다.
- **흩어진 제약을 먼저 모은다.** 제품, 사업, 보안, 컴플라이언스 담당자가 2~3시간 함께 모여 각자 아는 제약을 AI의 맥락으로 옮기는 세션을 둔다. 성공 기준과 edge case를 구현 전에 구체적으로 적게 된다.
- **문제를 쪼개고 팀을 작게 둔다.** 복잡한 문제를 통째로 맡기면 틀릴 가능성이 커지므로 작은 단위로 나눈다. 2~3명 팀이 더 나은 결과를 낸다는 관찰을 든다.
- **맥락을 개인이 아니라 조직이 관리한다.** 수백만 줄 저장소 전체를 가리키면 명시한 내용도 놓치는 recall 문제가 생긴다고 말한다. 무엇을 AI가 알아야 하는지 공통 절차로 정하면 좋은 작업이 누적된다는 설명이다.
- **속도와 품질을 같이 잰다.** 개발자당 배포 수와 on-call당 호출(page) 수 같은 지표의 AI 도입 전후를 비교하고, 기준선 없이 생산성을 주장하지 않는다.
- **자율은 부여하는 것이 아니라 쌓는 것이다.** 리뷰 체계, CI/CD와 코드 품질 같은 기반을 갖춘 문제 유형부터 자율 처리를 넓힌다는 원칙을 말한다.
- **스펙이 자산이다.** 한 백엔드의 V2를 만들 때 기존 코드를 버리고 갱신한 스펙에서 다시 생성했다는 사례를 들었다.
- **모델을 하나에 묶지 않는다.** 모델과 가격이 자주 바뀌므로 중장기에는 여러 모델을 고를 수 있는 도구 사슬을 권한다.

## 트레이드오프

- **장점:** 요구사항 단계에 관련 부서를 함께 넣어 개발 뒤에 드러나는 제약을 줄인다. 산출물이 저장소에 남아 세션이 끊겨도 이어서 작업하고 감사할 수 있다.
- **비용:** Mob 세션은 여러 사람의 시간을 동시에 쓴다. 작은 수정에 전체 단계를 돌리면 과하므로 흐름을 고르는 적응형 선택이 필요하다.
- **강제력:** README는 모든 도구에서 같은 결정론적 엔진을 쓰고 native 설치는 hook과 명령을 `aidlc`로 돌린다고 설명하지만, 승인 게이트를 어떤 층에서 강제하는지는 밝히지 않는다. 도입 전에 게이트가 프롬프트 지시인지 hook 같은 강제 층인지 확인하고, 꼭 지켜야 하는 검사는 [[Harness-Gate-Placement|강제 층]]에 둔다.
- **자료 간 차이:** 블로그와 저장소의 단계 구분, 지원 도구 목록이 다르다. 발표 속 제품명과 수치는 공식 문서로 확인한 뒤 쓴다.

## 면접 체크포인트

- 코딩 속도 향상만으로 팀 전체 리드타임이 크게 줄지 않는 이유를 시간 비율로 설명할 수 있는가
- 기획, 보안, 컴플라이언스의 제약을 구현 전에 AI 맥락으로 모으는 방법과 그 비용
- 스펙과 계획 파일을 저장소에 남길 때 얻는 것(세션 연속성, 감사)과 관리할 것(스펙과 코드의 불일치)
- 자율 처리 범위를 넓히기 전에 갖춰야 할 검증 기반

## 출처

- [AI-Driven Development Life Cycle: Reimagining Software Engineering — AWS DevOps & Developer Productivity Blog, Raja SP](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/) — 2025-07-31 게시
- [aidlc-workflows — GitHub, awslabs](https://github.com/awslabs/aidlc-workflows) — 2026-11-15 README 확인
- [AI-DLC: The AI-Driven Development Lifecycle — YouTube, Amazon Web Services](https://www.youtube.com/watch?v=Zjx_F5EJZqI) — 2026-11-04 업로드, Humans In The Loop 팟캐스트, 음성 전사 기준

## 관련 문서

- [[BMad-Method|BMad Method (역할별 기성 워크플로우)]]
- [[Harness-Adoption-Ladder|하네스 도입 계단]]
- [[Harness-Gate-Placement|게이트 배치 (요청 층과 강제 층)]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법]]
- [[Developer-Role-AI-Era|AI 시대 개발자 역할]]
