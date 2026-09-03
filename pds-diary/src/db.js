const {Pool,types}=require('pg');
require('dotenv').config();

types.setTypeParser(1082,value=>value);
types.setTypeParser(1114,value=>value);

const raw=new Pool({
  connectionString:process.env.DATABASE_URL,
  ssl:process.env.DB_SSL==='false'?false:{rejectUnauthorized:false},
  options:'-c timezone=Asia/Seoul',
  max:Number(process.env.DB_POOL_SIZE||10)
});

function sqlText(text){
  let i=0;
  return text
    .replace(/CURRENT_DATE\(\)/g,'CURRENT_DATE')
    .replace(/DATE_ADD\(NOW\(\),INTERVAL \? SECOND\)/g,"(NOW() + (? * INTERVAL '1 second'))")
    .replace(/\?/g,()=>`$${++i}`);
}
function duplicate(error){if(error.code==='23505')error.code='ER_DUP_ENTRY';return error}
async function execute(client,text,params=[]){
  const select=/^\s*(SELECT|WITH)\b/i.test(text);
  let query=sqlText(text);
  if(/^\s*INSERT\b/i.test(query)&&!/\bRETURNING\b/i.test(query)){
    query+=/^\s*INSERT\s+INTO\s+plan_history\b/i.test(query)?' RETURNING history_id AS id':' RETURNING id';
  }
  try{
    const result=await client.query(query,params);
    if(select)return [result.rows,result.fields];
    return [{insertId:result.rows[0]?.id,affectedRows:result.rowCount},result.fields];
  }catch(error){throw duplicate(error)}
}
function wrap(client,release=()=>{}){return {
  execute:(text,params)=>execute(client,text,params),query:(text,params)=>execute(client,text,params),
  beginTransaction:()=>client.query('BEGIN'),commit:()=>client.query('COMMIT'),rollback:()=>client.query('ROLLBACK'),release
}}
module.exports={...wrap(raw),async getConnection(){const client=await raw.connect();return wrap(client,()=>client.release())},end:()=>raw.end()};
