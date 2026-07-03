import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Printer, ArrowLeft, FileText } from 'lucide-react'
import { useRoomStore } from '@/store/useRoomStore'
import { useTimer } from '@/hooks/useTimer'
import { formatDuration } from '@/lib/utils'

export default function Report() {
  const { roomId } = useParams<{ roomId: string }>()
  const { currentRoom, loadRoom } = useRoomStore()
  const { timers } = useTimer(roomId)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId) return
    loadRoom(roomId).finally(() => setLoading(false))
  }, [roomId, loadRoom])

  if (loading) {
    return <div className="p-8 text-white">Loading report...</div>
  }

  if (!currentRoom) {
    return <div className="p-8 text-white">Room not found</div>
  }

  const formatTime = (ms: number | null) => {
    if (!ms) return '-'
    const d = new Date(ms)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const calculateDelay = (planned: number | null | undefined, actual: number | null | undefined) => {
    if (!planned || !actual) return { text: '-', isLate: false }
    const diff = (actual - planned) / 1000
    if (diff > 60) return { text: `+${formatDuration(diff)}`, isLate: true }
    if (diff < -60) return { text: `-${formatDuration(Math.abs(diff))}`, isLate: false }
    return { text: 'On Time', isLate: false }
  }

  const calculateOvertime = (plannedDur: number, actualDur: number) => {
    const diff = actualDur - plannedDur
    if (diff > 0) return { text: `+${formatDuration(diff)}`, isOver: true }
    if (diff < 0) return { text: `-${formatDuration(Math.abs(diff))}`, isOver: false }
    return { text: 'Exact', isOver: false }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-white text-black p-8 font-sans print:p-0 print:bg-white">
      
      {/* Non-print UI Controls */}
      <div className="flex items-center justify-between mb-8 print:hidden">
         <Link to={`/controller/${roomId}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Controller
         </Link>
         <button 
           onClick={handlePrint}
           className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-blue-700 transition-all"
         >
            <Printer className="w-4 h-4" /> Print to PDF
         </button>
      </div>

      {/* Report Header */}
      <div className="mb-10 border-b-2 border-gray-200 pb-6 flex items-start justify-between">
         <div>
            <h1 className="text-3xl font-bold mb-2">Event Timeline Report</h1>
            <p className="text-gray-600 text-lg">{currentRoom.name}</p>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5 font-mono">
               <FileText className="w-4 h-4" /> ID: {currentRoom.id}
            </p>
         </div>
         {currentRoom.logo && (
            <img 
               src={import.meta.env.VITE_API_URL.replace('/api', '') + '/' + currentRoom.logo} 
               alt="Event Logo" 
               className="max-w-[200px] max-h-[80px] object-contain"
            />
         )}
      </div>

      {/* Report Table */}
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 border-y border-gray-300">
            <th className="py-3 px-4 font-semibold text-gray-700 w-12 text-center">#</th>
            <th className="py-3 px-4 font-semibold text-gray-700">Segment / Speaker</th>
            <th className="py-3 px-4 font-semibold text-gray-700 text-center">PIC</th>
            <th className="py-3 px-4 font-semibold text-gray-700 text-center">Planned Start</th>
            <th className="py-3 px-4 font-semibold text-gray-700 text-center">Actual Start</th>
            <th className="py-3 px-4 font-semibold text-gray-700 text-center">Start Delay</th>
            <th className="py-3 px-4 font-semibold text-gray-700 text-center">Planned Dur.</th>
            <th className="py-3 px-4 font-semibold text-gray-700 text-center">Actual Dur.</th>
            <th className="py-3 px-4 font-semibold text-gray-700 text-center">Overtime</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {timers.map((timer, index) => {
            const startDelay = calculateDelay(timer.plannedStart, timer.startedAt)
            // Actual duration is what elapsed is when finished, plus what's remaining if still running (but usually we only report finished timers)
            // We use `timer.elapsed` which gets populated or updated
            const actualDur = timer.elapsed || 0
            const overtime = calculateOvertime(timer.duration, actualDur)
            const isCompleted = timer.status === 'finished'

            return (
               <tr key={timer.id} className={!isCompleted ? "opacity-60 bg-gray-50" : "hover:bg-gray-50"}>
                  <td className="py-3 px-4 text-center font-mono text-gray-500">{index + 1}</td>
                  <td className="py-3 px-4">
                     <div className="font-semibold text-gray-900">{timer.title}</div>
                     {timer.speaker && <div className="text-gray-500 text-xs mt-0.5">{timer.speaker}</div>}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">{timer.pic || '-'}</td>
                  <td className="py-3 px-4 text-center font-mono">{timer.plannedStart ? formatTime(timer.plannedStart) : '-'}</td>
                  <td className="py-3 px-4 text-center font-mono">{timer.startedAt ? formatTime(timer.startedAt) : '-'}</td>
                  <td className={`py-3 px-4 text-center font-mono font-medium ${startDelay.isLate ? 'text-red-600' : 'text-green-600'}`}>
                     {startDelay.text}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{formatDuration(timer.duration)}</td>
                  <td className="py-3 px-4 text-center font-mono">{isCompleted ? formatDuration(actualDur) : '-'}</td>
                  <td className={`py-3 px-4 text-center font-mono font-medium ${overtime.isOver ? 'text-red-600' : (isCompleted ? 'text-green-600' : 'text-gray-400')}`}>
                     {isCompleted ? overtime.text : '-'}
                  </td>
               </tr>
            )
          })}
          {timers.length === 0 && (
             <tr>
                <td colSpan={9} className="py-12 text-center text-gray-500">No timers available for this event.</td>
             </tr>
          )}
        </tbody>
      </table>
      
      <div className="mt-12 text-center text-xs text-gray-400 print:block">
         Generated by Stage Timer Pro
      </div>

    </div>
  )
}
