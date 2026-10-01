---
tags: [security, web-attacks, file-upload, webshell, owasp]
status: done
verified_at: 2026-10-01
category: "보안(Security)"
aliases: ["File Upload Security", "파일 업로드 보안", "File Upload Attack", "Webshell Upload", "웹셸 업로드"]
---

# 파일 업로드 보안

파일 업로드는 공격자가 서버에 임의의 바이트를 올려놓을 수 있는 기능이다. 서버가 실행할 수 있는 스크립트(웹셸)를 올리고 URL로 호출하면 [[Command-Injection]]과 같은 결과가 나고, 실행되지 않더라도 저장 자원 고갈, 악성 파일 배포, 브라우저에서 실행되는 파일을 통한 XSS로 이어진다.

## 위협

| 위협 | 예 |
|---|---|
| 서버 측 실행 | 스크립트 확장자 파일을 웹 루트에 올리고 호출해 웹셸을 얻는다 |
| 확장자 우회 | 이중 확장자(`.jpg.php`), 대소문자 변형, 널 바이트, 인코딩된 이름으로 검사를 피한다 |
| 클라이언트 측 실행 | HTML, SVG처럼 브라우저가 스크립트를 실행하는 파일을 같은 도메인에서 열게 해 XSS를 일으킨다 [[XSS]] |
| 경로 조작 | 파일명에 `../`를 넣어 의도하지 않은 위치에 쓴다 |
| 자원 고갈 | 대용량 파일을 반복하거나, 압축을 풀면 폭증하는 압축 폭탄을 올린다 |
| 악성 파일 배포 | 서비스가 악성코드 배포처가 된다 |

## 방어

- **확장자는 허용 목록으로**: 업무상 필요한 확장자만 허용한다. 파일명을 디코딩한 뒤 검사해 이중 확장자와 인코딩 우회를 막는다.
- **Content-Type을 믿지 않는다**: 요청의 Content-Type은 클라이언트가 정하는 값이라 쉽게 위조된다. 빠른 1차 거름으로만 쓴다.
- **파일 시그니처를 확인하되 단독으로 믿지 않는다**: 매직 바이트로 실제 형식을 확인하지만 이 역시 우회가 흔하다. 이미지라면 다시 인코딩해 원본 바이트를 버리는 방식(이미지 재작성, CDR)이 더 강하다. 필요하면 백신 검사나 샌드박스 검토를 더한다.
- **파일명은 서버가 만든다**: 사용자 파일명을 저장 경로에 쓰지 않고 UUID 같은 식별자로 저장한다. 원래 이름이 필요하면 메타데이터로 따로 보관한다.
- **크기와 개수를 제한한다**: 파서 단계에서 요청 크기와 파일 수를 막고, 압축 파일은 해제 후 크기를 안전하게 계산한다.
- **실행되지 않는 곳에 저장한다**: 우선순위는 별도 서버나 객체 스토리지, 그다음 웹 루트 밖, 불가피하면 웹 루트 안의 실행 불가 디렉터리 순이다. 디렉터리별 설정 재정의(`.htaccess` 등)를 막는다.
- **안전하게 내려준다**: 식별자로 파일을 찾아 내려주는 핸들러를 두고, 사용자 콘텐츠는 서비스와 다른 도메인에서 `Content-Disposition: attachment`와 정확한 Content-Type, `X-Content-Type-Options: nosniff`로 제공한다. [[Security-Headers]]
- **권한과 CSRF**: 업로드와 조회에 인가를 적용하고, 업로드 요청도 CSRF 방어 대상에 넣는다. [[CSRF]], [[IDOR]]

프레임워크 구현(파일 수와 크기 제한, 매직 바이트 검증, 객체 스토리지 사용)은 [[NestJS-File-Upload]]에 있다.

## 체크포인트

- 업로드 파일이 서버 측 실행, 브라우저 측 실행, 자원 고갈로 이어지는 경로
- 확장자 허용 목록, Content-Type 불신, 시그니처 검사의 역할과 한계
- 파일명을 서버가 생성하고 실행 불가 위치나 별도 도메인에서 제공하는 이유
- SVG와 HTML 업로드가 XSS가 되는 이유

## 출처

- [웹 개발을 위해 꼭 알아야하는 보안 공격 — kciter.so, kciter](https://kciter.so/posts/basic-web-hacking/)
- [OWASP Cheat Sheet Series, File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

## 관련 문서

- [[Command-Injection|Command Injection]]
- [[XSS|XSS]]
- [[Security-Headers|보안 헤더]]
- [[NestJS-File-Upload|NestJS 파일 업로드]]
- [[Application-Security|애플리케이션 보안]]
