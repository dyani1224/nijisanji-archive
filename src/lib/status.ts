// 상태 흐름(주문→입금 확인→발송→완료 …)의 선언. 화면(StatusPill·StatusActions·RecordList)과 Worker 가 같이 쓴다.

export type Tone = "neutral" | "info" | "warn" | "ok" | "danger";
export type StatusDef = {
  label: string;
  tone: Tone;
  /** 이 상태에서 누를 수 있는 버튼. to 는 다음 상태, label 은 버튼 문구(「입금 확인」). danger 는 확인을 한 번 더 묻는다. */
  next?: { to: string; label: string; danger?: boolean }[];
};
export type StatusConfig = Record<string, StatusDef>;

export const defineStatuses = <C extends StatusConfig>(c: C) => c;

/** from → to 가 선언된 흐름인지. Worker 는 이걸로 상태 변경을 막고, 화면은 같은 목록으로 버튼을 그린다. */
export const canMove = (c: StatusConfig, from: string, to: string) => !!c[from]?.next?.some(n => n.to === to);
