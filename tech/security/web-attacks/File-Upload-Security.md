---
tags: [security, web-attacks, file-upload, webshell, owasp]
status: done
verified_at: 2026-10-13
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
| 디코더 취약점 | 썸네일 생성이나 형식 변환 중 이미지 디코더의 메모리 안전성 버그를 건드리는 조작 파일로, 스크립트 업로드 없이도 서버에서 코드를 실행한다 |

## 방어

- **확장자는 허용 목록으로**: 업무상 필요한 확장자만 허용한다. 파일명을 디코딩한 뒤 검사해 이중 확장자와 인코딩 우회를 막는다.
- **Content-Type을 믿지 않는다**: 요청의 Content-Type은 클라이언트가 정하는 값이라 쉽게 위조된다. 빠른 1차 거름으로만 쓴다.
- **파일 시그니처를 확인하되 단독으로 믿지 않는다**: 매직 바이트로 실제 형식을 확인하지만 이 역시 우회가 흔하다. 이미지라면 다시 인코딩해 원본 바이트를 버리는 방식(이미지 재작성, CDR)이 더 강하다. 다만 재인코딩도 원본을 먼저 디코딩하므로 디코더 자체의 취약점은 막지 못한다. 필요하면 백신 검사나 샌드박스 검토를 더한다.
- **디코더까지 공격면으로 본다**: 썸네일 생성과 형식 변환은 업로드한 바이트를 이미지 디코더가 직접 해석하게 만든다. 검증기가 판별하지 못한 형식을 범용 변환기에 넘기면 검증하지 않은 입력이 디코더에 그대로 닿으므로, 검증기가 확인하는 형식과 디코더가 처리하는 형식을 같은 허용 목록으로 맞춘다. 업무에 필요 없는 형식(예: HEIF, AVIF)은 디코딩하지 않는다.
- **비신뢰 파일의 디코딩은 격리한다**: 이미지 처리는 강화된 일회용 샌드박스에서 실행하고, 디코더 라이브러리의 보안 업데이트는 이미지를 다시 빌드해 실제 배포본에 들어갔는지까지 확인한다. [[Dependency-Vulnerability-Scanning]]
- **ImageMagick은 보안 정책으로 좁힌다**: 공식 문서 기준 기본 설치는 open 정책이다. `policy.xml`에서 넓은 거부 규칙을 먼저 두고 필요한 형식만 예외로 허용하며, memory, map, area, disk, width, height, time 같은 자원 한도를 건다. 적용 중인 정책은 `magick identify -list policy`로 확인한다.
- **파일명은 서버가 만든다**: 사용자 파일명을 저장 경로에 쓰지 않고 UUID 같은 식별자로 저장한다. 원래 이름이 필요하면 메타데이터로 따로 보관한다.
- **크기와 개수를 제한한다**: 파서 단계에서 요청 크기와 파일 수를 막고, 압축 파일은 해제 후 크기를 안전하게 계산한다.
- **실행되지 않는 곳에 저장한다**: 우선순위는 별도 서버나 객체 스토리지, 그다음 웹 루트 밖, 불가피하면 웹 루트 안의 실행 불가 디렉터리 순이다. 디렉터리별 설정 재정의(`.htaccess` 등)를 막는다.
- **안전하게 내려준다**: 식별자로 파일을 찾아 내려주는 핸들러를 두고, 사용자 콘텐츠는 서비스와 다른 도메인에서 `Content-Disposition: attachment`와 정확한 Content-Type, `X-Content-Type-Options: nosniff`로 제공한다. [[Security-Headers]]
- **권한과 CSRF**: 업로드와 조회에 인가를 적용하고, 업로드 요청도 CSRF 방어 대상에 넣는다. [[CSRF]], [[IDOR]]

2026-07 Discourse 사례가 검증기와 디코더의 형식 불일치를 보여 준다. 업로드 이미지를 FastImage로 확인하던 Discourse는 FastImage가 HEIF를 지원하지 않아 해당 파일을 ImageMagick `magick` 명령으로 변환했고, 이 경로가 공격자 파일을 libheif 파서에 그대로 노출했다. Debian 12 기반 Docker 이미지에 들어 있던 libheif 1.19.7의 HEIC 디코딩 중 heap buffer overflow가 원격 코드 실행으로 이어졌다. Discourse는 권고 GHSA-vhm9-85gw-x335(CVSS 3.1 8.8)에서 2026.7.0, 2026.6.1, 2026.5.2, 2026.1.6을 패치 버전으로 두고 최신 Docker 이미지에 패치된 libheif를 넣었으며, 최신 지원 버전에는 커널이 지원하는 환경에서 이미지 처리 샌드박스를 심층 방어로 더했다.

프레임워크 구현(파일 수와 크기 제한, 매직 바이트 검증, 객체 스토리지 사용)은 [[NestJS-File-Upload]]에 있다.

## 체크포인트

- 업로드 파일이 서버 측 실행, 브라우저 측 실행, 자원 고갈로 이어지는 경로
- 확장자 허용 목록, Content-Type 불신, 시그니처 검사의 역할과 한계
- 파일명을 서버가 생성하고 실행 불가 위치나 별도 도메인에서 제공하는 이유
- SVG와 HTML 업로드가 XSS가 되는 이유
- 검증기와 디코더의 형식 불일치가 디코더 취약점으로 이어지는 경로와 허용 형식 제한, 디코딩 격리

## 출처

2026-10-13 부분 검증: 디코더 공격면, 디코딩 격리와 ImageMagick 보안 정책, Discourse 사례를 ImageMagick 공식 문서, Discourse 권고와 신고자의 글에 대조했다. 기존 방어 항목 전체를 다시 대조한 기록은 아니다.

- [웹 개발을 위해 꼭 알아야하는 보안 공격 — kciter.so, kciter](https://kciter.so/posts/basic-web-hacking/)
- [OWASP Cheat Sheet Series, File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [ImageMagick, Security Policy](https://imagemagick.org/security-policy/)
- [RCE via malformed HEIF file (GHSA-vhm9-85gw-x335) — GitHub, discourse/discourse](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335)
- [Hacking OpenAI — Hacktron, Harsh Jaiswal, Mohan Pedhapati, Rahul Maini](https://www.hacktron.ai/blog/hacking-openai)

## 관련 문서

- [[Command-Injection|Command Injection]]
- [[XSS|XSS]]
- [[Security-Headers|보안 헤더]]
- [[NestJS-File-Upload|NestJS 파일 업로드]]
- [[Application-Security|애플리케이션 보안]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
