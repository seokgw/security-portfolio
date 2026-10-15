const fs=require('node:fs');
const mysql=require('mysql2/promise');
require('dotenv').config();

const output=process.argv[2];
if(!output)throw new Error('Usage: node export-mariadb-json.js OUTPUT.json');
const tables=['users','plans','plan_history','tasks','execution_logs','task_completion_events','reflections','daily_records','rule_changes','auth_sessions'];

async function main(){
  const connection=await mysql.createConnection({
    host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),
    user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,
    dateStrings:true
  });
  const data={};
  try{for(const table of tables){const [rows]=await connection.query(`SELECT * FROM \`${table}\``);data[table]=rows}}
  finally{await connection.end()}
  fs.writeFileSync(output,JSON.stringify(data));
  console.log(tables.map(table=>`${table}:${data[table].length}`).join(' '));
}

main().catch(error=>{console.error(error.message);process.exitCode=1});
