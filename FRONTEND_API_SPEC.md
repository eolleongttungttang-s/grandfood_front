# GrandFood 프론트엔드 POST API 명세

이 문서는 프론트 화면의 주요 버튼을 눌렀을 때 백엔드로 보내는 POST 요청을 정리한 문서입니다.

> 문서의 JSON 값은 요청 형식을 설명하기 위한 예시입니다. 실제 요청에는 사용자가 화면에서 입력하거나 프론트에서 생성한 값이 들어갑니다.

## 공통 설정

- API 주소 환경변수: `NEXT_PUBLIC_API_URL`
- 로컬 기본 주소: `http://localhost:8000`
- JSON 요청 헤더: `Content-Type: application/json`

---

## 1. 지자체 및 기관코드 생성

### 프론트 기능

`관리 → 등록 → 지자체 및 기관코드 생성`

### API

```http
POST /api/admin/facilities
```

### 요청 JSON 예시

```json
{
  "name": "강서구청",
  "facility_type": "MUNICIPALITY",
  "department": "어르신복지과",
  "contract_start_date": "2026-08-01",
  "contract_end_date": "2027-07-31",
  "facility_code": "GS-0001"
}
```

### 필드 설명

| 필드 | 설명 | 필수 여부 |
|---|---|---|
| `name` | 지자체명 | 필수 |
| `facility_type` | 기관 유형, 지자체 등록 시 `MUNICIPALITY` | 필수 |
| `department` | 담당 부서 | 선택 |
| `contract_start_date` | 계약 시작일 | 필수 |
| `contract_end_date` | 계약 종료일 | 필수 |
| `facility_code` | 프론트에서 생성한 기관코드 | 필수 |

### 현재 프론트 동작

```text
기관코드 생성
→ 브라우저 localStorage에 테스트 데이터 저장
→ POST /api/admin/facilities 요청
```

백엔드 요청이 실패해도 로컬 테스트 데이터는 유지됩니다.

### 확인할 사항

현재 `facility_id`는 프론트가 `Date.now()`로 만든 테스트 ID를 사용합니다. 실제 백엔드 연동 시에는 이 API의 성공 응답으로 받은 실제 `facility_id`를 프론트에 저장해야 합니다.

---

## 2. 관리자 계정 발급

### 프론트 기능

`관리 → 등록 → 관리자 계정 발급`

### API

```http
POST /api/admin/staff
```

### 요청 JSON 예시

```json
{
  "facility_id": 1,
  "facility_name": "강서구청",
  "facility_code": "GS-0001",
  "name": "홍길동",
  "role": "팀장",
  "account": "gangseo_admin",
  "email": "hong@example.go.kr",
  "temporary_password": "임시비밀번호",
  "access_level": "MUNICIPALITY_ADMIN"
}
```

### 필드 설명

| 필드 | 설명 | 필수 여부 |
|---|---|---|
| `facility_id` | 소속 기관 ID | 필수 |
| `facility_name` | 소속 지자체명 | 필수 |
| `facility_code` | 소속 지자체 기관코드 | 필수 |
| `name` | 관리자 이름 | 필수 |
| `role` | 담당 업무 또는 직책 | 필수 |
| `account` | 로그인 아이디 | 필수 |
| `email` | 업무용 이메일 | 필수 |
| `temporary_password` | 최초 로그인용 임시 비밀번호 | 필수 |
| `access_level` | 시스템 접근 권한 | 필수 |

### 현재 프론트 동작

```text
관리자 계정 로컬 저장
→ POST /api/admin/staff 요청
```

백엔드 요청이 실패해도 로컬 테스트 계정은 유지됩니다.

### 확인할 사항

- 현재 `access_level`은 `MUNICIPALITY_ADMIN`으로 전송합니다.
- 권한값을 `ADMIN`으로 통일하기로 결정하면 프론트 요청값도 변경해야 합니다.
- 실제 연동 시 지자체 등록 API가 반환한 `facility_id`를 사용해야 합니다.

---

## 3. 회원가입 신청

### 프론트 기능

`로그인 화면 → 회원가입 → 가입 신청`

### 사용할 API

```http
POST /api/signup/requests
```

### 요청 JSON 예시

