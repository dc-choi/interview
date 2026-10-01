---
tags: [nestjs, file-upload, multer, multipart, validation]
status: done
verified_at: 2026-09-30
category: "OS & Runtime - NestJS"
aliases: ["NestJS File Upload", "FileInterceptor", "ParseFilePipe"]
---

# NestJS File Upload — multer 업로드와 StreamableFile 응답

Express용 multer 미들웨어를 내장 모듈로 래핑. **multipart/form-data만** 처리한다. NestJS 12.1 이전에는 FastifyAdapter와 호환되지 않았고, 12.1부터는 `@nestjs/platform-fastify/multipart`가 `@fastify/multipart` 기반으로 같은 인터셉터, 추출 데코레이터와 `ParseFilePipe`를 제공한다. Fastify 쪽은 기본 크기 제한이 Multer보다 엄격하고 세부 동작이 다르므로 공식 문서의 차이 목록을 확인한다. GraphQL 쪽 업로드는 [[GraphQL-File-Uploads]], S3 직행(presigned) 설계는 [[S3-File-Upload]]가 별도 정본.

## 인터셉터 4 + 1종

| 인터셉터 | 용도 | 추출 데코레이터 |
|---------|------|---------------|
| `FileInterceptor('file')` | 단일 파일 | `@UploadedFile()` |
| `FilesInterceptor('files', maxCount?)` | 같은 필드명 배열 | `@UploadedFiles()` |
| `FileFieldsInterceptor([{ name, maxCount }...])` | 필드명별 여러 파일 | `@UploadedFiles()` |
| `AnyFilesInterceptor()` | 임의 필드명 전부 | `@UploadedFiles()` |
| `NoFilesInterceptor()` | multipart의 텍스트 필드만 (파일 거부) | — |

인터셉터는 `@nestjs/platform-express`(Fastify는 `@nestjs/platform-fastify/multipart`), 추출 데코레이터는 `@nestjs/common` 소속. 파일 타입은 `Express.Multer.File`(Fastify는 `UploadedMultipartFile`).

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

## 저장 경계와 운영 보안

`ParseFilePipe`는 핸들러에 전달될 파일을 검증하지만 업로드 parser의 자원 사용까지 제한하지는 않는다. Multer `limits`로 파일 수와 크기를 먼저 제한하고, 파일 내용의 magic number, 업무상 허용 형식과 권한을 다음 단계에서 검증한다.

- `originalname`과 요청의 `Content-Type`은 클라이언트 입력이다. 저장 경로나 공개 URL에 그대로 쓰지 않고 서버가 UUID 같은 object key를 생성한다.
- 로컬 `diskStorage`와 정적 파일 서빙은 단일 인스턴스 실습에는 단순하지만, 여러 replica가 파일을 공유하지 못하고 컨테이너 교체 때 사라질 수 있다. 비공개 파일을 webroot에서 바로 서빙하지 않는다.
- 서버가 변환이나 검사를 해야 하면 격리된 임시 영역에서 처리한 뒤 object storage로 옮긴다. 서버 처리가 필요 없으면 [[S3-File-Upload|presigned URL]]로 클라이언트가 S3에 직접 올리는 경로를 검토한다.

### 흔한 실패: 저장 경로, 필드명, 정적 서빙

