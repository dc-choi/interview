---
tags: [cs, typescript, diagnostics, debugging]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript 오류 진단", "TS 오류 메시지 읽기"]
verified_at: 2026-10-01
---

# TypeScript 오류 진단

오류를 없애는 데 앞서 어떤 계약이 어느 값과 충돌했는지 찾는다. `any`, 단언이나 임시 ambient 선언은 메시지를 숨길 수 있지만 잘못된 호출과 모듈 계약을 고치지는 않는다.

## 중첩된 오류 메시지 읽기

컴파일러는 대입이나 호출의 바깥 관계부터 충돌한 속성, 마지막으로 호환되지 않는 값까지 설명한다. 가장 안쪽 원인을 찾은 뒤 선언과 호출 중 어느 쪽이 실제 계약과 다른지 판단한다.

```typescript
interface Profile { name: string }
interface SendRequest { profile: Profile }

function send(request: SendRequest): void {}
const getName = (): string => "Lee";

send({ profile: { name: getName } }); // 오류: 함수는 string이 아님
send({ profile: { name: getName() } }); // 의도한 값 전달
```

바깥의 `SendRequest`를 느슨하게 바꿀 문제가 아니라 함수를 호출하지 않은 값의 문제다. 단언 전에 최소한의 재현으로 값, 추론 결과와 기대 타입을 나란히 확인한다.

## 이름과 모듈 오류 구분

| 진단 | 우선 확인할 경계 |
|---|---|
| TS2304, 이름을 찾을 수 없음 | 스코프, import, 전역 선언의 포함 여부 |
| TS2307, 모듈을 찾을 수 없음 | 실제 파일과 패키지, 경로와 대소문자, `exports`, 모듈 해석 설정 |
| TS7016, 선언 파일을 찾을 수 없음 | JavaScript 모듈은 찾았지만 대응 타입 선언이 없는지 |

TS7016이 발생하면 패키지에 타입이 포함되는지, 별도 `@types`가 있는지 확인하고 없으면 실제로 사용하는 API의 선언을 작성한다. `declare module "package";`는 경계를 `any`로 만드는 임시 우회이므로 정확한 API 계약과 같게 취급하지 않는다. [[TS-JavaScript-Migration|마이그레이션]]에 단계별 처리 기준이 있다.

## 실제 프로젝트 설정으로 재현

프로젝트에서 사용하는 컴파일러 버전을 확인한 뒤 같은 설정 파일을 지정한다.

```sh
tsc --version
tsc -p tsconfig.json --noEmit
tsc -p tsconfig.json --showConfig
tsc -p tsconfig.json --explainFiles --noEmit
tsc -p tsconfig.json --traceResolution --noEmit
```

`showConfig`는 상속을 합친 설정, `explainFiles`는 파일이 포함된 이유, `traceResolution`은 import 대상 탐색 과정을 확인할 때 사용한다. 전체 로그를 계속 켜 두기보다 문제 경계에 필요한 출력만 읽는다. 파일을 직접 넘기는 CLI 호출은 프로젝트 모드와 같지 않으므로 프로젝트 재현은 `-p`를 기준으로 한다. 버전별 CLI 변화는 설치한 컴파일러의 `--help`도 확인한다.

에디터와 CLI 결과가 다르면 사용 중인 TypeScript 버전과 프로젝트 선택부터 비교한다. 설정을 바꾸기 전에 진단에 실제로 참여한 파일과 선언을 확인하며, 의존성 삭제나 lockfile 재생성을 첫 조치로 삼지 않는다.

## 테스트와 전역 선언 충돌

DOM, 서버, worker, 테스트 프레임워크 선언이 한 프로그램에 들어오면 같은 이름에 다른 계약이 겹칠 수 있다. 테스트 전역 타입은 테스트 설정에, 서버와 브라우저 전역은 해당 환경 설정에 둔다. `types`와 `lib`의 역할, 버전별 기본값은 [[option|컴파일러 옵션]]을 참고한다.

테스트 실행기나 변환기가 TypeScript 문법을 제거했다고 타입 검사까지 끝난 것은 아니다. 테스트 실행 결과와 `tsc --noEmit` 결과를 따로 확인한다. `skipLibCheck`는 선언 파일 검사 범위를 줄이는 옵션이며 잘못된 전역 조합이나 런타임 불일치를 수정하는 기능이 아니다.

## 런타임 예외도 별도 계약

JavaScript는 `Error` 인스턴스뿐 아니라 문자열이나 다른 값도 throw할 수 있다. `strict`의 `useUnknownInCatchVariables`는 catch 절의 값을 좁히도록 요구한다.

```typescript
try {
  runJob();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  reportFailure(message);
}
```

`Promise<T>`는 reject 사유를 표현하지 않으며 `.catch()` 콜백에 이 옵션이 그대로 적용되지도 않는다. 자세한 경계는 [[TS-Generics|Promise 제네릭]]을 참고한다. 정상적인 업무 실패는 판별 유니온 결과로 표현하고, 예상하지 못한 예외는 별도 오류 처리 정책을 둔다.

## 관련 문서

- [[TS-Module-Boundaries|모듈 경계]]
- [[compile|타입 오류와 emit]]
- [[TS-Any-Boundaries|any를 제한하는 경계]]
- [[TS-Type-Design-Principles|업무 상태와 실패 모델]]

## 출처

- [TypeScript Deep Dive, Interpreting Errors — Basarat](https://basarat.gitbook.io/typescript/main/interpreting-errors)
- [TypeScript Deep Dive, Common Errors — Basarat](https://basarat.gitbook.io/typescript/main/common-errors)
- [TypeScript Deep Dive, Testing — Basarat](https://basarat.gitbook.io/typescript/intro-1)
- [TypeScript, tsc CLI Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [TypeScript TSConfig, useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html)
- [TypeScript, Choosing Compiler Options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
