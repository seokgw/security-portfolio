const mysql=require('mysql2/promise');
const {Client}=require('pg');

const sourceUrl=process.env.SOURCE_DATABASE_URL;
const targetUrl=process.env.DATABASE_URL;
if(!sourceUrl||!targetUrl)throw new Error('SOURCE_DATABASE_URL and DATABASE_URL are required');

const tables=[
  ['users',['id','username','password_hash','created_at','updated_at'],'id'],
  ['plans',['id','owner_id','title','description','start_date','end_date','priority','success_criteria','estimated_minutes','carried_improvement','created_at','updated_at'],'id'],
  ['plan_history',['history_id','plan_id','title','description','start_date','end_date','priority','success_criteria','estimated_minutes','carried_improvement','saved_at'],'history_id'],
  ['tasks',['id','plan_id','title','description','due_date','priority','tag','estimated_minutes','status','completed_at','deleted_at','created_at','updated_at'],'id'],
  ['execution_logs',['id','task_id','start_time','end_time','actual_minutes','blocker_reason','work_done','created_at'],'id'],
  ['task_completion_events',['id','task_id','completion_key','completed_at'],'id'],
  ['reflections',['id','plan_id','improvement','carried_to_plan_id','created_at'],'id'],
  ['daily_records',['id','owner_id','record_date','metric_name','metric_unit','metric_value','calculation_rule','plan_rule','note','created_at'],'id'],
  ['rule_changes',['id','owner_id','changed_at','before_rule','after_rule','reason','day1_record_id','day2_record_id'],'id'],
  ['auth_sessions',['id','user_id','jti','created_at','last_activity_at','idle_expires_at','absolute_expires_at','revoked_at'],'id']
];

async function main(){
  const source=await mysql.createConnection(sourceUrl);
  const target=new Client({connectionString:targetUrl,ssl:process.env.DB_SSL==='false'?false:{rejectUnauthorized:false},options:'-c timezone=Asia/Seoul'});
  await target.connect();
  try{
    await target.query('BEGIN');
    for(const [table,columns,sequenceColumn] of tables){
      const [rows]=await source.query(`SELECT ${columns.map(x=>`\`${x}\``).join(',')} FROM \`${table}\` ORDER BY \`${sequenceColumn}\``);
      for(const row of rows){
        const values=columns.map(column=>row[column]);
        const placeholders=columns.map((_,index)=>`$${index+1}`).join(',');
        await target.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,values);
      }
      const sequence=`${table}_${sequenceColumn}_seq`;
      await target.query(`SELECT setval($1,COALESCE((SELECT MAX(${sequenceColumn}) FROM ${table}),1),EXISTS(SELECT 1 FROM ${table}))`,[sequence]);
      console.log(`${table}: ${rows.length}`);
    }
    await target.query('COMMIT');
  }catch(error){
    await target.query('ROLLBACK');
    throw error;
  }finally{
    await source.end();
    await target.end();
  }
}

main().catch(error=>{console.error(error.message);process.exitCode=1});
