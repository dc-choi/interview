---
tags: [ontology, retrieval, performance, evaluation]
status: done
category: "AI엔지니어링(AIEngineering)"
---

# 같은 검색 결과의 조회 지연 줄이기

2026-09-08에 `context_lookup`과 `context_search`가 공유하는 요청 경로를 개선했다. 반복 비교에서 lookup 중앙값은 약 470ms에서 376ms로 20% 줄었다. 검색 순위, 본문 선택과 원문 receipt는 보존하고, Git 원문 읽기와 응답 byte 계산의 반복 작업을 줄인다.

## 적용한 변경

- 전체 본문을 읽는 조회는 고정 revision의 파일 목록을 `listMarkdown`으로 한 번 해석하고, 조회 대상 Document의 OID만 `readBlobs`에 전달한다. 문서마다 `revision:path`를 해석하는 비용을 줄이며 기존 snapshot 빌드용 헬퍼를 재사용한다.
- 파일 목록은 effective scope 안에서 가져오고 색인 Document 경로와 다시 대조한다. 요청 경로의 symlink 검사, 문서 수 일치 검사, Git replace 비활성화와 반환 근거의 SHA-256 검증을 유지한다.
- 한 토큰의 정확한 metadata 조회와 graph에서 추가로 읽는 좁은 경로는 기존 batch 방식을 유지한다. snapshot 형식이나 원문, 별도 캐시는 추가하지 않는다.
- `outputBytes`는 JSON을 한 번 직렬화하고 `used_bytes` 숫자의 자릿수만 다시 계산한다. 정렬된 깊은 복사와 반복 직렬화를 제거하며 실제 반환 JSON의 UTF-8 byte 검사를 유지한다.