- **빌드 산출물 안의 업로드**: diskStorage의 destination을 `path.join(__dirname, '..', 'uploads')`처럼 잡으면 `__dirname`이 컴파일된 파일 위치라 업로드가 `dist` 안에 쌓인다. Nest CLI 스타터의 `nest-cli.json`은 `compilerOptions.deleteOutDir: true`이고, 이 옵션은 compiler가 실행될 때마다 출력 디렉터리를 먼저 지운다. `nest build`나 `nest start`가 돌 때, 그리고 새 산출물로 교체하는 배포에서 업로드 파일이 함께 사라진다. 업로드 루트는 설정으로 받은 빌드 산출물 밖의 경로와 영속 볼륨에 두거나 object storage로 옮긴다.
- **필드명은 계약이다**: `FileInterceptor('image')`와 `FilesInterceptor('image', 10)`은 multipart의 `image` 파트만 파일로 받는다. 클라이언트가 다른 필드명으로 보내면 Multer가 `LIMIT_UNEXPECTED_FILE`로 거부하고 `@nestjs/platform-express`는 이를 400 `BadRequestException`으로 바꾼다. 크기 제한 초과(`LIMIT_FILE_SIZE`)는 413 `PayloadTooLargeException`이다. Multer 메시지는 `Unexpected field`가 `Unexpected file field`로 바뀐 것처럼 릴리스마다 달라질 수 있으므로 메시지 문자열이 아니라 상태 코드와 필드명으로 판별하고, API 문서에 필드명을 적는다. 수동 테스트 도구에서도 body를 form-data로 두고 같은 필드명의 파일 파트로 보낸다.
- **정적 서빙은 공개 경로다**: `useStaticAssets()`는 `INestApplication`이 아니라 platform별 application 타입의 메서드다. Express는 `NestFactory.create<NestExpressApplication>()` 뒤 `app.useStaticAssets(path, { prefix: '/media' })`, Fastify는 `@fastify/static` 기반의 `app.useStaticAssets({ root, prefix })`로 시그니처가 다르다. Nest handler 앞에서 응답하는 정적 서빙이라 Guard가 적용되지 않고 prefix 아래 파일은 인증 없이 공개된다. DB에는 경로나 object key만 저장하고, 비공개 파일은 권한 확인 뒤 `StreamableFile`이나 서명 URL로 내보낸다.

강의의 `nestjs-multer-extended`와 AWS SDK v2 예시는 당시 구현이다. 현재 기준은 내장 Multer로 서버가 파일을 받은 뒤 AWS SDK for JavaScript v3의 `S3Client`와 command를 호출하거나, presigned URL을 발급하는 방식이다. Multer middleware가 S3로 전송한다면 파일 bytes는 여전히 애플리케이션 서버를 통과하므로 "직접 업로드"와 구분한다.

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

- [[File-Upload-Security|파일 업로드 보안 (위협 모델과 OWASP 방어)]]
- [[NestJS-Pipes|Pipes (ParseFilePipe가 내장 로스터의 하나)]]
- [[GraphQL-File-Uploads|GraphQL 파일 업로드]]
- [[S3-File-Upload|S3 업로드 설계 (서버 경유 vs presigned)]]
- [[HTTP-Content-Type|Content-Type (multipart/form-data)]]

## 출처
- [NestJS — File upload](https://docs.nestjs.com/techniques/file-upload)
- [NestJS — Streaming files](https://docs.nestjs.com/techniques/streaming-files)
- [NestJS — File upload, Fastify](https://docs.nestjs.com/http/file-upload#fastify) (12.1부터 FastifyAdapter 업로드 지원)
- [NestJS — MVC](https://docs.nestjs.com/techniques/mvc) (`NestExpressApplication`의 `useStaticAssets`)
- [NestJS CLI — Global compiler options](https://docs.nestjs.com/cli/monorepo#global-compiler-options) (`deleteOutDir`)
- [nest-cli.json — NestJS typescript-starter](https://github.com/nestjs/typescript-starter/blob/master/nest-cli.json)
- [multer.utils.ts — NestJS GitHub](https://github.com/nestjs/nest/blob/master/packages/platform-express/multer/multer/multer.utils.ts) (Multer 오류 코드의 400, 413 변환)
- [AWS SDK for JavaScript v3 — S3 examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html)
- [Amazon S3 — Presigned URL upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [OWASP — File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- 강의: [Multer 파일 업로드](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=84170), [Multer와 S3](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=84082), [AWS SDK 보충](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=95255), [Postman에서 미디어 파일 업로드 보충](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=86913)
