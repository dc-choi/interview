---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Observe 프레임, 네트워크와 메모리 진단"]
---

# Observe 프레임, 네트워크와 메모리 진단

## TTI에 붙는 실행 조건

TTI event는 느린 이유를 분리할 부가 정보를 포함한다. slowFrames는 17ms 이상, frozenFrames는 700ms 이상 걸린 frame 수다. totalDelay는 frame 목표 시간을 넘긴 지연의 합(초)이다. 높은 TTI와 낮은 delay는 대기/초기화, 높은 TTI와 높은 delay는 UI 작업 경합의 조사 신호다. 단독으로 원인을 확정하지 않는다.

Low Power Mode, batteryLevel(0~1), 충전 상태, thermalState(nominal/fair/serious/critical/unknown)를 함께 비교한다. 네트워크는 connected/type/isExpensive, iOS isConstrained, Android dataSaverEnabled를 구분한다. VPN도 보통 underlying wifi/cellular로 기록된다.

## 요청 집계의 범위

Native launch 종료부터 markInteractive까지 iOS URLSession/Android OkHttpClient 요청을 집계하며 Observe 자신의 업로드는 제외한다. 요청이 없으면 관련 params도 없다.

| 값 | 해석 |
| --- | --- |
| count / failed | 시작한 요청 수, 오류 또는 non-2xx 응답 수 |
| bytesReceived / bytesSent | wire 기준 byte 합계 |
| totalDuration | 각 요청 duration의 합. 병렬이면 실제 경과 시간보다 클 수 있다. |
| throughputBytesPerSecond | 실제 응답 전송 구간의 합집합 기준. DNS/연결/서버 대기, cache hit와 실패를 제외한다. |
| slowest.* | 완료한 가장 긴 요청의 host/statusCode/duration/TTFB/수신량 |

Buffer는 최근 200개 요청으로 제한된다. 시작 시 그보다 많은 요청을 보내면 완전한 합계가 아니다. 긴 TTFB와 큰 다운로드량을 구분하되 네트워크 조건과 backend trace로 확인한다.

## iOS 메모리 경고

SDK 57 이상은 OS low-memory warning 때 expo.memory.warning을 기록한다. allocated는 앱에 부과한 memory footprint, physical은 resident memory, available은 한도까지 남은 공간, warningsCount는 session 누적 횟수다. Simulator에는 available이 없다.

경고 뒤 session 종료는 OOM 의심 근거이지 확정 crash report가 아니다. 큰 이미지 decode, 유지된 cache, 전체 파일/응답을 메모리에 올리는 처리와 해제하지 않은 listener를 조사한다.

## 출처

- [Expo Documentation, Metrics reference](https://docs.expo.dev/eas/observe/reference/metrics)

## 관련 문서

- [[Expo-Observe]]

- [[Expo]]
