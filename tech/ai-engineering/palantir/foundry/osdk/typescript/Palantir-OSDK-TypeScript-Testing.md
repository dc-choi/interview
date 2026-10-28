---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-28
category: "AI엔지니어링(AIEngineering)"
---

# OSDK mock, 로컬 통합 테스트와 Platform API 테스트

@osdk/unit-testing은 experimental이며 `/experimental` subpath로 import한다. createMockClient는 Client를 인자로 받는 Ontology 로직을 Foundry 요청 없이 시험한다. 이 테스트가 실제 OAuth, permission, Action 서버 validation이나 운영 성능을 확인하는 것은 아니다.

## 객체와 link

createMockOsdkObject에는 generated ObjectType과 primary-key property가 필요하다. `$title`을 읽는 테스트는 titlePropertyApiName과 실제 해당 property도 제공한다. 기본 mock RID와 실제 RID를 구별한다.

mock은 $primaryKey/$apiName/$objectType/$objectSpecifier/$link/$clone shape를 제공하지만 `$as`와 experimental accessor는 지원하지 않아 접근 시 throw한다. polymorphic React 예제를 이 mock으로 전부 검증했다고 보고하지 않는다.

single link는 object 또는 Error, many link는 object array 또는 MockObjectSet으로 설정한다. missing single link도 accessor는 있지만 fetchOne은 reject, WithErrors는 error Result다. array many-link는 primary-key fetch/page/async iteration을 지원하지만 aggregate는 안 된다. aggregate/where chain이 필요하면 MockObjectSet과 stub을 쓴다.

$clone은 merged/frozen 새 mock을 만들고 primary key 변경은 거부한다. attachment mock은 Blob/RID surface의 placeholder이지 업로드/1시간 보존을 검증하지 않는다.

## 호출 stub

when은 client부터 실제 call chain을 재구성한다. whenObjectSet은 특정 mock set, whenQuery는 Function과 parameter를 맞춘다. thenReturnObjects는 fetchPage와 asyncIter, thenReturnObject는 fetchOne, thenReturnAggregation은 metric 결과를 제공한다.

Query는 parameter별 thenReturn/thenThrow로 분기한다. stub 등록 순서가 matching을 정하지 않는다. 테스트마다 fresh client나 clearStubs를 사용한다. 임의 응답으로 반환 경로만 통과시킨 것을 원본 query 실행 검증으로 보고하지 않는다.

## 로컬 Ontology 서버로 통합 테스트

`@osdk/integration-testing`은 metadata와 seed 데이터를 로컬 Ontology 서버에 넣어 filter, object read, link와 aggregation의 조합을 평가한다. `IntegrationServer`는 Foundry CLI로 서버를 제어하고, `SeedClient`는 데이터를 구성하며, `IntegrationClient`는 OSDK 요청을 보낸다. 로컬 프로세스를 시작하므로 Node.js용이며 브라우저 테스트용이 아니다.

`@osdk/seed-helpers`, 호환되는 `@osdk/api`와 `@osdk/client`, generated SDK를 준비한다. Metadata로 서버를 생성해 시작한 뒤 client와 seed client를 얻는다. 예를 들어 서로 다른 office의 객체를 seed하고 `where`와 `aggregate` 결과를 비교하면 조회 결과를 미리 stub하지 않고 조합을 검사할 수 있다.

Seed 변경은 `await` 뒤 조회한다. `seed.ref()`는 동기 참조 조회이며 서버 반영을 기다리지 않는다. `seed.update()`는 primary key를 바꾸지 않고 property를 병합하며, 객체가 없으면 생성한다. 여러 변경을 묶는 seed callback은 동기로 작성한다. `seed.link()`로 넣는 관계는 양 끝에 문자열 primary key가 필요하고, 외래키 기반 관계는 해당 property를 seed한다.

Function query는 로컬 서버가 실행하지 않으므로 `whenQuery`로 stub한다. 테스트마다 `seed.set()`으로 데이터를 초기화하고 `client.clearStubs()`로 query stub을 별도로 지운다. 서버를 공유하면 순차 실행하고, 병렬 테스트는 서버를 분리한다. 실패 경로에서도 cleanup hook이나 `finally`로 `server.stop()`을 호출한다.

이 검사는 Foundry 권한, 배포된 function과 외부 서비스 검증을 대체하지 않는다. 공식 문서와 대조한 범위이며 로컬 서버나 실제 Foundry에서 실행한 결과는 아니다.

## Platform은 MSW

createMockClient는 @osdk/foundry.* 및 internal Platform API fetch를 intercept하지 않는다. 기본 mock.invalid origin의 실제 path에 MSW handler를 붙이고 onUnhandledRequest:error로 빠진 요청을 실패시킨다. server는 test lifecycle의 listen/resetHandlers/close로 격리한다.

fixture는 endpoint 함수의 Awaited<ReturnType<typeof fn>>와 satisfies로 실제 package 타입에 연결한다. compile-time shape 검사는 값 의미, 실제 서버 schema와 인증 성공까지 보장하지 않는다. 사용자명 suffix를 admin으로 보는 source 테스트는 예제 업무 predicate이지 Foundry 인가 모델이 아니다.

## 출처

- [Palantir, typescript-osdk-testing](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-testing)
- [Palantir, typescript-osdk-integration-testing](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-integration-testing)

## 관련 문서

- [[Palantir-OSDK-TypeScript]]
- [[Palantir-OSDK-Compatibility]]
- [[Palantir-OSDK-React-Task-Cache]]
