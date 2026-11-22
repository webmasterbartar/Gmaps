export const config = { maxDuration: 60 };
const fields = 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,nextPageToken';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Only POST is supported'});
  const key=process.env.GOOGLE_MAPS_API_KEY;
  if(!key) return res.status(503).json({error:'GOOGLE_MAPS_API_KEY در تنظیمات Vercel ثبت نشده است.'});
  const city=String(req.body?.city||'').trim().slice(0,100);
  const keyword=String(req.body?.keyword||'پیچ و مهره').trim().slice(0,70);
  if(!city || !keyword) return res.status(400).json({error:'شهر و عبارت جستجو الزامی است.'});
  const results=[]; let pageToken;
  try{
    for(let page=0;page<3;page++){
      const body={textQuery:keyword+' در '+city+' ایران',languageCode:'fa',regionCode:'IR',pageSize:20};
      if(pageToken) body.pageToken=pageToken;
      const response=await fetch('https://places.googleapis.com/v1/places:searchText',{
        method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':fields},body:JSON.stringify(body),
        signal:AbortSignal.timeout(15000)
      });
      const payload=await response.json();
      if(!response.ok) return res.status(response.status).json({error:payload.error?.message||'Google Places API error',city});
      for(const p of payload.places||[])results.push({id:p.id,name:p.displayName?.text||'',address:p.formattedAddress||'',phone:p.internationalPhoneNumber||p.nationalPhoneNumber||'',website:p.websiteUri||'',city});
      pageToken=payload.nextPageToken;
      if(!pageToken)break;
      await new Promise(resolve=>setTimeout(resolve,1800));
    }
    return res.status(200).json({city,keyword,count:results.length,results});
  }catch(e){return res.status(502).json({error:'ارتباط با سرویس جستجو برقرار نشد: '+e.message,city})}
}
