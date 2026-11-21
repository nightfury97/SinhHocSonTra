# Quản lý đa dạng sinh học Sơn Trà — Backend

TypeScript + Express + Prisma (MySQL) API for the Sơn Trà online biodiversity management system (Phần mềm quản lý đa dạng sinh học Sơn Trà trực tuyến).

## Stack

- Express 4 + TypeScript
- Prisma ORM, MySQL
- JWT auth (`jsonwebtoken` + `bcryptjs`)
- `zod` request validation

## Setup

Uses the shared local MySQL container `shared-mysql` (port 3306) — no dedicated
database container for this project. Make sure that container is running, then:

```bash
cp .env.example .env          # adjust values if needed
npm install
npm run prisma:migrate        # creates tables (prompts for a migration name)
npm run seed                  # loads sample species/stations/observations
npm run start:dev             # http://localhost:7000
```

The `sontra` database lives inside `shared-mysql`; `DATABASE_URL` in `.env` already
points at it (root user). If that container isn't running, start it before running
migrations/seed/dev server.

From the repo root, `npm run install:backend` / `npm run start:backend` also work (see root `package.json`).

Seeded accounts (password `password123`):

- `admin@sontra.vn` — role `ADMIN`
- `ranger@sontra.vn` — role `RANGER`

## API overview

All routes are prefixed with `/api`. Auth uses `Authorization: Bearer <token>`.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/login` (khoá tạm sau 8 lần sai/15 phút), `GET /auth/me`, `POST /auth/change-password`; tài khoản do ADMIN tạo bằng `POST /users`, đặt lại mật khẩu `POST /users/:id/password` |
| Species | `GET/POST /species`, `GET/PUT/DELETE /species/:id`, `POST /species/:id/population` |
| Observations | `GET/POST /observations`, `GET/DELETE /observations/:id`, `PATCH /observations/:id/status` |
| Stations | `GET/POST /stations`, `GET/PUT/DELETE /stations/:id` |
| Map | `GET /map/pins`, `GET /map/filters` |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/population-trend`, `GET /dashboard/env-stations`, `GET /dashboard/recent-observations` |
| Users | `GET /users` (admin), `PATCH /users/:id/role` (admin) |
| Datasets | `GET /datasets`, `GET /datasets/:id` (thống kê), `POST /datasets/import` (admin, upload file), `DELETE /datasets/:id` (admin, xoá cả lô) |
| Surveys | `GET /surveys/transects`, `GET /surveys/summary`, `GET /surveys/sightings?year=&transect=&flagged=`, `PATCH /surveys/sightings/:id` |
| Export | `GET /export/database.xlsx` (Excel 5 sheet: Thông tin, Loài, Quan sát, Khảo sát tuyến, Tổng hợp khảo sát), `GET /export/occurrences.csv` (Darwin Core, bản ghi đã duyệt) — chỉ ADMIN/RANGER |
| Species images | `POST /species/:id/images` (upload bytes, RANGER+), `PATCH/DELETE /species/images/:imageId`; ảnh phục vụ tại `/api/media/species/<key>.webp` (công khai) |
| Map (thêm) | `GET /map/observations?group=&year=&speciesId=&datasetId=` — điểm quan sát đã duyệt |

`GET /observations` trả về `{ items, total, page, pageSize }`, lọc được theo `status`, `basisOfRecord`, `year`, `speciesId`, `datasetId`, `mine`.

Roles: `ADMIN`, `RANGER`, `VIEWER`. Species/station writes require `ADMIN` or `RANGER`; deletes require `ADMIN`.
Observation submission is open to any authenticated user; reviewing (`PATCH .../status`) requires `ADMIN` or `RANGER`.

## Scripts

- `npm run start:dev` — dev server with hot reload
- `npm run build` / `npm start` — production build + run
- `npm run prisma:migrate` — create/apply a migration
- `npm run prisma:studio` — browse the DB
- `npm run seed` — (re)load sample data

## Nhập dữ liệu khảo sát

Hai loại file được hỗ trợ (mẫu trong `../File Data/`):

| Loại | Định dạng | Lưu vào |
| --- | --- | --- |
| `occurrences` | CSV chuẩn Darwin Core (`occurrenceID`, `genus`, `specificEpithet`, `class`, `decimalLatitude`, `decimalLongitude`, `eventDate`...) | `Observation` (trạng thái APPROVED, gắn `Dataset`); loài chưa có được tạo mới với `status = NE` và tên hiển thị = tên khoa học |
| `transects` | Excel khảo sát theo tuyến, mỗi sheet một năm, toạ độ UTM | `Transect` / `TransectSurvey` / `TransectSighting` |

