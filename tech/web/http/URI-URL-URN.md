---
tags: [web, http, uri, url, urn]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["URI URL URN", "URI/URL/URN 차이"]
---

# URI · URL · URN

세 용어 자주 혼용되지만 **포함 관계**가 있는 개념. URI가 상위, URL/URN이 하위.

```
URI (Uniform Resource Identifier) — 식별자 (상위 개념)
 ├─ URL (Uniform Resource Locator) — 위치 기반
 └─ URN (Uniform Resource Name) — 이름 기반
```

## URI (Uniform Resource Identifier)

인터넷 자원을 **식별**하는 문자열. **위치로 식별하든(URL), 이름으로 식별하든(URN) 모두 URI**.

RFC 3986 표준 정의. 실무 대부분의 식별자는 URI이고, 그중 대부분이 URL.

## URL (Uniform Resource Locator)

자원의 **"어디 있는지"** + **"어떻게 접근하는지"**(프로토콜)를 명시.

```
https://www.example.com:443/path/to/resource?query=1#section
└─┬─┘   └──────┬──────┘ └┬┘ └──────┬──────┘ └──┬──┘ └──┬──┘
scheme     authority   port   path          query    fragment
```

구성:
- **scheme**: 프로토콜 (`http`, `https`, `ftp`, `mailto`, `file` 등)
- **authority**: 호스트 + (선택)포트. 사용자 정보도 포함 가능 (`user:pass@host`)
- **path**: 자원 경로
- **query**: 검색 조건·파라미터
- **fragment**: 문서 내 위치 (브라우저에서만 처리, 서버에 전송 안 됨)

특징: **자원이 이동하면 URL도 바뀜** → 링크 깨짐(dead link) 필연적.

## URN (Uniform Resource Name)

자원의 **"이름"**을 영구 식별자로 사용. 위치가 바뀌어도 동일한 식별자 유지.

```
urn:isbn:978-3-16-148410-0          (책 ISBN)
urn:uuid:6e8bc430-9c3a-11d9-...      (UUID)
urn:ietf:rfc:3986                    (RFC 문서)
```

형식: `urn:<namespace>:<specific-identifier>`

URN은 "**이 자원이 어디 있는지 모르지만 이름은 안다**"는 상황에 유용. 단, URN 자체로는 자원을 가져올 수 없다 — 별도 **리졸버**가 URN → URL로 변환해야 함.

## 실무에서의 현실

URL이 압도적으로 많이 쓰이고, URN은 **표준 제안 수준에서 제한적 사용**. 실무 API 설계에서 "URI 설계"라고 말하면 사실상 "URL 설계"를 의미.

그럼에도 구분을 알아야 하는 이유:
- 면접 단골 질문
- HTTP/REST 문서 정확 해석 (RFC는 URI로 표현)
- 영구 식별자 설계 시 URN 패턴 참고 가치

## 자주 혼동되는 포인트

### "URL은 URI의 일부" 정확한 의미
모든 URL은 URI지만, 모든 URI가 URL은 아님. URN도 URI.

### URI vs URL을 실무에서 섞어 써도 되나
HTTP 스펙·API 문서는 엄격히 URI를 쓰고, 일상 대화에선 URL로 통일해도 의미 통함. **면접에서는 구분해서 답할 것**.

### 프래그먼트 `#`는 서버에 전송되는가
NO. 브라우저가 URL 파싱 후 서버에는 `#` 이전까지만 전송. 프래그먼트는 클라이언트 사이드 라우팅용(SPA의 `#/page`).

### 쿼리스트링이 URL의 일부인가
YES. `?key=value` 부분도 URL의 구성 요소. API 설계 시 경로 vs 쿼리 선택 기준은 [[REST#URI 설계 규칙|REST URI 설계]] 참고.

## 면접 체크포인트

- URI·URL·URN의 포함 관계를 한 줄로
- URL 구성 요소 6개 (scheme·authority·port·path·query·fragment)
- URN이 실무에서 잘 안 쓰이는 이유
- 프래그먼트가 서버에 전송되지 않는 이유
- "URL은 URI다"가 맞고 "URI는 URL이다"는 틀린 이유

## 출처
- [매일메일 — URI, URL, URN](https://www.maeil-mail.kr/question/149)

## 관련 문서
- [[REST|REST · URI 설계]]
- [[HTTP-Seminar|HTTP 버전별 진화]]
