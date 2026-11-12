# 소유자 화면 (`/admin`)

사장님이 매주 바뀌는 것(영업시간·가격·품절·공지·계좌)과 들어온 문의·예약·주문을 에이전트 없이 직접 다루는 화면.
열기: `/admin#k=<ADMIN_TOKEN>`(토큰은 탭에만 남고 주소에서 지워진다) 또는 `/admin` 에서 비밀번호 입력.
모양은 `src/styles.css` 토큰만 쓴다 — 템플릿 색·서체를 바꾸면 소유자 화면도 따라간다. 새 색을 만들지 않는다.

## 설정 하나 더하기 (코드 3줄)

1. `src/content.ts` 의 `settings` 에 키를 더한다. 타입: `text` `number` `money`(원, 정수) `timeRange`(`{from,to}`)
   `weekdays`(0=일 … 6=토 배열) `toggle` `select`(`options`). `public: true` 면 방문자 화면에 나간다.
   ```ts
   soldOut: { type: "toggle", label: "오늘 품절", default: false, on: "품절", off: "판매 중", public: true },
   ```
2. 방문자 화면: `const s = usePublicSettings(settings)` → `s.soldOut`. 서버가 없으면 기본값.
3. 비공개 값(계좌 등)은 서버에서 `readSettings(c.env.DB, settings).values.bank` 로 읽어 그 응답(주문 완료)에만 싣는다.
4. 서버도 써야 하는 값(최소 주문 금액으로 주문 거절 등)은 Worker 에서 같은 `readSettings` 로 읽는다 — 화면 값을 믿지 않는다.
`SettingsForm` 이 선언대로 칸을 그리고, `checkSettings`(src/lib/settings.ts)가 화면·견본·Worker 에서 같은 검사를 한다.
D1 `settings` 표에는 바뀐 키만 들어간다. 키 이름을 바꾸면 옛 값은 버려지고 기본값이 쓰인다.

## 접수 목록 하나 만들기 (주문·예약·거래 …)

- 표(schema.sql)에 `status` 와(필요하면) `assignee` 칸. 상태 흐름은 `content.ts` 에 `defineStatuses({...})` —
  상태마다 `label` `tone`(neutral·info·warn·ok·danger) `next: [{ to, label, danger? }]`.
- Worker: `GET /api/admin/<이름>` → `{ rows }`, `PATCH /api/admin/<이름>/:id` → `{ row }`(상태 변경은 `canMove` 로 막는다),
  직접 입력이 필요하면 `POST /api/admin/<이름>` → `{ row }`. 전부 `ownerOnly`. 예: `worker/index.ts` 의 inquiries.
- 화면: `src/pages/Admin.tsx` 를 복사해 바꾼다. `useOwner().data` 의 `list` `create` `update` `settings` `saveSettings`.

## 부품

| 부품 | 쓰는 법 |
|---|---|
| `OwnerGate` | `<OwnerGate title sample={sample(seed, settings, { 이름: statusConfig })}>` — 안에서 `useOwner()` |
| `OwnerShell` | `tabs=[{id,label,icon,badge?}] active onTab actions?` — 900px 이상 왼쪽 레일, 아래는 아래 탭 |
| `RecordList` | `rows columns label statuses statusKey dateKey assigneeKey assignees searchText sorts onOpen csvName empty` |
| `RecordFilters` + `filterRows` | 보드·달력처럼 목록 밖에서 같은 필터를 쓸 때(`filter`/`onFilterChange` 로 상태를 들고 있는다) |
| `DetailDrawer` + `Field` | `open onClose title subtitle footer` — 오른쪽 패널 / 아래 시트, Esc·초점 가둠. `Field` 는 `<dl>` 안에 |
| `StatusPill` / `StatusActions` | `status config` / `status config onMove busy` — 다음 상태 버튼, danger 는 두 번 눌러야 실행 |
| `SettingsForm` | `spec values updated onSave groups?=[["영업", ["hours","closed"]]]` — 바꾼 키만 보낸다 |
| `ownerApi` | `ownerApi(path, init)` · `ownerHeaders()` · `downloadCsv(path, name)` — Bearer + encodeURIComponent |
| `lib/format` | `won(15000)` · `dateKo(iso)` 「2026년 11월 21일 (토)」 · `dateTimeKo(iso)` · `dayKey(iso)` |

## 견본 모드 (README 규칙 2)

`/admin#sample` 또는 문 화면의 「견본 데이터로 둘러보기」. `content.ts` 의 `ownerSample` 을 이 브라우저에만 두고 고친다.
화면 맨 위에 늘 「견본 데이터예요」가 보인다. 비밀번호가 틀리면 틀렸다고 말하고, 견본으로 몰래 넘어가지 않는다.
방문자 폼은 견본을 쓰지 않는다 — 언제나 `api()` 로 서버에 보내고 저장을 확인한 뒤에만 완료를 보여 준다.
견본 행은 실제 표와 같은 모양으로, 날짜는 오늘 기준으로 만든다(브리프 표본 규칙 5).

## 지킬 것

- CSV 는 지금 보이는 행만, 엑셀 BOM + 수식 방지(`toCsv`). 개인정보가 있으면 보존 기한(`purgeAfter`)도.
- 390px: 아래 탭 + 아래 시트. 모든 칸에 라벨. 상태는 색 + 글자.
- `content.ts` 는 Worker 도 import 한다: 이미지·컴포넌트를 import 하지 않는다.
