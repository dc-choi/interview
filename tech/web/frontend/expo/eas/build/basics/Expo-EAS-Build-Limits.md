---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Build 자원과 서비스 제한"]
---

# EAS Build 자원과 서비스 제한

## 자원 한도

EAS worker의 CPU/RAM은 고정되어 있다. 메모리 부족이면 코드/의존성/parallelism 원인을 확인하고 필요하면 large resourceClass를 선택한다. 더 큰 runner가 잘못된 무한 작업이나 credential 오류를 고쳐 주지는 않는다.

최대 build 실행 시간은 요금제에 따라 다르고 초과하면 취소된다. 2026-10-01 확인 문서 기준 pending build는 계정별 플랫폼당 최대 50개이며 그 이상 새 요청은 대기열이 줄기 전 거부된다. 실제 운영 전 현재 요금제와 서비스 제한을 다시 확인한다.

## Cache와 workspace

npm/Maven/CocoaPods 다운로드 cache와 node_modules 전체 snapshot은 다르다. 기본 서비스가 설치 완료 node_modules를 매번 복원한다고 가정하지 않는다. cache 정책에 맞춰 시간을 측정하고 앱 소스에 node_modules를 commit하는 방식으로 해결하지 않는다.

Bun/npm/pnpm/Yarn workspace는 지원하지만 다른 도구의 공식 안내는 제한적이다. 앱 build root, 선행 workspace build, native dependency 중복과 접근 가능한 파일 범위를 먼저 확인한다. 구체적인 cache 동작은 해당 build cache reference를 따른다.

## 출처

- [Expo Documentation, EAS Build limitations](https://docs.expo.dev/build-reference/limitations)

## 관련 문서

- [[Expo-EAS-Build-Basics]]

- [[Expo]]
