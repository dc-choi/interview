---
name: auto-learn
description: 구독한 YouTube 채널과 리포스트한 Threads 글을 사용자가 자료를 넘기지 않아도 검증된 vault 지식으로 바꾸고, 매일 다이제스트와 회상 퀴즈로 이해를 확인하는 자동 학습 파이프라인. launchd 작업(harvest, learn, digest)이 claude -p로 이 스킬의 해당 모드를 실행한다. 사용자가 퀴즈 답, 자동 학습 상태, 다이제스트, auto-learn 멈춤이나 재개를 말할 때도 사용한다.
---

# 자동 학습 (auto-learn)

구독 채널의 새 영상과 리포스트한 Threads 글을 주기적으로 모아 1차 출처로 검증한 지식 문서로 vault에 반영한다. 문서가 늘어난 것을 숙련으로 착각하지 않도록 매일 회상 퀴즈를 내고 답을 기록한다.

## 구성

- `S`는 장비 로컬 상태 디렉터리 `~/.local/state/vault-auto-learn`이다. 구독 목록, 리포스트 원문, 전사문, 큐, 다이제스트와 로그는 여기에만 두고 저장소에 옮기지 않는다. Threads 계정 주소 같은 장비별 값은 `S/config.json`에 있다.
- `VL`은 저장소 루트에서 실행하는 `python3 .claude/skills/auto-learn/scripts/vault_learn.py`다. 큐, 기록, 검사와 Git 게시는 VL로만 한다.
- launchd 작업은 `S/launchd/`에 있고 라벨 접두사는 `com.dcchoi.vault-learn.`이다.

| 작업 | 주기 | 하는 일 |
| --- | --- | --- |
| transcriber | 상시(KeepAlive) | 큐의 영상을 2개씩 전사한다. 새 업로드가 먼저, 백로그가 다음이다. 실패는 30초 간격 3회 재시도하고 멤버십, 비공개, 말소리 없음은 영구 제외한다 |
| discover | 30분 | learn 채널의 RSS에서 채널 `added_at` 이후 올라온 영상을 새 업로드 큐에 넣는다 |
| harvest | 2시간 | Chrome으로 구독 목록을 갱신하고 새 리포스트를 모은다 |
| learn | 30분(잠금) | 이 스킬의 learn 모드로 최대 K개 항목을 반영한다 |
| digest | 매일 07:30 | 다이제스트와 회상 퀴즈를 쓰고 알림을 보낸다 |

- 주요 파일: `S/channels.tsv`(handle, channel_id, title, decision, reason, added_at), `S/queue/{new,backlog}.tsv`, `S/transcripts/<id>/transcript.md`, `S/inbox/threads/`(리포스트, `INDEX.tsv`, `EXCLUDED.tsv`), `S/digests/log.jsonl`(처리 기록), `S/digests/<날짜>.md`, `S/quiz.jsonl`, `S/runs/<run>/`, `S/logs/`.

## 공통 원칙

- 2026-10-05 사용자 결정: 검증 단계를 통과한 결과는 브랜치와 PR 없이 main에 자동으로 커밋하고 푸시하며, 작업 주기는 가능한 한 짧게 둔다.
- 신앙과 종교 관련 채널과 글은 학습하지 않는다. 이름, 내용과 단서를 저장소 문서, 커밋 메시지와 다이제스트에 쓰지 않고 상태 파일에는 `exclude`와 사유 `personal`만 남긴다.
- Threads 글은 단서다. 공식 문서, 표준, 원 논문 같은 1차 출처로 확인한 사실만 쓰고 `## 출처`에는 확인한 1차 출처만 적는다. Threads 링크는 문서에 넣지 않는다.
- 영상 전사문은 `.claude/skills/memo/SKILL.md`의 영상과 녹음 규칙대로 음차와 오인식을 교정하고, 교정할 수 없는 내용은 쓰지 않는다.
- 로그인한 YouTube 구독과 Threads 리포스트는 Claude in Chrome(`mcp__claude-in-chrome__*`)으로만 읽는다. Playwright는 쓰지 않는다. 공개 RSS와 yt-dlp는 VL과 전사 스크립트가 맡는다.
- 문서는 출처 중립적인 레퍼런스로 쓰고 루트와 도메인 `CLAUDE.md`의 규칙(가운뎃점과 강조용 따옴표 금지, PII 익명화, 문서 길이와 폴더 분할, 출처 표기, `verified_at`)을 따른다.
- `git add`, `commit`, `push`, `stash`, `reset`, `checkout`, `rebase`를 직접 실행하지 않는다. 게시는 `VL publish`가 하고, 다른 작업의 미커밋 변경은 건드리지 않는다.
- 무인 실행에서는 사용자에게 묻지 않는다. 판단이 서지 않는 항목은 `deferred`로 남긴다.

