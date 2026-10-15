const fs=require('node:fs');
const {Client}=require('pg');

const input=process.argv[2],targetUrl=process.env.DATABASE_URL;
if(!input||!targetUrl)throw new Error('Usage: DATABASE_URL=... node import-postgres-json.js INPUT.json');
const tableOrder=['users','plans','plan_history','tasks','execution_logs','task_completion_events','reflections','daily_records','rule_changes','auth_sessions'];
const primaryKey={plan_history:'history_id'};

async function main(){
  const data=JSON.parse(fs.readFileSync(input,'utf8'));
  const target=new Client({connectionString:targetUrl,ssl:process.env.DB_SSL==='false'?false:{rejectUnauthorized:false},options:'-c timezone=Asia/Seoul'});
  await target.connect();
  try{
    await target.query('BEGIN');
    for(const table of tableOrder){
      const rows=data[table]||[];
      for(const row of rows){
        const columns=Object.keys(row),values=Object.values(row),placeholders=columns.map((_,index)=>`$${index+1}`).join(',');
        await target.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,values);
      }
      const key=primaryKey[table]||'id',sequence=`${table}_${key}_seq`;
      await target.query(`SELECT setval($1,COALESCE((SELECT MAX(${key}) FROM ${table}),1),EXISTS(SELECT 1 FROM ${table}))`,[sequence]);
      console.log(`${table}: ${rows.length}`);
    }
    await target.query('COMMIT');
  }catch(error){await target.query('ROLLBACK');throw error}
  finally{await target.end()}
}

main().catch(error=>{console.error(error.message);process.exitCode=1});
