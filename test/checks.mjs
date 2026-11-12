// _base 견본의 확인: 소유자 설정(공개/비공개, 모양 검사)과 문의 → 소유자 문의함 → 상태 흐름.
// 새 템플릿은 자기 흐름으로 바꾸되, 설정 부분(settings)은 자기 키로 고쳐서 남긴다.
export const uiOnAll = true;
export const pages = ["/admin?tab=settings"];
export const expectedStatuses = [];

export async function api({ call, assert, owner }) {
  let n = 0;
  const ok = (c, m) => { assert(c, m); n++; };
  const put = values => call("/api/admin/settings", { method: "PUT", headers: owner, body: JSON.stringify({ values }) });

  let r = await call("/api/settings");
  ok(r.status === 200 && r.body.values.hours?.from === "11:00" && r.body.values.minOrder === 15000, "public defaults");
  ok(!("bank" in r.body.values), "non-public key stays private");
  ok((await call("/api/admin/settings")).status === 404, "owner settings hidden without token");
  r = await put({ hours: { from: "21:00", to: "10:00" } });
  ok(r.status === 400 && r.body.field === "hours", "time range must end after start");
  ok((await put({ minOrder: 12.5 })).status === 400, "money is whole won");
  ok((await put({ closed: [7] })).status === 400, "weekday 0–6");
  ok((await put({ nope: 1 })).status === 400, "undeclared key rejected");
  ok((await put({ open: "yes" })).status === 400, "toggle is boolean");
  r = await put({ minOrder: 20000, closed: [2, 1, 2], hours: { from: "10:00", to: "21:00" }, bank: "신한 110-000-000000 정은재" });
  ok(r.status === 200 && r.body.values.minOrder === 20000 && r.body.values.closed.join() === "1,2" && r.body.updated, "owner saves settings");
  r = await call("/api/settings");
  ok(r.body.values.minOrder === 20000 && r.body.values.hours.to === "21:00" && !("bank" in r.body.values), "public reads D1 over defaults");

  r = await call("/api/inquiries", { method: "POST", body: JSON.stringify({ name: "", contact: "x", message: "y" }) });
  ok(r.status === 400, "inquiry needs every field");
  r = await call("/api/inquiries", { method: "POST", body: JSON.stringify({ name: "윤서진", contact: "010-2481-0000", message: "=SUM(A1) 주차 되나요?" }) });
  ok(r.status === 201 && /^[A-Z0-9]{6}$/.test(r.body.code), "inquiry saved with a 6-char code");
  ok((await call("/api/admin/inquiries")).status === 404, "inbox hidden without token");
  r = await call("/api/admin/inquiries", { headers: owner });
  ok(r.status === 200 && r.body.rows.length === 1 && r.body.rows[0].status === "new", "owner sees the inquiry");
  const id = r.body.rows[0].id;
  const patch = body => call(`/api/admin/inquiries/${id}`, { method: "PATCH", headers: owner, body: JSON.stringify(body) });
  ok((await patch({ status: "done" })).status === 409, "new → done is not a declared move");
  r = await patch({ status: "contacted", assignee: "정은재" });
  ok(r.status === 200 && r.body.row.status === "contacted" && r.body.row.assignee === "정은재", "declared move + assignee");
  return n;
}

export async function ui({ page, shot, admin, viewport, base }) {
  const name = `손님 ${viewport}`;
  await page.getByLabel("이름").fill(name);
  await page.getByLabel("연락처").fill("010-5555-0000");
  await page.getByLabel("문의 내용").fill("토요일 4명 예약 가능할까요?");
  await page.getByRole("button", { name: "문의 보내기" }).click();
  await page.getByText("접수 번호").waitFor();

  await page.goto(`${base}/admin#k=${encodeURIComponent(admin)}`);
  const row = page.getByRole("button", { name: new RegExp(name) });
  await row.waitFor();
  if (page.url().includes("#k=")) throw new Error("token must leave the address bar");
  await shot("admin-inbox");
  await row.click();
  const dialog = page.getByRole("dialog", { name });
  await dialog.waitFor();
  await page.waitForTimeout(450);
  await shot("admin-drawer");
  await dialog.getByRole("button", { name: "연락함" }).click();
  await dialog.getByRole("button", { name: "완료" }).waitFor();
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  if (!(await row.evaluate(el => el === document.activeElement))) throw new Error("focus must return to the row after Esc");

  await page.getByRole("button", { name: "설정" }).click();
  // 세 화면이 D1 하나를 같이 쓴다: 화면마다 다른 값을 넣어야 「바꾼 칸」이 생긴다.
  const k = ["iphone16pro", "iphonese", "desktop"].indexOf(viewport);
  await page.getByLabel("최소 주문 금액").fill(String(18000 + k * 1000));
  await page.getByRole("checkbox", { name: ["수", "목", "금"][k] }).check({ force: true });
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByText("저장했어요").waitFor();
  await shot("admin-settings");
}
