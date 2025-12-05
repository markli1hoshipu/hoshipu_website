import yaml
import os

def get_available_templates():
    """获取所有可用的输出模板"""
    try:
        with open('output_templates.yaml', 'r', encoding='utf8') as f:
            config = yaml.safe_load(f)
            return list(config['templates'].keys())
    except:
        return []

def get_template(template_name):
    """获取指定模板的配置"""
    try:
        with open('output_templates.yaml', 'r', encoding='utf8') as f:
            config = yaml.safe_load(f)
            return config['templates'].get(template_name)
    except:
        return None

def add_template(template_name, template_config):
    """添加新模板到YAML文件"""
    try:
        with open('output_templates.yaml', 'r', encoding='utf8') as f:
            config = yaml.safe_load(f)
        
        if not config:
            config = {'templates': {}}
        
        if 'templates' not in config:
            config['templates'] = {}
        
        config['templates'][template_name] = template_config
        
        with open('output_templates.yaml', 'w', encoding='utf8') as f:
            yaml.dump(config, f, allow_unicode=True, default_flow_style=False)
        
        return True
    except Exception as e:
        print(f"添加模板失败: {e}")
        return False

def list_templates():
    """列出所有模板及其描述"""
    templates = get_available_templates()
    print("=" * 60)
    print("可用的输出模板:")
    print("=" * 60)
    
    for name in templates:
        template = get_template(name)
        desc = template.get('description', '无描述') if template else '无描述'
        print(f"\n模板名称: {name}")
        print(f"描述: {desc}")
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    list_templates()
