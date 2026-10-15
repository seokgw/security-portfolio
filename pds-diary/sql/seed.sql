USE pds_diary;
SET time_zone = '+09:00';
INSERT INTO plans(title,description,start_date,end_date,priority,success_criteria,estimated_minutes)
SELECT 'MCP 서버 구축 및 Tool 연동','Node.js 기반 MCP 서버를 구축하고 외부에서 접근할 수 있도록 설정한 뒤, AI가 실제로 사용할 수 있는 Tool과 외부 API를 연결하고 정상 호출 여부를 확인한다.',CURRENT_DATE(),DATE_ADD(CURRENT_DATE(),INTERVAL 14 DAY),'high','1. MCP 서버 정상 실행\n2. 외부 클라이언트 연결\n3. Tool 1개 이상 등록\n4. 실제 호출 결과 확인\n5. 최종 테스트 통과',480
WHERE NOT EXISTS(SELECT 1 FROM plans WHERE title='MCP 서버 구축 및 Tool 연동');
SET @p=(SELECT id FROM plans WHERE title='MCP 서버 구축 및 Tool 연동' ORDER BY id LIMIT 1);
INSERT INTO tasks(plan_id,title,description,due_date,priority,tag,estimated_minutes,status)
SELECT @p,'MCP 서버 프로젝트 기본 환경 구성','Node.js 프로젝트 생성 및 필요한 패키지 구성',CURRENT_DATE(),'high','setup',60,'completed' WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE plan_id=@p AND tag='setup');
INSERT INTO tasks(plan_id,title,description,due_date,priority,tag,estimated_minutes,status)
SELECT @p,'Node.js 기반 MCP 서버 기본 구조 구현','MCP 서버 실행 및 endpoint 동작 확인',DATE_ADD(CURRENT_DATE(),INTERVAL 2 DAY),'high','backend',90,'completed' WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE plan_id=@p AND tag='backend');
INSERT INTO tasks(plan_id,title,description,due_date,priority,tag,estimated_minutes,status)
SELECT @p,'MCP Tool 등록 기능 구현','테스트 Tool을 추가하고 호출 결과 확인',DATE_ADD(CURRENT_DATE(),INTERVAL 4 DAY),'high','tool',90,'in_progress' WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE plan_id=@p AND tag='tool');
INSERT INTO tasks(plan_id,title,description,due_date,priority,tag,estimated_minutes,status)
SELECT @p,'외부 API를 MCP Tool로 연결','parameter binding과 오류 응답 검증',DATE_ADD(CURRENT_DATE(),INTERVAL 6 DAY),'medium','api',90,'todo' WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE plan_id=@p AND tag='api');
INSERT INTO tasks(plan_id,title,description,due_date,priority,tag,estimated_minutes,status)
SELECT @p,'외부 클라이언트 MCP 연결 테스트','외부 클라이언트에서 Tool 목록과 호출 확인',DATE_ADD(CURRENT_DATE(),INTERVAL 9 DAY),'high','test',60,'todo' WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE plan_id=@p AND tag='test');
INSERT INTO tasks(plan_id,title,description,due_date,priority,tag,estimated_minutes,status)
SELECT @p,'오류 수정 및 최종 검증','<script>alert(''T06-XSS'')</script> 문자열 안전 표시 포함',DATE_ADD(CURRENT_DATE(),INTERVAL 12 DAY),'medium','debug',90,'todo' WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE plan_id=@p AND tag='debug');
SET @t1=(SELECT id FROM tasks WHERE plan_id=@p AND tag='setup' LIMIT 1);SET @t2=(SELECT id FROM tasks WHERE plan_id=@p AND tag='backend' LIMIT 1);SET @t3=(SELECT id FROM tasks WHERE plan_id=@p AND tag='tool' LIMIT 1);
INSERT INTO execution_logs(task_id,start_time,end_time,actual_minutes,blocker_reason,work_done) SELECT @t1,DATE_SUB(NOW(),INTERVAL 3 DAY),DATE_ADD(DATE_SUB(NOW(),INTERVAL 3 DAY),INTERVAL 50 MINUTE),50,NULL,'Node.js 프로젝트 생성 및 필요한 패키지 구성' WHERE NOT EXISTS(SELECT 1 FROM execution_logs WHERE task_id=@t1);
INSERT INTO execution_logs(task_id,start_time,end_time,actual_minutes,blocker_reason,work_done) SELECT @t2,DATE_SUB(NOW(),INTERVAL 2 DAY),DATE_ADD(DATE_SUB(NOW(),INTERVAL 2 DAY),INTERVAL 80 MINUTE),80,'초기 endpoint 경로 충돌','MCP 서버 실행 및 endpoint 동작 확인' WHERE NOT EXISTS(SELECT 1 FROM execution_logs WHERE task_id=@t2);
INSERT INTO execution_logs(task_id,start_time,end_time,actual_minutes,blocker_reason,work_done) SELECT @t3,DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_ADD(DATE_SUB(NOW(),INTERVAL 1 DAY),INTERVAL 65 MINUTE),65,'<script>alert(''T06-XSS'')</script>', '테스트 Tool을 추가하고 호출 결과 확인' WHERE NOT EXISTS(SELECT 1 FROM execution_logs WHERE task_id=@t3);
UPDATE tasks SET completed_at=COALESCE(completed_at,NOW()) WHERE id IN(@t1,@t2) AND status='completed';
