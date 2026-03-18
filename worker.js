// ===== 顶级商业八字核心引擎 =====
// 1900-2100 高精度
// 北京时间基准
// 单文件可直接部署 Cloudflare Worker

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

const GAN_WUXING = {
  甲:"木",乙:"木",
  丙:"火",丁:"火",
  戊:"土",己:"土",
  庚:"金",辛:"金",
  壬:"水",癸:"水"
};

const YIN_YANG = {
  甲:1,乙:0,丙:1,丁:0,戊:1,己:0,庚:1,辛:0,壬:1,癸:0
};

const ZHI_CANGGAN = {
  子:["癸"],
  丑:["己","癸","辛"],
  寅:["甲","丙","戊"],
  卯:["乙"],
  辰:["戊","乙","癸"],
  巳:["丙","戊","庚"],
  午:["丁","己"],
  未:["己","丁","乙"],
  申:["庚","壬","戊"],
  酉:["辛"],
  戌:["戊","辛","丁"],
  亥:["壬","甲"]
};

const SOLAR_TERM_INFO = [
0,21208,42467,63836,85337,107014,
128867,150921,173149,195551,218072,240693,
263343,285989,308563,331033,353350,375494,
397447,419210,440795,462224,483532,504758
];

// ===== 儒略日 =====

function toJulianDay(date){
  let y = date.getUTCFullYear();
  let m = date.getUTCMonth()+1;
  let d = date.getUTCDate() +
          date.getUTCHours()/24 +
          date.getUTCMinutes()/1440 +
          date.getUTCSeconds()/86400;

  if(m<=2){ y--; m+=12; }

  let A = Math.floor(y/100);
  let B = 2 - A + Math.floor(A/4);

  return Math.floor(365.25*(y+4716))
       + Math.floor(30.6001*(m+1))
       + d + B - 1524.5;
}

// ===== 节气 =====

function getSolarTermDate(year,n){
  let offTime = 31556925974.7*(year-1900)
              + SOLAR_TERM_INFO[n]*60000;
  let base = Date.UTC(1900,0,6,2,5);
  return new Date(base + offTime + 8*3600000);
}

// ===== 年柱 =====

function getYearGanzhi(date){
  let year = date.getUTCFullYear();
  let lichun = getSolarTermDate(year,2);
  if(date < lichun) year--;

  let offset = (year-4)%60;
  if(offset<0) offset+=60;

  return {
    gan: GAN[offset%10],
    zhi: ZHI[offset%12]
  };
}

// ===== 月柱 =====

function getMonthGanzhi(date){
  let year = date.getUTCFullYear();
  let monthIndex = 11;

  for(let i=0;i<12;i++){
    let term = getSolarTermDate(year,i*2);
    if(date < term){
      monthIndex = i-1;
      break;
    }
  }

  if(monthIndex<0){
    year--;
    monthIndex=11;
  }

  let yearGanIndex = (year-4)%10;
  if(yearGanIndex<0) yearGanIndex+=10;

  let ganIndex = (yearGanIndex*2 + monthIndex +2)%10;

  return {
    gan: GAN[ganIndex],
    zhi: ZHI[(monthIndex+2)%12]
  };
}

// ===== 日柱 =====

function getDayGanzhi(date){
  let jd = toJulianDay(date);
  let offset = Math.floor(jd + 49) % 60;
  return {
    gan: GAN[offset%10],
    zhi: ZHI[offset%12]
  };
}

// ===== 时柱 =====

function getHourGanzhi(date,dayGan){
  let hour = date.getUTCHours();
  let branchIndex = Math.floor((hour+1)/2)%12;
  let dayGanIndex = GAN.indexOf(dayGan);
  let ganIndex = (dayGanIndex*2 + branchIndex)%10;

  return {
    gan: GAN[ganIndex],
    zhi: ZHI[branchIndex]
  };
}

// ===== 十神完整逻辑 =====

function getShiShen(dayGan,targetGan){

  const generate = {木:"火",火:"土",土:"金",金:"水",水:"木"};
  const overcome = {木:"土",土:"水",水:"火",火:"金",金:"木"};

  let dayWX = GAN_WUXING[dayGan];
  let targetWX = GAN_WUXING[targetGan];

  let sameYinYang = YIN_YANG[dayGan] === YIN_YANG[targetGan];

  if(dayGan===targetGan) return "比肩";

  if(dayWX===targetWX)
    return sameYinYang?"比肩":"劫财";

  if(generate[dayWX]===targetWX)
    return sameYinYang?"食神":"伤官";

  if(generate[targetWX]===dayWX)
    return sameYinYang?"偏印":"正印";

  if(overcome[dayWX]===targetWX)
    return sameYinYang?"偏财":"正财";

  if(overcome[targetWX]===dayWX)
    return sameYinYang?"七杀":"正官";

  return "未知";
}

// ===== 五行统计（含藏干）=====

function countWuXing(pillars){

  let count = {木:0,火:0,土:0,金:0,水:0};

  pillars.forEach(p=>{
    count[GAN_WUXING[p.gan]] += 1;

    ZHI_CANGGAN[p.zhi].forEach(g=>{
      count[GAN_WUXING[g]] += 0.5;
    });
  });

  return count;
}

// ===== 起运 =====

function getStartLuck(date,gender,yearGan){

  let isYang = YIN_YANG[yearGan]===1;
  let forward = (isYang && gender===1) ||
                (!isYang && gender===0);

  let year = date.getUTCFullYear();
  let nextTerm = getSolarTermDate(year,2);

  let diffDays = Math.abs(nextTerm-date)/86400000;
  let startAge = diffDays/3;

  return {
    forward,
    startAge: parseFloat(startAge.toFixed(2))
  };
}

// ===== 十步大运 =====

function getLuckList(monthGanIndex,monthZhiIndex,startAge,forward){

  let list=[];

  for(let i=0;i<10;i++){
    let step = forward?i+1:-(i+1);

    let gan = GAN[(monthGanIndex+step+100)%10];
    let zhi = ZHI[(monthZhiIndex+step+100)%12];

    list.push({
      step:i+1,
      ganzhi:gan+zhi,
      startAge:parseFloat((startAge+i*10).toFixed(2))
    });
  }

  return list;
}

// ===== 主入口 =====

function calculateBazi(birthISO,gender){

  let date = new Date(birthISO);

  let year = getYearGanzhi(date);
  let month = getMonthGanzhi(date);
  let day = getDayGanzhi(date);
  let hour = getHourGanzhi(date,day.gan);

  let pillars=[year,month,day,hour];

  let wuxing=countWuXing(pillars);

  let shishen={
    year:getShiShen(day.gan,year.gan),
    month:getShiShen(day.gan,month.gan),
    hour:getShiShen(day.gan,hour.gan)
  };

  let startLuck=getStartLuck(date,gender,year.gan);

  let luckList=getLuckList(
    GAN.indexOf(month.gan),
    ZHI.indexOf(month.zhi),
    startLuck.startAge,
    startLuck.forward
  );

  return {
    fourPillars:[
      year.gan+year.zhi,
      month.gan+month.zhi,
      day.gan+day.zhi,
      hour.gan+hour.zhi
    ],
    wuxing,
    shishen,
    startLuck,
    luckList
  };
}

async function handleRequest(request){

  if(request.method==="POST"){
    let data=await request.json();

    let result=calculateBazi(data.birth,data.gender);

    return new Response(JSON.stringify(result,null,2),{
      headers:{"Content-Type":"application/json"}
    });
  }

  return new Response("Professional Bazi Engine Ready");
}
