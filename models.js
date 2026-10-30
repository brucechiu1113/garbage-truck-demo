// 資料模型與各縣市轉接器（registry）。UI 只看這些型別，不碰原始欄位。
/** @typedef {{id:string,name:string,liveUrl:string|null,stopsUrl:string|null,hasSchedule:boolean,hasLiveGps:boolean,note:string}} City */
/** @typedef {{id:string,cityId:string,plate:string}} Route  路線以車牌識別（臺中資料沒有路線編號對應清運點） */
/** @typedef {{id:string,cityId:string,district:string,village:string,address:string,plate:string,mode:string,
 *   garbage:(string|null)[], recycle:(string|null)[], lat:number|null, lng:number|null}} Stop
 *   garbage/recycle：索引 0=週一 … 6=週日 的預定時間 "HH:MM"，null 表示當天不收 */
/** @typedef {{plate:string,lat:number,lng:number,time:Date,place:string,speed:number|null}} TruckPosition */

const TC = 'https://newdatacenter.taichung.gov.tw/api/v1/no-auth/resource.download?rid=';
const parseTcTime = s => new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}+08:00`);
const ymdhms = s => new Date(s.replace(' ','T').replace(/\//g,'-') + '+08:00');

/** 每個縣市一個轉接器：把原始開放資料轉成上面的模型 */
export const ADAPTERS = {
  taichung: {
    city: {id:'taichung',name:'臺中市',liveUrl:TC+'c923ad20-2ec6-43b9-b3ab-54527e99f7bc',stopsUrl:'stops.json',
      hasSchedule:true,hasLiveGps:true,note:'清運點班表＋車輛 GPS（官方標示每 10 分更新）。清運點沒有座標。'},
    /** @returns {Stop[]} */
    stops: raw => raw.stops.map((r,i)=>({id:'tc'+i,cityId:'taichung',district:r[0],village:r[1],address:r[2],plate:r[3],mode:r[4],
      garbage:r[5].map(t=>t||null),recycle:r[6].map(t=>t||null),lat:null,lng:null})),
    /** @returns {TruckPosition[]} */
    trucks: raw => raw.map(t=>({plate:t.car,lat:+t.Y,lng:+t.X,time:parseTcTime(t.time),place:t.location,speed:t.SpeedValue===''?null:+t.SpeedValue})),
  },
  tainan: {
    city: {id:'tainan',name:'臺南市',liveUrl:'https://soa.tainan.gov.tw/Api/Service/Get/2c8a70d5-06f2-4353-9e92-c40d33bcd969',stopsUrl:null,
      hasSchedule:false,hasLiveGps:true,note:'只有車輛 GPS，沒有找到清運點班表開放資料。測試主機連線被拒，資料格式未確認。'},
    stops: () => [],
    trucks: raw => (raw.data||raw).map(t=>({plate:t.car,lat:+t.y,lng:+t.x,time:ymdhms(t.time),place:t.location,speed:null})),
  },
  kaohsiung: {
    city: {id:'kaohsiung',name:'高雄市',liveUrl:'https://openapi.kcg.gov.tw/Api/Service/Get/aaf4ce4b-4ca8-43de-bfaf-6dc97e89cac0',stopsUrl:null,
      hasSchedule:false,hasLiveGps:true,note:'只有車輛 GPS，沒有找到清運點班表開放資料。測試主機連線被拒，資料格式未確認。'},
    stops: () => [],
    trucks: raw => (raw.data||raw).map(t=>({plate:t.car,lat:+t.y,lng:+t.x,time:ymdhms(t.time),place:t.location,speed:null})),
  },
};

/** 下一次清運（垃圾或回收），回傳 {kind,time:Date,dayOffset} 或 null */
export function nextPickup(stop, now=new Date()){
  const dow=(now.getDay()+6)%7, best=[];
  for(let k=0;k<8;k++){ const d=(dow+k)%7;
    for(const [kind,arr] of [['垃圾',stop.garbage],['回收',stop.recycle]]){ const t=arr[d]; if(!t) continue;
      const [h,m]=t.split(':').map(Number); const at=new Date(now); at.setDate(at.getDate()+k); at.setHours(h,m,0,0);
      if(at>now) best.push({kind,time:at,dayOffset:k}); }
    if(best.length) break; }
  best.sort((a,b)=>a.time-b.time); return best[0]||null;
}