## learn 모드

1. 준비: 루트 `CLAUDE.md`, `.claude/skills/memo/SKILL.md`와 대상 도메인의 `CLAUDE.md`를 읽는다. `VL begin`으로 run을 연다. `blocked`면 결과 JSON만 출력하고 끝낸다. `foreign_dirty`는 다른 작업의 미커밋 변경이라 편집하지 않는다. `orphans`는 시간 제한이나 사용량 한도로 끊긴 이전 run이 남긴 파일이다. 그 파일부터 읽고 4~5단계 검증을 거쳐 `S/runs/<그 run>/result.json`을 남은 파일 기준으로 다시 쓴 뒤 `VL publish --run <그 run>`으로 게시하거나, `VL discard --run <그 run> --file ...`로 되돌린다.
2. 후보: `VL pick --k K`를 실행하고 현재 목표를 `fit/CLAUDE.md`의 현재 커리어 상태, `fit/growth/Current-Goals-and-Roadmap.md`, `fit/job-search/Job-Search-Tracker.md`의 지원 공고 요구사항과 `fit/growth/learning/roadmaps/roadmaps.md`에서 확인한다. 고르는 순서는 tier1(새 리포스트와 새 업로드) 중 1인 사업과 외주, 구직 요구사항, 학습 로드맵에 직접 닿는 항목, tier2(백로그 전사문) 중 같은 기준의 항목, 나머지 학습 영역 항목이다. tier3(인덱스의 `[ ]` 항목과 오래된 `verified_at`)은 tier1과 tier2가 비었을 때만 나온다. 학습 영역(개발, CS, 인프라와 클라우드, AI 엔지니어링, 사업과 제품, 마케팅과 영업, 운영, 경제와 재무, 커리어) 밖이거나 새 지식이 없는 항목은 제목과 메타데이터만 보고 `skipped`로 둘 수 있다. 한 run에서 반영은 K개, 건너뛰기는 2K개까지다.
3. 항목마다:
   - 원문(`path`)을 읽는다. 리포스트의 외부 링크는 WebFetch로 확인하고, YouTube 링크는 `VL enqueue <URL> --source repost:<id>`로 전사 큐에 넣는다.
   - 중복 확인: `mcp__development-context__context_lookup`(주제에 맞는 scope, `max_bytes: 24000`)과 Grep으로 같은 개념의 문서를 찾는다. 있으면 보강하고 보탤 내용이 없으면 `skipped`(사유에 해당 문서 경로)로 둔다.
   - 1차 출처 대조: WebSearch와 WebFetch를 쓰고 라이브러리 문서는 context7을 쓴다. 확인하지 못한 주장은 쓰지 않는다.
   - 편집 전에 대상 문서와 카테고리 인덱스를 `VL plan --run R --file <경로> ...`로 등록한다. 거부된 파일은 편집하지 않고 그 항목을 `deferred`로 둔다.
   - memo 스킬의 대상 결정, 본문 작성 원칙, 프론트매터와 출처, 연결 규칙대로 쓰고 인덱스의 `[ ]`를 `[x]`로 바꾸거나 새 항목을 더한다. tier3의 `[ ]` 항목은 계획된 문서를 쓰고, 오래된 문서는 1차 출처와 다시 대조한 범위만 고친 뒤 tech 규칙의 조건을 만족할 때만 `verified_at`을 바꾼다.
4. 반증 검증: 작성자와 분리된 새 서브에이전트(Agent 도구, `subagent_type: general-purpose`, `model: opus`)에 변경 파일 목록, `git diff`로 변경을 보는 방법, 원문 경로와 대조한 1차 출처 URL을 주고 결론을 반증하게 한다. 사실 오류와 과장된 일반화, 전사 오인식, 버전과 날짜처럼 시점에 민감한 주장, 출처 중립성, 지침 위반(가운뎃점, 강조용 따옴표, PII, 신앙 관련 내용, 출처 표기, `verified_at` 조건), 깨진 위키링크를 보게 하고 확정 오류, 조건부 문제, 설명 보완, 미검증으로 나눠 근거와 함께 보고하게 한다. 확정 오류는 고치고, 고친 범위가 크면 새 서브에이전트로 한 번 더 검증한다. 두 번째 검증 뒤에도 확정 오류가 남은 항목은 `VL discard`로 되돌리고 `deferred`로 둔다.
5. 규칙 검사: `VL check --run R`이 통과할 때까지 고친다.
6. 결과: 항목 하나나 같은 주제로 묶은 항목들이 4~5단계를 통과할 때마다 `S/runs/R/result.json`을 그 묶음으로 다시 쓴다. 건너뛰거나 미룬 항목도 묶음에 넣어 기록한다. learned와 merged 항목에는 문서만 읽고 답할 수 있는 회상 질문 1~2개를 둔다. 정의 암기보다 적용과 이유를 묻는다.

   ```json
   {"scope": "cloud", "subject": "한국어 요약", "body": "무엇을 근거로 무엇을 보강했는지 2~3줄",
    "items": [{"key": "video:ID", "result": "learned", "files": ["tech/..."], "topic": "주제",
               "takeaway": "핵심 한 문장", "recall": [{"q": "질문", "a": "모범 답", "doc": "tech/...md"}],
               "note": "skipped나 deferred의 사유"}]}
   ```

   `result`는 learned, merged, skipped, deferred 중 하나이고 `key`는 pick이 준 값을 그대로 쓴다.
