# Triển khai — HL Care

App được đóng gói thành **một artifact duy nhất**: server Django (gunicorn) vừa phục vụ API
`/api/*` vừa phục vụ trang shell React đã build (WhiteNoise đọc thẳng
`backend/predictor/static/frontend/`, không cần `collectstatic`). Không có model DB — dự đoán
không lưu gì lại, nên không cần MySQL/Postgres như financal_management.

Đây là cách deploy lên VPS dùng chung với **financal_management** ("finance",
finance.hlcompany.id.vn, cổng 8081) và **debt-crusher** ("balance", cổng 8080). Ứng dụng này
("HL Care") dùng domain **care.hlcompany.id.vn**, cổng host **8082** — khác 2 app kia để tránh
đụng cổng trên cùng VPS; cổng BÊN TRONG container vẫn là 8000 như bình thường.

Ngoài VPS, repo này còn deploy song song lên Vercel (xem mục "Deployment" trong README.md) —
hai cách không xung đột nhau, dùng cách nào tuỳ nhu cầu.

## Biến môi trường

Sao chép `.env.prod.example` → `.env.prod` và chỉnh giá trị thật:

| Biến | Ý nghĩa |
|------|---------|
| `DJANGO_SECRET_KEY` | Bắt buộc — sinh bằng `openssl rand -hex 32`. Dùng giá trị **khác** với finance/balance dù chạy chung VPS. |
| `DJANGO_ALLOWED_HOSTS` | `care.hlcompany.id.vn` — cũng tự động thêm vào `CSRF_TRUSTED_ORIGINS` (xem `backend/config/settings.py`). |

## Cách 1 — Chạy trực tiếp (không Docker)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd backend && python manage.py migrate && python manage.py runserver
```

## Cách 2 — Docker (khuyến nghị cho triển khai)

Dockerfile multi-stage: build FE bằng Node → cài Python deps → image runtime Python slim,
gunicorn chạy `config.wsgi:application`.

```bash
docker build -t hlcare:latest .
docker run --rm -p 8000:8000 -e DJANGO_SECRET_KEY=dev -e DJANGO_ALLOWED_HOSTS=localhost hlcare:latest
```

## Cách 3 — VPS production (dùng chung VPS finance/balance)

Domain: **care.hlcompany.id.vn**. Dùng chung VPS đã chạy debt-crusher và financal_management —
Docker, Nginx, Certbot, UFW đã cài sẵn, **không cần cài lại**. Kiến trúc:

```
Browser → Nginx (host, :80/:443, server_name care.hlcompany.id.vn)
        → 127.0.0.1:8082 (container hlcare-app, cổng nội bộ 8000)
```

### 1. Trỏ domain

Thêm bản ghi DNS tại nơi quản lý `hlcompany.id.vn`:

| Type | Name | Value |
|------|------|-------|
| A    | `care` | `<IP_VPS>` (IP đã dùng cho finance/balance) |

Kiểm tra đã lan truyền trước khi xin SSL: `ping care.hlcompany.id.vn`.

### 2. Đưa code lên VPS

```bash
git clone <URL_repo> /opt/heart_risk_estimator
cd /opt/heart_risk_estimator
```

(hoặc `git pull` nếu đã clone từ trước.)

### 3. Cấu hình secrets

```bash
cp .env.prod.example .env.prod
nano .env.prod   # điền DJANGO_SECRET_KEY — sinh bằng: openssl rand -hex 32
```

### 4. Build & chạy

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml ps     # service phải "running"
docker compose -f docker-compose.prod.yml logs -f app   # Ctrl+C để thoát, kiểm tra app boot OK
```

### 5. Trỏ Nginx vào container

```bash
cp /opt/heart_risk_estimator/nginx/care.hlcompany.id.vn.conf /etc/nginx/sites-available/hlcare
ln -s /etc/nginx/sites-available/hlcare /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Lúc này `http://care.hlcompany.id.vn` đã lên được (chưa có HTTPS).

### 6. Bật HTTPS

```bash
certbot --nginx -d care.hlcompany.id.vn
```

Certbot tự sửa `/etc/nginx/sites-available/hlcare`: thêm block 443 + redirect 80→443, tự gia hạn.

### 7. Kiểm tra

```bash
curl https://care.hlcompany.id.vn/api/schema/
```

### Cập nhật code sau này

```bash
cd /opt/heart_risk_estimator && git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Troubleshooting

- **502 Bad Gateway**: container `hlcare-app` chưa chạy/chưa healthy — check
  `docker compose -f docker-compose.prod.yml ps` và `... logs app`.
- **`certbot --nginx` báo domain không resolve**: DNS A record chưa trỏ đúng/chưa kịp lan truyền.
- **403 CSRF verification failed** sau khi đổi domain: kiểm tra `DJANGO_ALLOWED_HOSTS` trong
  `.env.prod` đúng `care.hlcompany.id.vn` — nó cũng nạp vào `CSRF_TRUSTED_ORIGINS`.
