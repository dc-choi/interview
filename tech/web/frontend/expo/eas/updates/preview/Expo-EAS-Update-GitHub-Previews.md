---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["GitHub Actions의 EAS Update PR preview"]
---

# GitHub Actions의 EAS Update PR preview

pull_request workflow로 PR 변경을 device에서 검증할 update를 publish한다. repository secret EXPO_TOKEN으로 Expo account 권한을 제공하고 contents:read/pull-requests:write가 필요하다. preview subaction은 update 정보와 QR comment를 추가한다. token은 vault나 코드에 저장하지 않는다.

## Workflow 구조

```yaml
on: pull_request
jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: yarn
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: yarn install
      - uses: expo/expo-github-action/preview@v8
        with:
          command: eas update --auto --environment preview
```

원문 command는 --environment가 빠졌으나 SDK57 예제에는 preview를 명시한다. --auto의 branch/message가 PR checkout의 예상 Git context와 맞는지 확인한다. source는 token 누락 검사로 job을 중단하는 step도 제공한다. organization이 third-party Actions를 허용해야 한다.

## Package manager와 권한 범위

Bun은 oven-sh/setup-bun과 bun install로 교체할 수 있다. package manager/lockfile과 environment를 일치시킨다. fork PR은 repository secret 접근이 제한될 수 있으므로 trusted publish 경로를 설계한다. token을 노출하는 pull_request_target 코드 실행을 단순 우회로 사용하지 않는다. CI publish가 public release channel에 영향을 주지 않도록 branch/channel을 구분한다. 이 문서는 자동 comment 기능의 설명이며 실제 외부 comment를 보낸 기록은 아니다.

## 출처

- [Expo Documentation, GitHub Action for PR previews](https://docs.expo.dev/eas-update/github-actions)

## 관련 문서

- [[Expo-EAS-Update-Preview]]
- [[Expo-EAS-Update-Channels]]