```json
{
  "facility_id": 1,
  "facility_code": "GS-0001",
  "workplace_name": "강서종합사회복지관",
  "name": "김담당",
  "role": "사회복지사",
  "department": "사례관리팀",
  "account": "worker01",
  "email": "worker@example.com",
  "phone": "010-0000-0000",
  "password": "사용자비밀번호"
}
```

### 필드 설명

| 필드 | 설명 | 필수 여부 |
|---|---|---|
| `facility_id` | 기관코드 확인으로 얻은 기관 ID | 필수 |
| `facility_code` | 회원가입자가 입력한 기관코드 | 필수 |
| `workplace_name` | 실제 근무 기관명 | 필수 |
| `name` | 신청자 이름 | 필수 |
| `role` | 담당 업무 | 필수 |
| `department` | 부서 또는 팀 | 선택 |
| `account` | 로그인에 사용할 아이디 | 필수 |
| `email` | 업무용 이메일 | 필수 |
| `phone` | 연락처 | 필수 |
| `password` | 로그인에 사용할 비밀번호 | 필수 |

### 현재 프론트 동작

현재 아래 camelCase 형식으로 `localStorage`에 저장한 후 `POST /api/signup/requests`를 호출합니다.

```json
{
  "facilityName": "강서구청",
  "facilityCode": "GS-0001",
  "workplaceName": "강서종합사회복지관",
  "name": "김담당",
  "role": "사회복지사",
  "department": "사례관리팀",
  "account": "worker01",
  "email": "worker@example.com",
  "phone": "010-0000-0000",
  "password": "사용자비밀번호",
  "requestedAt": "2026. 8. 4."
}
```

API 요청 시 위 로컬 데이터를 snake_case JSON 형식으로 변환합니다. 백엔드 요청이 실패해도 승인 화면 테스트를 위해 로컬 신청 데이터는 유지됩니다.

---

## 4. 식사 기록 및 이미지 전달

### 프론트 기능

`대상자 상세 → 오늘의 잔반 이미지 → 잔반 분석 시작`

### API

```http
POST /wards/{ward_id}/meal-logs
```

### URL 및 헤더

| 위치 | 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|---|
| URL 경로 | `ward_id` | string | 필수 | 프론트의 대상자 ID |
| Header | `Authorization` | `Bearer {token}` | JWT 연결 후 필수 | 로그인 응답으로 받은 접근 토큰 |

### 요청 형식

`multipart/form-data`

| 위치 | 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|---|
| Form | `mealSlot` | string | 필수 | 아침, 점심, 저녁 |
| Form | `comboId` | string | 필수 | 반찬 조합 ID |
| File | `beforePhoto` | image file | 필수 | 식사 전 사진 |
| File | `afterPhoto` | image file | 필수 | 식사 후 사진 |

### 프론트 요청 예시

```ts
const formData = new FormData();
formData.append("mealSlot", mealSlot);
formData.append("comboId", comboId);
formData.append("beforePhoto", beforeImage);
formData.append("afterPhoto", afterImage);

await fetch(`${API_URL}/wards/${wardId}/meal-logs`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  body: formData,
});
```

현재 테스트 로그인에는 JWT가 없으므로 세션에 `accessToken`이 있을 때만 `Authorization` 헤더를 추가합니다.

---

## 현재 구현 상태 요약

| 프론트 버튼 | API | 상태 |
|---|---|---|
| 지자체 및 기관코드 생성 | `POST /api/admin/facilities` | 프론트 `fetch()` 요청 코드 작성됨, 백엔드 구현 여부 미확인 |
| 관리자 계정 발급 | `POST /api/admin/staff` | 프론트 `fetch()` 요청 코드 작성됨, 백엔드 구현 여부 미확인 |
| 회원가입 신청 | `POST /api/signup/requests` | 프론트 `fetch()` 요청 코드 작성됨, 백엔드 구현 여부 미확인 |
| 잔반 이미지 전달 | `POST /wards/{ward_id}/meal-logs` | 프론트 `fetch()` 요청 코드 작성됨, JWT 연결 전 |

## 관련 프론트 파일

- 지자체 등록 및 관리자 발급: `src/components/admin/super-admin-dashboard.tsx`
- 회원가입 신청: `src/components/admin/signup-dialog.tsx`
