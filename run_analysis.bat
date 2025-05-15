@echo off
echo 开始分析关键词数据...

REM 确保analytics目录存在
mkdir public\analytics 2>nul

REM 设置Python路径
set PYTHONPATH=%cd%

REM 运行分析脚本
python scraper\data_analysis.py --keywords "Application API"

echo 分析完成!
pause 