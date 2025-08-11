#!/bin/bash
# 测试运行脚本 - 支持 Linux/macOS

set -e

echo "🧪 GitHub Trending Scraper - 测试运行器"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 帮助函数
print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 检查命令是否存在
check_command() {
    if command -v $1 >/dev/null 2>&1; then
        print_success "$1 已安装"
        return 0
    else
        print_error "$1 未安装"
        return 1
    fi
}

# 运行命令并检查结果
run_command() {
    local cmd="$1"
    local desc="$2"
    
    print_step "$desc"
    if eval "$cmd"; then
        print_success "$desc 完成"
        return 0
    else
        print_error "$desc 失败"
        return 1
    fi
}

# 主函数
main() {
    local test_type="${1:-all}"
    
    echo -e "${CYAN}测试类型: $test_type${NC}"
    echo ""
    
    case $test_type in
        "frontend"|"front")
            echo "🌐 运行前端测试..."
            run_command "npm test" "前端测试"
            ;;
        "backend"|"back"|"python")
            echo "🐍 运行 Python 测试..."
            if [ -d "scraper" ]; then
                run_command "cd scraper && python -m pytest -v" "Python 测试"
            else
                print_error "scraper 目录不存在"
                exit 1
            fi
            ;;
        "coverage")
            echo "📊 生成覆盖率报告..."
            run_command "npm run test:coverage" "前端覆盖率"
            if [ -d "scraper" ]; then
                run_command "cd scraper && python -m pytest --cov=. --cov-report=html" "Python 覆盖率"
            fi
            ;;
        "ci"|"check")
            echo "🔍 运行 CI 检查..."
            run_command "npm run lint" "ESLint 检查"
            run_command "npm run type-check" "TypeScript 检查"
            run_command "npm run build" "构建检查"
            if [ -d "scraper" ]; then
                run_command "cd scraper && flake8 ." "Python 语法检查"
                run_command "cd scraper && black --check ." "Python 格式检查"
            fi
            ;;
        "all"|*)
            echo "🚀 运行所有测试..."
            
            # 前端测试
            print_step "前端测试"
            if npm test; then
                print_success "前端测试通过"
            else
                print_warning "前端测试失败，继续执行..."
            fi
            
            # Python 测试
            if [ -d "scraper" ]; then
                print_step "Python 测试"
                if cd scraper && python -m pytest -v; then
                    print_success "Python 测试通过"
                    cd ..
                else
                    print_warning "Python 测试失败，继续执行..."
                    cd ..
                fi
            fi
            
            # CI 检查
            print_step "代码质量检查"
            if npm run ci:check; then
                print_success "代码质量检查通过"
            else
                print_warning "代码质量检查失败"
            fi
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🎉 测试运行完成！${NC}"
}

# 显示帮助
show_help() {
    echo "用法: $0 [test_type]"
    echo ""
    echo "测试类型:"
    echo "  all        - 运行所有测试 (默认)"
    echo "  frontend   - 仅运行前端测试"
    echo "  backend    - 仅运行 Python 测试"
    echo "  coverage   - 生成覆盖率报告"
    echo "  ci         - 运行 CI 检查"
    echo "  help       - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0              # 运行所有测试"
    echo "  $0 frontend     # 仅运行前端测试"
    echo "  $0 coverage     # 生成覆盖率报告"
}

# 检查参数
if [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 运行主函数
main "$1"
