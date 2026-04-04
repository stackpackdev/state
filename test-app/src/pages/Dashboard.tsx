import React, { useState, useEffect } from 'react'
import { Notifications } from '../components/Notifications'

interface DashboardProps {
  user: { name: string; email: string } | null
}

interface Task {
  id: number
  title: string
  completed: boolean
}

export function Dashboard({ user }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/todos?_limit=10')
      .then(res => res.json())
      .then(data => {
        setTasks(data)
        setIsLoading(false)
      })
  }, [])

  if (!user) return <div>Please log in to access the dashboard.</div>

  const filteredTasks = tasks.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'done') return t.completed
    return true
  })

  const onToggleTask = (id: number) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome back, {user.name}!</p>

      <Notifications userId={user.email} />

      <section>
        <h2>Your Tasks</h2>
        <div className="filter-buttons">
          <button onClick={() => setFilter('all')} style={filter === 'all' ? {background: '#0066cc', color: 'white'} : {}}>All</button>
          <button onClick={() => setFilter('active')} style={filter === 'active' ? {background: '#0066cc', color: 'white'} : {}}>Active</button>
          <button onClick={() => setFilter('done')} style={filter === 'done' ? {background: '#0066cc', color: 'white'} : {}}>Done</button>
        </div>

        {isLoading ? (
          <p>Loading tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <p>No tasks found.</p>
        ) : (
          <ul>
            {filteredTasks.map(task => (
              <li key={task.id}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task.id)}
                />
                <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
