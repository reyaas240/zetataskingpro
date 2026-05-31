"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useWorkspace } from "@/app/dashboard/WorkspaceContext";
import TaskDrawer from "@/app/dashboard/components/TaskDrawer";
import TipTapEditor from "@/app/dashboard/components/TipTapEditor";
import "./board.css";

export default function BoardWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.orgId as string;
  const projectId = params?.projectId as string;
  const boardId = params?.boardId as string;

  const { selectedOrg } = useWorkspace();

  const [board, setBoard] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("kanban"); // kanban, backlog, epics, settings

  // Filters
  const [filterEpic, setFilterEpic] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected task for drawer
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Modals / Creators
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState(""); // HTML rich text content
  const [taskType, setTaskType] = useState("TASK");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskPoints, setTaskPoints] = useState("");
  const [taskColumnId, setTaskColumnId] = useState("");
  const [taskSprintId, setTaskSprintId] = useState("");
  const [taskEpicId, setTaskEpicId] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [createTaskEditorKey, setCreateTaskEditorKey] = useState(0); // force remount on reset

  // Epic Form
  const [epicName, setEpicName] = useState("");
  const [epicColor, setEpicColor] = useState("#3b82f6");
  const [epicDesc, setEpicDesc] = useState("");
  const [epicLoading, setEpicLoading] = useState(false);

  // Sprint Form
  const [showStartSprint, setShowStartSprint] = useState<string | null>(null);
  const [sprintStartDate, setSprintStartDate] = useState("");
  const [sprintEndDate, setSprintEndDate] = useState("");
  const [startSprintLoading, setStartSprintLoading] = useState(false);

  // Board settings / Columns Edit
  const [newColName, setNewColName] = useState("");
  const [colLoading, setColLoading] = useState(false);

  useEffect(() => {
    if (boardId) {
      loadBoardWorkspace();
    }
  }, [boardId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlTaskId = searchParams.get("taskId");
      if (urlTaskId) {
        setSelectedTaskId(urlTaskId);
      }
    }
  }, []);

  const loadBoardWorkspace = async () => {
    setLoading(true);
    try {
      // 1. Load Board
      const boardRes = await fetch(`/api/boards?projectId=${projectId}`);
      if (boardRes.ok) {
        const boardData = await boardRes.json();
        const activeBoard = boardData.boards.find((b: any) => b.id === boardId);
        setBoard(activeBoard);
        setColumns(activeBoard?.columns || []);
        if (activeBoard?.columns.length > 0) {
          setTaskColumnId(activeBoard.columns[0].id);
        }
      }

      // 2. Load Tasks
      await fetchTasks();

      // 3. Load Sprints
      await fetchSprints();

      // 4. Load Epics
      await fetchEpics();

      // 5. Load Members
      const membersRes = await fetch(`/api/organizations/members?organizationId=${orgId}`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?boardId=${boardId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSprints = async () => {
    try {
      const res = await fetch(`/api/boards/sprints?boardId=${boardId}`);
      if (res.ok) {
        const data = await res.json();
        setSprints(data.sprints);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEpics = async () => {
    try {
      const res = await fetch(`/api/boards/epics?boardId=${boardId}`);
      if (res.ok) {
        const data = await res.json();
        setEpics(data.epics);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Drag and Drop implementation
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistically update column of dragged task
    const updatedTasks = [...tasks];
    const taskIdx = updatedTasks.findIndex((t) => t.id === draggableId);
    if (taskIdx > -1) {
      updatedTasks[taskIdx].columnId = destination.droppableId;
      setTasks(updatedTasks);
    }

    try {
      // Call PUT /api/tasks to persist status transition
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: draggableId,
          columnId: destination.droppableId,
        }),
      });
      fetchTasks();
    } catch (e) {
      console.error("Failed to persist task status", e);
    }
  };

  // Submit Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateTaskLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          taskType,
          priority: taskPriority,
          storyPoints: taskPoints,
          projectId,
          boardId,
          columnId: taskColumnId,
          sprintId: taskSprintId || undefined,
          epicId: taskEpicId || undefined,
          assigneeId: taskAssigneeId || undefined,
        }),
      });

      if (res.ok) {
        setTaskTitle("");
        setTaskDesc("");
        setTaskPoints("");
        setCreateTaskEditorKey((k) => k + 1); // Reset TipTap editor
        setShowCreateTask(false);
        fetchTasks();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create task");
      }
    } catch {
      alert("Network error.");
    } finally {
      setCreateTaskLoading(false);
    }
  };

  // Submit Epic Creation
  const handleCreateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    setEpicLoading(true);
    try {
      const res = await fetch("/api/boards/epics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: epicName,
          colorCode: epicColor,
          description: epicDesc,
          boardId,
        }),
      });
      if (res.ok) {
        setEpicName("");
        setEpicDesc("");
        fetchEpics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEpicLoading(false);
    }
  };

  const handleDeleteEpic = async (epicId: string) => {
    if (!confirm("Are you sure you want to delete this Epic? Tasks linked to it will be un-linked.")) return;
    try {
      const res = await fetch(`/api/boards/epics?epicId=${epicId}`, { method: "DELETE" });
      if (res.ok) {
        fetchEpics();
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Sprint
  const handleCreateSprint = async () => {
    const nextSprintNum = sprints.length + 1;
    try {
      const res = await fetch("/api/boards/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Sprint ${nextSprintNum}`,
          boardId,
        }),
      });
      if (res.ok) {
        fetchSprints();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Start Sprint
  const handleStartSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStartSprint) return;
    setStartSprintLoading(true);

    try {
      const res = await fetch("/api/boards/sprints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sprintId: showStartSprint,
          startDate: sprintStartDate,
          endDate: sprintEndDate,
          status: "ACTIVE",
        }),
      });
      if (res.ok) {
        setShowStartSprint(null);
        setSprintStartDate("");
        setSprintEndDate("");
        fetchSprints();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStartSprintLoading(false);
    }
  };

  // Complete Sprint
  const handleCompleteSprint = async (sprintId: string) => {
    if (!confirm("Complete this Sprint? Incomplete tasks will be returned to the Backlog.")) return;
    try {
      const res = await fetch("/api/boards/sprints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sprintId,
          status: "COMPLETED",
        }),
      });
      if (res.ok) {
        fetchSprints();
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Column CRUD
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    setColLoading(true);
    try {
      const res = await fetch("/api/boards/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newColName,
          boardId,
        }),
      });
      if (res.ok) {
        setNewColName("");
        loadBoardWorkspace();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setColLoading(false);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm("Delete this column?")) return;
    try {
      const res = await fetch(`/api/boards/columns?columnId=${columnId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        loadBoardWorkspace();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter Tasks for Kanban
  const getFilteredTasks = () => {
    let activeSprint = sprints.find((s) => s.status === "ACTIVE");
    
    return tasks.filter((t) => {
      // 1. Standard filter by Active Sprint (only active sprint tasks shown on board)
      if (t.sprintId !== (activeSprint?.id || null)) return false;
      
      // 2. Filter by Epic
      if (filterEpic && t.epicId !== filterEpic) return false;

      // 3. Filter by Assignee
      if (filterAssignee && t.assigneeId !== filterAssignee) return false;

      // 4. Filter by Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(query) ||
          t.code.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading workspace boards...</p>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();
  const activeSprint = sprints.find((s) => s.status === "ACTIVE");

  return (
    <div className="board-workspace">
      
      {/* Board Header & Controls */}
      <div className="board-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{board?.name}</h1>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Project: {selectedOrg?.projects.find((p: any) => p.id === projectId)?.name} ({selectedOrg?.projects.find((p: any) => p.id === projectId)?.key})
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => setShowCreateTask(true)} className="btn btn-primary" style={{ padding: "8px 16px" }}>
            ➕ Create Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="board-tabs">
        <button className={`board-tab-btn ${activeTab === "kanban" ? "active" : ""}`} onClick={() => setActiveTab("kanban")}>
          📋 Kanban Board {activeSprint && <span className="badge badge-success" style={{ fontSize: 9, marginLeft: 6 }}>Active Sprint</span>}
        </button>
        <button className={`board-tab-btn ${activeTab === "backlog" ? "active" : ""}`} onClick={() => setActiveTab("backlog")}>
          🗂️ Backlog & Sprints
        </button>
        <button className={`board-tab-btn ${activeTab === "epics" ? "active" : ""}`} onClick={() => setActiveTab("epics")}>
          🏷️ Epics Manager
        </button>
        <button className={`board-tab-btn ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
          ⚙️ Columns Config
        </button>
      </div>

      {/* 1. KANBAN TAB */}
      {activeTab === "kanban" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, overflow: "hidden" }}>
          {/* Filters Bar */}
          <div className="board-filters">
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>Filters:</span>
            <select value={filterEpic} onChange={(e) => setFilterEpic(e.target.value)} className="filter-select">
              <option value="">All Epics</option>
              {epics.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="filter-select">
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search by code/title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 200, padding: "4px 10px" }}
            />
            {(filterEpic || filterAssignee || searchQuery) && (
              <button
                onClick={() => {
                  setFilterEpic("");
                  setFilterAssignee("");
                  setSearchQuery("");
                }}
                className="btn-link"
                style={{ fontSize: 12, color: "var(--danger)", background: "none" }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {!activeSprint ? (
            <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
              <h3 style={{ marginBottom: 12 }}>No Active Sprint</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
                Active tasks are tracked inside sprints. Head over to the **Backlog & Sprints** tab to start one!
              </p>
              <button onClick={() => setActiveTab("backlog")} className="btn btn-outline" style={{ display: "inline-block" }}>
                Go to Sprint Planner
              </button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="kanban-container">
                {columns.map((col) => {
                  const colTasks = filteredTasks.filter((t) => t.columnId === col.id);
                  return (
                    <div key={col.id} className="kanban-column">
                      <div className="kanban-column-header">
                        <span className="column-title">{col.name}</span>
                        <span className="column-count">{colTasks.length}</span>
                      </div>
                      
                      <Droppable droppableId={col.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="kanban-task-list"
                          >
                            {colTasks.map((t, idx) => (
                              <Draggable key={t.id} draggableId={t.id} index={idx}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="task-card"
                                    onClick={() => setSelectedTaskId(t.id)}
                                  >
                                    <span style={{ fontSize: 10, color: t.epic?.colorCode, fontWeight: 800 }}>
                                      {t.epic?.name}
                                    </span>
                                    <div className="task-card-title">{t.title}</div>
                                    <div className="task-card-footer">
                                      <div className="task-card-left">
                                        <span className={`task-type-icon ${t.taskType === "BUG" ? "type-bug" : t.taskType === "STORY" ? "type-story" : "type-task"}`}>
                                          {t.taskType[0]}
                                        </span>
                                        <span className="task-code">{t.code}</span>
                                      </div>
                                      <div className="task-card-right">
                                        {t.storyPoints && (
                                          <span className="story-points-badge">{t.storyPoints}</span>
                                        )}
                                        {t.assignee ? (
                                          <div className="task-assignee-avatar" title={t.assignee.name}>
                                            {t.assignee.name[0].toUpperCase()}
                                          </div>
                                        ) : (
                                          <div className="task-assignee-avatar" style={{ backgroundColor: "var(--text-tertiary)" }} title="Unassigned">
                                            -
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          )}
        </div>
      )}

      {/* 2. BACKLOG TAB */}
      {activeTab === "backlog" && (
        <div className="backlog-view-container">
          <div className="flex justify-between align-center">
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Sprint Backlog Planner</h2>
            <button onClick={handleCreateSprint} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }}>
              ➕ Create Sprint
            </button>
          </div>

          {/* Sprints lists */}
          {sprints.map((sprint) => {
            const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
            const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
            
            return (
              <div key={sprint.id} className="sprint-block">
                <div className="sprint-header">
                  <div className="sprint-title-info">
                    <span style={{ fontSize: 15, fontWeight: 800 }}>🏃 {sprint.name}</span>
                    <span className={`badge ${sprint.status === "ACTIVE" ? "badge-success" : sprint.status === "COMPLETED" ? "badge-primary" : "badge-warning"}`} style={{ fontSize: 9 }}>
                      {sprint.status}
                    </span>
                    <span className="sprint-meta">
                      {sprintTasks.length} tasks | <strong>{totalPoints} SP</strong>
                    </span>
                  </div>
                  
                  <div className="sprint-action-buttons">
                    {sprint.status === "PLANNING" && (
                      <button
                        onClick={() => setShowStartSprint(sprint.id)}
                        className="btn btn-primary"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                      >
                        Start Sprint
                      </button>
                    )}
                    {sprint.status === "ACTIVE" && (
                      <button
                        onClick={() => handleCompleteSprint(sprint.id)}
                        className="btn btn-outline"
                        style={{ padding: "4px 10px", fontSize: 11, borderColor: "var(--success)", color: "var(--success)" }}
                      >
                        Complete Sprint
                      </button>
                    )}
                  </div>
                </div>

                <div className="backlog-task-list">
                  {sprintTasks.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "10px 0" }}>
                      Plan sprint by adding tasks to this sprint.
                    </p>
                  ) : (
                    sprintTasks.map((t) => (
                      <div key={t.id} className="backlog-task-row" onClick={() => setSelectedTaskId(t.id)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className={`task-type-icon ${t.taskType === "BUG" ? "type-bug" : t.taskType === "STORY" ? "type-story" : "type-task"}`} style={{ width: 14, height: 14, fontSize: 9 }}>
                            {t.taskType[0]}
                          </span>
                          <strong style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{t.code}</strong>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {t.epic && (
                            <span className="badge" style={{ backgroundColor: t.epic.colorCode + "20", color: t.epic.colorCode, fontSize: 9 }}>
                              {t.epic.name}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                            Priority: {t.priority}
                          </span>
                          {t.storyPoints && (
                            <span className="story-points-badge">{t.storyPoints}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* General Backlog (sprintId is null) */}
          <div className="sprint-block" style={{ borderStyle: "dashed" }}>
            <div className="sprint-header" style={{ backgroundColor: "rgba(0,0,0,0.01)" }}>
              <div className="sprint-title-info">
                <span style={{ fontSize: 15, fontWeight: 800 }}>🗃️ Backlog</span>
                <span className="sprint-meta">
                  {tasks.filter((t) => !t.sprintId).length} tasks not in sprint
                </span>
              </div>
            </div>
            
            <div className="backlog-task-list" style={{ backgroundColor: "transparent" }}>
              {tasks.filter((t) => !t.sprintId).length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "10px 0" }}>
                  No tasks in backlog. Create a task to add items.
                </p>
              ) : (
                tasks.filter((t) => !t.sprintId).map((t) => (
                  <div key={t.id} className="backlog-task-row" onClick={() => setSelectedTaskId(t.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className={`task-type-icon ${t.taskType === "BUG" ? "type-bug" : t.taskType === "STORY" ? "type-story" : "type-task"}`} style={{ width: 14, height: 14, fontSize: 9 }}>
                        {t.taskType[0]}
                      </span>
                      <strong style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{t.code}</strong>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {t.epic && (
                        <span className="badge" style={{ backgroundColor: t.epic.colorCode + "20", color: t.epic.colorCode, fontSize: 9 }}>
                          {t.epic.name}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        Priority: {t.priority}
                      </span>
                      {t.storyPoints && (
                        <span className="story-points-badge">{t.storyPoints}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. EPICS TAB */}
      {activeTab === "epics" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32, alignItems: "start" }}>
          {/* Epics List */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Board Epics</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {epics.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No epics created yet for this board.</p>
              ) : (
                epics.map((epic) => (
                  <div
                    key={epic.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--border-radius)",
                      backgroundColor: "var(--bg-primary)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: epic.colorCode }}></span>
                      <div>
                        <strong style={{ fontSize: 14 }}>{epic.name}</strong>
                        {epic.description && (
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{epic.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEpic(epic.id)}
                      style={{ background: "none", color: "var(--danger)", fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Epic Creation Form */}
          <div className="card">
            <h3 className="card-title">Create Epic</h3>
            <form onSubmit={handleCreateEpic} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Epic Name</label>
                <input type="text" value={epicName} onChange={(e) => setEpicName(e.target.value)} required placeholder="E.g. Authentication flow" />
              </div>
              <div className="form-group">
                <label className="form-label">Color Code Tag</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="color" value={epicColor} onChange={(e) => setEpicColor(e.target.value)} style={{ width: 44, height: 38, padding: 2, cursor: "pointer" }} />
                  <input type="text" value={epicColor} onChange={(e) => setEpicColor(e.target.value)} required style={{ flex: 1 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={epicDesc} onChange={(e) => setEpicDesc(e.target.value)} placeholder="What this Epic tracks..." rows={3}></textarea>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={epicLoading}>
                {epicLoading ? "Creating Epic..." : "Save Epic"}
              </button>
            </form>
          </div>
        </div>
      )}
{/* 4. COLUMNS SETTINGS TAB */}
      {activeTab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32, alignItems: "start" }}>
          {/* Columns Table */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Manage Board Columns</h3>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Sort Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, idx) => (
                    <tr key={col.id}>
                      <td>
                        {/* Inline edit field */}
                        {col._editing ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="text"
                              defaultValue={col.name}
                              onChange={(e) => (col._newName = e.target.value)}
                              style={{ width: "120px" }}
                            />
                            <button
                              onClick={async () => {
                                const newName = col._newName?.trim() || col.name;
                                if (newName !== col.name) {
                                  const res = await fetch("/api/boards/columns", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ columnId: col.id, name: newName }),
                                  });
                                  if (res.ok) {
                                    loadBoardWorkspace();
                                  } else {
                                    const data = await res.json();
                                    alert(data.error || "Failed to rename column");
                                  }
                                }
                                col._editing = false;
                                // Force re-render
                                setColumns([...columns]);
                              }}
                              className="btn btn-primary"
                              style={{ fontSize: 12, padding: "2px 6px" }}
                            >Save</button>
                            <button
                              onClick={() => {
                                col._editing = false;
                                setColumns([...columns]);
                              }}
                              className="btn btn-outline"
                              style={{ fontSize: 12, padding: "2px 6px" }}
                            >Cancel</button>
                          </div>
                        ) : (
                          <strong>{col.name}</strong>
                        )}
                      </td>
                      <td>Order {col.order}</td>
                      <td style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {/* Edit toggle */}
                        <button
                          onClick={() => {
                            col._editing = true;
                            setColumns([...columns]);
                          }}
                          style={{ background: "none", color: "var(--text-secondary)", fontSize: 12 }}
                        >✎</button>
                        {/* Move Up */}
                        <button
                          onClick={async () => {
                            if (idx === 0) return;
                            const newColumns = [...columns];
                            const above = newColumns[idx - 1];
                            // swap orders
                            const temp = col.order;
                            col.order = above.order;
                            above.order = temp;
                            // send batch reorder
                            await fetch("/api/boards/columns", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ columns: newColumns.map(c => ({ id: c.id, order: c.order })) }),
                            });
                            loadBoardWorkspace();
                          }}
                          style={{ background: "none", color: "var(--text-secondary)", fontSize: 12 }}
                        >↑</button>
                        {/* Move Down */}
                        <button
                          onClick={async () => {
                            if (idx === columns.length - 1) return;
                            const newColumns = [...columns];
                            const below = newColumns[idx + 1];
                            const temp = col.order;
                            col.order = below.order;
                            below.order = temp;
                            await fetch("/api/boards/columns", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ columns: newColumns.map(c => ({ id: c.id, order: c.order })) }),
                            });
                            loadBoardWorkspace();
                          }}
                          style={{ background: "none", color: "var(--text-secondary)", fontSize: 12 }}
                        >↓</button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteColumn(col.id)}
                          style={{ background: "none", color: "var(--danger)", fontSize: 12 }}
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Column Box */}
          <div className="card">
            <h3 className="card-title">Add Column</h3>
            <form onSubmit={handleAddColumn} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Column Name</label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  required
                  placeholder="E.g. Blocked"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={colLoading}>
                {colLoading ? "Adding..." : "Add Column"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TASK DRAWER WINDOW */}
      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={fetchTasks}
          boardColumns={columns}
          boardSprints={sprints}
          boardEpics={epics}
          orgMembers={members}
          orgTimezone={selectedOrg?.timezone || "UTC"}
          projectId={projectId}
        />
      )}

      {/* MODAL: START SPRINT */}
      {showStartSprint && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Start Sprint</h3>
              <button className="modal-close" onClick={() => setShowStartSprint(null)}>×</button>
            </div>
            <form onSubmit={handleStartSprintSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="datetime-local"
                    value={sprintStartDate}
                    onChange={(e) => setSprintStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="datetime-local"
                    value={sprintEndDate}
                    onChange={(e) => setSprintEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowStartSprint(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={startSprintLoading}>
                  {startSprintLoading ? "Starting..." : "Start Sprint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TASK */}
      {showCreateTask && (
        <div className="modal-overlay">
          <div className="modal-card create-task-modal">
            <div className="modal-header">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>✏️ Create Task</h3>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Fill in the details below. You can embed images, videos & attachments in the description.</span>
              </div>
              <button className="modal-close" onClick={() => setShowCreateTask(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body create-task-body">

                {/* Left Column: Title + Description (rich) + Attachments */}
                <div className="create-task-left">
                  <div className="form-group">
                    <label className="form-label">Task Title <span style={{ color: "var(--danger)" }}>*</span></label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                      placeholder="Short, actionable summary of the task..."
                      style={{ fontSize: 16, fontWeight: 600, padding: "10px 14px" }}
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <label className="form-label">Description</label>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, display: "block" }}>
                      Use the toolbar to format text, embed images 🖼️, videos 🎥 or attach files 📎
                    </span>
                    <div style={{ flex: 1 }}>
                      <TipTapEditor
                        key={createTaskEditorKey}
                        content={taskDesc}
                        onChange={(html) => setTaskDesc(html)}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Metadata fields */}
                <div className="create-task-right">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                      <option value="TASK">📝 Task</option>
                      <option value="BUG">🐛 Bug</option>
                      <option value="STORY">📖 Story</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                      <option value="Critical">🔴 Critical</option>
                      <option value="High">🟠 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🟢 Low</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status Column <span style={{ color: "var(--danger)" }}>*</span></label>
                    <select value={taskColumnId} onChange={(e) => setTaskColumnId(e.target.value)} required>
                      {columns.map((col) => (
                        <option key={col.id} value={col.id}>{col.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assignee</label>
                    <select value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)}>
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sprint</label>
                    <select value={taskSprintId} onChange={(e) => setTaskSprintId(e.target.value)}>
                      <option value="">📦 Backlog (No Sprint)</option>
                      {sprints.filter((s) => s.status !== "COMPLETED").map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Epic</label>
                    <select value={taskEpicId} onChange={(e) => setTaskEpicId(e.target.value)}>
                      <option value="">None</option>
                      {epics.map((epic) => (
                        <option key={epic.id} value={epic.id}>{epic.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Story Points</label>
                    <input type="number" value={taskPoints} onChange={(e) => setTaskPoints(e.target.value)} min="0" placeholder="E.g. 5" />
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateTask(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createTaskLoading} style={{ minWidth: 140 }}>
                  {createTaskLoading ? "⏳ Creating..." : "✅ Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
