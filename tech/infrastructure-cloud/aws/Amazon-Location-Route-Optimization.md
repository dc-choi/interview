---
tags: [aws, amazon-location, routing, logistics, geospatial]
status: done
verified_at: 2026-10-16
category: "Infrastructure - AWS"
aliases: ["Amazon Location 경로 최적화", "Route Matrix와 방문 순서"]
---

# Amazon Location의 경로 행렬과 방문 순서

배송 경로 설계에서는 지점 사이의 이동 비용 계산, 방문 순서 결정과 차량 위치 추적을 구분한다. 거리 행렬을 얻었다고 차량별 배차와 배송 완료까지 결정된 것은 아니다.

## 경로 행렬은 최적화의 입력이다

`CalculateRouteMatrix`는 출발지와 목적지의 각 조합에 대한 이동 거리와 시간을 반환한다. 현재 Routes API의 `Distance` 단위는 미터, `Duration` 단위는 초다. 출발지가 2개, 목적지가 3개라면 비교할 조합은 6개다.

행렬을 경로 최적화 소프트웨어에 넣어 방문 순서나 배차를 계산할 수 있다. API의 거리와 시간 반환을 차량별 최적 배정 결과로 해석하지 않는다. 업무 적용 시에는 이동 거리 최소화와 도착 시간 최소화 중 목적을 먼저 정하고, 적재량과 배송 시간 약속 같은 제약을 어느 계층이 처리하는지 확인한다(설계 점검 제안).

## 방문 순서는 별도 API로 계산할 수 있다

`OptimizeWaypoints`는 출발지, 목적지와 경유 지점의 방문 순서를 계산한다. `OptimizeSequencingFor`는 `FastestRoute` 또는 `ShortestRoute`를 받으며 기본값은 `FastestRoute`다. 좌표는 `[longitude, latitude]` 순서다.

2026-10-16 공식 API 기준으로 일반 요청은 최대 50개 경유 지점, `AccessHours`, `AppointmentTime`, `ServiceDuration` 등 제약을 사용하는 요청은 최대 20개 경유 지점을 지원한다. `ImpedingWaypoints`와 `FailedConstraints`도 확인해 제약을 충족하지 못한 지점을 처리한다. HTTP 성공만으로 모든 배송 약속을 만족했다고 판단하지 않는다.

이 계약은 한 경로의 방문 순서를 다룬다. 여러 차량의 적재 한도와 주문 배정까지 해결하려면 그 요구를 별도로 모델링하고 지원 범위를 검증한다. 행렬 API와 방문 순서 API 중 하나만으로 모든 배차 문제를 해결한다고 가정하지 않는다.

## 계산과 위치 추적을 분리한다

AWS의 경로 최적화 가이드는 다음 구성 예시를 제공한다. 실제 서비스의 필수 구성 목록은 아니다.

| 단계 | 예시 구성과 책임 |
|---|---|
| 일정 입력 | 웹 UI와 AppSync를 통해 일정을 입력하고 DynamoDB에 저장 |
| 이동 비용 계산 | Amazon Location의 route matrix를 최적화 입력으로 사용 |
| 위치 수집 | 차량의 MQTT 위치 메시지를 IoT Core에서 Location Tracker로 전달 |
| 지도 갱신 | Lambda 기반 AppSync resolver로 Tracker 위치를 polling해 표시 |

가이드의 Tracker는 위치 업데이트를 최대 30일 보관한다. 장기 운행 기록 보존 요구는 별도로 설계한다. 지도 갱신 주기와 위치 측정 시각을 함께 표시하면 오래된 좌표를 현재 위치로 오해하는 일을 줄일 수 있다(설계 제안).

## 적용 전 확인

- 같은 지점 목록으로 거리와 시간 목적함수의 결과 차이를 비교한다.
- 주소를 좌표로 바꾼 결과가 실제 방문 위치와 맞는지 확인한다.
- 도달할 수 없는 구간, 제약을 만족하지 못한 지점과 위치 갱신 중단을 시험한다.
- 차량 위치 도착과 배송 완료를 구분하고, 완료 판정에 필요한 업무 이벤트를 따로 정한다.

문서와 API 계약을 대조한 내용이다. 실제 경로의 정확도, 비용 절감률이나 배차 성능을 측정한 결과는 아니다.

## 출처

- [Amazon Location Service, How to calculate a route matrix of distance and time for multiple origins and destinations](https://docs.aws.amazon.com/location/latest/developerguide/calculate-route-matrix-distance.html)
- [Amazon Location Service, OptimizeWaypoints](https://docs.aws.amazon.com/location/latest/APIReference/API_OptimizeWaypoints.html)
- [Guidance for Intelligent Route Optimization on AWS — AWS](https://docs.aws.amazon.com/solutions/intelligent-route-optimization-on-aws/)

## 관련 문서

- [[IoT-Edge-Cloud-Pipeline|IoT 수집과 클라우드 처리]]
- [[AWS서비스(AWSServices)|AWS 서비스]]
