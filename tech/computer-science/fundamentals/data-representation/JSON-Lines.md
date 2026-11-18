---
tags: [cs, data-format, json, jsonl, ndjson, append-only, log]
status: done
verified_at: 2026-11-19
category: "CS - 기초"
aliases: ["JSON Lines", "JSONL", "NDJSON", "줄 단위 JSON"]
---

# JSON Lines: 한 줄에 한 레코드를 적는 JSON

JSON Lines(JSONL)는 JSON 값 하나를 한 줄에 적고 줄바꿈으로 레코드를 나누는 텍스트 형식이다. 파일 전체가 하나의 JSON 값이 아니라 JSON 값의 나열이라서, 끝에 덧붙이고 한 줄씩 흘려 읽는 용도에 맞다.

## 형식 규칙

JSON Lines 사이트가 정한 요구사항은 세 가지다.

- **UTF-8 인코딩**: BOM(U+FEFF)은 넣지 않는다.
- **각 줄은 유효한 JSON 값 하나**: 객체나 배열이 흔하지만 어떤 JSON 값이든 된다. `null`은 값이지만 빈 줄은 값이 아니다.
- **줄 구분자는 `\n`**: JSON 파서가 값 주변 공백을 무시하므로 `\r\n`도 읽힌다. 마지막 값 뒤의 줄 구분자는 강하게 권장되지만 필수는 아니다.

확장자는 `.jsonl`이고 압축하면 `.jsonl.gz`나 `.jsonl.bz2`를 쓴다. MIME 타입은 `application/jsonl`을 쓸 수 있으나 아직 표준화되지 않았다.

```jsonl
{"key":"a","result":"skipped","note":"첫 줄\n둘째 줄"}
{"key":"b","result":"learned"}
```

## 한 줄에 한 값이 성립하는 조건

레코드가 두 줄에 걸치지 않는다는 성질은 두 조건이 함께 만든다.

- **문자열 안의 줄바꿈은 이스케이프된다.** RFC 8259는 문자열 안의 제어 문자(U+0000부터 U+001F)를 반드시 이스케이프하게 한다. 값에 줄바꿈이 있어도 직렬화하면 `\n` 두 글자가 된다.
- **토큰 사이에 줄바꿈을 넣지 않는다.** RFC 8259는 구조 문자 앞뒤의 공백으로 줄바꿈을 허용하므로, 들여쓰기 옵션을 켠 출력은 여러 줄이 된다. JavaScript의 `JSON.stringify`는 `space` 인자가 없으면 공백을 넣지 않고, Python의 `json.dumps`는 `indent`가 기본값 `None`이면 줄바꿈을 넣지 않는다.

따라서 쓰는 쪽은 들여쓰기 없이 직렬화해야 하고, 사람이 보기 좋게 편집한 여러 줄 JSON을 그대로 넣으면 형식이 깨진다.

읽는 쪽이 줄을 나누는 기준도 `\n`이어야 한다. JSON은 U+0085, U+2028, U+2029를 문자열 안에 그대로 둘 수 있는데, 줄 단위 읽기 함수 가운데 이 문자에서도 줄을 나누는 것이 있다.

- **Python `str.splitlines()`**: 세 문자 모두에서 나눈다(Python 문서의 줄 경계 표, CPython 3.14.8 실행 확인). `split("\n")`과 파일 객체 순회는 나누지 않았다.
- **Node.js `node:readline`**: U+2028, U+2029와 단독 `\r`에서 나눈다(Node v24.22.1 실행 확인). `JSON.stringify`는 U+2028과 U+2029를 이스케이프하지 않으므로, 같은 프로그램이 쓰고 읽어도 그 문자가 든 레코드가 두 조각으로 갈려 버려진다.

## JSON 배열과의 차이

