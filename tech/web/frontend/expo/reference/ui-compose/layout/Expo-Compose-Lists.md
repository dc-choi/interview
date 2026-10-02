---
tags: [expo, react-native, layout]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose LazyColumn, LazyRow와 ListItem"]
---

# Compose LazyColumn, LazyRow와 ListItem



## 네이티브 지연 렌더와 React 생성

LazyColumn/LazyRow는 화면에 보이는 항목만 네이티브에서 구성하지만 React는 전체 자식을 먼저 만든다. 큰 목록의 React mount까지 지연된다고 가정하지 않는다. 원문은 큰 데이터에 FlashList/Legend List를 제안한다. 스크롤 축에 유한한 크기를 주고 같은 축에 Host matchContents를 적용하지 않는다.

공통으로 children, modifiers, contentPadding을 받는다. 패딩은 start/top/end/bottom의 선택적 dp 객체다. LazyColumn은 horizontalAlignment(start/end/center), verticalArrangement(top/bottom/center/spaceBetween/spaceAround/spaceEvenly 또는 spacedBy)를 받는다. LazyRow는 verticalAlignment(top/bottom/center), horizontalArrangement(start/end/center/spaceBetween/spaceAround/spaceEvenly 또는 spacedBy)를 받는다.

```tsx
<Host style={{ height: 400 }}>
  <LazyColumn contentPadding={{ start: 16, end: 16, top: 8, bottom: 8 }}
    verticalArrangement={{ spacedBy: 8 }}>
    {items.map(item => <ListItem key={item.id}>
      <ListItem.HeadlineContent><Text>{item.label}</Text></ListItem.HeadlineContent>
    </ListItem>)}
  </LazyColumn>
</Host>
```

## ListItem 슬롯

ListItem의 자식 슬롯은 HeadlineContent/SupportingContent/OverlineContent/LeadingContent/TrailingContent다. 제목 안에도 Row/Icon/Text를 조합할 수 있다. 누르기 행동은 clickable modifier를 사용한다. Universal ListItem의 onPress와 다르다.

children/colors/modifiers와 shadowElevation/tonalElevation dp를 받으며 기본 elevation은 ListItemDefaults다. colors의 containerColor/contentColor/leadingContentColor/overlineContentColor/supportingContentColor/trailingContentColor는 선택적 ColorValue다. 보조 텍스트의 대비도 테마에 맞춰 정한다.

## PullToRefreshBox

스크롤 자식을 감싸 당겨서 새로고침하는 입력을 제공한다. children은 필수, isRefreshing 기본 false, onRefresh는 인자 없는 callback, contentAlignment 기본 topStart다. indicator의 color/containerColor와 modifiers를 설정한다.

앱이 isRefreshing를 관리한다. 요청 시작에 true로 바꾸고 성공과 실패 모두 finally에서 false로 종료한다. Universal List의 Promise 기반 새로고침과 계약이 다르다. 중첩 스크롤, 빈 목록에서도 입력이 전달되는지 확인한다.

## 출처

- [Expo Documentation, LazyColumn](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/lazycolumn)
- [Expo Documentation, LazyRow](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/lazyrow)
- [Expo Documentation, ListItem](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/listitem)
- [Expo Documentation, PullToRefreshBox](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/pulltorefreshbox)

## 관련 문서

- [[Expo-Compose-Host]]
- [[Expo-Compose-Layout]]
