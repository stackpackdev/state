import React, { useState, useCallback } from 'react';
import { useProjects } from '../hooks/useProjects';

// ── Boilerplate counter: 4x useState, 2x useCallback + hooks internals ──

export function ProjectsPage({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
  const {
    projects,
    isLoading,
    error,
    editingId,
    setEditingId,
    addProject,
    updateProject,
    deleteProject,
    archiveProject,
  } = useProjects();

  // New project form state
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  // Edit inline state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newName.trim()) {
        addProject(newName.trim(), newDesc.trim());
        setNewName('');
        setNewDesc('');
        setShowForm(false);
      }
    },
    [newName, newDesc, addProject]
  );

  const startEdit = useCallback(
    (project: { id: string; name: string; description: string }) => {
      setEditingId(project.id);
      setEditName(project.name);
      setEditDesc(project.description);
    },
    [setEditingId]
  );

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading projects...</div>;
  }

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Projects</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {/* New project form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            padding: 16,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
            autoFocus
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description"
            rows={2}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'vertical' }}
          />
          <button
            type="submit"
            style={{
              alignSelf: 'flex-start',
              padding: '8px 20px',
              backgroundColor: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create Project
          </button>
        </form>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>No projects yet. Create one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 16,
                opacity: project.status === 'archived' ? 0.6 : 1,
              }}
            >
              {editingId === project.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() =>
                        updateProject({ ...project, name: editName.trim(), description: editDesc.trim() })
                      }
                      style={{ fontSize: 12, color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: 16, marginBottom: 4 }}>{project.name}</h3>
                      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{project.description}</p>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        Created: {project.createdAt} | Tasks: {project.tasks.length} |{' '}
                        <span
                          style={{
                            color: project.status === 'active' ? '#22c55e' : '#9ca3af',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {project.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => onOpenProject(project.id)}
                        style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Open Board
                      </button>
                      <button
                        onClick={() => startEdit(project)}
                        style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      {project.status === 'active' && (
                        <button
                          onClick={() => archiveProject(project)}
                          style={{ fontSize: 12, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Archive
                        </button>
                      )}
                      <button
                        onClick={() => deleteProject(project.id)}
                        style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
