---
tags: [react-native, runtime]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native intersection 관측과 Canary 조건

React Native의 IntersectionObserver와 IntersectionObserverEntry는 2026-10-02 확인 기준 **Canary/Experimental channel에만 제공**된다. stable 0.87 앱에서 쓰는 기본 API로 안내하지 않는다.

## target와 root의 두 비율

threshold는 intersection area를 target bounding box로 나눈 비율이다. rnRootThreshold는 RN 전용이며 intersection area를 root area로 나눈다. 작은 item이 자신의 전부를 보여도 viewport의 작은 비율만 차지할 수 있으므로 두 기준은 다르다.

root는 target의 ancestor element 또는 기본 viewport이고 rootMargin은 계산할 root rectangle을 확장/축소한다. threshold/rnRootThreshold는 0~1의 숫자 또는 배열이며, 양쪽 기준 중 어느 threshold를 넘어도 callback이 발생한다. instance의 thresholds/rnRootThresholds는 정렬된 값을 제공한다.

## 관측의 수명과 entry

observe는 target을 등록하고 unobserve는 하나, disconnect는 전체를 해제한다. takeRecords는 pending entry를 얻는다. callback은 entries와 observer를 받는다.

entry는 target/rootBounds/boundingClientRect/intersectionRect, intersectionRatio/isIntersecting/time을 가진다. rnRootIntersectionRatio는 root 기준 비율이며 web 표준 field가 아니다. 이는 geometry intersection 모델이므로 사용자에게 실제로 읽혔다는 사실이나 모든 occlusion 조건을 보장하지 않는다.

stable 목록의 항목 노출은 FlatList/SectionList의 viewability 계약을 먼저 사용한다. 실험 채널 도입은 다른 기능의 안정성까지 바꾸므로 관측 하나만을 위해 앱 전체 release level을 바꿀지 별도로 판단한다.

## 출처

- [React Native, intersectionobserver](https://reactnative.dev/docs/global-intersectionobserver)
- [React Native, intersectionobserverentry](https://reactnative.dev/docs/global-intersectionobserverentry)

## 관련 문서

- [[RN-Lists]]
- [[RN-Native-Nodes]]
- [[RN-Release-Levels]]
