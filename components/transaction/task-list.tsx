'use client'

import {
  IconCheck,
  IconCircle,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  createTransactionTaskAction,
  updateTaskStatusAction,
} from '@/app/actions/transactions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type {
  TaskStatus,
  TransactionTask,
} from '@/services/transaction.service.server'

const STATUS_ICON: Record<TaskStatus, typeof IconCheck> = {
  open: IconCircle,
  in_progress: IconPlayerPlay,
  done: IconCheck,
  skipped: IconX,
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  open: 'text-[#5f554d]',
  in_progress: 'text-blue-600',
  done: 'text-emerald-600',
  skipped: 'text-[#5f554d]',
}

function TaskRow({
  task,
  transactionId,
}: {
  task: TransactionTask
  transactionId: string
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const Icon = STATUS_ICON[task.status]

  const cycleStatus = async () => {
    const next: TaskStatus =
      task.status === 'open'
        ? 'in_progress'
        : task.status === 'in_progress'
          ? 'done'
          : 'open'
    setIsSubmitting(true)
    try {
      await updateTaskStatusAction(task.id, next, transactionId)
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-[rgba(34,24,18,0.06)] last:border-0">
      <button
        type="button"
        onClick={cycleStatus}
        disabled={isSubmitting}
        className={cn('shrink-0 transition-colors', STATUS_COLOR[task.status])}
        aria-label={`Task status: ${task.status.replace('_', ' ')} — click to advance`}
      >
        <Icon className="h-4 w-4" />
      </button>
      <span
        className={cn(
          'text-sm flex-1',
          task.status === 'done' && 'line-through text-[#5f554d]',
          task.status === 'skipped' && 'line-through text-[#5f554d]'
        )}
      >
        {task.title}
      </span>
      {task.dueDate && (
        <span className="text-xs text-[#5f554d]">{task.dueDate}</span>
      )}
    </div>
  )
}

export function TaskList({
  transactionId,
  tasks,
}: {
  transactionId: string
  tasks: TransactionTask[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addTask = async () => {
    if (title.trim().length === 0) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await createTransactionTaskAction(transactionId, title)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      setTitle('')
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {tasks.length === 0 ? (
        <p className="text-sm text-[#5f554d] py-4">No tasks yet.</p>
      ) : (
        <div className="mb-4">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} transactionId={transactionId} />
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mb-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="Add a task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <Button
          size="sm"
          disabled={isSubmitting || title.trim().length === 0}
          onClick={addTask}
        >
          Add
        </Button>
      </div>
    </div>
  )
}
