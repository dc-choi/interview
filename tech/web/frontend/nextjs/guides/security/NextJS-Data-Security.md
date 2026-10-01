---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 데이터 보안과 서버 경계"]
---

# Next.js 데이터 보안과 서버 경계

## 데이터 접근 모델

기존 독립 백엔드가 있다면 RSC에서도 기존 HTTP API의 인증과 인가를 유지한다. 새 앱은 server-only DAL이 검증과 최소 DTO를 제공하도록 구성할 수 있다. 컴포넌트에서 DB를 직접 읽는 방식은 빠른 시제품에 편하지만 전체 레코드를 Client Component에 넘기는 누출을 경계한다.

서버에서 실행된다는 사실과 클라이언트에 전달되지 않는다는 사실은 다르다. Client Component는 초기 HTML 생성 때 서버에서도 실행되지만 브라우저 코드와 같은 비밀 접근 제한을 적용한다. RSC의 props와 Action 반환값은 직렬화되어 외부로 나간다.

## 코드와 데이터의 누출 방지

- 서버 전용 모듈은 `import 'server-only'`로 Client graph의 잘못된 import를 빌드 오류로 만든다. `use server`는 서버 함수의 호출 경계를 만드는 지시자이므로 목적이 다르다.
- DB에서 필요한 열만 조회하고 DTO에서 공개 필드를 다시 제한한다. 비밀번호, 토큰, 내부 권한 정보가 있는 원본 객체를 UI props나 Action 반환값으로 보내지 않는다.
- `NEXT_PUBLIC_` 변수는 클라이언트 공개 값이다. 비밀 환경 변수도 서버가 HTML, props나 로그로 복사하면 노출된다.
- 실험적 `taint`는 객체 참조나 고유 값이 클라이언트로 넘어가는 것을 추가로 막는다. 복제나 파생 값을 모두 추적하는 일반적인 정보 유출 방지 장치가 아니므로 DTO 필터를 대신하지 않는다.

## Server Action은 독립된 공개 진입점

화면을 렌더할 때 인증했더라도 Action 호출 때 다시 검증한다. 매개변수, FormData, URL, headers는 외부 입력이다. 로그인 여부뿐 아니라 대상 레코드의 소유권과 허용된 상태 전이까지 검사하고, 없는 리소스를 먼저 처리한다.

```ts
'use server'
import { deleteOwnedPost } from '@/data/posts'
import { revalidatePath } from 'next/cache'

export const deletePostAction = async (postId: unknown) => {
  if (typeof postId !== 'string' || !postId) {
    return { error: '잘못된 요청입니다.' }
  }
  // DAL이 세션, 존재 여부와 소유권을 확인한 뒤 삭제한다.
  await deleteOwnedPost(postId)
  revalidatePath('/posts')
  return { success: true }
}
```

암호화된 비결정적 Action ID와 사용하지 않는 Action 제거는 공격 표면을 줄인다. ID를 알아내기 어렵다는 사실은 인가가 아니다. 비용이 큰 이메일 발송과 DB 변경에는 사용자별 rate limit 등 남용 방지 정책도 적용한다.

## 클로저와 배포 키

인라인 Server Action이 캡처한 값은 렌더 시점 snapshot으로 클라이언트에 전달되었다가 호출 때 돌아올 수 있다. Next.js가 이를 암호화하지만 비밀 값의 불필요한 캡처를 피한다. 배포 간 Action ID, 클로저 데이터와 코드가 맞지 않으면 요청이 실패할 수 있다.

여러 인스턴스에 일관된 암호화 키가 필요하면 빌드 시점 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`를 관리한다. Base64를 해제한 키는 지원되는 AES 길이여야 한다. 공통 키만 설정한다고 구버전 코드와 신버전 Action의 호환성까지 보장되지는 않는다.

## CSRF와 렌더의 부작용

Server Action 호출은 POST를 사용하고 Origin과 Host 또는 X-Forwarded-Host를 비교한다. 역방향 프록시 구성이 다르면 `serverActions.allowedOrigins`에 필요한 신뢰 origin만 허용한다. 이를 API 전체의 CORS 설정이나 모든 CSRF 방어로 일반화하지 않는다.

렌더나 GET 요청에서 로그아웃, DB 변경, 쿠키 삭제와 cache invalidation을 수행하지 않는다. prefetch와 재렌더가 사용자 의도 없이 실행할 수 있기 때문이다. 변경은 검증된 Action 또는 적절한 HTTP 변경 endpoint로 보낸다.

## 점검 순서

Client props와 Action 반환 DTO, server-only 경계, 모든 변경 진입점의 입력 검증과 리소스별 인가, 캐시 키와 태그의 비밀 값, Proxy의 전달 헤더, 배포 간 Action 호환성을 확인한다. 이 목록은 프레임워크 설정만으로 보안이 증명된다는 뜻이 아니다.

## 세부 계약과 감사 범위

기존 REST/GraphQL backend를 호출하는 RSC도 zero-trust 경계를 유지한다. 검증된 token만 허용 목적지에 전달하고 backend의 인가를 생략하지 않는다. HTTP API, server-only DAL, 시제품의 component 직접 조회 중 주된 접근 방식을 일관되게 정하면 감사 범위가 명확하다.

RSC와 초기 HTML용 Client Component는 서버에서 별도 module 환경으로 실행된다. Client Component가 SSR된다는 이유로 비밀 환경 변수나 DB 접근을 허용하지 않는다. DTO 필터링은 조회 단계의 parameterized SQL/select/columns와 직렬화 직전의 필드 제한을 함께 적용한다.

`experimental.taint: true`를 켜면 React의 experimental_taintObjectReference와 experimental_taintUniqueValue를 사용할 수 있다. 일반 함수/class 인스턴스의 직렬화 제한과 taint는 다르며, Server Function 같은 명시적 허용 형식은 예외다. Next가 server-only 표시를 내부 처리하므로 npm 패키지의 실행 내용을 의존하지 않지만 extraneous-dependency lint 정책상 설치가 필요할 수 있다. server-only를 use server 파일에 함께 둬도 Client가 서버 Action 참조를 import하는 사용법은 가능하다.

Action ID는 컴파일 때 만들고 최대 14일 cache한다는 문서 계약이 있으며 새 빌드나 build cache 무효화에서 다시 생성된다. 이 기간을 인증 유효기간으로 읽지 않는다. 참조되지 않는 Action 제거와 ID의 비결정성도 각 Action의 인가를 대신하지 않는다.

클로저 snapshot 예로 게시 시점의 version을 캡처하고 Action 실행 때 최신 version과 비교해 다른 편집자의 변경을 감지할 수 있다. 캡처 암호화만 믿고 민감 값을 넣지 않는다. NEXT_SERVER_ACTIONS_ENCRYPTION_KEY는 Base64 decode 후 16/24/32바이트 AES key를 지원하며 기본 생성은 32바이트다. 빌드/인스턴스 일치와 키 교체를 함께 관리한다.

감사는 DAL 밖 DB/환경 변수 접근, 넓은 Client props, Action 인자와 반환값, bracket URL 입력, 강력한 Proxy/Route Handler를 함께 추적한다. `searchParams.isAdmin` 같은 값은 권한 증거가 아니다. 렌더 중 logout 대신 form Action을 사용하고, 팀의 개발 수명주기에 맞는 취약점 검사와 침투 테스트를 별도로 수행한다.

## 출처

- [Next.js, data-security](https://nextjs.org/docs/app/guides/data-security)

## 관련 문서

- [[NextJS-Authentication]]
- [[NextJS-Content-Security-Policy]]
