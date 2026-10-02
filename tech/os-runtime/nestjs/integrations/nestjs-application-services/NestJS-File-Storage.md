---
tags: [nestjs, storage, upload, security]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS Storage", "NestJS 파일 저장"]
---

# NestJS 파일 저장과 공개 경계

현행 `@nestjs/storage`는 파일을 보관하는 named disk 추상화다. multipart를 파싱하는 기능은 [[NestJS-File-Upload]]의 Express multer/Fastify multipart가 담당한다. 저장, 검증, 도메인 레코드 갱신은 서로 다른 실패 경계를 갖는다.

## Disk와 DI

`StorageModule`은 기본 global이다. `StorageDisk`를 주입하면 default disk, `@InjectDisk('photos')`는 해당 이름, `Storage.disk(name)`은 동적으로 선택한 disk를 반환한다. disk가 여러 개면 default를 명시한다. 잘못된 default와 등록하지 않은 disk 이름은 시작 오류다.

| Disk | 용도와 계약 |
|---|---|
| LocalDisk | 개발용 디렉터리다. publicUrl은 실제 serving route가 별도로 필요하며 local signed URL도 앱이 검증하고 제공해야 한다. |
| S3Disk | AWS S3와 호환 object storage를 대상으로 동작한다. endpoint, region, path-style과 batch-delete 지원은 서비스별로 맞춘다. presigned URL은 object store로 직접 간다. |
| InMemoryDisk | 동일한 key, range, metadata API를 테스트에서 사용한다. 실제 S3 인증, multipart, IAM 동작을 증명하지 않는다. |

`put()`는 Buffer, Node/web stream, byte iterable을 받아 파일 단위로 원자적으로 교체한다. DB 레코드와 같은 트랜잭션이라는 뜻은 아니다. `get()`은 stream, `stat()`은 metadata만, `list()`는 cursor 기반 페이지, `listAll()`은 전체 페이지를 순회한다. 전체 파일을 메모리에 읽는 `getBuffer()`는 파일 크기를 고려한다.

Key는 상대 경로이며 UTF-8 1024 bytes 이내, 빈 segment/점/상위 경로/backslash/control character가 금지된다. 이 규칙은 디렉터리 탈출을 막지만 같은 disk의 다른 사용자 파일 접근 권한을 검증하지 않는다. key는 서버가 통제하는 식별자로 만들고 별도 소유권 검사를 한다.

## 스트리밍 업로드의 검증 위치

`uploadToDisk()`를 `FileInterceptor`의 storage engine으로 지정하면 파일을 메모리에 모으지 않고 disk로 보낸다. `contentTypes`는 첫 bytes에서 감지한 타입을 검사하며 클라이언트의 mimetype을 신뢰하지 않는다. 금지된 타입은 쓰기 전에 415, size limit은 부분 파일을 남기지 않고 413으로 처리한다. 반환 `StoredUpload`의 `contentType`은 검출값이고 `mimetype`은 클라이언트 주장이다.

- `ParseFilePipe`는 interceptor 다음이다. 이 단계에서는 스트리밍 파일이 이미 저장되어 있으므로 메모리 buffer를 요구하는 `FileTypeValidator`를 뒤에 추가해 사전 검증으로 설명하지 않는다.
- handler에서 상품이 없거나 DB 갱신이 실패하면 새 파일을 보상 삭제한다. 이전 파일 삭제와 새 DB 레코드 반영도 원자적이라고 가정하지 않는다.
- UUID와 검출 확장자 같은 새 key를 사용하면 overwrite와 CDN cache stale 문제를 줄일 수 있다. 사용자 filename을 storage key로 그대로 쓰지 않는다.
- `serveFile()`은 content headers, ETag, Last-Modified와 nosniff를 붙인다. req를 전달하면 Range/If-None-Match를 처리한다. 기본 disposition은 attachment이며 HTML/SVG처럼 origin에서 script를 실행할 수 있는 타입은 inline 요청이어도 attachment로 제공한다.

## Private 파일과 서명 URL