| 기준 | JSON 배열 하나 | JSON Lines |
| --- | --- | --- |
| 항목 추가 | 닫는 `]` 앞에 끼워야 해서 보통 전체를 다시 쓴다 | 끝에 한 줄을 덧붙인다 |
| 읽기 | 스트리밍 파서를 쓰지 않으면 전체를 파싱한다 | 한 줄씩 읽고 버릴 수 있다 |
| 쓰다 끊긴 경우 | 문서 전체가 유효하지 않게 된다 | 마지막 줄만 깨진다(이어 쓰기 전에 꼬리를 정리한 경우) |
| 줄 단위 도구 | 쓸 수 없다 | `wc -l`, `grep`, `tail`, `split`이 레코드 단위로 동작한다 |
| 파일 수준 메타데이터 | 바깥 객체에 둘 수 있다 | 둘 자리가 없어 첫 줄 관례나 별도 파일이 필요하다 |

## 비슷한 형식

| 형식 | 레코드 구분 | 빈 줄 | 미디어 타입과 확장자 |
| --- | --- | --- | --- |
| JSON Lines | 값 뒤의 `\n`, 마지막은 권장 | 유효하지 않다 | `application/jsonl`(표준화 전), `.jsonl` |
| NDJSON 1.0.0 | 모든 값 뒤에 `\n` 필수, 앞에 `\r` 허용 | 파서가 무시할 수 있고 그 동작을 문서화해야 한다 | `application/x-ndjson`(명세 권고), `.ndjson` |
| JSON Text Sequences (RFC 7464) | 값 앞에 RS(0x1E), 값 뒤에 LF | 연속한 RS는 무시할 수 있다 | `application/json-seq`(IANA 등록) |

JSON Lines와 NDJSON은 실무에서 같은 파일을 가리키는 두 이름으로 쓰인다. 형식 규칙의 차이는 빈 줄과 마지막 줄바꿈의 엄격함 정도이고 미디어 타입과 확장자 표기가 다르다. 쓰는 쪽은 빈 줄 없이 모든 값 뒤에 `\n`을 붙이면 두 규칙을 모두 만족한다.

RFC 7464는 접근이 다르다. 시작을 RS로 표시해 깨진 레코드 다음 지점을 찾을 수 있게 하고, 끝의 LF로 잘린 숫자와 `true`, `false`, `null`을 구분한다. 덧붙이던 로그가 중간에 잘려도 파서가 다음 RS부터 이어 읽도록 설계됐다. 대신 값마다 RS 바이트가 앞에 붙으므로 `grep`이나 `tail`로 뽑은 줄을 일반 JSON 파서에 그대로 넘길 수 없다.

## 쓰기: 덧붙이기의 보장 범위

```js
import { appendFileSync } from 'node:fs';

const appendRecord = (path, record) => {
  appendFileSync(path, `${JSON.stringify(record)}\n`);
};
```

레코드는 객체로 한정한다. `undefined`나 함수를 넘기면 `JSON.stringify`가 `undefined`를 돌려줘 유효하지 않은 줄이 기록된다.

덧붙이기가 안전하다는 말은 조건부다. POSIX(IEEE Std 1003.1-2017) 기준으로 구분한다.

