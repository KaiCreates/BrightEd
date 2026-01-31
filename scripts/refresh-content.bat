@echo off
echo Refreshing BrightEd Content Cache...
call npx tsx scripts/cache-objective-ids.ts
pause
