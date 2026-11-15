---
tags: [kotlin, cli, toolchain, migration]
status: done
verified_at: 2026-11-15
category: "CS - Kotlin"
aliases: ["Kotlin 러너 명령 kotlinr", "Kotlin Runner Command kotlinr"]
---

# Kotlin 러너 명령의 kotlinr 전환

Kotlin 명령줄 배포판에는 소스를 컴파일하는 `kotlinc`와 컴파일한 프로그램이나 스크립트를 실행하는 러너가 있다. Kotlin 2.4.20(2026-09-07 릴리스)에서 러너 명령이 `kotlin`에서 `kotlinr`로 바뀌었다. `kotlin`이라는 이름은 새 빌드 도구인 Kotlin Toolchain의 명령과 겹치기 때문이다.

## 무엇이 바뀌었나

| 버전 | 러너 명령 | `kotlin` 명령의 상태 |
| --- | --- | --- |
| 2.4.0 이하 | `kotlin` | 공식 러너 명령 |
| 2.4.10 | `kotlin`, `kotlinr` | `kotlinr`가 배포판에 함께 들어간다(KT-86930) |
| 2.4.20 이상 | `kotlinr` | 릴리스 문서에 따르면 사용 시 경고를 내고 `kotlinr`를 권한다 |

- 릴리스 문서가 밝힌 이유는 Kotlin Toolchain의 `kotlin` 명령과 이름이 충돌하지 않게 하는 것이다. JetBrains의 소개 영상은 비운 `kotlin` 명령을 Kotlin Toolchain의 통합 진입점으로 쓸 계획이라고 설명한다.
- 2.4.21 태그 기준 배포판 소스에는 `kotlin` 스크립트가 남아 있어 여전히 러너를 실행한다. 경고 문구는 릴리스 문서의 설명이며 로컬 실행으로 확인하지 않았다.
- 2026-11-15 확인한 릴리스 문서에는 기존 `kotlin` 러너 명령의 제거 시점이 없다. 경고는 이름을 옮기라는 신호이므로 지금 동작하는 호출도 앞으로 계속 동작한다고 가정하지 않는다.
- 컴파일러 명령 `kotlinc`의 이름은 이번 변경 대상이 아니다. 같은 릴리스에서 Experimental로 나온 컴파일러 native image는 `kotlinc` 자리에 그대로 쓸 수 있는(drop-in replacement) 별도 배포물이며 지원 컴파일러 플러그인이 제한된다. 러너 이름 변경과는 다른 항목이다.

## Kotlin Toolchain

- Kotlin Toolchain은 JVM, Android, iOS, 멀티플랫폼과 서버 애플리케이션을 하나의 진입점에서 빌드하고, 모듈의 `module.yaml`에 선언형 설정을 두는 도구다.
- 2026-11-15 확인한 문서 기준 안정성 수준은 Alpha다. Alpha 단계에서는 호환성을 깨는 변경이 예상되고 기능이 크게 바뀌거나 중단될 수 있으므로 기존 Gradle 빌드를 바로 대체할 근거로 쓰지 않는다.
- 러너 이름 변경은 Kotlin Toolchain을 도입하지 않는 프로젝트에도 영향을 준다. 셸 스크립트나 CI가 명령줄 배포판의 `kotlin`을 직접 호출하면 릴리스 문서 기준 2.4.20 이후 배포판에서 경고가 나온다.

## 이전 점검

- 저장소와 CI 설정, Dockerfile, 셸 스크립트에서 명령줄 배포판의 `kotlin` 호출을 찾아 `kotlinr`로 바꾼다. Gradle로만 실행하는 프로젝트라면 이 호출이 없을 수 있다.
- 바꾼 뒤에는 러너를 쓰는 환경의 Kotlin 배포판이 2.4.10 이상인지 확인한다. 2.4.0 이하 배포판에는 `kotlinr`가 없으므로, 여러 버전이 섞인 환경에서는 버전을 맞춘 뒤 바꾼다.
- 같은 장비에 Kotlin Toolchain을 설치하면 `kotlin`이 어느 도구를 가리키는지 `PATH` 순서에 따라 달라질 수 있다. 스크립트에는 의도한 명령 이름을 명시한다.
- Homebrew와 SDKMAN 같은 패키지 관리자에서 명령 이름이 어떻게 배포되는지는 공식 릴리스 문서에서 확인하지 못했다. 설치 경로별 동작은 실제 환경에서 확인한다.

## 출처

- [Kotlin, What's new in Kotlin 2.4.20](https://kotlinlang.org/docs/whatsnew2420.html)
- [The Kotlin Toolchain](https://kotlin-toolchain.org/latest/)
- [Kotlin 2.4.10 — JetBrains/kotlin (GitHub Releases)](https://github.com/JetBrains/kotlin/releases/tag/v2.4.10)
- [compiler/cli/bin/kotlin, v2.4.21 — JetBrains/kotlin (GitHub)](https://github.com/JetBrains/kotlin/blob/v2.4.21/compiler/cli/bin/kotlin)
- [Kotlin, Stability of Kotlin components](https://kotlinlang.org/docs/components-stability.html#stability-levels-explained)
- [kotlin is now kotlinr — Kotlin by JetBrains (YouTube)](https://www.youtube.com/watch?v=yjvTmiJlTJE)

## 관련 문서

- [[Kotlin-Lazy-Assertion-Messages|Kotlin 지연 assertion 메시지]]
- [[Kotlin-JS-Suspend-Lambda-Export|Kotlin/JS suspending 람다 내보내기]]
