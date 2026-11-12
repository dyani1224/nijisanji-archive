# DESIGN.md — <템플릿 이름>

이 파일은 이 프로젝트의 디자인 결정을 한 곳에 적는다. 나중에 이 프로젝트를 고치는 에이전트는 코드를 뒤지기
전에 이 파일을 읽는다. 템플릿을 만들 때 `<…>` 를 전부 채우고, 사용자 요청으로 결정이 바뀌면 여기부터 고친다.
토큰의 원본은 `src/styles.css` 의 `@theme static` 블록이며, 이 표는 그 값을 설명한다 — 둘이 어긋나면 CSS 가 맞다.

## 한 줄

<이 사이트/앱이 무엇이고 어떤 인상을 주는지 한 문장. 예: 「어두운 전시 벽 위에 사진 한 장씩, 인터페이스는 물러난다」>

## 정체성 (template.json 과 같은 값)

| 항목 | 값 |
|---|---|
| grammar | `<chaptered-editorial / filmic-one-shot / live-surface / continuous-world / typographic-poster / gallery / split-stage / rhythmic-cutlist>` |
| ground | `<light / dark / hard-cut>` — `<어디에 data-ground="dark" 를 다는지: body 전체 / 2·4·6번째 섹션 …>` |
| type_pair | `<Pretendard>` (본문) + `<두 번째 가족>` (`<어디에 쓰는지: 제목·숫자·캡션>`) — 출처 `<Google Fonts OFL / public/fonts/ + 라이선스 파일>` |
| signature move | `<이 템플릿에만 있는 상호작용 한 문장>` — 구현 `<파일:컴포넌트>`, reduced-motion 에서는 `<어떻게 되는지>` |
| nav | `<상단 고정 얇은 바 4링크 / 숨김 후 스크롤 시 등장 / 좌측 레일 …>` |
| hero | `<전면 사진 + 14px 이름 / 120–160px 선언형 타이포 / 고정 제품 이미지 …>` |
| acts (섹션 순서) | `<1 → 2 → 3 → … → close>` |
| close (페이지 끝) | `<뷰포트 폭 워드마크 / 문의 서랍 / 지도 + 주소 …>` |
| owner screens | `/admin` = `src/owner/`(src/owner/OWNER.md) — `<탭: 주문·예약·설정 …>`, 상태 흐름 `<content.ts 의 defineStatuses 이름>`, 소유자가 고치는 설정 `<settings 키: hours, closed, …>`. 토큰만 쓴다: `<그대로 / 소유자 화면만 data-ground="light" 등>` |

## 토큰 — `src/styles.css` 에서 바꾼 것

기본값과 다른 토큰만 적는다. 안 적힌 것은 `_base` 기본값이다.

| 토큰 | 값 | 이유 |
|---|---|---|
| `--font-display` | `<"Noto Serif KR", var(--font-body)>` | `<왜 이 서체인지>` |
| `--color-accent` / `--color-on-accent` | `<#…>` / `<#…>` | `<어디에만 쓰는지 — 보통 한 군데>` |
| `--color-ground` (dark) | `<#0b0d10>` | `<순검정이 아닌 이유 / 사진과의 관계>` |
| `--display-lg` 사용처 | `<h1 only>` | `<데스크톱 몇 px 까지 허용했는지>` |
| `--spacing-section` | `<기본>` | |
| `--radius-card` / `--radius-media` | `<기본 / 0>` | `<사진은 각지게 등>` |
| `<추가 토큰>` | | |

## 타입 스케일 적용

| 역할 | 클래스/토큰 | 굵기 · 행간 · 자간 |
|---|---|---|
| 디스플레이(히어로) | `.display` / `.display-lg` | `<600 · 0.92 · -0.035em>` |
| 섹션 제목 | `text-step-4 font-display` | `<…>` |
| 본문 | `text-step-0 measure` | `<400 · 1.7>` |
| 캡션 · 라벨 | `text-step--1 .caps` | `<…>` |
| 숫자 · 데이터 | `font-mono .tnum` | `<…>` |

## 모션

| 어디 | 무엇 | 구현 |
|---|---|---|
| 섹션 등장 | `.reveal` 한 번 | `_base` |
| `<시그니처 무브>` | `<무엇이 어떻게 움직이는지>` | `<animation-timeline: scroll() + 대체: trackScrollProgress>` |
| 라우트 전환 | View Transitions | `<Link viewTransition>` |
| hover/focus | 모든 링크·버튼·카드 | `<색 / 밑줄 / translate>` |
| reduced-motion | 비필수 모션 전부 정지, 최종 상태 유지 | `_base` 블록 + `<템플릿 추가분>` |

## 상태 · 피드백 · 빈 화면

- 상태 색: `text-ok` `text-warn` `text-danger` `text-info` (+ `bg-…/15`). 색만으로 상태를 말하지 않는다(아이콘·문구 동반).
- 폼: 라벨은 입력 위, 오류는 필드 아래 `text-danger`, 접수 완료는 서버 확인 뒤에만.
- 빈 상태: `<어떤 화면에 어떤 문구와 다음 행동>`.
- 소유자 화면(`/admin`): `src/owner/` 부품(레일·아래 탭, RecordList, DetailDrawer, SettingsForm). 밀도 `--spacing-control-sm`, 900px 이상 표 / 아래 카드 + 시트. `<바꾼 점>`.

## 미디어

| 파일 | 역할 | 비율 · 크기 | 출처(docs/ASSETS.md) |
|---|---|---|---|
| `public/images/<…>.webp` | `<히어로>` | `<16:9 · 1600px · 180 KB>` | `<baze gen image, 2026-11-09>` |

`public/images/` 합계 `<… MB>` / 4 MB. 생성 사진은 견본이다 — 「고객 작업」으로 쓰지 않는다.

## 폰 (375 / 402)

- `<무엇이 바뀌는지: 챕터가 카드로 쌓임 / 탭이 가로 스냅 레일 / 고정 이미지 55vh …>`
- `<무엇은 유지되는지: 워드마크 크기 / 슬라이더 …>`

## 바꾸면 안 되는 것

- `src/routes.tsx` 가 유일한 라우트 표, `main.tsx` 의 `window.__baze` 줄, `/api/*`, `schema.sql` 은 더하기만.
- 두 가족을 넘는 서체, 섹션당 둘 이상의 등장 연출, 시그니처 무브 밖의 큰 모션.
- `<이 템플릿 고유의 금지: 예 — 사진 위 그라데이션 오버레이 금지, 액센트는 CTA 한 곳>`

## 변경 기록

- `<2026-11-09>` — `<초기 설계, 참고: REBUILD-BRIEF-2026-11-09.md>`
