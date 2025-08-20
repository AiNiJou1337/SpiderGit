const fs = require('fs');
const path = require('path');

console.log('开始清理 maimai 关键词的残留数据...');

// 1. 清理 public/result/all_keywords_analysis.json 中的 maimai 数据
const allKeywordsFile = path.join(__dirname, 'public', 'result', 'all_keywords_analysis.json');

if (fs.existsSync(allKeywordsFile)) {
  try {
    const fileContent = fs.readFileSync(allKeywordsFile, 'utf8');
    const data = JSON.parse(fileContent);
    
    console.log(`原始文件包含 ${data.length} 个关键词数据`);
    
    // 过滤掉 maimai 关键词
    const cleanedData = data.filter(item => item.keyword !== 'maimai');
    
    if (cleanedData.length !== data.length) {
      fs.writeFileSync(allKeywordsFile, JSON.stringify(cleanedData, null, 2));
      console.log(`成功从 all_keywords_analysis.json 中移除了 maimai 关键词`);
      console.log(`清理后文件包含 ${cleanedData.length} 个关键词数据`);
    } else {
      console.log('未找到 maimai 关键词数据');
    }
  } catch (error) {
    console.error('处理 all_keywords_analysis.json 失败:', error);
  }
} else {
  console.log('all_keywords_analysis.json 文件不存在');
}

// 2. 检查并清理 public/analytics 目录中的 maimai 分析文件
const analyticsDir = path.join(__dirname, 'public', 'analytics');
const maimaiAnalysisFile = 'analysis_maimai.json';
const maimaiAnalysisPath = path.join(analyticsDir, maimaiAnalysisFile);

if (fs.existsSync(maimaiAnalysisPath)) {
  try {
    fs.unlinkSync(maimaiAnalysisPath);
    console.log(`成功删除了分析文件: ${maimaiAnalysisFile}`);
  } catch (error) {
    console.error(`删除分析文件失败: ${error.message}`);
  }
} else {
  console.log(`分析文件 ${maimaiAnalysisFile} 不存在`);
}

// 3. 检查其他可能包含 maimai 的文件
const searchFiles = [
  'public/result/all_keywords_analysis.json',
  'public/analytics/analysis_maimai.json'
];

console.log('\n检查结果:');
searchFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`✓ ${filePath} 存在 (${stats.size} bytes)`);
  } else {
    console.log(`✗ ${filePath} 不存在`);
  }
});

console.log('\nmaimai 关键词残留数据清理完成！');
console.log('请重新启动应用或刷新页面以查看效果。'); 