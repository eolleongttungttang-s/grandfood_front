const SIDO_ALIASES: Array<[string, string[]]> = [
  ["서울특별시", ["서울특별시", "서울"]], ["부산광역시", ["부산광역시", "부산"]],
  ["대구광역시", ["대구광역시", "대구"]], ["인천광역시", ["인천광역시", "인천"]],
  ["광주광역시", ["광주광역시", "광주"]], ["대전광역시", ["대전광역시", "대전"]],
  ["울산광역시", ["울산광역시", "울산"]], ["세종특별자치시", ["세종특별자치시", "세종"]],
  ["경기도", ["경기도", "경기"]], ["강원특별자치도", ["강원특별자치도", "강원도", "강원"]],
  ["충청북도", ["충청북도", "충북"]], ["충청남도", ["충청남도", "충남"]],
  ["전북특별자치도", ["전북특별자치도", "전라북도", "전북"]], ["전라남도", ["전라남도", "전남"]],
  ["경상북도", ["경상북도", "경북"]], ["경상남도", ["경상남도", "경남"]],
  ["제주특별자치도", ["제주특별자치도", "제주"]],
];

const SEOUL_DISTRICTS = [
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구",
  "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구",
  "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구",
];

const SEOUL_AGENCY_PREFIXES = new Set([
  "JR", "JG", "YS", "SD", "GJ", "DDM", "JL", "SB", "GB", "DB", "NW", "EP", "SDM",
  "MP", "YC", "GS", "GR", "GC", "YDP", "DJ", "GA", "SC", "GN", "SP", "GD",
]);

export function resolveAdminRegion(
  facilityCode: string | null | undefined,
  ...values: Array<string | null | undefined>
) {
  const prefix = facilityCode?.split("-")[0]?.toUpperCase();
  if (prefix && SEOUL_AGENCY_PREFIXES.has(prefix)) return "서울특별시";
  const texts = values.filter((value): value is string => Boolean(value));
  for (const [region, aliases] of SIDO_ALIASES) {
    if (texts.some((text) => aliases.some((alias) => text.includes(alias)))) return region;
  }
  if (texts.some((text) => SEOUL_DISTRICTS.some((district) => text.includes(district)))) {
    return "서울특별시";
  }
  return "미등록";
}
