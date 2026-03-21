import type { Skill } from '@/types'

export const builtinSkills: Skill[] = [
  {
    id: 'superpowers',
    name: 'Superpowers 全流程',
    icon: '⚡',
    description: '完整的 Brainstorm → Planning → Executing 流程，适合新功能开发',
    stages: [
      { key: 'brainstorm', label: 'Brainstorm', icon: '💡', needsHumanConfirm: true },
      { key: 'planning', label: 'Planning', icon: '📝', needsHumanConfirm: true },
      { key: 'executing', label: 'Executing', icon: '🚀', needsHumanConfirm: false },
    ]
  },
  {
    id: 'quick-fix',
    name: '快速修复',
    icon: '🔧',
    description: '跳过设计和计划，直接执行修复，适合 Bug 修复和小改动',
    stages: [
      { key: 'executing', label: 'Executing', icon: '🚀', needsHumanConfirm: false },
    ]
  },
  {
    id: 'code-review',
    name: '代码审查',
    icon: '🔍',
    description: 'AI 审查代码质量，输出审查报告，不做代码修改',
    stages: [
      { key: 'brainstorm', label: '审查分析', icon: '🔍', needsHumanConfirm: true },
    ]
  },
  {
    id: 'refactor',
    name: '重构优化',
    icon: '♻️',
    description: '先分析重构方案，确认后执行重构',
    stages: [
      { key: 'brainstorm', label: '重构方案', icon: '♻️', needsHumanConfirm: true },
      { key: 'executing', label: 'Executing', icon: '🚀', needsHumanConfirm: false },
    ]
  },
  {
    id: 'docs',
    name: '文档生成',
    icon: '📖',
    description: '分析代码生成技术文档、API 文档或 README',
    stages: [
      { key: 'brainstorm', label: '文档规划', icon: '📖', needsHumanConfirm: true },
      { key: 'executing', label: '生成文档', icon: '✍️', needsHumanConfirm: false },
    ]
  },
  {
    id: 'test',
    name: '测试用例',
    icon: '🧪',
    description: '分析代码生成测试用例，TDD 风格',
    stages: [
      { key: 'planning', label: '测试计划', icon: '🧪', needsHumanConfirm: true },
      { key: 'executing', label: '编写测试', icon: '🚀', needsHumanConfirm: false },
    ]
  },
]

export function getSkill(id: string): Skill {
  return builtinSkills.find((s) => s.id === id) || builtinSkills[0]
}
