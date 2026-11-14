---
tags: [kotlin, kotlin-js, typescript, coroutine, interop]
status: done
verified_at: 2026-11-15
category: "CS - Kotlin"
aliases: ["Kotlin/JS suspending 람다 내보내기", "Kotlin JS Suspend Lambda Export"]
---

# Kotlin/JS에서 suspending 람다를 async 함수로 내보내기

Kotlin 2.4.20 이상에서 컴파일러 옵션 `-Xsuspend-lambda-exporting`을 켜면, Kotlin/JS 라이브러리가 `@JsExport`로 공개하는 API에 `suspend () -> String` 같은 suspending 함수 타입 매개변수를 둘 수 있고, JavaScript와 TypeScript 호출자는 그 자리에 일반 `async` 함수를 넘길 수 있다. Kotlin 2.4.20(2026-09-07 출시) 릴리스 문서가 이 기능을 소개하며, 그 전에는 suspending 람다를 포함한 선언을 Kotlin/JS 라이브러리에서 내보낼 방법이 없었다.

## 동작

Kotlin 쪽은 내보낼 선언에 `@JsExport`를 붙이고 suspending 함수 타입을 그대로 매개변수로 쓴다.

```kotlin
@JsExport
class TaskRunner {
    suspend fun runTask(task: suspend () -> String): String {
        return task()
    }
}
```

TypeScript 쪽에서는 suspending 람다 자리가 일반 `async` 함수로 보인다.

```typescript
import { TaskRunner } from "..."
const runner = new TaskRunner();
const result = await runner.runTask(async () => "done");
console.log(result); // "done"
```

예제는 릴리스 문서의 코드이며 로컬에서 컴파일하거나 실행하지 않았다. 생성되는 `.d.ts` 선언의 정확한 형태는 릴리스 문서에 나오지 않으므로 채택할 때 빌드 산출물에서 확인한다.

## 켜는 방법

컴파일러 인자 `-Xsuspend-lambda-exporting`으로 명시적으로 켠다. 컴파일러 레퍼런스는 `-X` 옵션의 이름과 동작이 예고 없이 바뀔 수 있다고 안내한다.

예제의 바깥 `suspend fun` 내보내기 자체는 Kotlin 2.3.0에서 Experimental 기능으로 `-Xenable-suspend-function-exporting` 옵션과 함께 소개됐다. 2.4.20에서 그 옵션이 여전히 필요한지는 확인하지 못했으므로 채택할 빌드에서 확인한다.

```kotlin
kotlin {
    js {
        compilations.all {
            compileTaskProvider.configure {
                compilerOptions {
                    freeCompilerArgs.add("-Xsuspend-lambda-exporting")
                }
            }
        }
    }
}
```

## 채택 판단

- 릴리스 문서는 이 기능을 Beta, Alpha, Experimental을 포함한 pre-stable 기능 목록에 넣고 있으나 셋 중 어느 단계인지는 적지 않았다(2026-11-15 확인). 공개 라이브러리의 안정 API로 약속하기 전에 이후 버전의 상태 변화를 확인한다.
- 릴리스 문서는 Kotlin/Wasm에 같은 기능을 안내하지 않는다. Wasm 타깃에도 있다고 추정하지 않는다.
- (설계 적용) 비동기 콜백을 받는 API를 TypeScript에 공개할 때 콜백을 suspending 함수 타입 그대로 둘 수 있게 된다. 실제로 내보내지는지는 플래그를 켠 빌드의 산출물로 확인한다.

## 출처

- [What's new in Kotlin 2.4.20 — Kotlin](https://kotlinlang.org/docs/whatsnew2420.html#support-for-exporting-suspending-lambdas-as-async-functions)
- [What's new in Kotlin 2.3.0 — Kotlin](https://kotlinlang.org/docs/whatsnew23.html)
- [Kotlin, Use Kotlin code from JavaScript](https://kotlinlang.org/docs/js-to-kotlin-interop.html#jsexport-annotation)
- [Kotlin, Kotlin compiler options](https://kotlinlang.org/docs/compiler-reference.html)

## 관련 문서

- [[Kotlin-Swift-Interface-Interop|Kotlin 계약과 Swift 구현]]
- [[Kotlin-Lazy-Assertion-Messages|Kotlin 지연 assertion 메시지]]
