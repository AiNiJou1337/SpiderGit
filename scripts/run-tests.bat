@echo off
REM 测试运行脚本 - Windows 版本

setlocal enabledelayedexpansion

echo 🧪 GitHub Trending Scraper - 测试运行器
echo ========================================

set "test_type=%~1"
if "%test_type%"=="" set "test_type=all"

echo 测试类型: %test_type%
echo.

REM 帮助函数
if "%test_type%"=="help" goto :show_help
if "%test_type%"=="-h" goto :show_help
if "%test_type%"=="--help" goto :show_help

REM 主要测试逻辑
if "%test_type%"=="frontend" goto :test_frontend
if "%test_type%"=="front" goto :test_frontend
if "%test_type%"=="backend" goto :test_backend
if "%test_type%"=="back" goto :test_backend
if "%test_type%"=="python" goto :test_backend
if "%test_type%"=="coverage" goto :test_coverage
if "%test_type%"=="ci" goto :test_ci
if "%test_type%"=="check" goto :test_ci
if "%test_type%"=="all" goto :test_all

goto :test_all

:test_frontend
echo 🌐 运行前端测试...
call npm test
if errorlevel 1 (
    echo ❌ 前端测试失败
    exit /b 1
) else (
    echo ✅ 前端测试通过
)
goto :end

:test_backend
echo 🐍 运行 Python 测试...
if not exist "scraper" (
    echo ❌ scraper 目录不存在
    exit /b 1
)
cd scraper
python -m pytest -v
if errorlevel 1 (
    echo ❌ Python 测试失败
    cd ..
    exit /b 1
) else (
    echo ✅ Python 测试通过
    cd ..
)
goto :end

:test_coverage
echo 📊 生成覆盖率报告...
echo 🔄 前端覆盖率...
call npm run test:coverage
if exist "scraper" (
    echo 🔄 Python 覆盖率...
    cd scraper
    python -m pytest --cov=. --cov-report=html
    cd ..
)
echo ✅ 覆盖率报告生成完成
goto :end

:test_ci
echo 🔍 运行 CI 检查...
echo 🔄 ESLint 检查...
call npm run lint
if errorlevel 1 (
    echo ❌ ESLint 检查失败
    exit /b 1
)

echo 🔄 TypeScript 检查...
call npm run type-check
if errorlevel 1 (
    echo ❌ TypeScript 检查失败
    exit /b 1
)

echo 🔄 构建检查...
call npm run build
if errorlevel 1 (
    echo ❌ 构建检查失败
    exit /b 1
)

if exist "scraper" (
    echo 🔄 Python 语法检查...
    cd scraper
    flake8 .
    if errorlevel 1 (
        echo ❌ Python 语法检查失败
        cd ..
        exit /b 1
    )
    
    echo 🔄 Python 格式检查...
    black --check .
    if errorlevel 1 (
        echo ⚠️  Python 格式检查失败（非阻塞）
    )
    cd ..
)
echo ✅ CI 检查完成
goto :end

:test_all
echo 🚀 运行所有测试...

echo 🔄 前端测试...
call npm test
if errorlevel 1 (
    echo ⚠️  前端测试失败，继续执行...
) else (
    echo ✅ 前端测试通过
)

if exist "scraper" (
    echo 🔄 Python 测试...
    cd scraper
    python -m pytest -v
    if errorlevel 1 (
        echo ⚠️  Python 测试失败，继续执行...
    ) else (
        echo ✅ Python 测试通过
    )
    cd ..
)

echo 🔄 代码质量检查...
call npm run ci:check
if errorlevel 1 (
    echo ⚠️  代码质量检查失败
) else (
    echo ✅ 代码质量检查通过
)

goto :end

:show_help
echo 用法: %~nx0 [test_type]
echo.
echo 测试类型:
echo   all        - 运行所有测试 (默认)
echo   frontend   - 仅运行前端测试
echo   backend    - 仅运行 Python 测试
echo   coverage   - 生成覆盖率报告
echo   ci         - 运行 CI 检查
echo   help       - 显示此帮助信息
echo.
echo 示例:
echo   %~nx0              # 运行所有测试
echo   %~nx0 frontend     # 仅运行前端测试
echo   %~nx0 coverage     # 生成覆盖率报告
goto :end

:end
echo.
echo 🎉 测试运行完成！
endlocal
