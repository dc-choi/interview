---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS build cache 계층과 신뢰 범위"]
---

# EAS build cache 계층과 신뢰 범위

## 다운로드와 파일 cache

npm/Maven/CocoaPods 다운로드 cache, profile의 임의 파일 cache와 C/C++ compiler cache는 서로 다른 계층이다. 의존성이 설치된 node_modules 전체를 기본 snapshot으로 복원하는 기능과 혼동하지 않는다.

Profile의 cache.paths는 성공 뒤 파일을 저장하고 다음 build에서 JS 의존성 설치 후 복원한다. 이미 있는 파일은 덮어쓰지 않는다. cache.key 또는 cache 객체의 다른 속성을 바꾸면 invalidate된다. 따라서 이전 파일을 강제로 교체할 의도로 복원을 사용하지 않는다.

## 의존성 cache

npm/Yarn Modern은 기본 npm cache를 사용하고 Yarn Classic은 별도 lockfile registry 처리가 필요하다. `EAS_BUILD_DISABLE_NPM_CACHE=1`, `EAS_BUILD_DISABLE_MAVEN_CACHE=1`, `EAS_BUILD_DISABLE_COCOAPODS_CACHE=1`로 각 계층을 끌 수 있다.

JS 설치는 기본 immutable lockfile을 사용한다. `EAS_NO_FROZEN_LOCKFILE=1`은 이를 해제하므로 재현성에 영향을 준다. 설치 실패 원인을 모른 채 끄지 않는다. CocoaPods는 사용자 .netrc/.curlrc가 있으면 cache를 우회한다.

CNG에서 생성된 Podfile.lock cache는 같은 resolution을 유지하는 데 도움이 되지만 로컬에서 해당 lockfile을 관리하지 않으면 업데이트 시점 판단이 어렵다. build process와 cache 가이드의 기본값 설명이 다르므로 필요 경로는 명시하고 실제 로그에서 복원을 확인한다.

## C++ ccache

`EAS_USE_CACHE=1`은 저장과 복원을 함께 켠다. `EAS_RESTORE_CACHE`, `EAS_SAVE_CACHE`는 각각 이를 덮어쓴다. custom build에서는 eas/restore_build_cache와 eas/save_build_cache를 순서대로 배치한다. 일반 cache step으로 key/path를 직접 지정하는 방식도 있다.

Cache는 정확한 key부터 찾고 없으면 restore_keys prefix 후보를 순서대로 확인해 최근 항목을 사용한다. 의존성 lockfile hash로 분리하면서 이전 prefix cache를 활용할 수 있다. 부분 hit가 동일한 효율을 보장하지는 않는다.

## 격리와 신뢰

GitHub build cache는 현재 branch와 default branch에서 복원한다. EAS CLI build는 사용자 단위 cache를 사용하며 없으면 default branch의 신뢰된 cache로 fallback할 수 있다.

여러 사람이 같은 token/actor를 공유하면 사용자 cache도 공유된다. production에서는 복원을 끄고 신뢰된 job만 새 cache를 저장하는 구성을 검토한다. `EAS_SAVE_CACHE=1`을 특정 job에 넣어도 다른 job의 저장 권한이 자동으로 사라지는 것은 아니다. cache를 credential 저장소로 사용하지 않는다.

## 출처

- [Expo Documentation, Cache dependencies](https://docs.expo.dev/build-reference/caching)

## 관련 문서

- [[Expo-EAS-Build-Execution]]

- [[Expo]]
