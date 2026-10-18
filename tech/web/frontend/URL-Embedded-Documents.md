---
tags: [web, url, local-first, document]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["URL Embedded Documents", "링크 안에 담긴 문서", "Tiny Little Office"]
---

# URL에 문서를 담는 공유 방식

URL에 문서 데이터를 포함하면 링크를 복사하는 행위가 문서 복사가 된다. 중앙 문서 ID를 함께 편집하는 협업과 달리, 수신자가 내용을 바꾸면 새로운 사본과 URL이 생긴다.

## 저장 위치가 만드는 차이

URL의 fragment(`#` 뒤)는 기본 HTTP 요청에 포함되지 않는다. 페이지 스크립트는 이를 읽을 수 있으므로 서버에 기본 전송되지 않는다는 성질을 모든 데이터 유출 방지와 동일시하지 않는다. 링크를 공개하면 내용도 공개될 수 있다. 링크 기록, 동기화와 공유 대상도 데이터 경로다.

긴 문서는 URL 길이와 공유 채널의 제한을 만난다. 단축 링크가 서버에 데이터를 저장한다면 저장소 없는 방식과 별도로 암호화, 키 전달, 보존과 삭제 정책을 확인한다. 링크 안의 데이터가 남아도 해석하는 웹 앱이 사라지면 열람이 어려울 수 있어 내보내기 경로가 필요하다.

## Tiny Little Office 사례와 확인 수준

2026-10-16 제공 발췌는 계정 없는 무료 웹 오피스, 문서/시트/슬라이드 등 10개 도구, 선택적 브라우저 보관과 암호화 단축 링크를 소개한다. 제작사의 2026-10-14 발표에서 링크 기반 사본 공유와 작은 문서용 도구 구성을 확인했다. 단축 링크의 암호 구현과 현재 저장 정책은 확인하지 못했다. 실제 UI 조작과 복구 시험도 하지 않았다.

적용 후보는 작은 설명 문서, 계산식과 일회성 공유다. 공동 편집, 권한 철회나 장기 기록이 필요하면 링크 사본의 특성이 요구에 맞는지 먼저 판단한다.

## 출처

- [Introducing TinyLittleOffice.com — Aboard, Paul Ford](https://aboard.com/introducing-tinylittleoffice-com/)
- GeekNews 제공 발췌, 2026-10-16 09:33, Tiny Little Office. 단축 링크 동작은 후속 확인 대상이다.

## 관련 문서

- [[URI-URL-URN|URI, URL과 식별자]]
- [[Web-Service-Structure|웹 서비스의 상태 저장 위치]]
