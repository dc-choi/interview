---
tags: [os, jvm, java, ffm, javascript, python, interop, virtual-thread]
status: done
verified_at: 2026-11-15
category: "OS&런타임(OS&Runtime)"
aliases: ["JVM Foreign Language Runtimes", "JVM 외부 언어 런타임 연동", "Project Detroit", "프로젝트 디트로이트"]
---

# JVM에서 외부 언어 런타임 쓰기

Java 애플리케이션에서 JavaScript나 Python 코드를 실행하는 방법은 크게 둘이다. 그 언어의 런타임을 JVM 위에 새로 구현하거나, 이미 있는 네이티브 런타임(V8, CPython)을 JVM 프로세스 안에 넣고 다리를 놓는 것이다. 두 방식 모두 `javax.script`(JSR 223) 스크립트 엔진 API로 노출할 수 있어 호출 코드는 비슷해 보이지만, 유지 비용과 장애 지점이 다르다.

## 두 전략

| 전략 | 예 | 얻는 것 | 치르는 것 |
|---|---|---|---|
| JVM 위에 재구현 | Rhino, Nashorn, GraalJS | 객체가 모두 Java 힙에 있어 GC 하나로 수명 관리, 깊은 상호 운용 | 언어 표준과 생태계를 계속 따라가는 구현 팀 |
| 네이티브 런타임 연결 | Project Detroit(V8, CPython) | 표준 런타임의 호환성과 성능, 실제 CPython에 설치한 Python 패키지 사용 | 경계 전환 비용, 두 런타임의 수명 관리, 스레드 모델 충돌 |

## Nashorn이 남긴 교훈

- Nashorn은 JDK 8에 들어간 JavaScript 엔진으로 ECMAScript 5.1을 구현했다. JDK 11에서 JEP 335로 제거 예고(deprecated for removal)됐고 JDK 15에서 JEP 372로 엔진, API와 `jjs` 도구가 함께 빠졌다. `javax.script` API 자체는 남았다.
- 지금은 독립 OpenJDK 프로젝트로 유지된다. `org.openjdk.nashorn:nashorn-core`(최신 15.7)는 Java 11 이상에서 쓸 수 있고 주 대상은 Java 15 이후다. ES6 일부(템플릿 문자열, `let`과 `const`, `Map`과 `Set` 등)를 지원한다.
- 2026 Devoxx 발표(Oracle Java 팀)는 제거 이유를 두 가지로 설명한다. ES2015부터 표준이 해마다 개정돼 작은 팀이 매년 따라잡아야 했고, Node.js 생태계와 호환하려면 V8과 버그까지 같아야 했다. 다른 언어의 런타임을 JVM 위에 다시 만드는 일은 장기적인 대규모 투자가 필요하다는 것이 발표의 결론이다.

## Project Detroit의 구조

OpenJDK의 Project Detroit는 V8과 CPython을 감싼 `javax.script` 엔진을 만든다. 아래 표는 2026-11-15 확인한 두 저장소 기준이다. README에는 성숙도 표기가 없고, 발표는 두 구현 모두 실험 단계라고 소개했다.

| 저장소 | 연결 방식 | 요구 조건 | 특징 |
|---|---|---|---|
| `openjdk/detroit-js` | JNI. `src/native`의 C++ glue(`jvmv8_jni.cpp` 등)가 V8을 호출한다 | JDK 25, V8 14.4.221, C/C++ 툴체인 | 엔진 이름이 둘이다. `v8`은 호스트 Java 런타임에 넓게 접근하고, README가 권하는 `v8-no-java`는 임베딩한 Java 쪽이 콜백 등으로 명시적으로 허용한 것만 노출한다 |
| `openjdk/detroit-python` | FFM. `Python.h`에서 jextract로 바인딩을 생성하고 `--enable-native-access`로 실행한다 | JDK 25, Python 3.14 | README는 pyenv로 만든 Python 3.14 환경을 안내한다. 발표 시연은 같은 환경에 pip로 설치한 gradio, transformers와 PyTorch를 그대로 불러 썼다 |

