---
tags: [growth, english, developer-english, communication, learning]
status: done
category: "Growth & Fit"
aliases: ["Developer English", "개발자 실무 영어", "Software English", "Working English"]
---

# 개발자 실무 영어

개발 영어는 토익식 영어나 일반 비즈니스 영어와 다르다. 코드, 문서, 깃허브, 스택오버플로에서 실제로 쓰이는 표현을 익히는 게 핵심이다. 목표는 "영어를 잘하는 것"이 아니라 **개발 상황을 영어로 정확히 설명하는 것**이다. 관사, 단복수, 전치사, 깃 동사, 코드 설명 동사 같은 작은 표현이 쌓이면 공식 문서 읽기, 코드 리뷰, 오픈소스 기여, 해외 취업이 훨씬 수월해진다.

## 일반 영어와 의미가 다른 단어

같은 단어라도 기술 맥락에서는 사전 1번 뜻이 아닌 경우가 많다. 단어를 사전 뜻으로 외우지 말고 맥락에서 익혀야 한다.

| 단어 | 일반 뜻 | 개발 맥락 뜻 |
|---|---|---|
| run | 달리다 | 프로그램을 실행하다 |
| cast | 던지다, 배역을 정하다 | 형변환하다 |
| render | 어떤 상태가 되게 하다 | 화면에 그리다, 페이지를 만들다 |
| commit | 약속하다, 저지르다 | 변경을 기록하다 |
| resolve | 결심하다 | 충돌, 의존성을 해결하다 |

## 관사와 단복수

한국어는 단복수를 엄격히 구분하지 않아도 자연스럽지만 영어는 다르다. **처음 언급하면 `a/an`, 이미 언급한 대상이면 `the`**.

- There is **a** PR. → (다시 언급) Merge **the** PR.
- `issue`, `PR`, `function`, `variable`은 가산 명사: an issue, two issues
- `code`는 보통 **불가산 명사**: 양을 셀 수 없다

```text
I wrote a lot of code today.   (O)
I wrote many codes today.      (X — 개발 맥락에서 어색)
```

## 전치사: 의미의 방향과 위치

전치사는 암기보다 상황으로 익힌다.

| 상황 | 전치사 | 예 |
|---|---|---|
| 브라우저 안에서 | in | in Safari, in Chrome |
| 운영체제 위에서 | on | on macOS, on Windows |
| 함수에 값 전달 | pass ... to | Pass data to the function. |
| 변수에 값 할당 | assign ... to | Assign a value to a variable. |
| 브랜치에 커밋이 있음 | on | on the main branch |
| 브랜치로 푸시 | push to | Push commits to the branch. |
| 브랜치 병합 | merge into | Merge a feature branch into the base branch. |

## 약어와 슬랭

협업 대화의 분위기를 좌우하므로 알아야 한다.

| 약어 | 풀이 | 의미 |
|---|---|---|
| PR | Pull Request | 풀 리퀘스트 |
| LGTM | Looks Good To Me | 좋아 보임, 머지해도 됨 |
| FYI | For Your Information | 참고로 |
| AFK | Away From Keyboard | 자리 비움 |
| OOO | Out Of Office | 부재중 |
| WIP | Work In Progress | 작업 중 (미완성 PR) |
| TBD | To Be Determined | 미정 |

## 개발 용어 발음 (강세 주의)

눈에 익어도 말로 하면 막히는 단어들. 강세 위치가 핵심이다. 발음 필터 재훈련 원리는 [[English-Learning-Phonics|개발자 영어 발음 학습법]] 참조.

| 단어 | 한국식 오류 | 실제 강세 |
|---|---|---|
| parameter | 파라미터 | pə-**RAM**-i-ter |
| deprecated | 디프리케이티드 | **DE**-pre-cated |
| asynchronous | 어싱크로너스 | a-**SYN**-chro-nous |
| execute | 엑세큐트 | **EK**-si-kyoot |
| height | 헤이트 | 하이트 (hīt) |

## 특수문자 영어 이름

코드 리뷰, 페어 프로그래밍에서 의외로 자주 필요하다.