7. 게시: 묶음마다 `VL publish --run R`을 실행한다. 묶음마다 게시하므로 run이 시간 제한이나 사용량 한도로 끊겨도 끝난 묶음은 남는다. 이 run이 plan한 파일 중 바뀐 것만 검사해 커밋하고, 다른 작업이 미리 바꿔 둔 파일은 건너뛰어 보고한다. 원격과 맞춘 뒤 푸시하고 HEAD, 추적 브랜치, `git ls-remote`의 SHA가 같고 차이가 `0 0`인지 증명한다. 원격이 앞서 있는데 다른 작업의 미커밋 변경이나 미푸시 커밋이 있으면 리베이스와 푸시를 미루고 `deferred`로 끝나며 다음 run이 다시 시도한다. 처리 기록(`S/digests/log.jsonl`)도 이때 남는다.
8. 마지막 줄에 `{"mode":"learn","run":"R","learned":0,"skipped":0,"deferred":0,"publish":"마지막 게시 상태","commits":["SHA"]}` 형식의 JSON 한 줄을 출력한다.

## harvest 모드

Chrome 도구(`tabs_context_mcp`, `tabs_create_mcp`, `navigate`, `javascript_tool`, `get_page_text`, `find`, `computer`, `tabs_close_mcp`)를 ToolSearch 한 번으로 불러온다. 도구가 없거나 브라우저가 연결되지 않으면 `CHROME_UNAVAILABLE`만 출력하고 끝낸다. 새 탭에서 작업하고 끝나면 연 탭만 닫는다. javascript_tool 출력은 2000자 근처에서 잘리므로 헬퍼의 `next` 값으로 나눠 읽고, 끝에 남은 Promise는 기다리지 않으므로 비동기 호출에는 `await`를 붙인다. 헬퍼 결과가 화면과 다르면 `find`와 `get_page_text`로 DOM을 확인해 맞춘다.

1. 구독: youtube.com을 열고 `.claude/skills/auto-learn/scripts/youtube_subs.js`의 내용을 javascript_tool로 실행한다. 사이드바의 구독 더보기를 펼치고 `ytd-guide-entry-renderer` 링크를 모은다. 이어서 `await __vlSubs(0)`을 실행하고 첫 줄의 `total`과 `next`를 보며 `await __vlSubs(next)`로 이어 읽은 행을 `S/tmp/subs.tsv`에 쓴다. 모은 행 수가 `total`과 같을 때만 `--complete`를 붙여 `VL channels-merge --rows S/tmp/subs.tsv --complete`를 실행한다.
2. 분류: 출력의 `pending` 채널마다 소개와 최근 제목을 보고 `VL channels-set --handle <handle> --decision learn|exclude --reason "<짧은 영어 사유>"`로 기록한다. 학습 영역은 learn 모드와 같고 오락, 스포츠, 음악, 브이로그, 운동, 요리는 제외한다. 사용자 본인 채널도 제외한다. 신앙과 종교 채널은 `--decision exclude --reason personal`로만 기록한다. 새 learn 채널은 분류한 날 이후의 업로드만 discover가 모은다.
3. 리포스트: `S/config.json`의 `threads_reposts_url`을 열고 `.claude/skills/auto-learn/scripts/threads_extract.js`의 내용을 실행한 뒤 `__vlThreads('list', 0)`으로 보이는 글을 읽는다(글이 늦게 그려지면 잠시 기다린다). `S/seen_reposts`에 있는 id가 나올 때까지 스크롤하며 새 글만 모으되 한 run에 50개까지만 모은다. `chain`이 `1/N`이면 글 페이지를 열어 헬퍼를 다시 실행하고 `__vlThreads('post', id, 0)`으로 이어진 글까지 읽는다. 글 페이지에는 `1/N` 표시가 없으므로 chain 값은 목록에서 읽은 것을 쓴다.
4. 저장: 새 글마다 `S/inbox/threads/<id>.md`를 기존 파일과 같은 형식으로 쓴다. frontmatter는 `id`, `url`, `author`, `posted_at`, `repost_order`(이번 수집의 최신 글이 1), `chain`, `chain_captured`, `images`, `videos`, `harvested_at`, `status: lead`이고 본문은 `## Text`와 필요할 때 `## Quoted post`, `## Thread continuation (same author)`(`### 2/N`), `## Outbound links`(`- URL`)다. 신앙과 종교 글은 파일을 만들지 않고 `S/inbox/threads/EXCLUDED.tsv`에 `id<TAB>harvested_at<TAB>repost_order<TAB>personal` 한 줄만 더한다. 끝나면 `VL threads-reindex`로 가운뎃점과 연락처를 정리하고 `INDEX.tsv`와 `seen_reposts`를 갱신한다.
5. 마지막 줄에 `{"mode":"harvest","channels_new":0,"pending_left":0,"reposts_new":0,"excluded":0}` 형식의 JSON 한 줄을 출력한다.

