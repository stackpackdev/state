import React, { useState, useEffect } from 'react'

interface NotificationsProps {
  userId: string
}

interface Notification {
  id: number
  title: string
  body: string
}

export function Notifications({ userId }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`https://jsonplaceholder.typicode.com/posts?_limit=3&userId=1`)
      .then(res => res.json())
      .then(data => {
        setNotifications(data)
        setIsLoading(false)
      })
  }, [userId])

  const onDismiss = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (isLoading) return <div>Loading notifications...</div>
  if (notifications.length === 0) return null

  return (
    <div>
      <h3>Notifications ({notifications.length})</h3>
      <ul>
        {notifications.map(n => (
          <li key={n.id}>
            <strong>{n.title}</strong>
            <button onClick={() => onDismiss(n.id)}>Dismiss</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