| 기호 | 이름 | 기호 | 이름 |
|---|---|---|---|
| `()` | parentheses | `#` | hash |
| `[]` | brackets | `@` | at sign |
| `{}` | curly brackets, braces | `*` | asterisk |
| `<>` | angle brackets | `~` | tilde |
| `_` | underscore | `\` | backslash |
| `/` | slash | `.` | dot |

## 깃 커밋 메시지

커밋 메시지는 문학이 아니라 라벨이다. 짧고, 정확하고, 변경 의도가 보이면 충분하다.

- **동사 원형(명령형)으로 시작**: Fix login bug / Update README / Add user validation / Remove unused imports
- 짧게 쓰기 위해 **관사를 자주 생략**한다 (일반 문장이면 필요할 자리도)
- Conventional Commits는 타입을 앞에 붙인다:

```text
feat: add user profile page
fix: resolve login error
docs: update README
refactor: simplify auth logic
test: add unit tests
```

## 깃 협업 동사

| 동작 | 표현 | 예 |
|---|---|---|
| 커밋 합치기 | squash | Squash the last three commits. |
| 브랜치 병합 | merge into | Merge a feature branch into the base branch. |
| PR 되돌리기 | revert | Revert the pull request. |
| 리뷰 요청 | request a review | Request a review. |
| 댓글 달기 | comment on | Comment on a pull request. |
| 충돌 해결 | **resolve** (not solve) | Resolve merge conflicts. |

## 코드 설명 동사

| 동작 | 표현 | 예 |
|---|---|---|
| 값 할당 | assign ... to | Assign a value to a variable. |
| 인자 전달 | pass ... to | Pass arguments to the function. |
| 인자 받기 | accept / take | The function accepts two parameters. |
| 배열 순회 | iterate over/through, loop over/through | Iterate over a string array. |
| 조건 평가 | evaluate to | The conditional statement evaluates to true. |

## 제어 흐름 표현

- 반복문 자체 = `loop`, 반복 한 번 = `iteration`, 반복문 본문 = `loop body`
- 반복문 탈출: `break out of` / `jump out of` / `exit out of the loop`
- `continue`로 한 번 건너뛰기: `jump over an iteration`

```text
Execute the loop body.
Break out of the loop.
Jump over an iteration.
```

## 산술 연산 말하기

| 연산 | 표현 | 예 |
|---|---|---|
| `+` | plus | Two plus three is five. |
| `-` | minus | Five minus three is two. |
| `*` | times, multiplied by | Five multiplied by two is ten. |
| `/` | divided by | Five divided by three is one. |
| `%` | mod, modulo | Ten mod three is one. |
| `x²` | squared | Five squared is twenty-five. |
| `x³` | cubed | Five cubed is one hundred twenty-five. |
| `xⁿ` | to the power of | Five to the power of two is twenty-five. |

## 네이밍 컨벤션과 공백

- 앞쪽 공백 = `leading whitespace`, 뒤쪽 공백 = `trailing whitespace`
- 앞뒤 공백 제거 = `trim` → Trim leading and trailing whitespace.

| 표기 | 이름 |
|---|---|
| `studentCount` | camel case |
| `student_count` | snake case |
| `student-count` | kebab case |
| `StudentCount` | Pascal case |

## 공부법

- 토익, 일반 영어보다 **실제 개발자가 쓰는 자료**가 효율적이다. 깃허브 유명 오픈소스 저장소의 PR 토론, 이슈 댓글, 스택오버플로 답변이 최고의 교재다.
- React, Kubernetes, TensorFlow 같은 대형 프로젝트에서 실무 개발자의 단어 선택과 문장 구조를 관찰한다.
- 읽기만 하지 말고 소리 내어 읽고, 같은 구조의 문장을 직접 써본다.
- 가장 좋은 연습은 **오늘 배운 표현을 실제 커밋 메시지, PR 설명, 코드 주석, 이슈 댓글에 바로 써보는 것**이다.

## 관련 문서

- [[English-Learning-Phonics|개발자 영어 발음 학습법]] — 발음 필터 재훈련, 학습 순서
- [[Self-Development-While-Working|일하면서 자기계발]] — 영어 학습 복리 효과
- [[Global-IT-Interview|글로벌 IT 면접]] — 영어 면접 대비

## 출처

- [글로벌 개발자를 위한 소프트웨어 실무 영어 — YouTube](https://www.youtube.com/watch?v=fBlf_vml5w4&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=5)