## digest 모드

1. `VL digest-data --date <오늘>`을 실행한다. 지난 다이제스트 이후의 처리 기록(커밋 SHA 포함), 1일, 3일, 7일 전에 배운 항목과 다시 물을 문항에서 고른 회상 퀴즈 1~2개, 큐와 게시 상태를 준다. 같은 날 다시 실행해도 같은 문항을 준다.
2. `S/digests/<날짜>.md`를 쓴다. `## 변경`(항목별 결과, 문서 경로, 커밋 SHA 7자리), `## 핵심 3가지`(판단에 가장 쓸모 있는 내용), `## 회상 퀴즈`(qid와 질문만 쓰고 답은 쓰지 않는다), `## 확인할 것`(게시 보류, 전사 실패, 백오프처럼 사용자가 알아야 할 것만) 순서다.
3. `S/digests/<날짜>.answers.md`에 qid별 모범 답과 근거 문서 경로를 쓴다.
4. 마지막 줄에 `{"mode":"digest","date":"YYYY-MM-DD","questions":0}` 형식의 JSON 한 줄을 출력한다. 알림은 VL이 보낸다.

## 퀴즈 답 (대화 세션)

사용자가 `퀴즈 답`이라며 답을 주면 다음 순서로 처리한다.

1. `VL begin --kind quiz`로 run을 연다.
2. `S/quiz.jsonl`에서 채점되지 않은 최근 문항과 `S/digests/<날짜>.answers.md`를 읽고, 근거 문서를 다시 읽어 correct, partial, wrong으로 채점한다. 틀리거나 빠진 부분만 짧게 보강해 설명한다. 문서 자체가 틀렸으면 learn 규칙대로 고친다.
3. 문항마다 `VL quiz-grade --qid <qid> --result <결과> --note "<빠진 점>"`을 실행한다. 다음 복습일은 VL이 정한다(wrong 1일, partial 3일, correct는 7일과 21일 뒤에 한 번씩 더 묻고 끝낸다).
4. `fit/growth/learning/Recall-Quiz-Log.md`에 날짜, 주제와 근거 문서 위키링크, 결과, 보강한 점, 다음 복습일을 한 행씩 더한다. 파일이 없으면 `status: active` frontmatter로 만들고 `fit/growth/learning/학습(Learning).md` 목차에 연결한다. 개인 맥락과 신앙 관련 내용은 쓰지 않는다.
5. `VL plan`, `VL check`, `result.json`(scope `learning`, items는 빈 목록)과 `VL publish`로 게시한다.

## 운영

- 사용자는 `~/.local/bin/vault-learn`으로 관리한다. `install`(도구 점검, 임시 전사 작업 이관, plist 복사와 `launchctl bootstrap`), `uninstall`, `status`, `pause`와 `resume`(`S/paused` 플래그, 진행 중 작업은 마친다), `run-now <작업>`, `logs [작업] [-f]`, `migrate [--dry-run]`이 있다.
- 에이전트는 launchd 작업, crontab이나 상주 프로세스를 등록하거나 시작하지 않는다. 등록은 사용자가 `vault-learn install`로 한다.
- K, 전사 동시 작업 수와 시간 제한은 `S/config.json`에서 바꾼다. 사용량 한도 오류가 나면 VL이 지수 백오프한다(`S/backoff.json`).
- 점검: `VL status`, `VL doctor`, `VL selftest`. node 경로가 바뀌면 `VL plists`로 plist를 다시 만든 뒤 `vault-learn install`을 다시 실행한다.
