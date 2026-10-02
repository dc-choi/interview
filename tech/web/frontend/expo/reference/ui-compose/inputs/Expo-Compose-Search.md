---
tags: [expo, react-native, inputs]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose SearchBar와 DockedSearchBar"]
---

# Compose SearchBar와 DockedSearchBar

`SearchBar`는 전체 화면으로 확장하는 검색 UI를 제공하고, `DockedSearchBar`는 부모 레이아웃에 붙어 있는 검색 입력이다. Android Compose용이며 `Host` 아래에서 사용한다.

## 제출과 입력 변경

`SearchBar.onSearch(searchText)`는 검색어를 제출했을 때 호출한다. `DockedSearchBar.onQueryChange(query)`는 검색어가 바뀔 때 호출한다. 이벤트 시점이 다르므로 서버 검색을 연결할 때 제출 검색과 실시간 검색을 구분한다. 두 API 표에 공통으로 공개된 props는 선택적 `children`, `modifiers`다. 문서에 없는 controlled `value`나 `expanded` props를 가정해 추가하지 않는다.

```tsx
<Host matchContents>
  <SearchBar onSearch={query => runSearch(query)}>
    <SearchBar.Placeholder><Text>항목 검색</Text></SearchBar.Placeholder>
  </SearchBar>
</Host>
```

`SearchBar.Placeholder`는 빈 입력의 안내 슬롯이다. `ExpandedFullScreenSearchBar`는 확장된 전체 화면 검색 영역으로 보낼 자식을 표시하는 컴포넌트다. 단순 문자열 props 대신 Compose 자식을 슬롯으로 전달한다.

```tsx
<DockedSearchBar onQueryChange={setQuery}>
  <DockedSearchBar.Placeholder><Text>검색어 입력</Text></DockedSearchBar.Placeholder>
  <DockedSearchBar.LeadingIcon>
    <Icon source={require('./assets/search.xml')} />
  </DockedSearchBar.LeadingIcon>
</DockedSearchBar>
```

Docked 형태의 leading icon과 placeholder도 별도의 자식 슬롯이다. 원문의 `useState` 예제는 callback 결과를 앱에 저장할 뿐 입력값을 prop으로 다시 제어하지 않는다. 입력값과 커서 위치의 명시적 제어가 필요하면 TextField의 상태 계약을 검토한다.

## 출처

- [Expo Documentation, SearchBar](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/searchbar)
- [Expo Documentation, DockedSearchBar](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/dockedsearchbar)

## 관련 문서

- [[Expo-Compose-TextField]]
