---
tags: [palantir, foundry, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["2024 media, 연동과 release 증거 해석"]
---

# 2024 media, 연동과 release 증거 해석

2024년 공식 release note의 역사적 변경 기록이다. 현재 지원과 기본값은 해당 제품의 최신 계약을 다시 확인한다.

## File과 transaction

1월 Media Sets GA는 common schema의 unstructured data, virtual Azure/S3와 transactional/transactionless 구성을 도입했다.4월~6월 retention,8월 creation UI,10월 DOCX→PDF/원본 DOCX download와 TIFF,12월 TXT→PDF가 이어졌다. 포맷 normalization 결과와 원본 bytes/fidelity를 구분한다. Video 등 당시 roadmap은 실지원으로 바꾸지 않는다.

Media path skip, item search batch2,500, bulk download/delete, upload preview cache refresh는 단순 탐색과 실제 수명 변경이 섞여 있다. Transactionless의 item별 즉시 변경과 transactional snapshot/incremental 보장은 다르다.11월 raw upload default가 folder file에서 dataset으로 바뀌었다는 기록도 현재 upload mode를 확인해야 하는 이유다.

## 외부 시스템 반영

6월 JDBC table export는 mirror/full/no truncation/truncation/incremental/append-only 검사 같은 mode를 분리했다. Full snapshot을 export하되 truncate하지 않는 mode와 destination mirror는 같지 않다. Target schema 일치와 direct/agent runtime, 당시 custom JDBC 지원 범위를 확인한다. Export tasks sunset은 모든 외부 write 경로 폐기가 아니다.

6월150개+source는 Experimental로 출시되어 connector별 lifecycle이 다르다고 명시한다.4월 Databricks도 beta였고 export/Virtual Table은 roadmap이었다. SAP SP31/32의 CDPOS/SLT metadata/HANA paging/BALDAT fix는 그 add-on version 이력이며 현재 SLT/OData 지원이나 설치 prerequisite를 대체하지 않는다.

Monitoring Slack/webhook 통합은 source credentials/egress와 severity를 연결하며 exact severity에 매칭되는 alert만 해당 integration을 실행한다. 수신 성공과 incident 해결, auto scheduling1분과 실제 evaluation latency는 구분한다. 실제 알림/외부 write는 수행하지 않았다.

## Release 본문의 증거 한계

이 문서군은 공개 페이지의 동적 JSON에 보존된234 release-day/894note(113개 longDescription)를 모두 읽고 재사용할 계약으로 합성했다. Type/prominence/category/application/date/releaseVersion/media와 본문 binding을 함께 확인했다. 동일 JSON을 반환하는 announcements/release-notes와 release-notes URL은 hash로 검증한 alias이며 별도 새로운 본문으로 세지 않는다.

Description과 longDescription에는 draft instructions, internal/placeholder link, Unparsable component, 같은 변경의 중복 note와 뒤늦게 갱신된 asset 경로가 있다. 공개 snapshot의 전체 본문을 읽었다는 사실과 발표 당시 최종본/화면/링크 콘텐츠가 완전히 재현된다는 보장은 다르다. 연결된 외부 표준/SDK/paper 전체를 추가로 읽은 것으로 간주하지 않는다.

일부3월7일 묶음은 많은 항목에 같은 frontend releaseVersion을 부여하며 이미지 경로 날짜도 note date와 다를 수 있다. Note date, rollout 예상 주간, actual enrollment enablement와 artifact 수정 시점을 구분한다. 일반적으로 일주일가량 지연될 수 있다는 발표문도 있으므로 표기된 날짜를 모든 환경의 배포 완료 증거로 사용하지 않는다.

Source의 current/best/guaranteed/faster 같은 표현은2024년 주장이다. 독립 성능시험이나 runtime/API 검증은 수행하지 않았다. 현재 제품 판단에는 해당 제품의 최신 공식 문서와 실제 환경을 다시 대조한다.

## 출처

- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2024)
- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/release-notes/2024)

## 관련 문서

- [[Palantir-Platform-Evolution-2024]]
