import { builtinSkills } from '@/skills'

const tagColors = [
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
]

export default function SkillBar() {
  return (
    <div className="px-3 pb-3 flex flex-wrap gap-1.5">
      {builtinSkills.map((skill, i) => (
        <span
          key={skill.id}
          title={skill.description}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${tagColors[i % tagColors.length]}`}
        >
          <span>{skill.icon}</span>
          <span>{skill.name}</span>
        </span>
      ))}
    </div>
  )
}
