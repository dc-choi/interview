---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["VS Code preview의 데이터 범위와 캐시"]
---

# VS Code preview의 데이터 범위와 캐시

## Preview와 build는 다른 실행이다

Python Preview Engine은 sampled(기본 1,000행), full dataset과 code-defined filters를 지원한다. Random sample은 좁은 필터나 여러 입력의 join에서 필요한 상대 행을 놓칠 수 있다. Full dataset은 사전 sampling을 하지 않고 엔진의 predicate pushdown을 이용한다. 결과를 작게 만드는 것과 입력 읽기를 줄이는 것은 다르며 pandas는 pushdown을 지원하지 않는다.

VS Code preview는 생산 build와 같은 증분 판정 로직(v1/v2)을 사용하지만 sampling과 실행 시점의 차이가 있다. 모든 feature가 build와 같다는 보장은 아니다. Media output preview는 put_media_item만 지원하고 media 증분은 지원하지 않는다. Cipher는 build 시 암호화라는 placeholder이며 실제 암호화 결과가 아니다. 언어 모델과 Spark sidecar preview는 지원하지 않는다.

Model input 지원 설명에는 local/workspace 가능이라는 문장과 workspace 전용이라는 문장이 함께 있다. 세부 제한과 현재 환경을 확인해야 한다. Virtual/Iceberg table, external transform의 VS Code preview는 Code Workspaces 범위로 표시된다. Spark profile은 목록에 있는 동작 설정만 반영하고 자원 크기 설정을 적용하지 않는다.

## 코드로 고르는 입력

Filter 함수는 module global에 직접 정의된 공개, 비동기 아닌, decorator 없는 완전한 타입 주석 함수여야 한다. Import한 함수나 class method는 탐지 대상이 아니다. 입력 타입은 Spark DataFrame, lightweight Polars LazyFrame 또는 raw file FileStatus iterator이며 같은 형태를 반환한다.

여러 필터는 고른 순서대로 적용한다. 추가 매개변수는 keyword-only이며 str/int/float/bool을 지원한다. Default가 있으면 optional이다. Filter는 전체 production dataset을 입력으로 받으므로 최종 행 수가 작아도 비효율적인 filter가 빠르다는 보장은 없다.

## Active Preview와 진단

Active Preview는 수동 저장마다 재실행하고 input/filter/context를 폭넓게 캐시한다. 다른 참조나 환경 변경이 바로 반영되지 않으면 세션을 재시작해야 한다. 실행 중 auto-save가 꺼지며 다른 preview/debug를 함께 시작할 수 없다. Transform 이름/경로와 setup.py 변경도 세션 밖에서 수행하는 지침이 있다. 외부 API 호출은 저장마다 반복될 수 있다.

환경 debugger는 충돌하는 requirement와 transitive dependency 경로를 구분한다. 라이브러리 패널 설치는 meta.yaml과 Python 환경을 바꾸고 필요한 backing repository import를 요구할 수 있다. Type hint quick fix는 개발 진단이며 runtime 타입 보장의 대체가 아니다. Full build는 local 변경을 remote로 push한 뒤 플랫폼에서 전체 데이터로 실행한다.

## 출처

- [Palantir palantir-extension-for-visual-studio-code, palantir-extension-for-visual-studio-code](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code)
- [Palantir palantir-extension-for-visual-studio-code, active-preview](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/active-preview)
- [Palantir palantir-extension-for-visual-studio-code, code-defined-filtering](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/code-defined-filtering)
- [Palantir palantir-extension-for-visual-studio-code, debug-transforms](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/debug-transforms)
- [Palantir palantir-extension-for-visual-studio-code, environment-debugger](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/environment-debugger)
- [Palantir palantir-extension-for-visual-studio-code, extension-features](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/extension-features)
- [Palantir palantir-extension-for-visual-studio-code, overview](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/overview)
- [Palantir palantir-extension-for-visual-studio-code, python-libraries](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/python-libraries)
- [Palantir palantir-extension-for-visual-studio-code, security-considerations](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/security-considerations)
- [Palantir palantir-extension-for-visual-studio-code, transforms-build](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-build)
- [Palantir palantir-extension-for-visual-studio-code, transforms-preview](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-preview)
- [Palantir palantir-extension-for-visual-studio-code, transforms-type-hints](https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-type-hints)

## 관련 문서

- [[Palantir-Developer-Tools]]
