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
  const [taskWatcherIds, setTaskWatcherIds] = useState<string[]>([]);
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [createTaskEditorKey, setCreateTaskEditorKey] = useState(0); // force remount on reset
  const [taskCustomFieldValues, setTaskCustomFieldValues] = useState<Record<string, string>>({}); // { [customFieldId]: value }

  // Custom Fields
  const [projectCustomFields, setProjectCustomFields] = useState<any[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("TEXT");
  const [newFieldOptions, setNewFieldOptions] = useState(""); // comma-separated for DROPDOWN
  const [fieldLoading, setFieldLoading] = useState(false);

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

  const [boardTitle, setBoardTitle] = useState("");
  const [isRenamingBoard, setIsRenamingBoard] = useState(false);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState("");


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
        setBoardTitle(activeBoard?.name || "");
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
        // Filter members to only those assigned to this board, or Admins who have access to all
        const boardMembers = membersData.members.filter((m: any) => 
          m.role === "ADMIN" || 
          m.user.boardMembers?.some((bm: any) => bm.boardId === boardId)
        );
        setMembers(boardMembers);
      }

      // 6. Load Custom Fields
      const cfRes = await fetch(`/api/projects/custom-fields?projectId=${projectId}`);
      if (cfRes.ok) {
        const cfData = await cfRes.json();
        setProjectCustomFields(cfData.customFields || []);
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

  const handleRenameBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardTitle.trim()) return;
    setIsRenamingBoard(true);
    try {
      const res = await fetch("/api/boards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, name: boardTitle.trim() }),
      });
      if (res.ok) {
        alert("Board renamed successfully");
        loadBoardWorkspace();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to rename board");
      }
    } catch (err: any) {
      alert(err.message || "Failed to rename board");
    } finally {
      setIsRenamingBoard(false);
    }
  };

  const handleDeleteBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmDeleteTitle !== board?.name) {
      alert("Entered name does not match board name.");
      return;
    }
    setIsDeletingBoard(true);
    try {
      const res = await fetch(`/api/boards?boardId=${boardId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Board deleted successfully");
        router.push("/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete board");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete board");
    } finally {
      setIsDeletingBoard(false);
      setShowDeleteConfirm(false);
      setConfirmDeleteTitle("");
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

  const handleBacklogDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newSprintId = destination.droppableId === "backlog" ? null : destination.droppableId;

    // Optimistically update tasks list with correct ordering
    const draggedTask = tasks.find((t) => t.id === draggableId);
    if (draggedTask) {
      const otherTasks = tasks.filter((t) => t.id !== draggableId);
      const destTasks = otherTasks.filter((t) =>
        newSprintId === null ? !t.sprintId : t.sprintId === newSprintId
      );
      const remainingTasks = otherTasks.filter((t) =>
        newSprintId === null ? !!t.sprintId : t.sprintId !== newSprintId
      );

      const updatedDraggedTask = { ...draggedTask, sprintId: newSprintId };
      const insertIndex = Math.max(0, Math.min(destination.index, destTasks.length));
      destTasks.splice(insertIndex, 0, updatedDraggedTask);

      setTasks([...remainingTasks, ...destTasks]);
    }

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: draggableId,
          sprintId: newSprintId,
          destinationIndex: destination.index,
        }),
      });
      fetchTasks();
    } catch (e) {
      console.error("Failed to persist task sprint/order", e);
      fetchTasks();
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
          watcherIds: taskWatcherIds,
          customFieldValues: taskCustomFieldValues,
        }),
      });

      if (res.ok) {
        setTaskTitle("");
        setTaskDesc("");
        setTaskPoints("");
        setTaskAssigneeId("");
        setTaskWatcherIds([]);
        setTaskCustomFieldValues({});
        setCreateTaskEditorKey(prev => prev + 1); // Reset TipTap editor
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

  // Base Filter applied to both Kanban and Backlog/Sprints
  const getBaseFilteredTasks = () => {
    return tasks.filter((t) => {
      if (filterEpic && t.epicId !== filterEpic) return false;
      if (filterAssignee === "unassigned") {
        if (t.assigneeId !== null) return false;
      } else if (filterAssignee && t.assigneeId !== filterAssignee) {
        return false;
      }
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

  const baseFilteredTasks = getBaseFilteredTasks();
  const activeSprint = sprints.find((s) => s.status === "ACTIVE");
  const filteredTasks = baseFilteredTasks.filter((t) => t.sprintId === (activeSprint?.id || null));

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
          📋 Board {activeSprint && <span className="badge badge-success" style={{ fontSize: 9, marginLeft: 6 }}>Active Sprint</span>}
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

      {/* Filters Bar for Kanban and Backlog */}
      {(activeTab === "kanban" || activeTab === "backlog") && (
        <div className="board-filters" style={{ marginBottom: activeTab === "backlog" ? 16 : 0 }}>
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
      )}

      {/* 1. KANBAN TAB */}
      {activeTab === "kanban" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, overflow: "hidden" }}>

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
        <DragDropContext onDragEnd={handleBacklogDragEnd}>
          <div className="backlog-view-container">
            <div className="flex justify-between align-center">
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Sprint Backlog Planner</h2>
              <button onClick={handleCreateSprint} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }}>
                ➕ Create Sprint
              </button>
            </div>

            {/* Sprints lists */}
            {sprints.map((sprint) => {
              const sprintTasks = baseFilteredTasks.filter((t) => t.sprintId === sprint.id);
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

                  <Droppable droppableId={sprint.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="backlog-task-list"
                        style={{
                          backgroundColor: snapshot.isDraggingOver ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                        }}
                      >
                        {sprintTasks.length === 0 && !snapshot.isDraggingOver && (
                          <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "10px 0" }}>
                            Plan sprint by adding tasks to this sprint.
                          </p>
                        )}
                        {sprintTasks.map((t, idx) => (
                          <Draggable key={t.id} draggableId={t.id} index={idx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="backlog-task-row"
                                onClick={() => setSelectedTaskId(t.id)}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <span className={`task-type-icon ${t.taskType === "BUG" ? "type-bug" : t.taskType === "STORY" ? "type-story" : "type-task"}`} style={{ width: 14, height: 14, fontSize: 9 }}>
                                    {t.taskType[0]}
                                  </span>
                                  <strong style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{t.code}</strong>
                                  <span style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</span>
                                  {t.columnId && (
                                    <span className="badge" style={{ fontSize: 9, backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                                      {columns.find((c) => c.id === t.columnId)?.name}
                                    </span>
                                  )}
                                  {t.assignee && (
                                    <span className="badge" style={{ fontSize: 9, backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                                      {t.assignee.avatarUrl ? (
                                        <img src={t.assignee.avatarUrl} alt="" style={{ width: 12, height: 12, borderRadius: "50%" }} />
                                      ) : (
                                        <span style={{ fontSize: 10 }}>👤</span>
                                      )}
                                      {t.assignee.name}
                                    </span>
                                  )}
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
              
              <Droppable droppableId="backlog">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="backlog-task-list"
                    style={{
                      backgroundColor: snapshot.isDraggingOver ? "var(--bg-tertiary)" : "transparent",
                    }}
                  >
                    {tasks.filter((t) => !t.sprintId).length === 0 && !snapshot.isDraggingOver && (
                      <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "10px 0" }}>
                        No tasks in backlog. Create a task to add items.
                      </p>
                    )}
                    {baseFilteredTasks.filter((t) => !t.sprintId).map((t, idx) => (
                      <Draggable key={t.id} draggableId={t.id} index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="backlog-task-row"
                            onClick={() => setSelectedTaskId(t.id)}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span className={`task-type-icon ${t.taskType === "BUG" ? "type-bug" : t.taskType === "STORY" ? "type-story" : "type-task"}`} style={{ width: 14, height: 14, fontSize: 9 }}>
                                {t.taskType[0]}
                              </span>
                              <strong style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{t.code}</strong>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</span>
                              {t.columnId && (
                                <span className="badge" style={{ fontSize: 9, backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                                  {columns.find((c) => c.id === t.columnId)?.name}
                                </span>
                              )}
                              {t.assignee && (
                                <span className="badge" style={{ fontSize: 9, backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                                  {t.assignee.avatarUrl ? (
                                    <img src={t.assignee.avatarUrl} alt="" style={{ width: 12, height: 12, borderRadius: "50%" }} />
                                  ) : (
                                    <span style={{ fontSize: 10 }}>👤</span>
                                  )}
                                  {t.assignee.name}
                                </span>
                              )}
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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
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
                      {epic._editing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <input
                            type="text"
                            defaultValue={epic.name}
                            onChange={(e) => (epic._newName = e.target.value)}
                            style={{ width: "150px" }}
                          />
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="color"
                              defaultValue={epic.colorCode}
                              onChange={(e) => (epic._newColor = e.target.value)}
                            />
                            <input
                              type="text"
                              defaultValue={epic.colorCode}
                              onChange={(e) => (epic._newColor = e.target.value)}
                              style={{ width: "70px" }}
                            />
                          </div>
                          <textarea
                            defaultValue={epic.description || ""}
                            onChange={(e) => (epic._newDesc = e.target.value)}
                            rows={2}
                            style={{ width: "200px" }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={async () => {
                                const updated = await fetch("/api/boards/epics", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    epicId: epic.id,
                                    name: epic._newName?.trim() || epic.name,
                                    colorCode: epic._newColor || epic.colorCode,
                                    description: epic._newDesc ?? epic.description,
                                  }),
                                });
                                if (updated.ok) {
                                  loadBoardWorkspace();
                                } else {
                                  const data = await updated.json();
                                  alert(data.error || "Failed to update epic");
                                }
                                epic._editing = false;
                                setEpics([...epics]);
                              }}
                              className="btn btn-primary"
                              style={{ fontSize: 12, padding: "2px 6px" }}
                            >Save</button>
                            <button
                              onClick={() => { epic._editing = false; setEpics([...epics]); }}
                              className="btn btn-outline"
                              style={{ fontSize: 12, padding: "2px 6px" }}
                            >Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: epic.colorCode }}></span>
                          <div>
                            <strong style={{ fontSize: 14 }}>{epic.name}</strong>
                            {epic.description && (
                              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{epic.description}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        onClick={() => { epic._editing = true; setEpics([...epics]); }}
                        style={{ background: "none", color: "var(--text-secondary)", fontSize: 12 }}
                      >✎</button>
                      <button
                        onClick={() => handleDeleteEpic(epic.id)}
                        style={{ background: "none", color: "var(--danger)", fontSize: 12 }}
                      >Delete</button>
                    </div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
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

          {selectedOrg?.role === "ADMIN" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32, alignItems: "start" }}>
              {/* Board Settings card */}
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>Board Settings</h3>
                <form onSubmit={handleRenameBoard} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Board Title</label>
                    <input
                      type="text"
                      value={boardTitle}
                      onChange={(e) => setBoardTitle(e.target.value)}
                      required
                      placeholder="Enter new board title"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }} disabled={isRenamingBoard}>
                    {isRenamingBoard ? "Renaming..." : "Rename Board"}
                  </button>
                </form>
              </div>

              {/* Danger Zone card */}
              <div className="card" style={{ borderColor: "var(--danger)" }}>
                <h3 className="card-title" style={{ color: "var(--danger)", marginBottom: 8 }}>Danger Zone</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                  Deleting this board will permanently delete all columns, tasks, epics, and active sprints. This action is irreversible.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-danger"
                  style={{ width: "fit-content" }}
                >
                  Delete Board
                </button>
              </div>
            </div>
          )}

          {/* Project Custom Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32, alignItems: "start" }}>
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Project Custom Fields</h3>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
                These fields apply to all tasks across <strong>every board</strong> in this project.
              </p>
              {projectCustomFields.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>No custom fields defined yet.</p>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Field Name</th><th>Type</th><th>Options</th><th></th></tr>
                    </thead>
                    <tbody>
                      {projectCustomFields.map((f: any) => (
                        <tr key={f.id}>
                          <td><strong>{f.name}</strong></td>
                          <td><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "var(--background-secondary)", border: "1px solid var(--border-color)" }}>{f.type}</span></td>
                          <td style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                            {f.type === "DROPDOWN" && f.options ? JSON.parse(f.options).join(", ") : "—"}
                          </td>
                          <td>
                            {selectedOrg?.role === "ADMIN" && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Delete field "${f.name}"? All task values will be lost.`)) return;
                                  const res = await fetch(`/api/projects/custom-fields?customFieldId=${f.id}`, { method: "DELETE" });
                                  if (res.ok) {
                                    setProjectCustomFields(prev => prev.filter(cf => cf.id !== f.id));
                                  }
                                }}
                                style={{ background: "none", color: "var(--danger)", fontSize: 12 }}
                              >Delete</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedOrg?.role === "ADMIN" && (
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>Add Custom Field</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setFieldLoading(true);
                    try {
                      const options = newFieldType === "DROPDOWN"
                        ? newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean)
                        : undefined;
                      const res = await fetch("/api/projects/custom-fields", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ projectId, name: newFieldName, type: newFieldType, options }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setProjectCustomFields(prev => [...prev, data.customField]);
                        setNewFieldName("");
                        setNewFieldType("TEXT");
                        setNewFieldOptions("");
                      }
                    } finally {
                      setFieldLoading(false);
                    }
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}
                >
                  <div className="form-group">
                    <label className="form-label">Field Name</label>
                    <input type="text" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} required placeholder="E.g. Customer Name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Field Type</label>
                    <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
                      <option value="TEXT">📝 Text</option>
                      <option value="NUMBER">🔢 Number</option>
                      <option value="DROPDOWN">📋 Dropdown</option>
                      <option value="DATE">📅 Date</option>
                      <option value="CHECKBOX">✅ Checkbox</option>
                    </select>
                  </div>
                  {newFieldType === "DROPDOWN" && (
                    <div className="form-group">
                      <label className="form-label">Options (comma-separated)</label>
                      <input type="text" value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="Option A, Option B, Option C" />
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={fieldLoading}>
                    {fieldLoading ? "Adding..." : "Add Field"}
                  </button>
                </form>
              </div>
            )}
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
          projectCustomFields={projectCustomFields}
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

      {/* MODAL: DELETE BOARD CONFIRMATION */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ color: "var(--danger)" }}>Delete Board</h3>
              <button className="modal-close" onClick={() => { setShowDeleteConfirm(false); setConfirmDeleteTitle(""); }}>×</button>
            </div>
            <form onSubmit={handleDeleteBoard}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 14, color: "var(--text-primary)" }}>
                  This will permanently delete the board <strong>{board?.name}</strong> and all of its sprints, epics, columns, and tasks.
                </p>
                <div className="form-group">
                  <label className="form-label">
                    To confirm, type <strong>{board?.name}</strong> below:
                  </label>
                  <input
                    type="text"
                    value={confirmDeleteTitle}
                    onChange={(e) => setConfirmDeleteTitle(e.target.value)}
                    required
                    placeholder="Enter board name"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowDeleteConfirm(false); setConfirmDeleteTitle(""); }}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={isDeletingBoard || confirmDeleteTitle !== board?.name}
                >
                  {isDeletingBoard ? "Deleting..." : "Permanently Delete"}
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
                    <label className="form-label">Watchers</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {taskWatcherIds.map(watcherId => {
                        const m = members.find(m => m.user.id === watcherId);
                        if (!m) return null;
                        return (
                          <div key={watcherId} style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "var(--background-secondary)", border: "1px solid var(--border-color)", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>
                            <span>{m.user.name}</span>
                            <button type="button" onClick={() => setTaskWatcherIds(prev => prev.filter(id => id !== watcherId))} style={{ background: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 12, marginLeft: 2 }}>✕</button>
                          </div>
                        );
                      })}
                    </div>
                    <select 
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !taskWatcherIds.includes(e.target.value)) {
                          setTaskWatcherIds(prev => [...prev, e.target.value]);
                        }
                      }}
                    >
                      <option value="" disabled>+ Add Watcher</option>
                      {members.filter(m => !taskWatcherIds.includes(m.user.id)).map((m) => (
                        <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Story Points</label>
                    <input type="number" value={taskPoints} onChange={(e) => setTaskPoints(e.target.value)} min="0" placeholder="E.g. 5" />
                  </div>

                  {/* Dynamic Custom Fields */}
                  {projectCustomFields.length > 0 && (
                    <>
                      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Custom Fields</span>
                      </div>
                      {projectCustomFields.map((field: any) => (
                        <div className="form-group" key={field.id}>
                          <label className="form-label">{field.name}</label>
                          {field.type === "TEXT" && (
                            <input type="text" value={taskCustomFieldValues[field.id] || ""} onChange={(e) => setTaskCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder={`Enter ${field.name}`} />
                          )}
                          {field.type === "NUMBER" && (
                            <input type="number" value={taskCustomFieldValues[field.id] || ""} onChange={(e) => setTaskCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder="0" />
                          )}
                          {field.type === "DATE" && (
                            <input type="date" value={taskCustomFieldValues[field.id] || ""} onChange={(e) => setTaskCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))} />
                          )}
                          {field.type === "CHECKBOX" && (
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                              <input type="checkbox" checked={taskCustomFieldValues[field.id] === "true"} onChange={(e) => setTaskCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.checked ? "true" : "false" }))} />
                              <span style={{ fontSize: 13 }}>{field.name}</span>
                            </label>
                          )}
                          {field.type === "DROPDOWN" && field.options && (
                            <select value={taskCustomFieldValues[field.id] || ""} onChange={(e) => setTaskCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}>
                              <option value="">— Select —</option>
                              {JSON.parse(field.options).map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </>
                  )}
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
