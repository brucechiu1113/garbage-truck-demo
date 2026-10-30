# 下載臺中市開放資料，轉成網頁讀的精簡 JSON。用法：python3 snapshot.py
import csv,json,io,urllib.request,datetime
B='https://newdatacenter.taichung.gov.tw/api/v1/no-auth/resource.download?rid='
STOPS=B+'3275290e-2375-437e-b7b1-998a4b4907b8'; LIVE=B+'c923ad20-2ec6-43b9-b3ab-54527e99f7bc'
def get(u): return urllib.request.urlopen(u,timeout=300).read().decode('utf-8-sig')
txt=get(STOPS); rows=list(csv.reader(io.StringIO(txt)))
h=[x.strip('\ufeff') for x in rows[0]]; out=[]
for r in rows[1:]:
  if len(r)!=len(h): continue  # 官方檔最後一列常被截斷，略過
  d=dict(zip(h,r))
  g=[d.get(f'g_d{i}_time_s','') for i in range(1,8)]; rc=[d.get(f'r_d{i}_time_s','') for i in range(1,8)]
  out.append([d['area'],d['village'],d['caption'],d['car_licence'],d['task_type'],g,rc])
json.dump({'fetched':datetime.datetime.now().isoformat(timespec='minutes'),'source':STOPS,'stops':out},open('stops.json','w'),ensure_ascii=False,separators=(',',':'))
open('trucks_snapshot.json','w').write(get(LIVE))
print(len(out),'stops')