Public 사진과 private 청구서를 다른 disk/bucket에 둔다. `publicUrl`만 설정하면 bucket의 접근 권한까지 구성되는 것은 아니다. private download endpoint는 사용자 소유권과 업무 조건을 확인한 다음 `signedUrl()`을 발급한다. 링크를 가진 사람은 만료 전까지 추가 인증 없이 그 파일을 읽을 수 있다.

Local signed URL은 HMAC-SHA256, 최소 32 characters key를 사용한다. 첫 key가 서명하고 전체 key가 검증하므로 새 key를 앞에 두고 기존 링크 만료 뒤 옛 key를 제거한다. `serveSignedUrl()`은 base route, key, expiry, filename/disposition과 method 계약을 검증한다. 다른 disk의 route나 변경된 key를 허용하지 않는다.

`signedUrl()`의 기본 만료는 15분, 최대 7일이며 숫자 duration은 milliseconds다. 권한이 바뀌었다고 발급된 링크가 즉시 폐기되는 것은 아니다. 짧은 TTL을 사용하고 URL을 로그, analytics, referrer에 유출하지 않도록 공개 경계를 설계한다. S3에서는 서명한 credential 만료나 권한 회수도 영향을 줄 수 있다.

## 직접 업로드는 검증 전 private에 저장

API에서 업로드 URL 발급 → 클라이언트가 `PUT` → API에 완료 key 제출 순서로 구성한다. `signedUpload()`가 준 method와 headers를 그대로 사용하고 선언한 content type/length를 서명한다. 선언값은 실제 파일 내용에 대한 검증이 아니다.

완료 시 key가 해당 사용자와 상품에 발급한 incoming 영역인지, 실제 크기가 제한 이내인지, ranged read의 bytes가 허용 타입인지 확인한 뒤 public disk로 복사한다. private 청구서 key를 임의 제출해 public으로 복사할 수 없어야 한다. 검출 가능한 파일의 magic bytes만으로 악성 콘텐츠 전체가 안전하다고 보증하지 않는다.

Local disk의 `receiveSignedUpload()`는 method, 서명, 만료, type/length를 검증하고 stream으로 저장한다. length 없이 서명한다면 `maxSize`도 설정한다. Fastify에서는 handler까지 body가 읽히지 않도록 content type parser를 맞춘다. 끝나지 않은 incoming upload와 incomplete S3 multipart는 lifecycle rule로 정리한다.

## 운영과 오류

S3Disk의 현행 기본 multipart는 part 8 MiB와 concurrency 4다. 길이를 모르는 stream도 multipart로 처리하며 실패하면 abort한다. 네트워크/timeout/throttling/5xx 재시도는 첫 시도 포함 3회다. timeout은 기본 미설정이므로 업무 deadline에 맞춘다. credentials 함수는 요청 전에 다시 호출해 회전을 지원한다.

Container 로컬 disk는 교체 때 없어지고 다른 인스턴스가 공유하지 못한다. production에는 지속 가능한 object storage와 별도 bucket 접근 권한을 둔다. `exists()`가 missing을 확인하려면 object store 권한 계약도 중요하다. 특히 S3의 ListBucket 권한이 없으면 missing이 404 대신 403으로 보일 수 있다. 브라우저 direct PUT에는 bucket CORS도 필요하다.

`StorageError` 계열은 HTTP helper 밖에서 `HttpException`이 아니다. missing(404), key 오류(400), body length 오류(400), range(416), conflict(409), 서명(403), upstream service 오류를 API 의미에 맞게 번역한다. 내부 경로와 upstream 정보를 그대로 노출하지 않는다.

테스트에서는 STORAGE_MODULE_OPTIONS를 override해 disk만 대체할 수 있다. LocalDisk 임시 디렉터리와 S3-compatible 서버는 다른 경계를 검증한다. 이 문서는 공식 코드 예제를 읽은 결과이며 저장 API를 실행한 기록은 아니다.

## 관련 문서

- [[NestJS-Application-Services]]
- [[NestJS-File-Upload]]
- [[NestJS-Security]]
- [[NestJS-Lifecycle-Shutdown]]

## 출처

- [NestJS — File storage](https://docs.nestjs.com/application/file-storage)
- [NestJS — File upload](https://docs.nestjs.com/http/file-upload)