적용 근거는 [[Latency-Optimization#레이턴시 예산 분해]]의 구간별 측정과 [[RAG-Retrieval-Engineering#품질을 분해하는 평가 모델]]의 검색 품질, 처리 비용 분리다. 적용 범위는 온톨로지 조회 코드다.

## 반복 측정 결과

Apple M3 Pro, macOS arm64, Node.js v24.13.1에서 아래와 같이 관측했다. 표는 세 회차의 측정값을 합친 결과다.

| 경로 | 질문 수 / 버전별 측정 호출 | p50 전 → 후 | p95 전 → 후 |
|---|---:|---:|---:|
| lookup | 104 / 312 | 469.7 → 375.6ms | 595.0 → 477.7ms |
| search | 5 / 15 | 136.0 → 132.6ms | 477.4 → 376.0ms |

lookup의 p50은 20.0%, p95는 19.7% 줄었다. 회차별 p50은 각각 464.5 → 380.2ms, 477.1 → 376.1ms, 465.2 → 371.8ms였고 세 회차 모두 p95도 줄었다. search는 질문 5개만 사용한 보조 관찰이다.

측정한 전후 응답 327쌍에서 아래 동등성 조건과 실제 JSON byte 예산 검사를 모두 통과했다. 준비용 세 쌍도 동등성을 확인했다. 새 검색 품질 표본은 추가하지 않았으며 기존 실패 질문을 성공으로 바꾸는 변경은 아니다.

전체 Node 테스트 137/137이 통과했다. 추가 fixture는 한글, emoji, 따옴표와 역슬래시가 섞인 본문에서 네 자리와 다섯 자리 응답 크기의 JSON byte 계산을 검사한다. 기존 scope, pinned revision, Git replace, symlink, cursor와 MCP 테스트도 함께 통과했다.

새 독립 검토자는 이번 코드와 비교 실행기, 문서의 변경 범위를 검토했고 추가 수정이 필요한 문제 없이 승인했다.

실제 Vault를 새 SDK stdio MCP로 연결해 정확한 제목 1개와 자연어 질문 2개의 lookup 결과가 현재 함수 결과와 같은지 확인했다. 각 결과의 완전한 section을 `context_read`로 다시 읽어 본문과 hash를 대조했고, search 두 페이지의 연속 offset과 모든 응답 byte 예산도 확인했다. 기존 host 연결의 교체를 뜻하지 않는다.

## 비교 조건

원문은 Git `4af3516d519b62d6840b04c79d1e25aba846d80d`, extractor 11 snapshot에 고정했다. 비교 기준은 작업 시작 시점의 미커밋 `query.mjs`이며 SHA-256은 `7731853f713f85cc613e3b8e28fb0f215a04f7d60369b76bbcfe7de9c619f636`이다. Git `HEAD`의 조회 코드와 비교한 것이 아니다.

[실행기](evaluation/retrieval-performance.mjs)는 이전에 관측한 합성 질문 104개와 문서 검색 5개를 사용한다. 준비용 요청 세 쌍 뒤 같은 프로세스에서 전후 호출 순서를 질문과 회차별로 번갈아 3회 실행한다. 질문, 코드와 snapshot hash, 환경, 요청별 원시 시간은 [보고서](evaluation/retrieval-performance-report-2026-09-08.json)에 보존한다.

- lookup은 반환 JSON 전체가 일치해야 통과한다. 검색 점수나 근거 수만 같다고 통과시키지 않는다.
- search는 코드 hash에 묶인 cursor의 binding 값만 제외하고 전체 JSON과 cursor offset을 비교한다. 실제 응답 byte 수와 예산 검사는 binding을 제외하기 전에 수행한다. 코드 변경 전 cursor는 기존 계약에 따라 재조회가 필요하다.
- 측정 구간은 메모리에 올린 snapshot에서의 `lookup` 또는 `search` 함수다. Git 상태 확인, 원문 읽기, 점수 계산과 응답 구성을 포함한다. snapshot 로드와 무결성 검사, MCP 전송, host 추론, 평가 채점과 응답 비교는 제외한다.
- p50/p95는 측정값을 오름차순 정렬한 뒤 `floor((N - 1) * q)` 위치를 사용한다. 동시 부하 시험이나 사용자 작업 전체 시간의 측정은 아니다.

## 재실행

Vault 루트에서 실행한다. 보고서가 기록한 코드와 사례가 바뀌었으면 중단한다. 비교 기준 코드는 보고서에서 임시 파일로 복원한다. 재실행을 새 검색 품질 표본으로 세지 않는다.

```bash
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256 } from './ontology/src/core.mjs';
import { loadSnapshot } from './ontology/src/snapshot.mjs';
const r = JSON.parse(fs.readFileSync('ontology/evaluation/retrieval-performance-report-2026-09-08.json'));
for (const [file, hash] of Object.entries(r.inputs.code_and_case_hashes)) {
  assert.equal(sha256(fs.readFileSync(file)), hash, file);
}
const s = loadSnapshot({ repo: process.cwd() });
assert.deepEqual({ revision: s.manifest.revision, fingerprint: s.fingerprint,
  manifest_hash: s.manifest_hash }, r.inputs.snapshot);
const directory = fs.mkdtempSync(join(tmpdir(), 'ontology-latency-replay-'));
try {
  const baseline = join(directory, 'query.mjs');
  fs.writeFileSync(baseline, r.inputs.baseline_query_source);
  assert.equal(sha256(fs.readFileSync(baseline)), r.inputs.baseline_query_sha256);
  const cases = Object.keys(r.inputs.code_and_case_hashes).filter(file => file.endsWith('.json'));
  const args = ['ontology/evaluation/retrieval-performance.mjs', '--baseline-query', baseline,
    ...cases.flatMap(file => ['--cases', file]), '--rounds', String(r.rounds),
    '--output', '/tmp/ontology-latency-replay.json'];
  process.exitCode = spawnSync(process.execPath, args, { stdio: 'inherit' }).status ?? 1;
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
JS
```

## 적용 범위

새 CLI와 MCP 프로세스가 수정된 코드를 읽는다. 이미 연결된 MCP에는 재연결이 필요하다. 기존 연결을 교체했거나 사용자 작업 전체가 같은 비율로 빨라졌다는 뜻은 아니다.

미커밋 Markdown은 계속 근거에 섞이지 않으며 `unindexed_worktree`로 표시된다. 이번 변경은 검색 품질 개선이나 무관한 질문 거절 문제의 해결을 주장하지 않는다.

상위: [[Development-Ontology]]. 검색 품질: [[Ontology-Retrieval-Quality]]. 실행 계약: [[Ontology-Operations]].
