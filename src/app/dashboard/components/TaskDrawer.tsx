"use client";

import React, { useState, useEffect } from "react";
import { formatInTimezone } from "@/lib/timezone";
import TipTapEditor from "./TipTapEditor";

interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onUpdate: () => void;
  boardColumns: any[];
  boardSprints: any[];
  boardEpics: any[];
  orgMembers: any[];
  orgTimezone: string;
  projectId: string;
}

export default function TaskDrawer({
  taskId,
  onClose,
  onUpdate,
  boardColumns,
  boardSprints,
  boardEpics,
  orgMembers,
  orgTimezone,
  projectId,
}: TaskDrawerProps) {
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("TASK");
  const [priority, setPriority] = useState("Medium");
  const [storyPoints, setStoryPoints] = useState("");
  const [columnId, setColumnId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [epicId, setEpicId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  // Attachments state
  const [uploadingFile, setUploadingFile] = useState(false);

  // Link state
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [linkTargetTaskId, setLinkTargetTaskId] = useState("");
  const [linkType, setLinkType] = useState("relates_to");
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  // Comments state
  const [commentContent, setCommentContent] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
      fetchProjectTasks();
    } else {
      setTask(null);
    }
  }, [taskId]);

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    setLoading(true);
    setError("");
    try {
      // Find task info using GET /api/tasks with board ID. Or we can create a single task detail API.
      // Wait, we can modify GET `/api/tasks` or just search. Wait, since our GET /api/tasks returns comments and attachments, we can just grab this specific task from the list or write a small detail fetcher.
      // Let's call /api/tasks?boardId=... and find the task, or call a dedicated GET /api/tasks/detail?taskId=...
      // Let's check how our api/tasks/route.ts handles it. Ah, it does:
      // const boardId = url.searchParams.get("boardId");
      // Wait! In api/tasks/route.ts, we require `boardId`. But we can also query specific taskId if we add support, or we can fetch tasks and filter, but wait! We can easily modify GET `/api/tasks` to also support fetching a single task by taskId if `taskId` query param is present! That's incredibly clean.
      // Let's check if we can fetch via: `/api/tasks/detail?taskId=${taskId}` which we can create, or just call `/api/tasks?boardId=...` which we have.
      // Wait, let's create a very simple detail fetcher API or support it in `/api/tasks/detail` to make it super fast!
      // Let's create `/api/tasks/detail/route.ts` next to keep details fast. But wait, can we fetch using `/api/tasks`?
      // Yes, let's write a `/api/tasks/detail` endpoint to load task details cleanly!
      const res = await fetch(`/api/tasks/detail?taskId=${taskId}`);
      const data = await res.json();
      if (res.ok) {
        setTask(data.task);
        setTitle(data.task.title);
        setDescription(data.task.description || "");
        setTaskType(data.task.taskType);
        setPriority(data.task.priority);
        setStoryPoints(data.task.storyPoints?.toString() || "");
        setColumnId(data.task.columnId);
        setSprintId(data.task.sprintId || "");
        setEpicId(data.task.epicId || "");
        setAssigneeId(data.task.assigneeId || "");
      } else {
        setError(data.error || "Failed to load task details.");
      }
    } catch {
      setError("Network error loading task details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async () => {
    try {
      // Fetch all tasks for this project to offer as linking targets
      const res = await fetch(`/api/tasks/project-list?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out the current task
        setProjectTasks(data.tasks.filter((t: any) => t.id !== taskId));
        if (data.tasks.length > 0) {
          setLinkTargetTaskId(data.tasks.filter((t: any) => t.id !== taskId)[0]?.id || "");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit generic inline updates
  const handleUpdateField = async (fieldName: string, value: any) => {
    if (!taskId) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          [fieldName]: value === "" ? null : value,
        }),
      });
      if (res.ok) {
        onUpdate();
        // Reload details locally to keep UI correct
        fetchTaskDetails();
      }
    } catch (e) {
      console.error("Failed to update task field:", e);
    }
  };

  // Upload attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", taskId);

    try {
      const res = await fetch("/api/tasks/attachments", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchTaskDetails();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingFile(false);
    }
  };

  // Create comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !taskId) return;

    setCommentLoading(true);
    try {
      const res = await fetch("/api/tasks/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentContent,
          taskId,
        }),
      });

      if (res.ok) {
        setCommentContent("");
        fetchTaskDetails();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCommentLoading(false);
    }
  };

  // Create task link
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTargetTaskId || !taskId) return;

    setLinkingLoading(true);
    try {
      const res = await fetch("/api/tasks/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTaskId: taskId,
          targetTaskId: linkTargetTaskId,
          type: linkType,
        }),
      });

      if (res.ok) {
        fetchTaskDetails();
        fetchProjectTasks();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to link tasks");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLinkingLoading(false);
    }
  };

  // Delete task link
  const handleRemoveLink = async (linkId: string) => {
    if (!confirm("Remove this link?")) return;
    try {
      const res = await fetch(`/api/tasks/links?linkId=${linkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTaskDetails();
        fetchProjectTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTitleBlur = () => {
    if (task && title.trim() && title !== task.title) {
      handleUpdateField("title", title);
    }
  };

  if (!taskId) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="task-code" style={{ fontSize: 14 }}>{task?.code || "Loading..."}</span>
            <select
              value={taskType}
              onChange={(e) => {
                setTaskType(e.target.value);
                handleUpdateField("taskType", e.target.value);
              }}
              className="filter-select"
              style={{ fontWeight: "bold" }}
            >
              <option value="TASK">📝 Task</option>
              <option value="BUG">🐛 Bug</option>
              <option value="STORY">📖 Story</option>
            </select>
          </div>
          <button className="btn btn-outline" onClick={onClose}>×</button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {loading ? (
            <p style={{ color: "var(--text-secondary)" }}>Loading task details...</p>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <div className="detail-grid">
              
              {/* Left Column (Main Details) */}
              <div className="detail-main">
                
                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      border: "1px solid transparent",
                      padding: "4px 8px",
                      borderRadius: "var(--border-radius)",
                      width: "100%",
                      backgroundColor: "transparent",
                    }}
                    className="inline-edit-input"
                  />
                </div>

                {/* Description */}
                <div>
                  <span className="detail-label">Description</span>
                  <TipTapEditor
                    content={description}
                    onChange={(html) => setDescription(html)}
                  />
                  <button
                     onClick={() => handleUpdateField("description", description)}
                     className="btn btn-primary"
                     style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}
                   >
                     Save Description
                   </button>
                </div>

                {/* Attachments */}
                <div>
                  <span className="detail-label">Attachments</span>
                  <div className="dropzone" onClick={() => document.getElementById("drawer-file-input")?.click()}>
                    {uploadingFile ? "Uploading..." : "Click to select a file for upload"}
                    <input
                      type="file"
                      id="drawer-file-input"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                  </div>

                  <div className="attachment-list">
                    {task?.attachments?.map((att: any) => (
                      <div key={att.id} className="attachment-item">
                        <div>
                          <strong>{att.fileName}</strong>{" "}
                          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                            ({(att.fileSize / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Linking */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="detail-label">Linked Tasks</span>
                    {projectTasks.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: "2px 10px", fontSize: 16, lineHeight: 1, borderRadius: "50%" }}
                        onClick={() => setShowLinkForm((v) => !v)}
                        title={showLinkForm ? "Cancel" : "Add link"}
                      >
                        {showLinkForm ? "×" : "+"}
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0" }}>
                    {/* Outgoing links */}
                    {task?.outgoingLinks?.map((lnk: any) => (
                      <div key={lnk.id} className="attachment-item" style={{ fontSize: 12 }}>
                        <span>
                          ⛓️ This task <strong>{lnk.type.replace("_", " ")}</strong>{" "}
                          <span style={{ color: "var(--primary)", fontWeight: 700 }}>{lnk.targetTask.code}</span>: {lnk.targetTask.title}
                        </span>
                        <button
                           onClick={() => handleRemoveLink(lnk.id)}
                           className="btn btn-outline"
                           style={{ fontSize: 10 }}
                         >
                           Remove
                         </button>
                      </div>
                    ))}
                    {/* Incoming links */}
                    {task?.incomingLinks?.map((lnk: any) => (
                      <div key={lnk.id} className="attachment-item" style={{ fontSize: 12 }}>
                        <span>
                          ⛓️ <span style={{ color: "var(--primary)", fontWeight: 700 }}>{lnk.sourceTask.code}</span>: {lnk.sourceTask.title}{" "}
                          <strong>{lnk.type.replace("_", " ")}</strong> this task
                        </span>
                      </div>
                    ))}
                  </div>

                  {showLinkForm && projectTasks.length > 0 && (
                    <form onSubmit={(e) => { handleAddLink(e); setShowLinkForm(false); }} style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
                      <select
                        value={linkType}
                        onChange={(e) => setLinkType(e.target.value)}
                        className="filter-select"
                        style={{ flex: 1 }}
                      >
                        <option value="relates_to">relates to</option>
                        <option value="blocks">blocks</option>
                        <option value="blocked_by">is blocked by</option>
                      </select>
                      <select
                        value={linkTargetTaskId}
                        onChange={(e) => setLinkTargetTaskId(e.target.value)}
                        className="filter-select"
                        style={{ flex: 2 }}
                      >
                        {projectTasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.code} - {t.title}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn btn-primary" style={{ padding: "6px 12px" }} disabled={linkingLoading}>
                        {linkingLoading ? "Linking..." : "Link"}
                      </button>
                    </form>
                  )}
                </div>

                {/* Comments Stream */}
                <div className="comment-section">
                  <span className="detail-label">Comments</span>
                  <form onSubmit={handleAddComment} className="comment-input-area">
                    <textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                      required
                    ></textarea>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ alignSelf: "flex-end", padding: "6px 16px", fontSize: 12 }}
                      disabled={commentLoading}
                    >
                      {commentLoading ? "Adding..." : "Comment"}
                    </button>
                  </form>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                    {task?.comments?.map((comment: any) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-meta">
                          <strong style={{ color: "var(--text-primary)" }}>{comment.user.name}</strong>
                          <span>{formatInTimezone(comment.createdAt, orgTimezone)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{comment.content}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column (Sidebar Details) */}
              <div className="detail-sidebar">
                
                {/* Column/Status */}
                <div>
                  <span className="detail-label">Status</span>
                  <select
                    value={columnId}
                    onChange={(e) => {
                      setColumnId(e.target.value);
                      handleUpdateField("columnId", e.target.value);
                    }}
                    className="filter-select w-full"
                  >
                    {boardColumns.map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <span className="detail-label">Assignee</span>
                  <select
                    value={assigneeId}
                    onChange={(e) => {
                      setAssigneeId(e.target.value);
                      handleUpdateField("assigneeId", e.target.value);
                    }}
                    className="filter-select w-full"
                  >
                    <option value="">Unassigned</option>
                    {orgMembers.map((member) => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <span className="detail-label">Priority</span>
                  <select
                    value={priority}
                    onChange={(e) => {
                      setPriority(e.target.value);
                      handleUpdateField("priority", e.target.value);
                    }}
                    className="filter-select w-full"
                  >
                    <option value="Critical">🔴 Critical</option>
                    <option value="High">🟠 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                </div>

                {/* Story Points */}
                <div>
                  <span className="detail-label">Story Points</span>
                  <input
                    type="number"
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(e.target.value)}
                    onBlur={() => handleUpdateField("storyPoints", storyPoints)}
                    placeholder="None"
                    min="0"
                    className="inline-edit-input w-full"
                  />
                </div>

                {/* Sprint */}
                <div>
                  <span className="detail-label">Sprint</span>
                  <select
                    value={sprintId}
                    onChange={(e) => {
                      setSprintId(e.target.value);
                      handleUpdateField("sprintId", e.target.value);
                    }}
                    className="filter-select w-full"
                  >
                    <option value="">Backlog (No Sprint)</option>
                    {boardSprints
                      .filter((s) => s.status !== "COMPLETED")
                      .map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name} ({sprint.status})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Epic */}
                <div>
                  <span className="detail-label">Epic</span>
                  <select
                    value={epicId}
                    onChange={(e) => {
                      setEpicId(e.target.value);
                      handleUpdateField("epicId", e.target.value);
                    }}
                    className="filter-select w-full"
                  >
                    <option value="">None</option>
                    {boardEpics.map((epic) => (
                      <option key={epic.id} value={epic.id}>
                        {epic.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Reporter:</span>
                    <strong style={{ color: "var(--text-secondary)" }}>{task?.reporter?.name}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 6 }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Created:</span>
                    <strong style={{ color: "var(--text-secondary)" }}>
                      {task ? formatInTimezone(task.createdAt, orgTimezone) : "-"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 6 }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Updated:</span>
                    <strong style={{ color: "var(--text-secondary)" }}>
                      {task ? formatInTimezone(task.updatedAt, orgTimezone) : "-"}
                    </strong>
                  </div>
                </div>

                {/* Delete button */}
                <div style={{ marginTop: 20 }}>
                  <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this task?")) {
                          const res = await fetch(`/api/tasks?taskId=${taskId}`, { method: "DELETE" });
                          if (res.ok) {
                            onUpdate();
                            onClose();
                          }
                        }
                      }}
                      className="btn btn-danger"
                      style={{ width: "100%" }}
                    >
                      🗑️ Delete Task
                    </button>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
