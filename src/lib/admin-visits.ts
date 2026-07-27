export type VisitType = "방문" | "전화" | "문자";

export type VisitLog = {
  id: string;
  date: string;
  residentName: string;
  worker: string;
  type: VisitType;
  note: string;
  followUp: boolean;
};

export const VISIT_LOGS: VisitLog[] = [
  {
    id: "v001",
    date: "2026.07.26",
    residentName: "한상옥",
    worker: "박정현 주무관",
    type: "방문",
    note: "4일 연속 미응답으로 긴급 방문. 자택에서 안전 확인, 컨디션 저하로 병원 동행 안내.",
    followUp: true,
  },
  {
    id: "v002",
    date: "2026.07.25",
    residentName: "박순자",
    worker: "김미정 사회복지사",
    type: "전화",
    note: "3일 미응답 안부 확인 전화. 단순 외출로 확인, 특이사항 없음.",
    followUp: false,
  },
  {
    id: "v003",
    date: "2026.07.24",
    residentName: "윤태식",
    worker: "박정현 주무관",
    type: "방문",
    note: "5일 미응답 방문 확인. 낙상으로 거동 불편, 방문 요양 연계 필요.",
    followUp: true,
  },
  {
    id: "v004",
    date: "2026.07.23",
    residentName: "이말순",
    worker: "김미정 사회복지사",
    type: "전화",
    note: "연하곤란 상태 재확인 전화. 다음 주 방문 평가 일정 조율.",
    followUp: true,
  },
  {
    id: "v005",
    date: "2026.07.21",
    residentName: "배동수",
    worker: "박정현 주무관",
    type: "문자",
    note: "호흡곤란으로 식사량 저하 안내 문자 발송, 소량 다회식 권고 전달.",
    followUp: false,
  },
  {
    id: "v006",
    date: "2026.07.20",
    residentName: "장옥희",
    worker: "김미정 사회복지사",
    type: "방문",
    note: "6일 미응답 긴급 방문. 자녀 연락 후 병원 이송 확인.",
    followUp: true,
  },
  {
    id: "v007",
    date: "2026.07.18",
    residentName: "남재춘",
    worker: "박정현 주무관",
    type: "전화",
    note: "퓨린 제한식 잔반 증가 관련 안부 전화. 입맛 문제로 확인, 식단 조정 요청.",
    followUp: false,
  },
];
