---
tags: [cs, javascript, code-quality, refactoring, readability, interview]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Code Readability", "코드 가독성", "JS 다크패턴", "Dark Patterns"]
---

# 코드 가독성 — 영리한 코드는 리뷰를 통과하지 못한다

Artem Sapegin의 글 *"Code Smells: Don't Make Me Think"* (지우초의 번역) 요약. **"짧은 코드 ≠ 명확한 코드"** 라는 원칙 아래, JS/CSS에서 자주 발견되는 "영리해 보이지만 읽기 어려운" 패턴을 대체 표현과 함께 정리한다.

> "영리한 코드는 구직 면접 문제나 언어 퀴즈에서는 가끔 볼 수 있지만, 코드 리뷰를 통과하지 못한다."

> "우리는 현재의 나를 위해 코드를 작성해서는 안 된다. 몇 년 후의 나를 위해 작성해야 한다."

## JavaScript 다크패턴 7가지

### 1. 문자열 연결
`.toString().concat("%")` → **템플릿 리터럴** `` `${percent}%` ``

### 2. `~indexOf` (비트 NOT으로 -1 체크)
`~url.indexOf("id")` → **명시적 메서드** `url.includes("id")`

### 3. `~~num` (소수점 제거)
`~~3.14` → **명확한 함수** `Math.trunc(3.14)`

### 4. 배열 길이 합산 체크
`dogs.length + cats.length > 0` → **OR로 분리** `dogs.length > 0 || cats.length > 0`

### 5. `split + slice`로 파일명 추출
`header.split("filename=")[1].slice(1, -1)` → **정규식 or URLSearchParams**
둘 다 의도가 "따옴표 사이의 값을 꺼낸다"는 것이 코드 자체에 드러나야 한다.

### 6. 조건부 스프레드 `...(condition && obj)`
조건이 falsy일 때 AND의 결과가 boolean이 되어 스프레드가 이상해진다. **삼항 연산자** `...(cond ? obj : {})` 또는 **필드 내부로 조건 이동** `{ value: cond ? 42 : undefined }` 사용.

### 7. `[...Array(10).keys()]` (0~9 배열)
암호화된 관용구. **`Array.from({ length: 10 }, (_, i) => i)`** 로 의도를 드러낸다.

### 회색 지대: `.filter(Boolean)`
간결하지만 **0과 빈 문자열도 제거**된다. null만 거르고 싶다면 명시적으로 `(item) => item != null`. 의도가 모호한 `Boolean` 축약은 버그의 근원이 될 수 있다.

---

## "차이를 드러내기" — 반복 속 다름을 명시적으로

### 중복 제거로 의도 명확화
동일한 표현식이 두 번 나오면 변수로 추출한다. 미래의 독자가 "두 값이 진짜 같은지" 비교할 필요가 없어진다.

### 함수 분리로 규칙 드러내기
`data-enzyme-id`는 `-`로, `data-codeception-id`는 `_`로 조인하는 경우, 인라인 템플릿 리터럴로 두면 차이가 잘 안 보인다. `joinEnzymeId`, `joinCodeceptionId` 함수로 이름을 붙이면 **"규칙이 다르다"** 는 사실 자체가 코드에 등장한다.

### 조건을 함수 호출 내부로 이동
```
if (documentId) { dispatch(changeX(true)); return; }
dispatch(changeX(false));
```
→ `dispatch(changeX(documentId !== undefined))` 한 줄로.

### 중첩 삼항 연산자 해체
중첩 삼항은 한 줄에 2개의 if를 쑤셔넣은 것과 같다. 배열 정규화(`_.castArray`) 후 `.map()` 하는 식으로 **단일 파이프라인**으로 평탄화한다.

---

## 평행 구조 (Parallel Structure)

### React 조건 분기 일관성
`if (subrecipe) return <Link>` 후 `return name`처럼 early return과 tail return을 섞지 말고, **`if/else`로 평행 구조**를 유지. 독자가 "else는 어디 있지?"를 스캔하지 않아도 된다.

### 조건부 속성은 긍정문으로 통일
```
Platform.OS !== "web" ? A : undefined
Platform.OS === "web" ? B : undefined
```
→ 조건을 **한 방향**(`=== "web"`)으로 통일하여 "같은 조건에 다른 값"임을 보여준다.

