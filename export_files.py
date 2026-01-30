#!/usr/bin/env python3
"""
文件导出脚本
将项目中的所有文件内容导出到txt文件中，每个txt文件大约1500行
忽略node_modules目录
"""


import os
import re
from pathlib import Path


def should_ignore_file(filepath):
    """判断是否应该忽略该文件"""
    # 忽略node_modules目录及其子目录
    if 'node_modules' in filepath.parts:
        return True
    
    # 忽略导出目录本身
    if 'exported_files' in filepath.parts:
        return True
    
    # 忽略常见的二进制文件、构建产物等
    ignore_extensions = {
        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.zip', '.tar', '.gz', '.rar', '.7z',
        '.exe', '.dll', '.so', '.dylib',
        '.pyc', '.pyo', '.pyd',
        '.class', '.jar',
        '.log', '.tmp', '.cache',
        '.tsbuildinfo', '.lcov',
        '.tgz', '.lock'
    }
    
    if filepath.suffix.lower() in ignore_extensions:
        return True
    
    # 忽略隐藏文件和系统文件
    if filepath.name.startswith('.') or filepath.name.startswith('~'):
        return True
    
    # 忽略常见的构建和缓存目录
    ignore_directories = {
        'dist', 'build', 'out', 'coverage', '.nyc_output',
        '.next', '.nuxt', '.cache', '.parcel-cache',
        '.svelte-kit', 'node_modules', 'jspm_packages',
        'web_modules', 'bower_components', '.grunt',
        'lib-cov', 'logs', 'pids', 'report',
        '.temp', '.pnpm-store', '.git', 'exported_files', 'data'
    }
    
    for part in filepath.parts:
        if part in ignore_directories:
            return True
    
    # 忽略常见的配置文件和环境文件
    ignore_filenames = {
        'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock',
        '.npmrc', '.yarnrc', '.env', '.env.local', '.env.production',
        '.eslintcache', '.stylelintcache', '.node_repl_history',
        'npm-debug.log', 'yarn-debug.log', 'yarn-error.log',
        'lerna-debug.log', 'exported_files', 'data'
    }
    
    if filepath.name in ignore_filenames:
        return True
    
    # 忽略特定模式的文件
    ignore_patterns = [
        r'^report\.\d+\.\d+\.\d+\.\d+\.json$',  # 诊断报告
        r'^\.\w+$',  # 隐藏文件
        r'^~\w+',  # 临时文件
        r'\.pid(\.lock)?$',  # PID文件
        r'\.seed$'  # 种子文件
    ]
    
    for pattern in ignore_patterns:
        if re.match(pattern, filepath.name):
            return True
    
    return False


def read_file_content(filepath):
    """读取文件内容，处理可能的编码问题"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        try:
            with open(filepath, 'r', encoding='latin-1') as f:
                return f.read()
        except:
            return f"[无法读取文件: {filepath}]"
    except Exception as e:
        return f"[读取文件出错: {filepath}, 错误: {str(e)}]"


def format_file_header(filepath, relative_path):
    """格式化文件头部信息"""
    return f"\n{'='*80}\n文件: {relative_path}\n大小: {filepath.stat().st_size} 字节\n{'='*80}\n\n"


def export_files_to_txt(project_root, output_dir='exported_files', max_lines_per_file=1500):
    """
    导出所有文件到txt文件中
    
    Args:
        project_root: 项目根目录路径
        output_dir: 输出目录名称
        max_lines_per_file: 每个txt文件的最大行数
    """
    project_path = Path(project_root)
    output_path = project_path / output_dir
    
    # 创建输出目录
    output_path.mkdir(exist_ok=True)
    
    # 收集所有需要导出的文件
    all_files = []
    for filepath in project_path.rglob('*'):
        if filepath.is_file() and not should_ignore_file(filepath):
            all_files.append(filepath)
    
    print(f"找到 {len(all_files)} 个文件需要导出")
    
    # 按文件扩展名排序，使相似文件类型在一起
    all_files.sort(key=lambda x: x.suffix)
    
    # 导出文件
    current_file_index = 1
    current_line_count = 0
    current_output_file = None
    
    for i, filepath in enumerate(all_files):
        relative_path = filepath.relative_to(project_path)
        
        # 读取文件内容
        content = read_file_content(filepath)
        
        # 计算行数（包括文件头部的行数）
        header_lines = format_file_header(filepath, relative_path).count('\n') + 1
        content_lines = content.count('\n') + 1
        total_lines = header_lines + content_lines
        
        # 如果当前输出文件已满或不存在，创建新的输出文件
        if current_output_file is None or current_line_count + total_lines > max_lines_per_file:
            if current_output_file:
                current_output_file.close()
            
            output_filename = output_path / f"exported_files_{current_file_index:03d}.txt"
            current_output_file = open(output_filename, 'w', encoding='utf-8')
            current_file_index += 1
            current_line_count = 0
            
            # 写入文件头
            header = f"{'*'*80}\n"
            header += f"导出文件 #{current_file_index-1:03d}\n"
            header += f"项目: {project_path.name}\n"
            header += f"{'*'*80}\n\n"
            current_output_file.write(header)
            current_line_count += header.count('\n') + 1
        
        # 写入文件内容
        file_header = format_file_header(filepath, relative_path)
        current_output_file.write(file_header)
        current_output_file.write(content)
        current_output_file.write('\n')  # 文件间添加空行分隔
        
        current_line_count += total_lines
        
        print(f"进度: {i+1}/{len(all_files)} - 已导出: {relative_path}")
    
    # 关闭最后一个输出文件
    if current_output_file:
        current_output_file.close()
    
    print(f"\n导出完成！共生成 {current_file_index-1} 个txt文件")
    print(f"输出目录: {output_path}")


def main():
    """主函数"""
    # 获取当前脚本所在目录的父目录（项目根目录）
    script_dir = Path(__file__).parent
    project_root = script_dir
    
    print(f"项目根目录: {project_root}")
    print("开始导出文件...")
    
    export_files_to_txt(project_root, max_lines_per_file=1500)


if __name__ == "__main__":
    main()