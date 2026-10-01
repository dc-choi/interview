---
tags: [testing, fixture, test-data, domain-model]
status: done
verified_at: 2026-09-30
category: "테스트&품질(Testing&Quality)"
aliases: ["상태별 픽스처", "시나리오 준비 메서드", "Named State Reaching Method", "Testcase Superclass"]
---

# 상태별 픽스처와 시나리오 준비

상태 전이가 있는 도메인 모델을 테스트할 때 특정 상태의 객체를 만드는 법, 여러 테스트가 반복하는 준비 코드를 모으는 법, 중첩된 결과를 한 번에 비교하는 법을 다룬다. 팩토리 기본형과 무작위 fixture는 [[Test-Fixture|Test Fixture 전략]]에 있다.

## 상태별 픽스처는 전이 메서드로 만든다

- 애그리거트마다 픽스처를 하나씩 두고 이름 규칙을 맞춘다(`createMember`, `createInstructor`, `createActiveInstructor`). 속성이 늘어도 고칠 곳이 한곳으로 모이고, 이름만 보고 어떤 상태의 객체인지 안다. 한 애그리거트만 픽스처 없이 만들면 테스트마다 생성 방식이 달라진다.
- 특정 상태의 객체를 돌려주는 메서드(xUnit Test Patterns의 Named State Reaching Method)는 상태 필드를 직접 채우지 않고 도메인의 전이 메서드를 호출한다. 활성 강사는 신청 뒤 `approve()`로, 공개 강의는 생성, 필수 정보 입력, 검수 신청, 공개 순으로 만든다.
- 이유: 픽스처가 도메인이 허용하지 않는 상태(검수 없이 공개된 강의)를 만들면 운영에서 도달할 수 없는 상태로 테스트가 통과한다. 공개 전에 검수를 요구하도록 규칙이 바뀌면 전이를 거치는 픽스처가 한곳에서 먼저 깨져 영향 범위가 드러난다.
- 대가: 준비 단계가 길어지고 전이 규칙이 바뀌면 준비도 함께 고쳐야 한다. 상태로 가는 경로를 메서드 하나에 모아 두면 수정도 한곳에서 끝난다.
- 무작위 생성기는 도메인 생성 메서드와 전이 메서드를 호출하지 않고 필드를 직접 채울 수 있다([[Test-Fixture#Instancio 기본 API|Instancio 기본 동작]]). 생성기는 요청 객체와 관심 없는 값에 쓰고, 엔티티는 그 입력으로 도메인 생성 메서드와 전이 메서드를 호출해 만든다.

```ts
export const createActiveInstructor = (member = createActiveMember()): Instructor => {
  const instructor = Instructor.apply(member, { introduction: '백엔드 강의를 합니다' });
  instructor.approve(); // 상태 필드를 직접 넣지 않는다
  return instructor;
};
```

## 반복되는 시나리오 준비를 모은다

애플리케이션 서비스와 리포지토리 테스트는 회원, 강사, 강의처럼 여러 애그리거트를 먼저 저장해야 실행된다. 준비를 테스트마다 복사하면 본문이 준비에 묻히고, 준비 방식이 바뀔 때 모든 테스트를 고쳐야 한다.

1. 같은 준비가 두 번째로 반복되면 의도가 드러나는 이름의 메서드로 추출한다(Creation Method). 예: `prepareMember`, `prepareInstructor`, `preparePublishedCourse`, `prepareCourseWithCurriculum`.
2. 여러 테스트 클래스가 쓰기 시작하면 공통 위치로 옮긴다. 추상 상위 클래스(Testcase Superclass, 예: `BaseApplicationServiceTest`, `BaseRepositoryTest`)로 끌어올리거나(Pull Up Method) 별도 헬퍼 객체(Test Helper)에 둔다.
3. 각 테스트는 필요한 준비 메서드를 본문에서 직접 호출한다(Delegated Setup). 본문에는 준비 호출, 실행, 검증만 남고, 준비 메서드 이름이 전제를 드러낸다.

처음부터 베이스 클래스를 설계하지 않고 반복이 드러날 때 추출한다. 준비 메서드는 테스트가 관심 있는 값만 인자로 받는다(`prepareCourse(instructor, title)`). 공개 여부처럼 결과 상태가 갈리면 불리언 인자 대신 메서드를 나눈다(`preparePublishedCourse`). 플래그 인자는 호출부에서 어떤 준비인지 읽기 어렵게 만든다.

| 둘 곳 | 맞는 조건 | 실패 양상 |
|---|---|---|
| 추상 상위 클래스 | 테스트 클래스들이 같은 주입 대상과 준비를 공유하고, 상속을 다른 용도로 쓰지 않는다 | 단일 상속이라 설정이 다른 계열의 준비를 함께 물려받기 어렵다 |
| 헬퍼 객체 | 여러 계열이 준비를 함께 쓰거나, 준비가 상위 클래스에서 보이지 않는 타입에 의존한다 | 헬퍼를 만들거나 주입하는 코드가 테스트 클래스마다 필요하다 |
| 암묵적 공통 준비(`@BeforeEach`, `beforeEach`) | 그 범위의 모든 테스트가 같은 초기 상태를 쓴다 | 준비가 본문 밖에 있어 원인과 결과가 안 보이고(Mystery Guest), 모든 테스트의 준비를 모으면 테스트마다 필요 이상으로 큰 fixture가 된다(General Fixture) |

Jest의 `describe`와 `it`에는 상속할 테스트 클래스가 없으므로 NestJS 테스트에서는 헬퍼 객체 방식이 자연스럽다. `TestingModule`에서 리포지토리를 꺼내 준비 메서드를 가진 객체를 만들고, 각 테스트에서 `await scenario.preparePublishedCourse()`처럼 부른다.

## 중첩 구조는 기대 구조 객체로 한 번에 비교한다

섹션 안에 수업이 든 커리큘럼처럼 중첩된 애그리거트의 삭제나 이동을 요소마다 인덱스로 꺼내 확인하면 단언이 길어지고, 남아서는 안 되는 요소를 놓치기 쉽다. 기대 결과를 같은 모양의 값 트리로 쓰고 현재 상태를 그 모양으로 변환해 동등성 단언 한 번으로 비교한다(xUnit Test Patterns의 Expected State Specification, 다른 이름 Expected Object).

```ts
const toContent = (curriculum: Curriculum) => {
  return curriculum.sections.map(({ title, lessons }) => ({
    title,
    lessons: lessons.map((lesson) => lesson.title),
  }));
};

// 준비: S0 [L0, L1], S1 [L2], S2 [L3]
curriculum.removeSection(1); // 가운데 섹션의 수업은 앞 섹션 끝으로 옮겨진다

expect(toContent(curriculum)).toEqual([
  { title: 'S0', lessons: ['L0', 'L1', 'L2'] },
  { title: 'S2', lessons: ['L3'] },
]);
```

- 배열 비교는 순서와 개수까지 확인하므로 이동 순서 오류와 남은 요소가 함께 드러난다.
- 비교할 모양에는 검증에 필요한 속성만 담는다. ID나 생성 시각처럼 실행마다 바뀌는 값은 빼거나 고정한다.
- Java는 record의 `equals`가 같은 record 클래스이고 모든 구성 요소가 같을 때 참이므로, `SectionContent(title, List<LessonContent>)` 같은 record와 정적 팩토리 `section(...)`, `lesson(...)`으로 기대 구조를 짧게 쓴다.
- 여러 요소의 한 속성만 확인하면 AssertJ `extracting`, 중첩 목록은 `flatExtracting`으로 뽑아 비교한다(AssertJ 3.27 문서 기준). Jest에서는 `map`, `flatMap`으로 뽑은 배열을 `toEqual`로 비교한다.
- 현재 상태를 옮긴 값을 스냅샷이라 부르기도 하지만 Jest snapshot과는 다르다. `toMatchSnapshot`과 `toMatchInlineSnapshot`은 첫 실행의 출력을 기록해 기준으로 삼고, 기대 구조 객체는 사람이 기대값을 먼저 쓴다(Jest 30 문서 기준).
- 상태 검증과 행위 검증의 선택은 [[Classicist-vs-Mockist-Testing#상태 검증|상태 검증]]에 있다.

## 영속화 없이 ID가 필요할 때

수업 ID로 다음 수업을 찾는 도메인 단위 테스트처럼 저장하지 않은 객체에 ID가 필요하면 Spring의 `ReflectionTestUtils.setField`로 private 필드에 값을 넣는다. Spring Framework 7.0 문서도 setter 대신 private 필드 접근을 쓰는 JPA, Hibernate 엔티티를 이 도구의 용도로 든다. 필드 이름에 묶이는 준비이므로 ID가 필요한 테스트에만 쓰고, 테스트 때문에 ID 공개 setter를 만들지 않는다. TypeScript의 `private`은 타입 검사에서만 막혀 대괄호 접근(`lesson['id']`)이 허용되지만, `#` 필드는 런타임에도 막힌다.

## 출처

- [Creation Method — xUnit Test Patterns](http://xunitpatterns.com/Creation%20Method.html)
- [Testcase Superclass — xUnit Test Patterns](http://xunitpatterns.com/Testcase%20Superclass.html)
- [Test Helper — xUnit Test Patterns](http://xunitpatterns.com/Test%20Helper.html)
- [Delegated Setup — xUnit Test Patterns](http://xunitpatterns.com/Delegated%20Setup.html)
- [Obscure Test — xUnit Test Patterns](http://xunitpatterns.com/Obscure%20Test.html)
- [State Verification — xUnit Test Patterns](http://xunitpatterns.com/State%20Verification.html)
- [Pull Up Method — Refactoring Catalog](https://refactoring.com/catalog/pullUpMethod.html)
- [Flag Argument — martinfowler.com](https://martinfowler.com/bliki/FlagArgument.html)
- [Spring Framework 7.0, Unit Testing Support Classes](https://docs.spring.io/spring-framework/reference/testing/unit.html)
- [Java SE 26, Record](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Record.html)
- [AssertJ, Core Assertions Guide](https://assertj.github.io/doc/)
- [Jest, Snapshot Testing](https://jestjs.io/docs/snapshot-testing)
- [TypeScript Handbook, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [인프런, 토비, 코드 리뷰와 수정](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=457195)
- [인프런, 토비, 강의 애플리케이션 서비스 개발 (2)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=466440)
- [인프런, 토비, 강의 애플리케이션 서비스 개발 (4)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=466442)
- [인프런, 토비, 수강 애플리케이션 서비스 개발 (1)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=467531)
- [인프런, 토비, 수강 애플리케이션 서비스 개발 (3)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=468588)
- [인프런, 토비, 커리큘럼 도메인 개발 (1)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470528)
- [인프런, 토비, 커리큘럼 도메인 개발 (2)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470529)
- [인프런, 토비, 커리큘럼 도메인 개발 (4)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470531)
- [인프런, 토비, 코드 리뷰와 개선 리팩터링](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=471512)

## 관련 문서

- [[Test-Fixture|Test Fixture 전략]]
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist, Test Double]]
- [[Spring-Testing-Essentials|Spring Testing Essentials]]
- [[NestJS-Testing|NestJS Testing]]
- [[Test-Isolation|Test isolation]]
- [[JPA-Aggregate-Collection-Mapping|JPA 애그리거트 컬렉션 매핑]]
