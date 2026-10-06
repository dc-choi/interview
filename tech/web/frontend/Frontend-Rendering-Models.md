---
tags: [web, frontend, rendering, hydration, islands, resumability]
status: done
verified_at: 2026-10-07
category: "웹&네트워크(Web&Network)"
aliases: ["프런트엔드 렌더링 모델", "Hydration Islands Resumability"]
---

# 프런트엔드 렌더링과 상호작용 모델

프런트엔드 도구는 HTML을 어디에서 만드는지, 브라우저가 상호작용을 시작하려고 어떤 코드를 실행하는지, 이후 화면을 누가 갱신하는지로 비교한다. SSR 여부 하나만으로 다운로드량이나 입력 반응성을 판단하지 않는다.

## 서로 다른 네 가지 경계

| 모델 | 동작 | 별도로 확인할 비용 |
|---|---|---|
| Hydration | 서버가 만든 HTML에 클라이언트 컴포넌트 로직을 연결 | 초기 코드 로드와 실행, 서버와 첫 클라이언트 출력 일치 |
| Client islands | 페이지 중 상호작용이 필요한 컴포넌트만 선택해 클라이언트 실행 | island 간 상태 공유, 실행 시점, 사용하는 런타임 수 |
| Resumability | 서버가 남긴 상태와 연결 정보를 이용해 실행을 재개 | 직렬화 제약, 지연 로드 코드와 첫 상호작용의 경로 |
| 서버 HTML 조각 교체 | 요청 결과로 받은 HTML을 지정한 DOM 영역에 반영 | 요청 지연, 실패 처리, 교체 영역의 입력과 초점 유지 |

네 모델은 제품을 배타적으로 분류하는 규칙이 아니다. islands 안에 React 컴포넌트를 두고 hydration할 수 있고, 같은 사이트가 정적 콘텐츠와 서버 요청 기반 UI를 함께 제공할 수도 있다.

## Hydration: 보이는 HTML과 동작하는 UI

React의 `hydrateRoot`는 서버가 생성한 HTML을 재사용하면서 컴포넌트 로직을 연결한다. 첫 클라이언트 출력이 서버 출력과 같아야 하며, 불일치를 자동으로 모두 복구한다고 가정하지 않는다. 빈 컨테이너를 처음 렌더링하는 `createRoot`와 역할이 다르다. 세부 오류 처리는 [[React-DOM-Client-Roots|React client root와 hydration]]에서 다룬다.

따라서 HTML이 먼저 보였다는 사실과 버튼이 동작할 준비가 됐다는 사실을 분리한다. 전체 앱이 한 번에 같은 방식으로 hydration한다고 일반화하지 않고 프레임워크의 경계와 로딩 전략을 확인한다.

## Astro: 선택한 컴포넌트에만 실행 비용 배정

Astro는 기본적으로 UI 컴포넌트를 HTML과 CSS로 렌더링하며, 컴포넌트의 클라이언트 JavaScript는 자동으로 보내지 않는다. `client:*` 지시자로 상호작용 영역과 실행 시점을 선택한다.

- `client:load`: 페이지 로드 시 컴포넌트 JavaScript를 로드하고 hydration한다.
- `client:visible`: 컴포넌트가 뷰포트에 들어왔을 때 로드하고 hydration한다.
- `client:only`: 해당 컴포넌트의 서버 HTML 렌더링을 건너뛰고 클라이언트에서 렌더링한다.

이는 사이트의 모든 JavaScript가 사라진다는 뜻이 아니다. 작성한 script, 분석 도구와 선택한 컴포넌트 런타임은 별도 비용이다. 여러 UI 프레임워크를 한 페이지에 사용할 수 있어도 상태 공유와 유지보수 비용까지 없어지지는 않는다.

## Qwik: 재실행 대신 재개할 정보 전달

Qwik의 resumability는 서버 렌더링 때 이벤트 리스너 정보, 컴포넌트 경계와 상태를 직렬화해 클라이언트가 실행을 재개하도록 한다. 브라우저가 초기 연결을 복원하려고 컴포넌트 트리 전체를 다시 실행하는 비용을 줄이는 접근이다.

JavaScript가 필요 없다는 뜻은 아니다. loader와 필요한 handler 코드는 여전히 실행되며, 앱도 직렬화 경계를 지켜야 한다. 사용자 정의 클래스 인스턴스나 stream 같은 값을 그대로 경계 너머로 보낼 수 있다고 가정하지 않는다. 첫 클릭에서 필요한 코드가 준비되는 경로까지 측정한다.

## htmx: 서버가 반환한 HTML로 갱신

htmx는 `hx-get`과 `hx-post` 같은 속성으로 요청을 보내고 응답 HTML을 DOM에 반영한다. `hx-target`은 갱신할 대상을, `hx-swap`은 교체 방식을 지정한다. JSON을 받은 뒤 클라이언트 템플릿으로 다시 화면을 만드는 구조와 책임 분담이 다르다.

서버 템플릿 중심의 목록, 검색과 폼에 검토할 수 있지만, 모든 상호작용이 네트워크 왕복을 감당할 수 있는지는 따로 확인한다. HTML 교체 자체가 인증, 권한 검사나 안전한 출력 처리를 대신하지 않는다.

## 선택과 측정

다음은 앞의 동작 차이에서 도출한 설계 점검 기준이며, 프레임워크별 성능 순위가 아니다.

1. 콘텐츠와 상호작용 영역을 구분한다. 안내 페이지의 메뉴 하나와 편집기의 지속적인 상태 갱신을 같은 요구로 보지 않는다.
2. 서버 응답, 초기 JavaScript, 메인 스레드 실행과 첫 입력을 나눠 측정한다. 작은 라이브러리 용량만으로 완성 앱의 속도를 판정하지 않는다.
3. 낮은 성능의 기기와 느린 네트워크에서 첫 동작, 로딩 중 입력과 오류 처리를 확인한다.
4. 기존 팀의 코드와 배포 방식에 맞는지 확인한다. 렌더링 모델의 장점만으로 기존 프로젝트의 교체를 결정하지 않는다.

## 이해 확인

1. 정적 소개 페이지에 React 메뉴 하나가 필요할 때 전체 페이지와 메뉴 영역의 실행 비용을 어떻게 분리할 수 있는가?
2. SSR로 HTML을 먼저 받는 세 방식에서 hydration, islands와 resumability의 비용 차이는 어디에서 생기는가?

## 출처

- [React DOM, hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Astro, Islands architecture](https://docs.astro.build/en/concepts/islands/)
- [Astro, Framework components](https://docs.astro.build/en/guides/framework-components/)
- [Qwik, Resumable](https://qwik.dev/docs/concepts/resumable/)
- [htmx, Documentation](https://htmx.org/docs/)

## 관련 문서

- [[Web-Service-Structure|웹 서비스 구조와 CSR/SSR]]
- [[React-DOM-Client-Roots|React hydration 계약]]
- [[Browser-Main-Thread|브라우저 메인 스레드]]
- [[NextJS-Rendering-Strategy|Next.js 렌더링 전략]]
