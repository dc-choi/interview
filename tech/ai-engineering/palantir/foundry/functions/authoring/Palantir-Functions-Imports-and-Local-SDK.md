---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology imports, 생성 SDK와 로컬 개발

## 권한과 생성물의 단위

Ontology entity imports는 Project 단위다. 같은 Project의 한 저장소에서 imports를 바꾸면 다른 저장소에도 영향을 줄 수 있다. 한 Project에 여러 Ontology를 import하는 구성은 지원하지 않는다. 객체 타입을 선택한 것과 생성할 Ontology를 선택한 것은 별도 단계다.

TypeScript v1의 `resources.json`은 object/link/source RID, 함수와 value type의 버전을 Git으로 관리한다. format version 1이 현재 형식이며 0은 이전 방식에서 자동 migration이 필요한 상태다. value type의 서로 다른 버전을 동시에 요구하는 imports는 컴파일 충돌을 일으킨다. source와 model imports에 대응하는 `functions.json` 기능 플래그도 필요하다.

Python/v2의 SDK는 entity를 import한 뒤 생성하고 설치해야 한다. 생성 package 이름은 첫 생성 후 바꿀 수 없다. 객체 속성이 바뀌거나 새 타입을 추가해도 기존 생성 package가 자동으로 새 계약이 되는 것은 아니다. 새 버전을 생성/설치하고, `meta.yml` 수동 수정 뒤에는 Code Assist도 갱신한다.

## 로컬 SDK와 실행 환경

Local SDK 방식은 저장소에 기록한 Ontology revision을 기준으로 SDK를 생성하고 Global branch와 연결한다. migration은 SDK 설정과 lockfile을 바꾸므로 생성 결과와 기존 imports를 함께 확인한다. 저장소의 `environments prepare`와 SDK 생성 절차를 사용하며 일반 npm 설치만으로 동일한 Ontology 계약을 얻었다고 보지 않는다.

Python 로컬 개발 가이드는 Java 21, 최신 template, Apple Silicon의 Rosetta 2 조건과 `CI`, `JEMMA`, `CA` 환경변수 간섭을 명시한다. `./gradlew vsCode` 또는 `condaDevelop`로 환경을 구성하고 테스트에는 test environment를 고른다. clone token은 짧은 수명이며 게시와 플랫폼 checks는 Foundry에 push한 뒤 수행한다.

VS Code/Code Repositories preview와 실제 배포의 인증 주체와 실행 한도는 다르다. imports, SDK 생성 성공, preview 성공을 운영 권한 검증으로 대신하지 않는다.

## 출처

- [Palantir, ontology-imports](https://www.palantir.com/docs/foundry/functions/ontology-imports)
- [Palantir, resource-imports-sidebar](https://www.palantir.com/docs/foundry/functions/resource-imports-sidebar)
- [Palantir, local-sdks](https://www.palantir.com/docs/foundry/functions/local-sdks)
- [Palantir, python-functions-on-objects](https://www.palantir.com/docs/foundry/functions/python-functions-on-objects)
- [Palantir, python-functions-local-development](https://www.palantir.com/docs/foundry/functions/python-functions-local-development)
- [Palantir, navigating-vscode](https://www.palantir.com/docs/foundry/functions/navigating-vscode)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
