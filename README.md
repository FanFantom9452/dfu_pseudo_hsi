# DFU Pseudo-HSI Research Image Analysis System

糖尿病足潰瘍 (Diabetic Foot Ulcer) 研究影像分析系統 — 模擬高光譜影像 (Pseudo-HSI) 分析流程的行動端原型。

> 本系統僅供研究資料分析使用，非醫療診斷工具，其結果不作為醫療判斷依據。

## Features

- **手機相機拍攝** — 支援 AI 輔助框選模式與手動拍攝模式，無相機時可上傳照片
- **模擬 AI 分析流程** — RGB→擬高光譜轉換、特徵萃取、影像分析（四階段動畫）
- **研究影像分析報告** — 分析流程視覺化、關鍵發現、研究說明
- **臨床標註表單（選填）** — 35+ 欄位，含傷口位置、Wagner 分級、感染判定、照片合規率
- **3D 熱力圖視覺化** — 獨立頁面，展示影像分析結果的 3D 視覺化
- **資料匯出** — JSON 儲存 + CSV 研究資料集匯出

## User Flow

```
相機畫面（AI/手動模式）→ 拍照 → 分析動畫（四階段）→ 研究影像分析報告 → 臨床標註（選填）→ 匯出
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask 3.1 + Gunicorn |
| Frontend | Vanilla JS + Tailwind CSS CDN + Lucide Icons CDN |
| Template | Jinja2 |
| Data | JSON (標註) + CSV (匯出)，Pandas / NumPy |
| Container | Docker + 自簽 HTTPS 憑證 |

## Quick Start

```bash
docker compose up -d --build
```

開啟瀏覽器前往：

- **本機**: `https://localhost:5000`
- **外網/手機**: `https://<your-ip>:5000`

> 使用自簽 HTTPS 憑證，瀏覽器會顯示安全警告，點「進階 → 繼續前往」即可。
> HTTPS 是手機瀏覽器存取相機 API 的必要條件。

## Project Structure

```
dfu_pseudo_hsi/
├── docker-compose.yml            # Docker Compose 配置
├── Dockerfile                    # 含自簽 HTTPS 憑證生成
├── requirements.txt              # Python 依賴 (flask, pandas, numpy, gunicorn)
├── app/
│   ├── __init__.py               # Flask app factory
│   ├── config.py                 # 環境設定
│   ├── routes/
│   │   ├── api.py                # REST API endpoints
│   │   └── pages.py              # 頁面路由 (/, /analysis)
│   ├── services/
│   │   └── annotation_manager.py # 標註管理、驗證
│   ├── templates/
│   │   ├── base.html             # 基底模板
│   │   ├── index.html            # 主應用（相機 → 分析 → 報告 + 標註 modal）
│   │   └── analysis.html         # 3D 熱力圖視覺化頁面
│   └── static/
│       ├── css/custom.css        # 自訂動畫
│       └── js/
│           ├── app.js            # 主控制器、畫面切換
│           ├── camera.js         # 相機 API、AI 框選模擬、模式切換
│           ├── processing.js     # 四階段分析進度動畫
│           ├── dashboard.js      # 報告頁面渲染
│           ├── gauge.js          # 報告顯示輔助
│           ├── annotation.js     # 標註表單邏輯
│           └── analysis.js       # 3D 視覺化
└── data/                         # 資料持久化（Docker volume）
    ├── annotations/              # 標註 JSON 檔案
    ├── exports/                  # 匯出的 CSV
    ├── images/                   # 拍攝的影像
    └── reports/                  # 統計報告
```

## Screens

| 畫面 | 說明 |
|------|------|
| **相機** | 即時取景、AI 偵測框選（信心度動畫）、手動模式切換、閃光燈、相簿上傳 |
| **分析動畫** | 四階段進度：擬高光譜轉換 → 光譜特徵萃取 → 組織特徵分析 → 生成報告 |
| **研究報告** | 流程視覺化、影像辨識結果、關鍵發現（外觀分類/異常標記/顏色特徵）、研究說明 |
| **標註表單** | 選填 modal，8 大區塊 35+ 欄位（基本資料、傷口位置、外觀評估、Wagner 分級等） |
| **3D 視覺化** | 獨立頁面 `/analysis`，熱力圖 3D 呈現 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/annotations` | 儲存標註（含驗證） |
| `GET` | `/api/annotations` | 列出所有標註 |
| `GET` | `/api/annotations/<case_id>` | 取得單筆標註 |
| `POST` | `/api/upload-image` | 上傳影像（base64） |
| `GET` | `/api/statistics` | 統計報告 |
| `GET` | `/api/export/csv` | 匯出研究 CSV |

## Development

本機開發（不用 Docker）：

```bash
pip install -r requirements.txt
flask --app app run --host 0.0.0.0 --port 5000
```

Docker 環境下重啟：

```bash
docker compose restart
```

## License

Internal use only.