- **`O_APPEND`가 보장하는 것**: 쓰기 직전에 오프셋을 파일 끝으로 옮기고, 오프셋 변경과 쓰기 사이에 다른 파일 수정이 끼어들지 않는다. 여러 쓰는 쪽이 서로의 데이터를 덮어쓰지 않는 근거다.
- **부분 쓰기**: 공간이 부족하면 쓸 수 있는 만큼만 쓰고 그 바이트 수를 돌려준다. 일부를 쓴 뒤 시그널로 끊겨도 쓴 만큼만 돌려준다. 반환값을 확인해 나머지를 이어 쓰지 않으면 잘린 줄이 남고, 공간 부족처럼 이어 쓸 수 없으면 꼬리 정리가 필요하다.
- **동시 쓰기**: 표준은 일반 파일의 `write`가 서로에 대해 원자적이어야 한다고 요구하고 이를 두 스레드의 호출로 풀어 쓴다. 서로 다른 프로세스까지 포함하는지는 문구가 한정하지 않으므로 표준만으로 여러 프로세스의 덧붙이기가 안전하다고 단정하지 않는다. 표준의 해설은 애플리케이션이 동시성 제어를 쓰라고 권한다. `PIPE_BUF` 이하 쓰기가 섞이지 않는다는 보장은 파이프와 FIFO에 대한 것이다. 여러 프로세스가 한 파일에 덧붙이면 잠금을 잡거나 쓰는 프로세스를 하나로 모은다.
- **한 레코드는 한 번의 쓰기로**: 런타임 버퍼가 한 줄을 여러 `write` 호출로 나누면 다른 쓰는 쪽의 줄과 섞일 수 있다. 줄 전체를 한 번에 넘긴다.
- **내구성**: 쓰기 성공은 저장 장치 도달을 뜻하지 않는다. `fsync`가 데이터를 저장 장치로 보내도록 요청하고 완료까지 기다리지만, 전송의 성격은 구현이 정한다. 잃으면 안 되는 기록이면 `fsync` 시점을 정책으로 정한다.

마지막 줄바꿈이 없는 파일에 덧붙이면 `{"n":1}{"n":2}`처럼 두 값이 한 줄에 붙는다. 모든 값 뒤에 `\n`을 쓰는 규칙이 이 문제를 막는다.

쓰다 끊긴 줄은 줄바꿈 없이 끝나므로 이 규칙으로 막지 못한다. 그 상태에서 다시 덧붙이면 `{"n":2,"na{"n":3}`처럼 다음 레코드가 깨진 줄에 붙어 함께 버려진다. 쓰기를 다시 시작할 때 파일의 마지막 바이트가 `\n`인지 확인하고, 아니면 마지막 `\n` 뒤의 꼬리를 잘라내거나 `\n`을 먼저 써서 깨진 줄을 떼어 놓는다.

## 읽기: 깨진 줄을 전제로 한다

쓰다 끊긴 마지막 줄, 빈 줄과 필드가 다른 줄은 형식이 막지 못하므로 읽는 쪽이 처리한다.

```js
import { createReadStream } from 'node:fs';

const readRecords = async (path) => {
  const records = [];
  let skipped = 0;
  let rest = '';
  const parseLine = (line) => {
    if (line.trim() === '') return; // 빈 줄은 관용으로 넘긴다
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      skipped += 1;
    }
  };
  for await (const chunk of createReadStream(path, { encoding: 'utf8' })) {
    const lines = (rest + chunk).split('\n');
    rest = lines.pop();
    for (const line of lines) parseLine(line);
  }
  if (rest !== '') skipped += 1; // 줄바꿈 없이 끝난 꼬리는 쓰다 끊긴 줄로 본다
  return { records, skipped };
};
```

줄은 `\n`으로만 나눈다. `JSON.parse`가 값 주변 공백을 무시하므로 `\r\n` 파일의 줄 끝 `\r`은 따로 지우지 않아도 된다. 자기 프로그램이 모든 값 뒤에 `\n`을 쓰는 기록이라면 줄바꿈 없이 끝난 꼬리는 파싱되더라도 잘린 것으로 다룬다. 최상위 값이 숫자면 `12`가 `1234`의 앞부분일 수 있기 때문이다. 마지막 줄바꿈을 생략할 수 있는 외부 파일은 꼬리도 파싱한다.

깨진 줄을 건너뛸지 전체를 실패시킬지는 용도가 정한다. 로그 집계는 건너뛰고 그 수를 남기는 편이 낫고, 상태를 복원하는 기록은 꼬리가 아닌 곳이 깨졌으면 멈춰야 한다.