`detroit-python` README는 임의의 신뢰할 수 없는 Python 코드 실행을 강하게 말린다. `detroit-js` README의 같은 경고는 `v8` 엔진에 대한 것이며 대신 `v8-no-java`를 쓰라고 권한다. 어느 쪽도 샌드박스를 제공한다고 하지 않으므로 신뢰 경계로 쓰지 않는다(해석). npm 패키지는 발표 질의응답에서 기본 V8을 쓰니 로컬 npm 환경을 그대로 쓰면 된다는 답이 있었지만, 저장소 문서에는 설명이 없다. Node.js의 파일 시스템, 소켓 API는 V8 위에 Node.js가 더한 것이므로 이에 의존하는 패키지가 그대로 돈다고 가정하지 않는다.

발표에 따르면 JS 엔진은 FFM이 없던 2017년 시제품부터 JNI로 작성됐고 FFM 전환을 계획 중이다. 전환이 jextract 실행 한 번으로 끝나지 않는 이유는 V8이 C++ 라이브러리라는 데 있다. 함수 하나를 부르려면 Locker, Isolate scope, Handle scope, 예외 처리기를 만들고 닫는 RAII 단계가 필요하다. 발표는 이를 평평한 C API로 감싸 jextract로 바인딩하는 방식을 실험 중이라고 소개했다. 발표 보고값으로 네이티브 코드가 약 7,000줄에서 2,000줄 미만으로 줄었다. 저장소의 현재 구현은 아직 JNI다.

## 경계에서 생기는 문제

### 전환 비용은 왕복 횟수에 비례한다

스크립트 하나를 실행하고 결과를 받는 호출은 전환이 한 번이라 V8의 실행 성능을 그대로 얻는다. JavaScript 배열을 Java comparator로 정렬하면 비교할 때마다 네이티브에서 Java로 올라오는 upcall이 생겨 크게 느려진다. 발표는 두 가지 개선 근거를 든다. FFM upcall이 JNI upcall보다 빠르고, 값의 타입을 묻는 마샬링 분기를 C++에서 Java로 옮기면 JIT가 자주 나오는 타입으로 특수화할 수 있다([[JVM-JIT-and-AOT-Cache|추측 최적화]]). 발표자는 그래도 upcall 성능이 재구현 엔진과 같아지지는 않을 것으로 봤다.

### 두 런타임의 수명 관리가 어긋난다

Java 객체는 JVM GC가, V8 객체는 V8 GC가, CPython 객체는 참조 계수가 관리한다. 두 런타임을 가로지르는 순환 참조(Python 객체가 Java 콜백을 잡고 그 콜백이 다시 Python 객체를 잡는 경우)는 어느 쪽 수집기도 전체를 보지 못해 회수되지 않는다. 발표자는 `javax.script` API가 JVM 위의 엔진을 전제로 만들어져 반환 객체에 `close` 같은 해제 수단이 없다고 지적했다.

`detroit-python`은 그래서 명시적 해제 API를 더했다.

- `PyObject.decRefCount()`: 네이티브 참조 계수를 줄인다. 0이 되면 래퍼가 Python `None`을 가리키게 바꿔, 해제 뒤 사용이 메모리 접근 대신 Python 예외로 끝난다.
- `PythonScriptEngine.withPyObjectManager(...)`: 실행 중 만든 `PyObject`를 범위에 등록하고 범위가 끝나면 모두 참조를 줄인다. FFM의 Arena와 같은 범위 기반 수명 관리다.

### 가상 스레드가 carrier에 고정된다

