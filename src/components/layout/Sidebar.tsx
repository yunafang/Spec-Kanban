import FileTree from './FileTree'
import SkillBar from './SkillBar'

export default function Sidebar() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-800">
        {'\u{1F4C1}'} Project Files
      </div>
      {/* File tree - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <FileTree />
      </div>
      {/* Skills section - fixed at bottom */}
      <div className="border-t border-gray-800">
        <div className="px-3 py-2 text-xs text-gray-500 font-semibold">
          {'\u26A1'} Skills
        </div>
        <SkillBar />
      </div>
    </div>
  )
}