jq는 입력을 공백으로 구분된 JSON 값의 나열로 읽어 필터를 값마다 적용하므로 JSONL을 그대로 받는다.

```bash
jq -r .result log.jsonl | sort | uniq -c     # 값별 개수
jq -c 'select(.key == "a")' log.jsonl         # 조건에 맞는 줄만, 한 줄 형식 유지
jq -s 'length' log.jsonl                      # 전체를 배열로 모아 한 번 실행 (메모리에 전부 올린다)
jq -R -c 'fromjson? | .key' log.jsonl         # 깨진 줄을 건너뛰며 읽기
```

깨진 줄이 있으면 jq는 그 앞까지 출력한 뒤 오류로 끝나고 뒤의 줄은 처리하지 않는다(jq 1.7.1 실행 기준, 종료 코드 5). `-R`로 줄을 문자열로 받아 `fromjson?`으로 파싱하면 그 줄만 건너뛴다. `-c`가 없으면 출력이 여러 줄로 펼쳐져 JSONL이 아니게 된다.

## 덧붙이기 전용 기록으로 상태를 표현한다

JSONL 파일을 처리 기록으로 쓰면 줄 하나가 사건이고 현재 상태는 읽는 쪽이 계산한 결과다.

- **고치지 않고 덧붙인다.** 건너뛴 항목을 다시 처리 대상으로 돌리려면 건너뜀 줄을 지우지 않고 다시 열었다는 줄을 뒤에 쓴다. 이력이 남고, 쓰는 쪽은 파일의 다른 부분을 건드리지 않는다.
- **읽는 쪽이 접는다.** 같은 key의 줄을 위에서 아래로 훑어 최종 상태를 정한다. 마지막 줄이 이긴다는 규칙만으로 부족하면 접는 함수에 업무 규칙을 넣는다. 이미 반영한 항목은 뒤에 다른 결과가 와도 다시 열지 않는다는 식이다.
- **같은 사건이 두 번 적히는 경우를 견딘다.** 기록 줄을 쓴 뒤 다른 상태 저장 전에 끊기면 재시도가 같은 줄을 한 번 더 쓴다. 접는 규칙이 중복에 같은 결과를 내도록 만들거나, 쓰기 전에 그 key의 기존 줄을 확인한다.
- **파일은 계속 자란다.** 접은 결과만 새 파일에 쓰고 교체하는 정리 작업이 없으면 읽기 비용이 기록 수에 비례해 늘어난다.

이 구조는 이벤트를 원본으로 두고 상태를 재생해 얻는 이벤트 소싱, 변경을 먼저 로그에 적는 데이터베이스의 선행 기록과 같은 발상을 파일 하나로 줄인 것이다.

## 쓰이는 곳

- **검색 엔진의 대량 색인**: OpenSearch Bulk API는 요청 본문이 NDJSON이고 `Content-Type: application/x-ndjson`을 쓰며 본문이 줄바꿈으로 끝나야 한다. 동작 줄 뒤에 문서 줄이 따라오는 구조라 한 줄이 한 레코드라는 가정이 그대로 맞지는 않는다.
- **LLM 배치 처리**: Claude Message Batches는 결과를 `.jsonl`로 주고, OpenAI Batch API는 입력과 출력이 모두 `.jsonl`이다. 두 곳 모두 결과 줄의 순서가 요청 순서와 같다고 보장하지 않으므로 `custom_id`로 대응시킨다(2026-11-19 문서 기준).
- **로그와 이벤트 내보내기**: 줄 단위로 잘라 병렬 처리하고 중간부터 이어 읽기 쉽다.

## 한계와 선택 기준

