---
tags: [react-native, ios, extension, memory]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native iOS App Extension 제약"]
---

# React Native iOS App Extension 제약

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## App Extension의 실행 환경

iOS App Extension은 앱의 주 화면 밖에서 특정 기능이나 내용을 제공한다. main app과 다른 실행 환경에서 여러 extension이 함께 올라갈 수 있고 메모리 제약이 작다. RN runtime을 포함했을 때의 비용을 앱 본체와 별도로 판단한다.

Simulator에서 성공해도 실제 기기에서 extension이 로드되지 않을 수 있다. 실제 기기의 release 구성을 확인하고 Instruments로 메모리를 측정한다.

## 문서에 남아 있는 extension별 수치

0.87 RN App Extensions 페이지에는 다음 수치가 제시된다.

| extension 예 | RN 페이지의 기재 수치 |
| --- | --- |
| Today widget | 16 MB |
| Custom Keyboard | 48 MB |
| Share extension | 120 MB |

이 수치는 RN 페이지의 기존 extension 설명이다. 이를 현재 모든 iOS 버전/기기/WidgetKit extension에 적용되는 공식 quota로 일반화하지 않는다. RN 페이지에 등장하는 Today widget과 예제 library가 현재 제품에 맞는 extension 기술인지, 지원 iOS의 실제 제한이 무엇인지는 Apple 공식 문서와 기기 측정으로 다시 확인한다.

## Today widget의 위험

RN의 JS runtime과 native UI를 함께 올리면 작은 메모리 예산의 Today widget에서 불안정할 수 있다. 로드 불가 메시지가 표시되면 메모리 초과를 조사한다.

- debug build는 release보다 더 빨리 한계에 도달할 수 있다.
- release가 처음 표시된다고 메모리 여유가 충분한 것은 아니다.
- API 요청과 데이터 파싱 같은 일상 작업으로도 peak memory가 늘 수 있다.
- 초기 로드, 반복 갱신과 네트워크 응답 처리까지 측정한다.

가이드의 `react-native-today-widget` 예제는 개념 검토용 참고다. 현재 앱에 적용 가능한 library 지원 상태를 이 페이지에서 확인했다고 주장하지 않는다.

## 다른 extension과 구현 판단

Share/Keyboard처럼 RN 페이지에서 더 큰 예산으로 소개하는 extension은 RN 적용이 더 가능할 수 있다. 그래도 main app처럼 메모리 사용과 runtime 실행을 가정할 수 없다. RN share extension proof of concept를 완성된 운영 권장안으로 취급하지 않는다.

선택 기준은 extension이 제공할 UI의 크기, startup 시간, runtime 비용과 재사용할 코드의 양이다. 플랫폼 native 구현이 목적을 더 작게 충족하면 RN 포함 여부를 다시 판단한다.

## 확인 항목

실제 extension 종류와 지원 iOS를 정한 뒤 cold start, peak memory, 긴 요청, 취소/종료와 연속 실행을 실제 기기로 확인한다. extension의 entitlement와 허용 API는 Apple의 해당 extension 문서에서 확인한다. 이 정리에서 실제 메모리 한계나 extension 동작을 측정하지 않았다.

## 출처

- [React Native, App Extensions](https://reactnative.dev/docs/app-extensions)

## 관련 문서

- [[RN-iOS]]
- [[RN-iOS-Publishing]]
