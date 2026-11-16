import type { AssistantMessage as Message } from '@/lib/assistant/types'

export function AssistantMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`max-w-[92%] rounded-2xl px-4 py-3 ${isUser ? 'ml-auto bg-[#1f7a52] text-white' : 'border border-[#d7e8dc] bg-white text-slate-700'}`}>
      <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${isUser ? 'text-white/70' : 'text-[#587568]'}`}>{isUser ? 'You' : 'Greener'}</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
    </div>
  )
}
