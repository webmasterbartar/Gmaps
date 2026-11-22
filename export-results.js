import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
const dir = path.resolve(process.env.JSON_OUTPUT_DIR || 'output');
const contacts = JSON.parse(await fs.readFile(path.join(dir, 'contacts.json'), 'utf8'));
const progress = JSON.parse(await fs.readFile(path.join(dir, 'queries_progress.json'), 'utf8').catch(()=> '{}'));
const book = new ExcelJS.Workbook();
book.creator = 'Gmaps original scraper';
book.created = new Date();
const sheet = book.addWorksheet('Contacts',{views:[{state:'frozen',ySplit:1,rightToLeft:true}]});
sheet.columns=[
 {header:'نام کسب‌وکار',key:'businessName',width:42},
 {header:'شماره تماس',key:'phone',width:22},
 {header:'وب‌سایت',key:'website',width:60},
 {header:'ایمیل',key:'email',width:35},
 {header:'عبارت جستجو',key:'sourceQuery',width:42},
 {header:'زمان استخراج',key:'extractedAt',width:26}
];
sheet.getRow(1).font={bold:true};
sheet.autoFilter={from:'A1',to:'F1'};
for(const contact of contacts)sheet.addRow({
 businessName:contact.businessName||'',phone:contact.phone||'',website:contact.website||'',email:contact.email||'',sourceQuery:contact.sourceQuery||'',extractedAt:contact.extractedAt||contact.timestamp||''
});
const summary=book.addWorksheet('Queries',{views:[{state:'frozen',ySplit:1,rightToLeft:true}]});
summary.columns=[
 {header:'کوئری',key:'query',width:46},
 {header:'وضعیت',key:'status',width:17},
 {header:'تعداد نتایج',key:'resultsFound',width:18},
 {header:'مخاطبین استخراج‌شده',key:'contactsExtracted',width:24},
 {header:'خطا',key:'error',width:70}
];
summary.getRow(1).font={bold:true};
summary.autoFilter={from:'A1',to:'E1'};
for(const [query,info] of Object.entries(progress))summary.addRow({
 query,status:info.status||'',resultsFound:info.resultsFound??'',contactsExtracted:info.contactsExtracted??'',error:info.status==='failed'?(info.error||''):''
});
const file=path.join(dir,'contacts.xlsx');
await book.xlsx.writeFile(file);
console.log(JSON.stringify({file,contacts:contacts.length,queries:Object.keys(progress).length}));
