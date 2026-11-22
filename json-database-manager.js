import fs from 'node:fs/promises';
import path from 'node:path';

export default class JsonDatabaseManager {
  constructor(dbName = null) {
    this.base = path.resolve(process.env.JSON_OUTPUT_DIR || 'output');
    this.dbName = dbName || 'google_maps_scraper';
    this.contacts = [];
    this.progress = {};
    this.isConnected = false;
  }
  async save(name, value) {
    const file=path.join(this.base, name);
    const tmp=file+'.tmp';
    await fs.writeFile(tmp,JSON.stringify(value,null,2),'utf8');
    await fs.rename(tmp,file);
  }
  async connect(){
    await fs.mkdir(this.base,{recursive:true});
    for(const [name,field,defaultValue] of [['contacts.json','contacts',[]],['queries_progress.json','progress',{}]]){
      try{this[field]=JSON.parse(await fs.readFile(path.join(this.base,name),'utf8'))}
      catch(e){if(e.code!=='ENOENT')throw e;this[field]=defaultValue}
    }
    this.isConnected=true;
    console.log('JSON storage enabled:',this.base);
  }
  async insertContact(contact){
    const result=await this.batchInsertContacts([contact]);
    return {inserted:result.inserted>0,duplicate:result.duplicates>0};
  }
  async batchInsertContacts(contacts){
    const existing=new Set(this.contacts.map(c=>c.phone).filter(Boolean));
    let inserted=0;
    for(const c of contacts||[]){
      if(c.phone && existing.has(c.phone))continue;
      if(c.phone)existing.add(c.phone);
      this.contacts.push({...c,timestamp:new Date().toISOString()});
      inserted++;
    }
    if(inserted)await this.save('contacts.json',this.contacts);
    return {inserted,duplicates:(contacts||[]).length-inserted};
  }
  async markQueryCompleted(query,stats){this.progress[query]={...this.progress[query],...stats,status:'completed',completedAt:new Date().toISOString()};await this.save('queries_progress.json',this.progress)}
  async markQueryFailed(query,error){this.progress[query]={...this.progress[query],status:'failed',error,retryCount:(this.progress[query]?.retryCount||0)+1};await this.save('queries_progress.json',this.progress)}
  async markQueryInProgress(query){this.progress[query]={...this.progress[query],status:'in_progress',startedAt:new Date().toISOString()};await this.save('queries_progress.json',this.progress)}
  async getCompletedQueries(){return Object.keys(this.progress).filter(q=>this.progress[q].status==='completed')}
  async getFailedQueries(maxRetries=3){return Object.keys(this.progress).filter(q=>this.progress[q].status==='failed'&&this.progress[q].retryCount<maxRetries)}
  async getStats(){
    const groups={};
    for(const c of this.contacts)groups[c.sourceQuery]=(groups[c.sourceQuery]||0)+1;
    return {totalContacts:this.contacts.length,completedQueries:Object.values(this.progress).filter(v=>v.status==='completed').length,failedQueries:Object.values(this.progress).filter(v=>v.status==='failed').length,inProgressQueries:Object.values(this.progress).filter(v=>v.status==='in_progress').length,topQueries:Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([_id,count])=>({query:_id,count})).slice(0,10)};
  }
  async close(){this.isConnected=false}
}