```bash
# Dev
npm run import -- occurrences "../File Data/occurrence_SonTra_Peninsula_final.csv" --code sie-sontra-2016-2017 --dry-run
npm run import -- transects "../File Data/SonTra_Raw-Data_2021+2023_GreenViet-Apr-2023.xlsx" \
  --code greenviet-transect-2021-2023 --species "Pygathrix nemaeus" --utm-zone 49

# Trong container production (mount thư mục dữ liệu vào /data)
docker compose run --rm -v "$PWD/File Data:/data:ro" --entrypoint node backend \
  dist/scripts/importData.js occurrences /data/occurrence_SonTra_Peninsula_final.csv --code sie-sontra-2016-2017
```

- Chạy lại cùng `--code` sẽ **cập nhật** (khoá theo `occurrenceID` / mã tuyến + năm), không tạo bản trùng.
- `--dry-run` kiểm tra và in báo cáo, không ghi gì.
- Loài đã có (khớp theo tên khoa học "Chi tính-ngữ") chỉ được bổ sung các trường phân loại còn trống; tên Việt, IUCN, mô tả đã biên tập không bị ghi đè.
- Điểm tuyến có toạ độ ngoài bán đảo / độ cao bất thường vẫn được nhập nhưng `flagged = true`; sửa qua `PATCH /api/surveys/sightings/:id` (sửa UTM tự tính lại lat/lng).
- `GET /api/surveys/summary` là số **đếm được** trên tuyến (đàn, cá thể, tỉ lệ gặp đàn/km, cỡ đàn TB) — không phải ước lượng quần thể.

## Tên tiếng Việt của loài

Dữ liệu gốc chỉ có tên khoa học, nên loài nhập từ bộ dữ liệu có tên Việt = tên khoa học cho tới khi được điền.
`File Data/ten-tieng-viet.csv` (cột `scientificName,name`) là bảng đối chiếu đã rà soát; thêm dòng vào đó khi có tên mới.

    npm run import:names -- "../File Data/ten-tieng-viet.csv"            # chạy thử
    npm run import:names -- "../File Data/ten-tieng-viet.csv" --apply    # ghi

Chỉ điền cho loài đang chưa có tên Việt, không ghi đè tên đã biên tập. Trong Docker:
`docker compose run --rm -T -v "$PWD/File Data:/data:ro" --entrypoint node backend dist/scripts/importNames.js /data/ten-tieng-viet.csv --apply`.

## Chatbot tra cứu

`POST /api/chat` (công khai, giới hạn 12 lượt/phút/IP) nhận `{ messages: [{role, content}] }` và trả `{ reply, tools }`.
Backend gọi model chạy trên **Ollama tự host** (`OLLAMA_URL`, `OLLAMA_MODEL`, mặc định `qwen2.5:7b`; cần model hỗ trợ tool calling, ví dụ `qwen2.5`, `llama3.1`). Model không tự trả lời từ trí nhớ mà gọi công cụ tra cứu trong `modules/chat/chat.tools.ts`:
`search_species`, `get_species`, `count_species`, `survey_summary`.

- Công cụ chỉ đọc và **không trả toạ độ/vị trí quan sát**: chatbot dùng được cho khách nên không được lộ vị trí loài nguy cấp.
- Tham số sai sẽ trả lỗi cho model để tự sửa; kết quả luôn kèm bộ lọc đã áp dụng. Model nhỏ (7B) vẫn có thể diễn đạt sai, nên đặt thêm quy tắc ở `SYSTEM_PROMPT` khi gặp lỗi lặp lại.
- Đặt `CHAT_DEBUG=1` để log tham số công cụ model gọi.
- Trong Docker, Ollama chạy trên máy chủ nên dùng `OLLAMA_URL=http://host.docker.internal:11434`.

## Ảnh loài

Mỗi loài có nhiều ảnh (1 ảnh đại diện) kèm chú thích, tác giả, giấy phép. Khi tải lên, ảnh được chuẩn hoá về WebP (tối đa 2000 px + bản nhỏ 480 px) và **xoá toàn bộ EXIF** — thông tin GPS nơi chụp loài nhạy cảm không bao giờ được lưu hay phát ra. Tải trùng (cùng nội dung) bị từ chối.

- Qua giao diện: Danh mục loài → mở loài → **Thêm ảnh** (chọn được nhiều file).
- Nhập hàng loạt từ thư mục:

```bash
# Nhận loài theo thư mục con "Pygathrix nemaeus/*.jpg" hoặc tên file "Pygathrix_nemaeus_01.jpg"
# (hoặc file CSV --meta với cột: file, scientificName, caption, credit, license, primary)
npm run import:images -- "../Anh loai" --credit "GreenViet" --license "CC BY 4.0" --dry-run
docker compose run --rm -T -v "$PWD/Anh loai:/in:ro" --entrypoint node backend dist/scripts/importImages.js /in --credit "GreenViet"
```

- File ảnh nằm ở `BackEnd/uploads/` (mount vào container qua `docker-compose.yml`, biến `UPLOAD_DIR`). **Cần sao lưu thư mục này cùng với cơ sở dữ liệu**; build lại image không làm mất ảnh.
