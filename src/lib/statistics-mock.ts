export type CareFacility = {
  id: string;
  region: string;
  municipality: string;
  municipalityCode: string;
  name: string;
  type: "지자체" | "요양원" | "사회복지기관";
  residents: number;
  mealRecordRate: number;
  averageIntakeRate: number;
  lowIntakeResidents: number;
  unresolvedAlerts: number;
};

export const CARE_FACILITIES: CareFacility[] = [
  { id: "seoul-gn-01", region: "서울특별시", municipality: "강남구", municipalityCode: "GN-0001", name: "강남실버요양원", type: "요양원", residents: 86, mealRecordRate: 96, averageIntakeRate: 82, lowIntakeResidents: 5, unresolvedAlerts: 1 },
  { id: "seoul-gn-02", region: "서울특별시", municipality: "강남구", municipalityCode: "GN-0001", name: "늘봄노인복지관", type: "사회복지기관", residents: 64, mealRecordRate: 91, averageIntakeRate: 76, lowIntakeResidents: 8, unresolvedAlerts: 3 },
  { id: "seoul-mp-01", region: "서울특별시", municipality: "마포구", municipalityCode: "MP-0002", name: "마포행복요양원", type: "요양원", residents: 72, mealRecordRate: 94, averageIntakeRate: 79, lowIntakeResidents: 6, unresolvedAlerts: 2 },
  { id: "seoul-mp-02", region: "서울특별시", municipality: "마포구", municipalityCode: "MP-0002", name: "마포어르신돌봄센터", type: "사회복지기관", residents: 58, mealRecordRate: 87, averageIntakeRate: 73, lowIntakeResidents: 10, unresolvedAlerts: 4 },
  { id: "gyeonggi-sn-01", region: "경기도", municipality: "성남시", municipalityCode: "SN-0003", name: "분당사랑요양원", type: "요양원", residents: 104, mealRecordRate: 98, averageIntakeRate: 85, lowIntakeResidents: 4, unresolvedAlerts: 1 },
  { id: "gyeonggi-sn-02", region: "경기도", municipality: "성남시", municipalityCode: "SN-0003", name: "성남종합사회복지관", type: "사회복지기관", residents: 93, mealRecordRate: 90, averageIntakeRate: 77, lowIntakeResidents: 11, unresolvedAlerts: 5 },
  { id: "gyeonggi-sw-01", region: "경기도", municipality: "수원시", municipalityCode: "SW-0004", name: "수원효원요양원", type: "요양원", residents: 79, mealRecordRate: 92, averageIntakeRate: 80, lowIntakeResidents: 7, unresolvedAlerts: 2 },
  { id: "gyeonggi-sw-02", region: "경기도", municipality: "수원시", municipalityCode: "SW-0004", name: "팔달노인복지관", type: "사회복지기관", residents: 67, mealRecordRate: 88, averageIntakeRate: 74, lowIntakeResidents: 9, unresolvedAlerts: 3 },
];
