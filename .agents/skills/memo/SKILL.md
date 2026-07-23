---
name: memo
description: Organize pasted notes, lecture notes, seminar notes, learning notes, blog posts, article URLs, or rough study material into this interview vault. Use when the user asks for memo 정리, 강의 내용 정리, 세미나 내용 정리, 학습 내용 정리, 이거 정리해줘, 블로그 or 아티클 정리, or asks to turn a URL/text into structured project notes.
---

# 메모 정리

강의, 세미나, 학습 메모, 블로그, 아티클, URL이나 거친 초안을 기존 vault 구조에 맞는 주제 중심 문서로 정리한다.

## 시작 전 필수 로드

1. 루트 `CLAUDE.md`를 읽는다.
2. 예상 대상이 `tech/`이면 `tech/CLAUDE.md`를 읽는다.
3. 예상 대상이 `fit/`이면 `fit/CLAUDE.md`와 해당 하위 도메인의 `CLAUDE.md`를 읽는다.
4. 대상 경로가 불명확하면 기존 인덱스와 파일을 확인한 뒤에도 남는 선택지만 사용자에게 묻는다.

## 입력 판별

- URL이면 원문을 가져온다. 추출이 부실하면 보조 검색을 하고, YouTube나 로그인 필요 페이지처럼 원문을 확인할 수 없으면 사용자에게 본문을 요청한다.
- URL의 주제나 사용 목적이 근거 확인 뒤에도 불명확할 때만 추정한 주제를 한 문장으로 말하고 확인받는다.
- 붙여 넣은 텍스트는 주제별로 분류한다. 서로 다른 주제가 섞였으면 문서를 나눈다.
- 텍스트에 객체 대체 문자 `￼`가 있으면 파일 접근이 가능한 범위에서 `~/Desktop/`의 관련 이미지를 확인한다.

## 대상 결정

- 관련 카테고리 인덱스를 먼저 읽고 기존 문서명, 체크리스트와 현재 분류를 확인한다.
- 같은 개념의 문서가 있으면 새 파일보다 기존 문서 보강을 우선한다.
- 여러 카테고리에 걸친 내용은 하나의 큰 문서로 강제하지 않고 가장 관련 있는 기존 카테고리에 나누어 반영한다.

### 카테고리 지도

- `tech/computer-science/`: CS와 프로그래밍
- `tech/web/`: 웹과 네트워크
- `tech/os-runtime/`: OS와 런타임
- `tech/database/`: 데이터와 저장소
- `tech/messaging-data-pipeline/`: 메시징과 데이터 파이프라인
- `tech/architecture-design/`: 아키텍처와 설계
- `tech/performance-scalability/`: 성능과 확장성
- `tech/infrastructure-cloud/`: 인프라와 클라우드
- `tech/ci-cd/`: CI/CD와 배포
- `tech/observability/`: 관측가능성
- `tech/reliability/`: 안정성 엔지니어링
- `tech/testing-quality/`: 테스트와 품질
- `tech/security/`: 보안
- `tech/fin-ops/`: 비용과 운영
- `tech/senior/`: 시니어 엔지니어링 역량
- `fit/`: 커리어, 면접과 학습 컨텍스트

카테고리 인덱스는 `*({EnglishName}).md` 형태를 우선 확인한다.

## 본문 작성 원칙

- 출처는 정리의 계기일 뿐 정리 대상이 아니다. 본문은 개념, 패턴, 용어 또는 기술 자체를 설명하는 재사용 가능한 레퍼런스로 쓴다.
- 블로그나 아티클 요약문을 만들지 않는다. 다른 출처를 추가해도 본문을 다시 쓰지 않고 `## 출처`에 한 줄만 더할 수 있도록 출처 중립적으로 작성한다.
- `원문에 따르면`, `저자는 이렇게 주장한다`, `이 글은 ...를 다룬다`, `원문의 핵심 주장`과 `필자가 강조한 것` 같은 표현을 쓰지 않는다.
- `원문 요약 -> 내 입장 -> 면접 답변 탄약` 구조를 쓰지 않는다. 사용자가 명시적으로 `fit/`의 면접 탄약 문서를 요청한 경우만 예외다.
- 정의, 동작 원리나 mental model, 예시, 트레이드오프, 운영 또는 면접 체크포인트, 관련 문서와 출처 순서를 기본 골격으로 사용한다.
- 저자 일화, 회사명과 연도 같은 일회성 정보는 핵심 설명으로 끌어오지 않는다. 필요하면 짧은 사례로 분리한다.
- 일반 본문을 통째로 코드 블록에 넣지 않는다. 실제 코드 예시에만 fenced code block을 사용한다.

## 프론트매터와 출처

새 지식 문서는 다음 형태를 사용한다.

```yaml
---
tags: [관련태그]
status: done
category: "카테고리명"
aliases: ["English Name", "한글명"]
---
```

출처는 문서 하단에 둔다.

```markdown
## 출처

- [제목 - 매체/저자](URL)
```

## 연결과 진행률

- 완료한 기존 계획 항목은 카테고리 인덱스에서 `[ ]`를 `[x]`로 바꾼다. 새 주제면 기존 형식에 맞춰 항목을 추가한다.
- 지식 문서 하단의 `## 관련 문서`를 갱신한다.
- 실제 대상이 존재하는지 확인한 뒤 `[[파일명|표시명]]`을 사용한다.
- 카테고리 인덱스 수량이 바뀌면 `README.md` 진행률을 갱신한다.
- 루트와 도메인 `CLAUDE.md`의 문서 길이, 폴더 분할, PII와 표기 규칙을 따른다.

## 세미나와 일반 학습 구분

- 사용자가 세미나라고 표현하면 주제 중심 지식 문서를 만들거나 보강하고 원본 맥락도 `status: seminar`로 보존한다.
- 세미나 원본은 성격에 따라 `fit/seminar/companies/`, `fit/seminar/career/` 또는 `fit/seminar/meetups/`에 둔다. 근거 확인 뒤에도 분류가 불명확하면 사용자에게 묻는다.
- 세미나 원본은 세션별로 구조화하고 README의 세미나 섹션 및 관련 카테고리 인덱스의 현장 사례와 연결한다.
- 강의, 일반 학습과 공부 메모는 지식 문서만 만들고 사용자가 요청하지 않으면 별도 원본 파일을 보존하지 않는다.