- **조회는 전체 훑기다.** 인덱스가 없어 특정 key를 찾는 비용이 파일 크기에 비례한다. 조회가 잦거나 파일이 커지면 SQLite 같은 저장소로 옮긴다.
- **스키마를 강제하지 않는다.** 줄마다 필드가 달라도 유효하다. 버전 필드를 두거나 읽을 때 검증한다.
- **수정과 삭제가 없다.** 보정 줄과 접는 규칙으로 표현하므로 읽는 코드가 복잡해진다.
- **텍스트라 크다.** 필드 이름이 줄마다 반복된다. 분석용 대용량 데이터는 컬럼 형식이, 저장 공간은 압축이 대안이다.

기록이 주로 덧붙여지고, 한 프로세스가 쓰며, 사람이 직접 열어 볼 일이 있고, 규모가 메모리에서 한 번 훑을 수준이면 JSONL이 가장 단순한 선택이다. 여러 쓰는 쪽, 잦은 조회, 트랜잭션이 필요해지면 데이터베이스가 맞다.

## 면접 체크포인트

- JSON 배열 대신 JSONL을 고르는 조건과 잃는 것을 설명한다.
- 문자열 값에 줄바꿈이 있어도 레코드가 한 줄로 유지되는 이유와, 그 성질이 깨지는 직렬화 옵션을 말한다.
- 덧붙이기에서 `O_APPEND`가 보장하는 범위와 여러 프로세스가 쓸 때 추가로 필요한 것을 구분한다.
- 쓰다 끊긴 마지막 줄을 읽는 쪽에서 어떻게 다룰지, 건너뛰기와 실패 처리를 고르는 기준을 설명한다.
- 덧붙이기 전용 기록에서 처리 결과를 되돌리는 방법과 중복 기록에 대비하는 방법을 설명한다.
- 배치 API의 결과 파일을 줄 번호로 요청과 대응시키면 안 되는 이유를 말한다.

## 출처

- [JSON Lines](https://jsonlines.org/)
- [ndjson-spec, Newline Delimited JSON 1.0.0](https://github.com/ndjson/ndjson-spec)
- [IETF, RFC 7464: JavaScript Object Notation (JSON) Text Sequences](https://www.rfc-editor.org/rfc/rfc7464)
- [IETF, RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259)
- [The Open Group, POSIX.1-2017: write](https://pubs.opengroup.org/onlinepubs/9699919799/functions/write.html)
- [The Open Group, POSIX.1-2017: 2.9.7 Thread Interactions with Regular File Operations](https://pubs.opengroup.org/onlinepubs/9699919799/functions/V2_chap02.html)
- [The Open Group, POSIX.1-2017: fsync](https://pubs.opengroup.org/onlinepubs/9699919799/functions/fsync.html)
- [Python Documentation, json](https://docs.python.org/3/library/json.html)
- [Python Documentation, Built-in Types: str.splitlines](https://docs.python.org/3/library/stdtypes.html#str.splitlines)
- [MDN Web Docs, JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [Node.js Documentation, Readline](https://nodejs.org/api/readline.html)
- [jq Manual](https://jqlang.org/manual/)
- [OpenSearch Documentation, Bulk API](https://docs.opensearch.org/latest/api-reference/document-apis/bulk/)
- [Claude Platform Docs, Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [OpenAI API Docs, Batch API](https://developers.openai.com/api/docs/guides/batch)

## 관련 문서

- [[OpenSearch-Data-Ingestion|OpenSearch 데이터 수집과 Bulk 색인 (NDJSON 요청 계약)]]
- [[Event-Sourcing|Event Sourcing (이벤트를 원본으로 두고 상태를 재생)]]
- [[MySQL-InnoDB-Redo-and-Crash-Recovery|InnoDB redo와 크래시 복구 (WAL 규칙)]]
- [[JSON-Parser-Differentials|JSON 파서의 해석 차이와 엄격한 디코딩]]
- [[Base64-Encoding|Base64 (바이너리를 JSON 문자열에 담기)]]
- [[SQLite-Fundamentals|SQLite 기초 (조회가 잦아질 때의 대안)]]
- [[CS-Data-Representation|데이터 표현 인덱스]]
