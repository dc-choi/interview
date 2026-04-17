---
tags: [spring, rest, multipart, file-upload, request-part]
status: done
category: "OS & Runtime"
aliases: ["Spring Multipart JSON", "RequestPart vs RequestBody", "파일 업로드 REST"]
---

# Spring REST — Multipart 파일 + JSON DTO 동시 처리

REST API에서 **파일 업로드와 JSON 메타데이터를 같은 요청으로** 받는 일은 흔하지만, Spring의 바인딩 어노테이션 선택을 잘못하면 `HttpMediaTypeNotSupportedException`·`Required request part ... is not present` 같은 오류로 자주 막힌다. 핵심은 **Content-Type이 `multipart/form-data`일 때 `@RequestBody`를 쓸 수 없다**는 것.

## 어노테이션 4종 비교

| 어노테이션 | 대상 Content-Type | 동작 |
|---|---|---|
| **`@RequestBody`** | `application/json`·`application/xml` | HttpMessageConverter로 Body 전체를 단일 객체로 역직렬화 |
| **`@RequestPart`** | `multipart/form-data` | 각 파트를 HttpMessageConverter로 역직렬화. **JSON 파트도 가능** |
| **`@RequestParam`** | `multipart/form-data`·쿼리 파라미터 | 단순 Name-Value 바인딩. `MultipartFile`도 수용하지만 복잡 객체는 부적합 |
| **`@ModelAttribute`** | `multipart/form-data`·`application/x-www-form-urlencoded` | Setter/Constructor 기반 필드별 바인딩. JSON 역직렬화 **아님** |

### 핵심 차이 요약

- **`@RequestBody` vs `@RequestPart`**: 둘 다 HttpMessageConverter 사용. `@RequestBody`는 요청 전체, `@RequestPart`는 파트별
- **`@RequestPart` vs `@ModelAttribute`**: 둘 다 multipart 처리. `@RequestPart`는 **파트 내부 Content-Type**(보통 `application/json`)을 따라 역직렬화, `@ModelAttribute`는 Name-Value로 필드 하나씩 채움
- **JSON 객체를 DTO로 받고 싶다면 `@RequestPart`**. `@ModelAttribute`는 중첩 객체·List·커스텀 타입에서 한계

## 핵심 원칙 — `@RequestBody`와 `@RequestPart` 혼용 금지

```java
// 잘못된 예 — HttpMediaTypeNotSupportedException 발생
@PostMapping("/boards")
public ResponseEntity<?> create(
    @RequestBody BoardDto dto,              // application/json 기대
    @RequestPart List<MultipartFile> files  // multipart/form-data 기대
) { ... }
```

요청 하나는 **하나의 Content-Type**만 가진다. 클라이언트가 `multipart/form-data`로 보내면 Spring이 `@RequestBody`를 처리하려다 실패. 해결책은 **JSON 파트도 `@RequestPart`로 받는 것**.

## 권장 패턴

```java
@PostMapping(value = "/boards", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<BoardResponse> create(
    @RequestPart("dto") @Valid BoardRequest dto,
    @RequestPart("files") List<MultipartFile> files,
    @AuthenticationPrincipal AuthMember member
) { ... }
```

### 필수 조건

- **`value` 파라미터 명시** (`@RequestPart("dto")`) — 파트 이름을 정확히 지정해야 "Required request part 'dto' is not present" 방지
- **파트의 Content-Type**: JSON DTO 파트는 `application/json`으로, 파일 파트는 파일 고유 타입
- **컨트롤러 `consumes` 명시**: `MediaType.MULTIPART_FORM_DATA_VALUE`로 선언하면 디스패처가 정확히 매칭

## 클라이언트 요청 구성

### JavaScript (FormData)

```js
const formData = new FormData();
formData.append(
  'dto',
  new Blob([JSON.stringify(dto)], { type: 'application/json' })
);
files.forEach(f => formData.append('files', f));

fetch('/boards', { method: 'POST', body: formData });
// 주의: Content-Type 직접 지정 금지 — 브라우저가 boundary 포함해 자동 설정
```

### Postman

- Body 탭 → **form-data** 선택
- `dto` 필드: Type을 `Text`로 놓고 Content-Type에 `application/json` 명시 (또는 File로 json 파일 업로드)
- `files` 필드: Type을 `File`로 지정, 여러 파일은 같은 key로 반복

## MockMvc 테스트

```java
@Test
void create() throws Exception {
    MockMultipartFile dtoPart = new MockMultipartFile(
        "dto", "", "application/json",
        objectMapper.writeValueAsBytes(dto)
    );
    MockMultipartFile filePart = new MockMultipartFile(
        "files", "a.png", "image/png", fileBytes
    );

    mockMvc.perform(multipart("/boards")
        .file(dtoPart)
        .file(filePart))
      .andExpect(status().isOk());
}
```