네이티브 프레임이 스택에 있는 동안 Java 콜백이 블로킹하면 가상 스레드는 carrier에서 내려올 수 없다([[Thread-Models#Java의 platform thread와 virtual thread|pinning]]). 요청마다 가상 스레드를 쓰는 서버에서 스크립트가 Java 콜백으로 DB를 조회하면 그 이점이 사라진다.

- `detroit-python`은 GIL을 잡은 Python 호출을 가상 스레드에서 실행할 때 `Continuation.pin()`으로 명시적으로 고정한다(`VirtualThreadHelper`, JDK 내부 패키지 접근이라 소스에 재검토 표시가 있다). Python 실행 시간만큼 carrier를 점유한다고 보고 용량을 잡는다(적용 제안).
- 발표는 JavaScript 쪽 대안으로 블로킹 콜백을 Promise로 감싸고 스크립트에서 `async`와 `await`로 기다리게 하는 방식을 제시했다. V8이 실행을 멈추고 스택을 비우므로 네이티브 프레임 없이 기다릴 수 있다는 설명이며, 저장소 문서로는 확인하지 못했다.

## 선택 기준

- 이미 있는 Python 라이브러리(예: PyTorch 기반 모델)를 한 번 부르고 결과만 받는 얕은 연동이 이 방식에 맞는다. 발표도 Oracle 내부 사례 대부분이 이런 형태였다고 했다.
- 콜백이 촘촘히 오가는 깊은 상호 운용이 필요하면 upcall 비용과 수명 관리를 먼저 측정한다.
- 별도 프로세스로 띄운 Python 서비스를 HTTP로 부르는 방식과 비교한다. 같은 프로세스 안에 두 런타임이 있으면 메모리를 함께 쓰고, 네이티브 런타임의 장애가 JVM 프로세스 전체를 멈출 수 있다(적용 제안). 모델 호출 경로 선택은 [[Java-AI-Integration-Boundaries|Java AI 통합 경계]]에서 다룬다.
- 실험 단계 프로젝트라 API, 지원 버전과 구현 방식(JNI에서 FFM으로)이 바뀔 수 있다. 도입 전에 저장소의 현재 상태를 다시 확인한다.

이 문서는 저장소 README와 소스를 읽어 대조했다. 빌드, 실행과 발표의 벤치마크 수치는 재현하지 않았다.

## 출처

- [Project Detroit: From Foreign Libraries to Foreign Language Runtimes — Devoxx Belgium 2026, Maurizio Cimadamore](https://www.youtube.com/watch?v=01uRM3je12Y) — Nashorn 제거 배경, 전환 비용, 수명 관리와 pinning 사례, JNI에서 FFM 전환 실험. 전사문의 nason과 jstruct는 Nashorn과 jextract로 교정했다.
- [openjdk/detroit-js — OpenJDK](https://github.com/openjdk/detroit-js) — 2026-11-15 README, `src/native`의 JNI 구현, 엔진 이름과 요구 조건 대조
- [openjdk/detroit-python — OpenJDK](https://github.com/openjdk/detroit-python) — 2026-11-15 README, jextract 바인딩, `PyObject`, `PythonScriptEngine`, `VirtualThreadHelper` 소스 대조
- [openjdk/nashorn — OpenJDK](https://github.com/openjdk/nashorn) — 독립 프로젝트, 지원 Java 버전과 최신 버전
- [Oracle Java SE 25 Migration Guide, Removed Tools and Components](https://docs.oracle.com/en/java/javase/25/migrate/removed-tools-and-components.html) — JDK 15의 Nashorn과 `jjs` 제거, Java 11의 제거 예고
- [Oracle Java SE 25 API, javax.script](https://docs.oracle.com/en/java/javase/25/docs/api/java.scripting/javax/script/package-summary.html) — 스크립트 API가 남아 있음
- [OpenJDK, JEP 335: Deprecate the Nashorn JavaScript Engine for Removal](https://openjdk.org/jeps/335)
- [OpenJDK, JEP 372: Remove the Nashorn JavaScript Engine](https://openjdk.org/jeps/372)

## 관련 문서

- [[JVM-Architecture|JVM 아키텍처]] — FFM API와 JNI
- [[Thread-Models|스레드 종류와 스레딩 모델]] — 가상 스레드 pinning
- [[Java-AI-Integration-Boundaries|Java AI 통합 경계]] — 원격 호출, 로컬 추론과 FFM 경계
- [[JVM-JIT-and-AOT-Cache|HotSpot JIT 최적화]]
