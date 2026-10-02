---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native pull-to-refresh의 상태 계약

React Native 0.87 기준이다. 예제는 계약을 설명하는 코드이며 앱 빌드나 기기 실행을 검증한 결과는 아니다.

RefreshControl은 ScrollView가 맨 위에 있을 때 아래로 당기는 동작을 `onRefresh`로 연결한다. 실제 데이터 요청을 수행하거나 결과를 저장해 주는 컴포넌트는 아니다.

## controlled refreshing

`refreshing`은 필수 boolean이다. onRefresh에서 true로 바꾸지 않으면 indicator가 곧바로 멈춘다. 요청이 성공하거나 실패한 뒤 false로 정리한다.

```tsx
const refresh = async () => {
  setRefreshing(true);
  setError(null);
  try {
    await reload();
  } catch (error) {
    setError(error instanceof Error ? error.message : '새로고침에 실패했습니다.');
  } finally {
    setRefreshing(false);
  }
};

<ScrollView refreshControl={
  <RefreshControl refreshing={refreshing} onRefresh={refresh} />
} />;
```

위 조각의 `setError`는 앱이 관리하는 `string | null` 오류 상태의 setter다. `onRefresh` 호출부가 반환 Promise의 rejection을 처리한다고 기대하지 않고 callback 안에서 실패를 처리한다. 요청 중복과 취소도 별도 앱 상태로 관리한다. 초기 로딩과 새로고침을 같은 boolean으로 묶으면 기존 목록을 유지해야 할 때 화면이 불필요하게 사라질 수 있다.

## 스타일과 플랫폼

Android의 colors는 하나 이상 색을 받고 progressBackgroundColor, enabled와 size를 설정할 수 있다. iOS는 tintColor, title과 titleColor가 있다. progressViewOffset은 indicator의 상단 위치를 조정한다. FlatList/SectionList의 onRefresh와 refreshing shortcut도 같은 controlled 계약을 따른다.

## 출처

- [React Native, RefreshControl](https://reactnative.dev/docs/refreshcontrol)
- [React Native v0.87.0, RefreshControl callback implementation](https://github.com/facebook/react-native/blob/v0.87.0/packages/react-native/Libraries/Components/RefreshControl/RefreshControl.js)

## 관련 문서

- [[RN-ScrollView]]
- [[RN-Lists]]
- [[RN-Networking]]
