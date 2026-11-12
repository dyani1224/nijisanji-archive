// 이 앱의 문구·데이터는 전부 이 파일에 있다. 사용자 정보를 반영할 때는 이 파일만 고친다.
// Worker 도 이 파일을 import 한다(설정 검사·상태 흐름) — 그래서 이미지·컴포넌트를 import 하지 않는다.
import { defineSettings } from "./lib/settings";
import { defineStatuses } from "./lib/status";

export const content = {
  title: "BAZE 템플릿",
  owner: {
    title: "가게 관리",
    members: ["정은재", "한도윤"],
  },
};

/**
 * 소유자가 /admin 에서 직접 바꾸는 값. 여기 적은 키는 전부 소유자가 고칠 수 있고, public: true 인 키만
 * GET /api/settings 로 방문자 화면에 나간다(계좌번호처럼 주문한 사람에게만 보일 값은 public 을 빼고
 * 그 응답에만 싣는다). 바뀐 값은 D1 settings 표에, 여기 default 는 저장 전의 값.
 */
export const settings = defineSettings({
  notice: { type: "text", label: "공지", help: "첫 화면 위쪽 한 줄", default: "", max: 120, public: true },
  hours: { type: "timeRange", label: "영업시간", default: { from: "11:00", to: "20:00" }, public: true },
  closed: { type: "weekdays", label: "정기 휴무", default: [1], public: true },
  minOrder: { type: "money", label: "최소 주문 금액", default: 15000, max: 1_000_000, public: true },
  leadDays: { type: "number", label: "예약 가능 기간", default: 14, min: 1, max: 90, unit: "일", public: true },
  open: { type: "toggle", label: "온라인 접수", default: true, on: "받는 중", off: "잠시 멈춤", public: true },
  bank: { type: "text", label: "입금 계좌", help: "접수한 사람에게만 보여요", default: "국민 000000-00-000000 (예금주)", max: 80 },
});

/** 문의 상태 흐름. 상태마다 다음에 누를 수 있는 버튼이 있다. */
export const inquiryStatus = defineStatuses({
  new: { label: "새 문의", tone: "info", next: [{ to: "contacted", label: "연락함" }, { to: "closed", label: "닫기", danger: true }] },
  contacted: { label: "연락함", tone: "warn", next: [{ to: "done", label: "완료" }, { to: "closed", label: "닫기", danger: true }] },
  done: { label: "완료", tone: "ok", next: [{ to: "contacted", label: "다시 열기" }] },
  closed: { label: "닫음", tone: "neutral", next: [{ to: "new", label: "다시 열기" }] },
});

/** 견본 모드에서 보이는 행(이 브라우저에만 저장). 실제 데이터와 같은 모양이어야 한다. 날짜는 오늘 기준으로 만든다. */
const ago = (days: number, hour = 10) => {
  const d = new Date(Date.now() - days * 864e5);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
export const ownerSample = {
  inquiries: [
    { id: 3, code: "K7Q2MD", name: "윤서진", contact: "010-2481-0000", message: "토요일 오후 4명 가능할까요?", status: "new", assignee: "", created_at: ago(0, 9) },
    { id: 2, code: "P4XR8A", name: "박지후", contact: "jihoo.park@example.com", message: "단체 주문 견적 부탁드려요. 30인분입니다.", status: "contacted", assignee: "정은재", created_at: ago(2, 15) },
    { id: 1, code: "B9TN3E", name: "김하린", contact: "010-7350-0000", message: "주차 가능한지 궁금합니다.", status: "done", assignee: "한도윤", created_at: ago(6, 11) },
  ],
};
