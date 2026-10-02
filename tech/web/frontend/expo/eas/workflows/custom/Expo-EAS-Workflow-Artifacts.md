---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow artifact와 cache"]
---

# Workflow artifact와 cache

## 파일은 job마다 분리된다

한 job에서 만든 파일을 다른 job의 같은 경로에서 바로 읽을 수는 없다. eas/upload_artifact와 eas/download_artifact로 전달한다. custom job은 type:other를 사용하며 application-archive/build-artifact는 build job 전용이다.

```yaml
jobs:
  create:
    outputs:
      artifact: ${{ steps.upload.outputs.artifact_id }}
    steps:
      - run: echo ready > result.txt
      - id: upload
        uses: eas/upload_artifact
        with:
          type: other
          name: result
          path: result.txt
  read:
    needs: [create]
    steps:
      - id: download
        uses: eas/download_artifact
        with:
          artifact_id: ${{ needs.create.outputs.artifact }}
      - run: cat '${{ steps.download.outputs.artifact_path }}'
```

Upload는 path(glob/newline 목록), name, metadata와 ignore_error(기본 false)를 받는다. Download는 artifact_id 또는 name으로 찾고 artifact_path를 출력한다. 불명확한 이름보다 upstream ID가 정확하다. glob에 credential과 환경 파일을 포함하지 않는다.

## Build 다운로드

eas/download_build는 유효한 build_id UUID를 받고 extensions 기본 apk/aab/ipa/app 중 결과를 찾는다. tar.gz이면 풀고 첫 일치 파일을 반환하므로 원하는 확장자를 제한한다. app archive가 없으면 실패한다. 출력 artifact_path는 다운로드된 절대 경로다.

## Cache

eas/restore_cache는 필수 key/path와 선택 restore_keys를 받고 eas/save_cache는 같은 key/path로 저장한다. hashFiles는 checkout된 파일이 있는 step에서 사용할 수 있다. fallback prefix가 맞더라도 dependency/OS/toolchain 호환성은 따로 확인한다.

Cache는 재생성 가능한 성능 보조 자료이며 배포 artifact의 정본이나 secret 저장 장소가 아니다. 중요한 결과 전달에는 cache miss를 정상 동작으로 허용할 수 있는지 구분한다. 실패 진단 artifact는 always 조건으로 수집하되 본래 오류를 숨기지 않는다.

## 출처

- [Expo Documentation, Syntax for EAS Workflows](https://docs.expo.dev/eas/workflows/syntax)

## 관련 문서

- [[Expo-EAS-Workflow-Custom]]

- [[Expo]]
