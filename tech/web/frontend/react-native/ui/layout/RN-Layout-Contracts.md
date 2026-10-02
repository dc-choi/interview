---
tags: [react-native, style]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native layout props의 단위와 우선순위

React Native 0.87 기준이다.

Layout props는 Yoga가 크기와 위치를 계산하는 입력이다. 같은 이름의 CSS 속성과 값 전체가 호환되는 것은 아니다.

## 크기와 여유 공간

width/height, min/max 크기와 위치 offset에는 논리적 숫자와 지원되는 percentage 값을 쓴다. em 등 web의 임의 단위는 지원하지 않는다. boxSizing 기본은 border-box이며 content-box는 지정 크기에서 border/padding의 관계를 바꾼다. aspectRatio는 정하지 않은 축을 계산하며 min/max 제약을 함께 따른다.

positive flex는 grow 값, shrink=1, basis=0으로 작동한다. flex=0은 width/height를 따르는 비유연 크기이고, -1은 공간이 부족하면 min 크기까지 축소한다. 독립 flexShrink의 기본 0과 shorthand의 shrink=1을 구분한다.

flexBasis는 주축의 초기 크기다. justifyContent는 주축, alignItems/alignSelf는 교차축, alignContent는 여러 줄 정렬을 다룬다. 기본 flexDirection은 column이다. wrap, stretch와 실제 콘텐츠 크기를 조합해 확인한다.

## 논리적 방향과 offset

start/end와 margin/padding/border의 start/end는 ltr/rtl에 따라 left/right에 대응한다. start는 left/right/end보다 우선하고 end는 left/right보다 우선한다. block/inline 단축 props를 섞으면 같은 축을 서로 다른 이름으로 재정의하지 않게 한다.

position relative는 원래 배치에서 offset, absolute는 normal flow 밖의 containing block, static은 inset을 적용하지 않고 absolute 자식의 containing block을 만들지 않는다. isolation은 별도 stacking context를 만든다.

## 보이기와 간격

display는 flex/none/contents다. contents와 view 존재 여부를 쓰는 ref/접근성 기능을 함께 확인한다. gap/rowGap/columnGap reference는 숫자 값 계약을 명시하므로 web의 임의 unit을 옮기지 않는다.

overflow는 clipping/측정 조건을 바꾸지만 scroll container 자체를 만드는 props로 취급하지 않는다. zIndex는 형제의 그리기 순서를 조정하며 iOS에서 sibling 관계가 필요할 수 있다. border/margin/padding의 축별 단축과 개별 값은 결과가 겹치지 않게 지정한다.

## 출처

- [React Native, layout-props](https://reactnative.dev/docs/layout-props)

## 관련 문서

- [[RN-Flexbox]]
- [[RN-Dimensions]]
- [[RN-Positioning]]
- [[RN-Styling-Effects]]
