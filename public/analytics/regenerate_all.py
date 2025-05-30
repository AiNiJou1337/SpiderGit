import json
import os
import sys
import psycopg2
from datetime import datetime

# 数据库连接信息
DB_URL = os.environ.get('DATABASE_URL', "postgresql://postgres:postgres@localhost:5432/github_trending")

def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"数据库连接失败: {e}")
        raise

def get_imported_libraries(conn, repository_ids):
    """获取仓库中使用的库/包统计"""
    imported_libraries = {}
    try:
        if not repository_ids:
            return imported_libraries
            
        with conn.cursor() as cursor:
            placeholder = ','.join(['%s'] * len(repository_ids))
            cursor.execute(f'''
                SELECT lib
                FROM code_files c, 
                     LATERAL unnest(c."importedLibraries") as lib
                WHERE c.repository_id IN ({placeholder})
            ''', repository_ids)
            
            for row in cursor.fetchall():
                lib = row[0]
                if lib:
                    imported_libraries[lib] = imported_libraries.get(lib, 0) + 1
                        
    except Exception as e:
        print(f"获取导入库数据失败: {e}")
        
    return imported_libraries

def process_file(file_path):
    """处理分析文件，重新生成分析结果"""
    try:
        print(f"Processing file: {file_path}")
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 确保有仓库数据
        if not data.get('repositories') or not isinstance(data['repositories'], list) or len(data['repositories']) == 0:
            print("错误: 分析文件中缺少仓库数据")
            return False
        
        # 确保charts存在
        if 'charts' not in data:
            data['charts'] = {}
        
        # 获取数据库连接
        conn = get_db_connection()
        
        try:
            # 获取仓库ID列表
            repository_ids = [repo['id'] for repo in data['repositories']]
            
            # 获取导入的库数据
            imported_libraries = get_imported_libraries(conn, repository_ids)
            
            # 重新分析数据
            # 1. 提取所有语言
            languages = {}
            for repo in data['repositories']:
                if repo.get('language'):
                    languages[repo['language']] = languages.get(repo['language'], 0) + 1
            
            data['charts']['language_distribution'] = {'data': languages}
            
            # 2. 提取星标分布
            stars = [repo.get('stars', 0) for repo in data['repositories']]
            stars_total = sum(stars)
            stars_distribution = {
                'mean': stars_total / len(stars) if stars else 0,
                'min': min(stars) if stars else 0,
                'max': max(stars) if stars else 0,
                'total': stars_total
            }
            
            data['charts']['stars_distribution'] = {'data': stars_distribution}
            
            # 3. 提取标签
            tags = {}
            for repo in data['repositories']:
                if repo.get('tags') and isinstance(repo['tags'], list):
                    for tag in repo['tags']:
                        tags[tag] = tags.get(tag, 0) + 1
            
            data['charts']['tag_analysis'] = {'data': tags}
            
            # 4. 提取描述关键词
            description_keywords = {}
            for repo in data['repositories']:
                if repo.get('description'):
                    words = repo['description'].lower().replace('\n', ' ').split()
                    for word in [w.strip('.,;:()[]{}\'"\'"').lower() for w in words if len(w.strip('.,;:()[]{}\'"\'"')) > 3]:
                        description_keywords[word] = description_keywords.get(word, 0) + 1
            
            # 只保留出现频率最高的前50个关键词
            sorted_keywords = {k: v for k, v in sorted(description_keywords.items(), key=lambda item: item[1], reverse=True)[:50]}
            
            data['charts']['description_keywords'] = {'data': sorted_keywords}
            
            # 5. 更新导入的库数据
            data['charts']['imported_libraries'] = {'data': imported_libraries}
            
        finally:
            conn.close()
        
        # 更新分析日期
        data['analysis_date'] = datetime.now().isoformat()
        
        # 写回文件
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"成功处理文件: {file_path}")
        return True
    except Exception as e:
        print(f"处理文件时出错: {e}")
        return False

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 处理当前目录中所有的分析文件
    count = 0
    errors = 0
    
    for filename in os.listdir(current_dir):
        if filename.startswith('analysis_') and filename.endswith('.json'):
            file_path = os.path.join(current_dir, filename)
            print(f"\n处理文件 {count+1}: {filename}")
            success = process_file(file_path)
            if success:
                count += 1
            else:
                errors += 1
    
    print(f"\n处理完成: 成功 {count} 个文件，失败 {errors} 个文件")