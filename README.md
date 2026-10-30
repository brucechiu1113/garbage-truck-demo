# 垃圾車幾點到：Demo 報告（2026-10-29）

**目標：** 做一個能解決現有垃圾車 App 痛點的 App，先用可操作的網頁 Demo 呈現。

## 結論：各縣市資料能不能用
| 縣市 | 班表（每個清運點幾點到） | 車輛即時 GPS | 判定 |
|---|---|---|---|
| 臺中 | 有，CSV/JSON，免金鑰，20,090 筆（measured）。**沒有座標** | 有，JSON，免金鑰，CORS 開放，663 台車，官方標示每 10 分更新（measured） | **可用**，Demo 只做臺中 |
| 臺南 | 沒找到班表開放資料（inferred，只查了 data.gov.tw） | 有資料集 data.gov.tw/dataset/136310，但測試主機連線被對方中斷（TLS reset），內容未確認 | 未確認，可能限臺灣 IP |
| 高雄 | 同上，沒找到班表 | 有資料集 data.gov.tw/dataset/138256（官方寫每分鐘更新、約 900 筆），連線同樣被中斷 | 未確認 |
| 新北、桃園、臺北 | 未查 | 未查 | 未確認 |

授權：以上皆為政府資料開放授權條款第 1 版、免費（data.gov.tw 頁面，measured）。

### 實測資料（curl，2026-10-29 13:30 台北時間）
- 臺中 GPS：`https://newdatacenter.taichung.gov.tw/api/v1/no-auth/resource.download?rid=c923ad20-2ec6-43b9-b3ab-54527e99f7bc`
  第一筆：`{"lineid":"24908","car":"KED-1385","time":"20261029T130544","location":"龍井區清潔隊回收廠","X":"120.540675","Y":"24.192552","SpeedValue":"0","OverSpeed":"N"}`
- 臺中班表 CSV：`...resource.download?rid=3275290e-2375-437e-b7b1-998a4b4907b8`
  第一筆：`"中區","中華里","312-UX","中華路一段143號","沿街","15:25",...`（欄位：區、里、車牌、地址、方式、週一到週日的垃圾與回收時間）
  注意：官方檔最後一列被截斷（兩次下載都在同一位置，measured），程式會略過不完整的列。JSON 版也被截斷、無法解析，所以改用 CSV。
- 班表 374 個車牌中，有 357 個在 GPS 資料出現（measured），因此可以用車牌把清運點和車連起來。

## Demo 做了什麼
入口：`index.html`（靜態網頁，`python3 -m http.server` 後開啟）。
- 選縣市，用區、里、地址任意關鍵字搜尋清運點（例如「北屯 崇德路」）
- 每個清運點用大字顯示下一班時間，並列出每週班表
- 顯示這台車 GPS「幾分鐘前」回報在哪，可在地圖上單獨看這台車（Leaflet＋OpenStreetMap）
- 收藏常用點，存在手機本機，重新整理後還在（measured：重新載入後收藏數 1）
- 頂端標示資料時間；即時 GPS 8 秒連不上就改用快照並標示「快照」，完全連不上就明說，不用假資料
- 無廣告、免登入
- 「提前 10 分鐘提醒」按鈕只顯示會在幾點提醒，**沒有實作推播**

頁面實際讀回的值（`dom_readback.json`，measured）：資料時間「班表 13:34 下載｜車輛 GPS（即時）13:35」，搜尋「北屯 崇德路」得 20 筆，第一筆「崇德路一段558號，今天 14:07，垃圾」，切到臺南顯示「沒有班表開放資料」的錯誤提示。

## 檔案
- 資料模型與轉接器：`models.js`（City、Route、Stop、TruckPosition，每個縣市一個轉接器）
- 抓資料：`fetch_snapshot.py`；檢查：`verify.py`（結果在 `verify_output.txt`）
- 痛點表：`pain_points.md`（811 則 iOS 評論）
- 截圖：`shot1_load_taichung.png`、`shot2_search_next_arrival.png`、`shot3_favorite_map.png`、`shot4_tainan_error_state.png`

## 還缺什麼
1. **「附近的清運點」做不到**：臺中班表沒有座標（verify.py 這項 FAIL，屬已知缺口）。要先把 2 萬筆地址轉成座標，需要找合法的地址轉座標服務。
2. **推播提醒**：要做成正式 App 才能做。
3. **臺南、高雄**：要從臺灣網路重新測試 GPS 介面，也還沒找到班表資料。
4. **準度**：官方 GPS 約 10 分鐘更新一次（實測同一台車回報已 36 分鐘前），「時間不準」有一部分是資料源問題，App 修不掉。
5. 地圖與 Leaflet 從網路載入，離線時地圖不會顯示。
6. Google Play 評論沒抓。
