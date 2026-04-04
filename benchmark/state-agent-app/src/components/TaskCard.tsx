import React, { useState, useCallback } from 'react';
import type { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onMove: (task: Task, newStatus: TaskStatus) => void;
}

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in-progress', 'done'];

export function TaskCard({ task, onEdit, onDelete, onMove }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleSave = useCallback(() => {
    if (editTitle.trim()) {
      onEdit({ ...task, title: editTitle.trim() });
      setIsEditing(false);
    }
  }, [editTitle, task, onEdit]);

  const handleCancel = useCallback(() => {
    setEditTitle(task.title);
    setIsEditing(false);
  }, [task.title]);

  const handleMoveClick = useCallback(
    (newStatus: TaskStatus) => {
      if (newStatus !== task.status) {
        onMove(task, newStatus);
      }
    },
    [task, onMove]
  );

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        {isEditing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{ flex: 1, padding: '2px 6px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 4 }}
            autoFocus
          />
        ) : (
          <strong style={{ fontSize: 14 }}>{task.title}</strong>
        )}
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#fff',
            backgroundColor: PRIORITY_COLORS[task.priority],
            padding: '2px 6px',
            borderRadius: 4,
            marginLeft: 8,
            textTransform: 'uppercase',
          }}
        >
          {task.priority}
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{task.description}</p>

      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
        Assignee: {task.assignee}
      </div>

      {/* Move buttons */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        {STATUS_OPTIONS.filter((s) => s !== task.status).map((status) => (
          <button
            key={status}
            onClick={() => handleMoveClick(status)}
            style={{
              fontSize: 11,
              padding: '2px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
            }}
          >
            Move to {status}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {isEditing ? (
          <>
            <button onClick={handleSave} style={{ fontSize: 11, cursor: 'pointer', color: '#22c55e', background: 'none', border: 'none' }}>
              Save
            </button>
            <button onClick={handleCancel} style={{ fontSize: 11, cursor: 'pointer', color: '#6b7280', background: 'none', border: 'none' }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              style={{ fontSize: 11, cursor: 'pointer', color: '#3b82f6', background: 'none', border: 'none' }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(task.id)}
              style={{ fontSize: 11, cursor: 'pointer', color: '#ef4444', background: 'none', border: 'none' }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
