---
name: interview-prep
description: Create company-specific interview preparation documents from a job description URL, resume, portfolio, company stage, and interview round. Use when the user asks for 면접 준비, 면접 분석, 인터뷰 준비, JD 분석, 예상 질문, 역질문, or company-specific fit and technical interview prep.
---

# 면접 준비

회사별 면접 준비 문서를 한 번의 자료 로드로 완성하는 워크플로우다. 재사용 답변의 배치와 회사별 폴더 규칙은 도메인 지침을 정본으로 따른다.

## 시작 전 필수 로드

다음 파일을 전부 읽고 서로 충돌하는 내용이 있으면 사용자에게 확인한다.

1. 루트 `CLAUDE.md`
2. `fit/CLAUDE.md`
3. `fit/interview/CLAUDE.md`
4. `fit/job-search/CLAUDE.md`
5. 기술 답변과 vault 내용을 다룰 때 `tech/CLAUDE.md`

## 필수 입력

- 채용공고 URL 또는 전체 JD 텍스트
- 이력서 경로 또는 전체 텍스트
- 포트폴리오 경로 또는 전체 텍스트
- 회사명과 면접 차수. 차수는 `1st`, `2nd`, `coffeechat`처럼 표현한다.

포트폴리오가 없거나 회사명과 차수를 안전하게 추론할 수 없으면 짧게 확인한다. 사용자가 포트폴리오 없이 진행하도록 승인하면 누락 사실과 분석 한계를 결과에 표시한다.

## 단일 라운드 로드

자료를 선별하거나 단계별로 다시 읽지 말고 한 번에 수집한다.

1. URL이면 JD를 가져오고, 텍스트면 그대로 분석한다. 회사 소개, 단계, 도메인, 비즈니스 모델, 주요 업무, 자격 요건, 우대 사항과 전형 절차를 구분한다.
2. 이력서와 포트폴리오를 전부 읽되 vault에 원문 전체를 복제하지 않는다.
3. `fit/interview/common/`의 `My-*.md` 9개 전체, `Common-Interview-Questions.md`와 `Interview-Retro-Template.md`를 읽는다. 실제 파일 수가 다르면 누락이나 추가 파일을 먼저 확인한다.
4. `fit/interview/prep/`의 인덱스와 템플릿을 제외한 다음 14개 가이드를 전부 읽는다.
   - `CS-Network-Interview.md`
   - `Common-Interview-Questions-Behavioral.md`
   - `Common-Interview-Questions-Tech-Basics.md`
   - `Common-Interview-Questions-Tech-Scale.md`
   - `Developer-Interview-13-Questions.md`
   - `Developer-Interview-Signals.md`
   - `Experience-Narrative-Reframing.md`
   - `Experience-Value-Framing.md`
   - `FIT-Framework.md`
   - `Global-IT-Interview.md`
   - `Live-Coding-Process.md`
   - `Self-Analysis.md`
   - `Sensitive-Question-Answers.md`
   - `System-Design-Practice-Topics.md`
5. `fit/interview/prep/Interview-Prep-Template.md`를 읽는다. 형식별 가이드의 적용 여부는 JD를 읽은 뒤 판단하되 로드는 생략하지 않는다.
6. `My-Tech-Cards`의 8개 마스터 카드가 가리키는 카테고리와 회사 특이 기술 도메인을 `tech/`에서 찾고 정본 내용을 읽는다.
7. 정량 수치를 사용하기 전에 `/Users/mark/myown/school-manage/docs/business/STATUS.md`에서 최신 기준일과 수치를 확인한다. 활성, 누적, 레코드 수를 서로 바꾸어 쓰지 않고 포트폴리오 PDF의 수치가 오래됐을 가능성을 확인한다. 마스터와 회사별 문서의 현재형 수치는 이 정본과 항상 동기화하고, 과거 스냅숏에는 기준일을 명시한다.
8. 다른 사이드 프로젝트의 정본 경로가 추가되면 이 목록에 누적한다.
9. 유사 회사 회고가 필요하면 `fit/interview/**/Interview-Retro-*.md`에서 찾아 읽는다.

## 답변 생성

- 문서 헤더에 면접일을 적고 알 수 없으면 TBD로 둔다. JD URL이나 제공된 JD의 출처와 `Interview-Prep-Template` 링크를 함께 둔다.
- JD 분석에는 회사 개요와 포지션 정보, 회사 단계, 서비스, 도메인, 비즈니스 모델 추정 및 반복될 핵심 키워드를 포함한다.
- 자격요건과 우대사항을 분리해 각각 이력서 경험과 매칭하고 기술 스택은 동일, 유사, 없음으로 비교한다.
- JD 요구사항과 이력서 경험을 강, 중, 약으로 매칭한다. 강은 직접 경험과 성과가 있는 경우, 중은 관련 경험은 있으나 직접적이지 않거나 깊이가 부족한 경우, 약은 경험이 없거나 매우 부족한 경우다.
- `Self-Analysis`의 WHY, 질문 의도, 답변 시그널, 경험 치환과 메타 가이드를 처음부터 정렬한다.
- JD에 강한 몰입, 업무 강도나 온콜이 있으면 `My-FIT-Answers` 11번, AI 도구가 있으면 10번, 데이터 파이프라인이 있으면 `My-Tech-Cards` 2번과 3번을 우선 검토한다.
- 회사 문서는 마스터 fork, 회사 매핑 끝줄과 필요한 기술 본문을 흡수해 자기완결적으로 만든다. vault 링크만 남기지 않는다.
- 기술 예상 질문에는 정량 비교, 대안, 트레이드오프와 심화 꼬리질문을 포함한다.
- 예상 질문은 최소 24개를 만든다. 이력서 기반 7개 이상, JD 기반 7개 이상, 서비스 맥락 5개 이상, 컬처핏 5개 이상으로 구성한다.
- 역질문은 `My-Reverse-Questions`에서 3개에서 5개를 고르고 회사 특이 질문 1개에서 2개를 추가한다.
- 외부 귀책, 부정적인 단어와 답변 끝의 회사 연결을 점검한다.
- 전형에 과제가 있으면 과제 대비 항목을 추가하고, 매칭도가 강인 항목은 강하게 어필할 포인트로 정리한다.
- 사용자가 원하면 D-1 또는 당일 30분 복습용 Cheatsheet를 추가한다.

## 저장과 후속 처리

- 결과는 `fit/interview/{회사명}/{차수}/Interview-Prep-{회사명}-{차수}.md`에 만든다.
- 차수 자료는 회사 폴더 루트에 두지 않는다.
- 새 회사나 JD 링크를 추적해야 하면 `fit/job-search/Job-Search-Tracker.md`를 도메인 규칙에 따라 갱신한다.
- 작업 후 생성하거나 수정한 경로, 강점과 갭 및 우선 준비 사항을 보고한다.

## 프론트매터

```yaml
---
tags: [fit, interview, {회사영문명소문자}]
status: active
category: "Interview - Fit"
aliases: ["{회사영문명} Interview Prep", "{회사한글명} 면접 준비"]
---
```

루트와 도메인 `CLAUDE.md`의 PII, 표기, 답변 배치 및 이력서 복제 금지 규칙을 그대로 적용한다.