### 변수 추출로 분기 덩어리화
여러 조건부 prop을 가진 컴포넌트는 `buttonProps = condition ? {...} : {...}` 변수로 분리 후 스프레드. JSX가 깔끔해지고 **분기 자체가 한 곳**에 모인다.

---

## CSS 축약 표현 — 순서 암기가 필요한 건 피한다

`margin: 1rem 2rem 3rem 4rem` (위/오른쪽/아래/왼쪽) 순서는 **규칙을 외워야 읽을 수 있다.** 이런 암묵지에 의존하는 코드는 리뷰에 부담이 된다.

**권장:**
- 단일 값만 축약 사용: `margin: 1rem`, `border-radius: 0.5rem`
- 방향이 필요하면 **논리 속성** 사용: `margin-block`, `margin-inline`
- `border: 1px solid #c0ffee`처럼 **순서가 다르면 어차피 에러**인 것은 허용

**피할 것:**
- `margin: 1rem 2rem 3rem` (3-값, 위·좌우·아래)
- `border-radius: 1em 2em 3em 4em` (4-값 모서리)
- `background: #bada55 url(...) no-repeat left top` (혼합 속성)

---

## 핵심 체크리스트

1. **"더 단순하고 읽기 쉬운 방법이 있는가?"** — 영리한 코드가 보이면 자동 반사로 물어라
2. **"이 조건이 정말로 필요한가?"** — `if (x) doA(true) else doA(false)` 같은 조건은 인자 안으로 밀어넣어라
3. **"축약이 코드를 짧게 만드는가, 읽기 쉽게도 만드는가?"** — 두 번째 질문이 핵심

---

## 나의 입장 (면접 답변 탄약)

**나는 이 철학에 강하게 동의한다.** 영리한 코드는 작성자의 자아를 만족시키지만, 팀의 인지적 비용을 누적시킨다. 프로 개발자는 "내가 이걸 할 줄 안다"를 과시하기보다 **팀의 읽는 속도를 최적화**해야 한다.

### Q. "좋은 코드란 무엇이라고 생각하시나요?"
> "저는 좋은 코드의 1순위 기준을 **가독성**으로 봅니다. 짧은 코드가 명확한 코드를 의미하지는 않는다고 생각하기 때문입니다. 예를 들어 `~indexOf`로 `-1`을 체크하는 비트 트릭보다 `includes()`가, `~~num`보다 `Math.trunc()`이 의도를 훨씬 잘 드러냅니다. 영리한 코드는 작성 시점의 자아를 만족시킬 수 있지만, 팀원이 이해하는 시간·리뷰 시간·버그 추적 시간을 모두 증가시킵니다. 저는 몇 년 후의 나나 다른 팀원이 읽었을 때 멈춤 없이 흐르는 코드를 목표로 합니다."

### Q. "코드 리뷰에서 어떤 부분을 주로 보시나요?"
> "첫째로 **의도가 코드 자체에 드러나 있는가**를 봅니다. 이름·구조·분기가 의도를 설명하는지 확인합니다. 두 번째로 **'차이'가 명확한지**를 봅니다. 반복되는 표현 중 일부만 다르면 그 차이가 눈에 띄도록 함수나 변수로 분리돼 있어야 합니다. 세 번째로 **순서나 암묵지에 의존하는 부분**을 경계합니다. 예를 들어 CSS 축약 속성의 네 방향 순서처럼 '규칙을 외워야 읽을 수 있는' 코드는 리뷰에서 지적합니다."

### Q. "리팩터링 기회를 언제 포착하시나요?"
> "리뷰나 유지보수 중 **'잠깐, 이게 뭐하는 거지?'** 하고 멈추는 순간입니다. 그 멈춤이 인지적 비용이고, 리팩터링의 신호입니다. 특히 중첩 삼항, 복잡한 조건부 스프레드, 비트 연산 트릭 같은 패턴을 보면 즉시 대체 표현을 제안합니다. 한 번 읽고 이해되는 코드가 결국 팀의 속도를 결정한다고 생각합니다."

---

## 관련 문서
- [[Readable-Code-Cognition|코드 가독성의 인지과학 (왜 어떤 코드는 읽기 쉬운가)]]
- [[Promise-Async|Promise와 Async]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
- [[Interview-Soft-Skills|면접 소프트 스킬]]