- DTO도 `MockMultipartFile`로 **Content-Type `application/json`** 지정해 전송
- `content(...)`로 JSON을 통째로 보내는 방식은 multipart에 작동하지 않음

## Swagger / OpenAPI 이슈

springdoc·swagger가 `@RequestPart` JSON 파트를 **문서화하는 방식이 버전에 따라 상이**.

- `@Schema(implementation = BoardRequest.class)` 명시로 JSON 스키마 인식 유도
- **`@Parameter(content = @Content(mediaType = "application/json"))`** 로 파트 타입 명시
- 그래도 UI에서 JSON 파트가 잘 안 보이면 **별도 Multipart DTO wrapper 클래스**를 만들어 `@ModelAttribute`로 받는 우회가 흔함 (단, 중첩 객체 한계 감수)

## 크기 제한

`application.yml`에 파일·요청 전체 크기 상한 설정 필수. 기본값은 작다.

```yaml
spring:
  servlet:
    multipart:
      enabled: true
      max-file-size: 10MB
      max-request-size: 50MB
      file-size-threshold: 2MB   # 이 이상이면 디스크 임시 파일로
```

- **`max-file-size`**: 단일 파일 상한
- **`max-request-size`**: 전체 요청 합 상한 (여러 파일·JSON 포함)
- 초과 시 `MaxUploadSizeExceededException` — `@RestControllerAdvice`로 400/413 응답 매핑
- `file-size-threshold`를 넘으면 메모리 대신 디스크에 임시 저장 → **대용량 업로드 시 OOM 방지**

## 흔한 오류와 원인

| 메시지 | 원인 | 해결 |
|---|---|---|
| `HttpMediaTypeNotSupportedException: Content type 'multipart/form-data;...' not supported` | `@RequestBody`를 multipart 요청에 사용 | `@RequestPart`로 변경 |
| `Required request part 'xxx' is not present` | 파트 이름 불일치 | `@RequestPart("xxx")` value 명시, 클라이언트 key와 일치 |
| `MissingServletRequestPartException` | multipart 파싱 실패 (Content-Type 불일치) | 클라이언트가 올바른 `multipart/form-data` 전송 확인 |
| `MaxUploadSizeExceededException` | 크기 제한 초과 | `max-file-size`·`max-request-size` 조정 또는 청크 업로드 |
| JSON 파트를 `text/plain`으로 보낼 때 | 클라이언트가 Blob 타입을 지정 안 함 | FormData 구성 시 `new Blob([json], { type: 'application/json' })` |

## 대용량·장기 업로드 대안

multipart 한 번에 수 GB를 올리는 건 메모리·네트워크 모두 부담. 대안:

- **Presigned URL**: 클라이언트가 **S3에 직접 업로드** → 완료 후 메타데이터만 서버 API로 전송
- **청크 업로드**: 파일을 N MB 단위로 쪼개 여러 번 POST → 서버가 조합
- **스트리밍**: `InputStreamResource`로 서버가 파일을 **버퍼 없이** 디스크·S3로 흘려보냄
- **멱등성 토큰**: 재시도 중복 업로드 방지

파일이 작고(수 MB) 메타데이터와 같은 트랜잭션으로 처리하면 충분할 때만 multipart 1-shot.

## 면접 체크포인트

- **`@RequestBody` vs `@RequestPart` vs `@ModelAttribute`** 사용 기준
- `multipart/form-data`에서 **`@RequestBody`를 쓸 수 없는 이유**
- JSON DTO를 multipart 파트로 받을 때 **Content-Type 명시 필요성** (클라이언트·`@RequestPart`)
- 대용량 파일 업로드에 **Presigned URL이나 청크 업로드**가 더 적합한 상황
- `max-file-size`·`file-size-threshold`의 의미와 OOM 방지 효과

## 출처
- [middleearth — Spring 요청 바인딩 어노테이션 비교](https://middleearth.tistory.com/35)
- [velog @songs4805 — Controller에서 MultipartFile·DTO 함께 요청하기](https://velog.io/@songs4805/Spring-Controller에서-MultipartFile-Dto를-함께-요청하기)
- [OKKY — RequestBody와 RequestPart 동시 사용 문제](https://okky.kr/questions/1212782)
- [seop-official — Spring Boot REST API에서 json dto·multipart 동시처리](https://seop-official.tistory.com/entry/SpringBoot-Rest-API에서-jsondto과-multipart-동시처리)

## 관련 문서
- [[HTTP-Content-Type|HTTP Content-Type]]
- [[Spring-Exception-Handling|Spring 예외 처리]]
- [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]
- [[API-Conventions|API Conventions]]
