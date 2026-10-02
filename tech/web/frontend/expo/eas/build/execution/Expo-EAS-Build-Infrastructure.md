---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS worker image와 자원 선택"]
---

# EAS worker image와 자원 선택

## Image 선택

EAS image는 OS와 Xcode 및 여러 도구 버전을 묶는다. image 생략 시 auto로 프로젝트 SDK/RN을 기준으로 선택하며 실제 값은 Spin up build environment 로그에서 확인한다. latest는 image release에 따라 움직이고 sdk-57은 해당 SDK에 적합한 image를 가리킨다. 완전한 이름을 선택해도 minor 갱신까지 전혀 없다는 보장은 아니다.

2026-10-01 확인 기준 SDK 57 alias는 Android `ubuntu-26.04-jdk-17-ndk-r27b-sdk-57`, iOS `macos-tahoe-26.5-xcode-26.6`을 가리킨다. 두 image는 Node 22.23.1을 포함한다. 이후 SDK image가 목록에 있어도 Reference latest의 SDK 57 기준과 구분한다.

## 자원

| 플랫폼 | medium | large |
| --- | --- | --- |
| Android | 4 vCPU, 16 GB RAM | 8 vCPU, 32 GB RAM |
| iOS | 5 performance core, 20 GiB RAM | 10 performance core, 40 GiB RAM |

위 수치는 확인일의 서비스 문서 기준이며 iOS SSD는 두 등급 모두 110 GB다. Android는 GCP runner, iOS는 Expo macOS cloud의 격리 VM을 사용한다. large 사용 자격과 비용은 계정 plan에서 확인한다.

## Gradle 메모리

Android worker는 GRADLE_OPTS로 medium 최대 heap 4g, large 8g를 전달한다. 추가로 metaspace 1g, OOM heap dump, UTF-8, parallel true와 daemon false를 설정한다. worker의 org.gradle.jvmargs는 프로젝트 gradle.properties보다 우선하므로 로컬 파일만 바꿔도 원격 heap이 바뀐다고 가정하지 않는다.

Profile env, workflow env 또는 EAS 환경 변수의 GRADLE_OPTS로 override할 수 있다. 전체 값을 대체할 때 다른 유용한 기본 옵션을 함께 잃지 않게 검토한다. OS/Xcode는 image, 지원되는 개별 도구는 eas.json, 나머지 설치는 hook으로 조정하며 후자는 build 시간을 늘린다.

## 네트워크 접근

Builder IP allowlist는 공식 worker IP 파일을 사용하고 Last-Modified/Expires를 확인한다. 문서의 내부 cache IP를 일반 공개 endpoint나 영구 방화벽 규칙으로 복사하지 않는다. image가 같아도 외부 registry와 credential 상태는 달라질 수 있다.

## 출처

- [Expo Documentation, Build server infrastructure](https://docs.expo.dev/build-reference/infrastructure)

## 관련 문서

- [[Expo-EAS-Build-Execution]]

- [[Expo]]
