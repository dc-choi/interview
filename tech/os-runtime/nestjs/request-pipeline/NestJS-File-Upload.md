---
tags: [nestjs, file-upload, multer, multipart, validation]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS File Upload", "FileInterceptor", "ParseFilePipe"]
---

# NestJS File Upload — multer 업로드와 StreamableFile 응답

Express용 multer 미들웨어를 내장 모듈로 래핑. **multipart/form-data만** 처리하며, **FastifyAdapter와는 호환되지 않는다** (공식 경고). GraphQL 쪽 업로드는 [[GraphQL-File-Uploads]], S3 직행(presigned) 설계는 [[S3-File-Upload]]가 별도 정본.

## 인터셉터 4 + 1종

| 인터셉터 | 용도 | 추출 데코레이터 |
|---------|------|---------------|
| `FileInterceptor('file')` | 단일 파일 | `@UploadedFile()` |
| `FilesInterceptor('files', maxCount?)` | 같은 필드명 배열 | `@UploadedFiles()` |
| `FileFieldsInterceptor([{ name, maxCount }...])` | 필드명별 여러 파일 | `@UploadedFiles()` |
| `AnyFilesInterceptor()` | 임의 필드명 전부 | `@UploadedFiles()` |
| `NoFilesInterceptor()` | multipart의 텍스트 필드만 (파일 거부) | — |

인터셉터는 `@nestjs/platform-express`, 추출 데코레이터는 `@nestjs/common` 소속. 파일 타입은 `Express.Multer.File`.

## 검증 — ParseFilePipe

```ts
@UploadedFile(new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: 1000 }),        // bytes
    new FileTypeValidator({ fileType: 'image/jpeg' }),
  ],
}))
file: Express.Multer.File,
```

- `FileTypeValidator`는 mime-type 문자열/정규식 매칭인데, **기본으로 파일 내용의 magic number를 검증**한다 — 확장자, 헤더 위조 방어.
- `MaxFileSizeValidator`는 bytes 단위.
- 옵션: `errorHttpStatusCode`(기본 400 계열 변경), `fileIsRequired`(기본 true — 파일 자체가 필수).
- `ParseFilePipeBuilder`로 체이닝 구성: `.addFileTypeValidator(...).addMaxSizeValidator(...).build({ errorHttpStatusCode, fileIsRequired })` — validator 수동 인스턴스화 제거.
- 커스텀 검증은 일반 파이프(`PipeTransform`)를 `@UploadedFile(pipe)`에 직접 바인딩.

## 기본 옵션과 설정

- 인터셉터 두 번째(또는 세 번째) 인자로 multer options 전달 (storage, limits 등).
- 전역 기본값은 `MulterModule.register({ dest: './upload' })`, ConfigService 의존이면 `registerAsync` + useFactory.

## 파일 응답 — StreamableFile (HTTP 앱 전용)

`createReadStream(...).pipe(res)`로 직접 파이핑하면 **핸들러 이후의 인터셉터 로직을 잃는다.** 대신 `StreamableFile`을 반환하면 프레임워크가 파이핑을 대신해 인터셉터 체인이 유지된다.

```ts
@Get()
getFile(): StreamableFile {
  const file = createReadStream(join(process.cwd(), 'package.json'));
  return new StreamableFile(file, {
    type: 'application/json',                            // 기본 application/octet-stream
    disposition: 'attachment; filename="package.json"',
  });
}
```

- 생성자는 Buffer 또는 Stream을 받는다. 옵션: `type`, `disposition`, `length`(Content-Length 오버라이드).
- Fastify는 원래 pipe 없이도 파일 전송이 되지만, StreamableFile은 **Express/Fastify 양쪽 호환**이라 어댑터를 바꿔도 코드가 그대로다.
- GraphQL, 마이크로서비스에는 적용되지 않고, ClassSerializerInterceptor 직렬화도 StreamableFile 응답은 건너뛴다.

## 관련 문서

- [[NestJS-Pipes|Pipes (ParseFilePipe가 내장 로스터의 하나)]]
- [[GraphQL-File-Uploads|GraphQL 파일 업로드]]
- [[S3-File-Upload|S3 업로드 설계 (서버 경유 vs presigned)]]
- [[HTTP-Content-Type|Content-Type (multipart/form-data)]]

## 출처
- [NestJS — File upload](https://docs.nestjs.com/techniques/file-upload)
- [NestJS — Streaming files](https://docs.nestjs.com/techniques/streaming-files)
