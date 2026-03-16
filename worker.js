addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {

  const url = new URL(request.url)

  if (url.pathname === "/") {
    return new Response(
      "Professional Bazi Engine Ready",
      {
        headers:{
          "content-type":"text/plain;charset=UTF-8"
        }
      }
    )
  }

  if (url.pathname === "/api/bazi") {

    const year = parseInt(url.searchParams.get("year"))
    const month = parseInt(url.searchParams.get("month"))
    const day = parseInt(url.searchParams.get("day"))
    const hour = parseInt(url.searchParams.get("hour"))
    const gender = parseInt(url.searchParams.get("gender"))

    if(!year || !month || !day){
      return new Response(
        JSON.stringify({
          error:"missing parameters"
        }),
        {headers:{"content-type":"application/json"}}
      )
    }

    const stems = [
      "甲","乙","丙","丁","戊",
      "己","庚","辛","壬","癸"
    ]

    const branches = [
      "子","丑","寅","卯","辰","巳",
      "午","未","申","酉","戌","亥"
    ]

    const elementMap = {
      "甲":"wood",
      "乙":"wood",
      "丙":"fire",
      "丁":"fire",
      "戊":"earth",
      "己":"earth",
      "庚":"metal",
      "辛":"metal",
      "壬":"water",
      "癸":"water"
    }

    function getStem(index){
      return stems[index % 10]
    }

    function getBranch(index){
      return branches[index % 12]
    }

    function getYearPillar(year){
      const index = year - 1984
      const stem = getStem(index)
      const branch = getBranch(index)
      return stem + branch
    }

    function getMonthPillar(yearStemIndex,month){
      const index = yearStemIndex * 12 + month
      const stem = getStem(index)
      const branch = getBranch(month + 1)
      return stem + branch
    }

    function getDayPillar(year,month,day){

      const baseDate = new Date(1900,0,31)
      const targetDate = new Date(year,month-1,day)

      const offset = Math.floor((targetDate - baseDate) / 86400000)

      const stem = getStem(offset + 40)
      const branch = getBranch(offset + 10)

      return stem + branch
    }

    function getHourPillar(dayStemIndex,hour){

      const hourIndex = Math.floor((hour + 1)/2)

      const stem = getStem(dayStemIndex*12 + hourIndex)
      const branch = getBranch(hourIndex)

      return stem + branch
    }

    const yearIndex = year - 1984
    const yearPillar = getYearPillar(year)

    const yearStemIndex = yearIndex % 10
    const monthPillar = getMonthPillar(yearStemIndex,month)

    const dayPillar = getDayPillar(year,month,day)

    const dayStemIndex = stems.indexOf(dayPillar[0])

    const hourPillar = getHourPillar(dayStemIndex,hour)

    const bazi = {
      year:yearPillar,
      month:monthPillar,
      day:dayPillar,
      hour:hourPillar
    }

    const fiveElements = {
      wood:0,
      fire:0,
      earth:0,
      metal:0,
      water:0
    }

    for(const key in bazi){
      const stem = bazi[key][0]
      const element = elementMap[stem]
      fiveElements[element]++
    }

    const result = {
      input:{
        year,
        month,
        day,
        hour,
        gender
      },
      bazi:bazi,
      fiveElements:fiveElements
    }

    return new Response(
      JSON.stringify(result,null,2),
      {
        headers:{
          "content-type":"application/json;charset=UTF-8"
        }
      }
    )
  }

  return new Response("Not Found",{status:404})

}
