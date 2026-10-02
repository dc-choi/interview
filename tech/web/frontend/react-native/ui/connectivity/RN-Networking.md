---
tags: [react-native, mobile, networking, security]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 네트워크 요청

React Native 0.87 Networking 기준. React Native는 Fetch, XMLHttpRequest, WebSocket을 제공한다. 요청은 비동기이며 네이티브 전송 정책과 인증 동작은 브라우저와 같다고 가정하지 않는다.

## Fetch 요청과 응답

`fetch(url)`은 Promise를 반환한다. 두 번째 인자로 method, headers, body 등을 설정한다. JSON 요청은 body를 직렬화하고 서버가 기대하는 Content-Type을 정한다.

```tsx
const postSettings = async () => {
  const response = await fetch('https://example.com/settings', {
    method: 'POST',
    headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
    body: JSON.stringify({notifications: true}),
  });
  return response.json();
};
```

이 조각에는 호출부의 오류 처리가 필요하다. 가이드의 then/catch 또는 async/await/try/catch 중 프로젝트 방식에 맞춰 오류가 유실되지 않게 처리한다.

## 데이터와 로딩 UI 예제

가이드의 movies Snack은 마운트 후 요청하고 ActivityIndicator에서 FlatList로 전환한다. 아래 재구성은 오류 UI와 HTTP status 확인을 추가한다.

```tsx
import {useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Text} from 'react-native';

interface Movie {readonly id: string; readonly title: string;}

export const Movies = () => {
  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const response = await fetch('https://reactnative.dev/movies.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (current) setMovies(data.movies);
      } catch {
        if (current) setFailed(true);
      } finally {
        if (current) setLoading(false);
      }
    };
    void load();
    return () => {current = false;};
  }, []);
  if (loading) return <ActivityIndicator />;
  if (failed) return <Text>불러오지 못했습니다.</Text>;
  return <FlatList data={movies} keyExtractor={item => item.id}
    renderItem={({item}) => <Text>{item.title}</Text>} />;
};
```

`current`는 unmount 뒤 상태 갱신을 막는 예제 보완이며 네트워크 자체를 취소하지 않는다. 응답 JSON이 예제 계약을 만족한다고 전제한다. TypeScript의 타입 선언이나 `as MoviesResponse`는 런타임 JSON 검증이 아니다. 외부 입력 구조 검증은 실제 앱의 계약에 맞춰 추가한다.

HTTP 오류 status 검사와 실패 UI는 원문 Snack의 로딩/목록 흐름에 추가한 보완이다. 코드 실행이나 API 응답을 현재 검증한 것은 아니다.

## HTTPS와 플랫폼 전송 정책

- iOS 9 이후 ATS는 HTTP 연결에 HTTPS를 요구하는 기본 정책을 둔다. cleartext가 필요하면 ATS exception 설정을 확인한다.
- 도메인을 미리 아는 경우 해당 도메인에 한정된 exception이 전체 ATS 해제보다 범위가 작다.
- ATS 전체 비활성화는 보안과 앱 심사 조건을 확인해야 한다. 가이드의 과거 App Store 정책 설명을 현재 심사 전부의 보장으로 사용하지 않는다.
- Android는 API level 28 관련 기본 cleartext 차단 조건을 가이드에서 설명하며 manifest의 `android:usesCleartextTraffic` 설정을 안내한다. 실제 target SDK와 네트워크 보안 설정을 함께 확인한다.

플랫폼 예외를 추가했다는 사실이 HTTP 요청을 제품에서 권장한다는 뜻은 아니다.

## XMLHttpRequest와 라이브러리

XMLHttpRequest가 내장돼 있으므로 이를 사용하는 axios, frisbee 같은 라이브러리를 쓸 수 있다. 단순 요청을 위해 라이브러리를 필수로 설치할 필요는 없다.

```tsx
const request = new XMLHttpRequest();
request.onreadystatechange = () => {
  if (request.readyState !== 4) return;
  if (request.status === 200) console.log(request.responseText);
  else console.warn('요청 실패', request.status);
};
request.open('GET', 'https://example.com/data');
request.send();
```

네이티브 앱에는 브라우저 CORS 모델이 없다. 웹에서 차단되는 cross-origin 요청이 앱에서도 같은 방식으로 차단된다고 기대하지 않는다. CORS가 없다는 사실이 서버의 인증과 권한 확인을 대신하지 않는다.

## WebSocket

WebSocket은 한 연결에서 양방향 통신을 제공한다. `onopen`에서 send, `onmessage`에서 data 처리, `onerror`와 `onclose`에서 실패와 종료를 구분한다.

```tsx
const socket = new WebSocket('wss://example.com/events');
socket.onopen = () => socket.send('subscribe');
socket.onmessage = event => console.log(event.data);
socket.onerror = event => console.warn(event.message);
socket.onclose = event => console.log(event.code, event.reason);
```

제품에서는 연결 수명과 종료 뒤 동작을 정한다. 이 예제는 reconnect, background 전환과 message 검증을 구현한 완성 통신 계층이 아니다.

## Fetch와 쿠키의 알려진 제약

0.87 Networking 가이드는 아래 문제를 기록한다. 가이드의 알려진 문제와 실제 사용 버전에서 재현된 장애를 구분한다.

| 항목 | 기록된 조건 |
|---|---|
| redirect: manual | 가이드에서 동작하지 않는 옵션으로 기록 |
| credentials: omit | 가이드에서 동작하지 않는 옵션으로 기록 |
| 같은 이름의 Android header | 마지막 값만 남는 문제 |
| cookie 기반 인증 | 불안정한 동작과 관련 issue |
| iOS 302와 Set-Cookie | redirect 응답의 cookie가 제대로 설정되지 않는 문제 |

특히 만료 세션이 302로 redirect되고 cookie 갱신이 실패하면 수동 redirect 제어도 어려워 반복 요청이 생길 수 있다. 쿠키 로그인은 두 OS에서 만료, redirect, 갱신과 로그아웃을 실제로 검증한다. 일반 Fetch 요청 전부가 불안정하다고 확대하지 않는다.

## iOS NSURLSession 설정

네트워크 계층의 custom user agent나 ephemeral NSURLSessionConfiguration이 필요하면 네이티브 초기화에서 provider를 설정한다.

```objc
#import <React/RCTHTTPRequestHandler.h>

RCTSetCustomNSURLSessionConfigurationProvider(^NSURLSessionConfiguration * {
  NSURLSessionConfiguration *configuration =
    [NSURLSessionConfiguration defaultSessionConfiguration];
  return configuration;
});
```

React가 요청을 시작하기 전, 앱 생명주기 초기에 등록한다. 가이드의 RCTBridge 초기화 코드를 현재 프로젝트의 AppDelegate에 그대로 붙이기보다 실제 architecture와 초기화 흐름에 맞춰 위치를 확인한다.

## 확인할 점

로딩 종료, 요청/파싱 실패, HTTP 실패, unmount, HTTPS 정책, cookie redirect, WebSocket 종료를 분리해 확인한다. RN 버전, OS, target SDK와 네이티브 설정 없이 웹 테스트만으로 앱 통신을 검증했다고 판단하지 않는다.

## 출처

- [React Native 0.87, Networking](https://reactnative.dev/docs/network)

## 관련 문서

- [[RN-Security-Storage|민감정보 저장 경계]]
- [[RN-Security-Transport|TLS와 pinning]]
- [[RN-Image-Loading|이미지 네트워크 요청과 캐시]]
