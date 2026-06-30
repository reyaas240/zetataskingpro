"use client";

import React, { useState, useEffect } from "react";
import { formatInTimezone } from "@/lib/timezone";
import TipTapEditor from "./TipTapEditor";
import { useWorkspace } from "@/app/dashboard/WorkspaceContext";

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
  projectCustomFields?: any[];
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
  projectCustomFields = [],
}: TaskDrawerProps) {
  const { user: currentUser } = useWorkspace();
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
  const [watcherIds, setWatcherIds] = useState<string[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

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
  const [commentEditorKey, setCommentEditorKey] = useState(0);
  const [commentLoading, setCommentLoading] = useState(false);
  const [activityTab, setActivityTab] = useState<"comments" | "history">("comments");

  // Lightbox preview state
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Copy success & Expand states
  const [copySuccess, setCopySuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopyUrl = async () => {
    if (!taskId) return;
    const taskUrl = window.location.origin + window.location.pathname + "?taskId=" + taskId;
    
    const copyToClipboard = (text: string) => {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise<void>((resolve, resolveFailed) => {
          document.execCommand("copy") ? resolve() : resolveFailed();
          textArea.remove();
        });
      }
    };

    try {
      await copyToClipboard(taskUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const isImageFile = (att: any) => {
    if (att.fileType?.startsWith("image/")) return true;
    const ext = att.fileName?.split(".").pop()?.toLowerCase();
    return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  };

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
        setWatcherIds(data.task.watchers?.map((w: any) => w.userId) || []);
        
        // Extract custom field values
        const cfValues: Record<string, string> = {};
        data.task.customFields?.forEach((cf: any) => {
          cfValues[cf.customFieldId] = cf.value;
        });
        setCustomFieldValues(cfValues);
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

  const handleUpdateCustomField = async (fieldId: string, value: string) => {
    if (!taskId) return;
    
    // Optimistic UI update
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          customFieldValues: { [fieldId]: value },
        }),
      });
      if (res.ok) {
        onUpdate();
      }
    } catch (e) {
      console.error("Failed to update custom field:", e);
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

  // Helper: check if TipTap HTML output is empty (e.g. just "<p></p>")
  const isCommentEmpty = (html: string) => {
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
  };

  // Create comment
  const handleAddComment = async () => {
    if (isCommentEmpty(commentContent) || !taskId) return;

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
        // Increment key to reset the editor
        setCommentEditorKey((k) => k + 1);
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

  const formatHistoryValue = (field: string, value: string | null) => {
    if (!value) return "Unassigned/None";
    if (field === "assigneeId") {
      const member = orgMembers.find(m => m.user.id === value);
      return member ? member.user.name : value;
    }
    if (field === "columnId") {
      const col = boardColumns.find(c => c.id === value);
      return col ? col.name : value;
    }
    if (field === "sprintId") {
      const sprint = boardSprints.find(s => s.id === value);
      return sprint ? sprint.name : value;
    }
    if (field === "epicId") {
      const epic = boardEpics.find(e => e.id === value);
      return epic ? epic.name : value;
    }
    if (field === "description") {
      return "(updated)";
    }
    return value;
  };

  const formatHistoryField = (field: string) => {
    switch (field) {
      case "assigneeId": return "Assignee";
      case "columnId": return "Status";
      case "sprintId": return "Sprint";
      case "epicId": return "Epic";
      case "description": return "Description";
      case "storyPoints": return "Story Points";
      case "taskType": return "Task Type";
      case "priority": return "Priority";
      case "title": return "Title";
      default: return field.charAt(0).toUpperCase() + field.slice(1);
    }
  };

  const currentColumn = boardColumns.find((col) => col.id === columnId);
  const isBacklogOrTodo = !sprintId || (currentColumn && currentColumn.name === "To Do");
  
  const currentUserMember = orgMembers.find((m) => m.user.id === currentUser?.id);
  const isCurrentUserAdmin = currentUserMember?.role === "ADMIN";
  const isReporter = task?.reporterId === currentUser?.id;
  
  const canDelete = isCurrentUserAdmin || (isReporter && isBacklogOrTodo);

  if (!taskId) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Drawer Header */}
        <div className="drawer-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <span className="task-code" style={{ fontSize: 14, flexShrink: 0 }}>{task?.code || "Loading..."}</span>
            <select
              value={taskType}
              onChange={(e) => {
                setTaskType(e.target.value);
                handleUpdateField("taskType", e.target.value);
              }}
              className="filter-select"
              style={{ fontWeight: "bold", flexShrink: 0 }}
            >
              <option value="TASK">📝 Task</option>
              <option value="BUG">🐛 Bug</option>
              <option value="STORY">📖 Story</option>
            </select>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              style={{
                fontSize: 16,
                fontWeight: 700,
                border: "1px solid transparent",
                padding: "4px 10px",
                borderRadius: "var(--border-radius)",
                flex: 1,
                minWidth: 150,
                backgroundColor: "transparent",
              }}
              className="inline-edit-input"
              placeholder="Enter task title..."
            />
            {/* Copy Task URL button */}
            <button
              type="button"
              onClick={handleCopyUrl}
              className="btn btn-outline"
              style={{
                padding: "4px 10px",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 4,
                border: "1px solid var(--border-color)",
                borderRadius: "var(--border-radius)",
                backgroundColor: copySuccess ? "var(--success-light)" : "var(--bg-secondary)",
                color: copySuccess ? "var(--success)" : "var(--text-secondary)",
                cursor: "pointer",
                flexShrink: 0,
                fontWeight: 600,
                transition: "all 0.15s ease"
              }}
              title="Copy Task URL Link"
            >
              {copySuccess ? "✓ Copied!" : "🔗 Copy Link"}
            </button>
          </div>
          <button className="btn btn-outline" onClick={onClose} style={{ flexShrink: 0 }}>×</button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {loading ? (
            <p style={{ color: "var(--text-secondary)" }}>Loading task details...</p>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <div className="detail-grid" style={{ gridTemplateColumns: isExpanded ? "1fr" : "2fr 1.1fr" }}>
              
              {/* Left Column (Main Details) */}
              <div className="detail-main">
                
                {/* Description */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span className="detail-label" style={{ margin: 0 }}>Description</span>
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="btn btn-outline"
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--border-radius-sm)",
                        cursor: "pointer",
                        color: "var(--primary)",
                        fontWeight: 600,
                        backgroundColor: "var(--bg-secondary)"
                      }}
                    >
                      {isExpanded ? "⤨ Collapse Sidebar" : "⤢ Expand Editor"}
                    </button>
                  </div>
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
                    {task?.attachments?.map((att: any) => {
                      const isImg = isImageFile(att);
                      return (
                        <div key={att.id} className="attachment-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                            {isImg && (
                              <div
                                onClick={() => setPreviewImage({ url: att.fileUrl, name: att.fileName })}
                                style={{
                                  width: 50,
                                  height: 38,
                                  borderRadius: "var(--border-radius-sm)",
                                  backgroundColor: "var(--bg-tertiary)",
                                  overflow: "hidden",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  border: "1px solid var(--border-color)",
                                  flexShrink: 0
                                }}
                              >
                                <img
                                  src={att.fileUrl}
                                  alt={att.fileName}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              </div>
                            )}
                            <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{att.fileName}</strong>
                              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                                ({(att.fileSize / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                            {isImg && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: att.fileUrl, name: att.fileName })}
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                              >
                                View
                              </button>
                            )}
                            <a
                              href={att.fileUrl}
                              download={att.fileName}
                              className="btn btn-outline"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
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

                {/* Activity Stream */}
                <div className="comment-section">
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, borderBottom: "1px solid var(--border-color)" }}>
                    <button
                      onClick={() => setActivityTab("comments")}
                      style={{
                        background: "none",
                        border: "none",
                        borderBottom: activityTab === "comments" ? "2px solid var(--primary)" : "2px solid transparent",
                        padding: "0 4px 8px 4px",
                        fontSize: 12,
                        fontWeight: activityTab === "comments" ? 700 : 500,
                        color: activityTab === "comments" ? "var(--text-primary)" : "var(--text-secondary)",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Comments
                    </button>
                    <button
                      onClick={() => setActivityTab("history")}
                      style={{
                        background: "none",
                        border: "none",
                        borderBottom: activityTab === "history" ? "2px solid var(--primary)" : "2px solid transparent",
                        padding: "0 4px 8px 4px",
                        fontSize: 12,
                        fontWeight: activityTab === "history" ? 700 : 500,
                        color: activityTab === "history" ? "var(--text-primary)" : "var(--text-secondary)",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      History
                    </button>
                  </div>

                  {activityTab === "comments" && (
                    <div className="comment-input-area" style={{ marginBottom: 24 }}>
                      <div className="comment-editor-wrap">
                        <TipTapEditor
                          key={commentEditorKey}
                          content={commentContent}
                          onChange={(html) => setCommentContent(html)}
                          placeholder="Add a comment... Use the toolbar to format, add images or embed videos."
                          compact
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ alignSelf: "flex-end", padding: "6px 16px", fontSize: 12 }}
                        disabled={commentLoading || isCommentEmpty(commentContent)}
                        onClick={handleAddComment}
                      >
                        {commentLoading ? "Adding..." : "Comment"}
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {task && activityTab === "comments" && (task.comments || [])
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((item: any) => (
                        <div key={`comment-${item.id}`} className="comment-item">
                          <div className="comment-meta">
                            <strong style={{ color: "var(--text-primary)" }}>{item.user.name}</strong>
                            <span>{formatInTimezone(item.createdAt, orgTimezone)}</span>
                          </div>
                          <div
                            className="comment-rich-content tiptap-content"
                            dangerouslySetInnerHTML={{ __html: item.content }}
                            style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}
                          />
                        </div>
                      ))
                    }
                    {task && activityTab === "history" && (task.history || [])
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((item: any) => (
                        <div key={`history-${item.id}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-tertiary)" }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                            🕒
                          </div>
                          <div style={{ flex: 1 }}>
                            <strong style={{ color: "var(--text-secondary)" }}>{item.user.name}</strong>
                            {item.field === "creation" ? (
                              <span> created the task</span>
                            ) : (
                              <span>
                                {" "}changed <strong style={{ color: "var(--text-secondary)" }}>{formatHistoryField(item.field)}</strong>
                                {item.field === "description" ? "" : (
                                  <>
                                    {item.oldValue ? ` from ${formatHistoryValue(item.field, item.oldValue)}` : ""}
                                    {item.newValue ? ` to ${formatHistoryValue(item.field, item.newValue)}` : " (cleared)"}
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11 }}>{formatInTimezone(item.createdAt, orgTimezone)}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>

              </div>

              {/* Right Column (Sidebar Details) */}
              {!isExpanded && (
                <div className="detail-sidebar" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                
                  {/* Core Details Group */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <span className="detail-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Status</span>
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

                    <div>
                      <span className="detail-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Priority</span>
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

                    <div>
                      <span className="detail-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Story Points</span>
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
                  </div>

                  <hr style={{ border: 0, borderTop: "1px solid var(--border-color)", margin: 0 }} />

                  {/* People Group */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <span className="detail-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Assignee</span>
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

                    <div>
                      <span className="detail-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Watchers</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                        {watcherIds.map(watcherId => {
                          const m = orgMembers.find(m => m.user.id === watcherId);
                          if (!m) return null;
                          return (
                            <div key={watcherId} style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "var(--background-secondary)", border: "1px solid var(--border-color)", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>
                              <span>{m.user.name}</span>
                              <button 
                                onClick={() => {
                                  const newWatchers = watcherIds.filter(id => id !== watcherId);
                                  setWatcherIds(newWatchers);
                                  handleUpdateField("watcherIds", newWatchers);
                                }}
                                style={{ background: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 12, marginLeft: 2 }}
                              >✕</button>
                            </div>
                          );
                        })}
                      </div>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value && !watcherIds.includes(e.target.value)) {
                            const newWatchers = [...watcherIds, e.target.value];
                            setWatcherIds(newWatchers);
                            handleUpdateField("watcherIds", newWatchers);
                          }
                        }}
                        className="filter-select w-full"
                        style={{ padding: "4px 8px", height: "auto" }}
                      >
                        <option value="" disabled>+ Add Watcher</option>
                        {orgMembers.filter(m => !watcherIds.includes(m.user.id)).map((member) => (
                          <option key={member.user.id} value={member.user.id}>
                            {member.user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <hr style={{ border: 0, borderTop: "1px solid var(--border-color)", margin: 0 }} />

                  {/* Organization Group */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <span className="detail-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Sprint</span>
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

                    <div>
                      <span className="detail-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Epic</span>
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
                  </div>

                  <hr style={{ border: 0, borderTop: "1px solid var(--border-color)", margin: 0 }} />

                  {/* Custom Fields */}
                  {projectCustomFields && projectCustomFields.length > 0 && (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {projectCustomFields.map((field: any) => (
                          <div key={field.id}>
                            <span className="detail-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>{field.name}</span>
                            {field.type === "TEXT" && (
                              <input
                                type="text"
                                className="filter-input w-full"
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                onBlur={(e) => handleUpdateCustomField(field.id, e.target.value)}
                                placeholder="—"
                              />
                            )}
                            {field.type === "NUMBER" && (
                              <input
                                type="number"
                                className="filter-input w-full"
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                onBlur={(e) => handleUpdateCustomField(field.id, e.target.value)}
                                placeholder="0"
                              />
                            )}
                            {field.type === "DATE" && (
                              <input
                                type="date"
                                className="filter-input w-full"
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                onBlur={(e) => handleUpdateCustomField(field.id, e.target.value)}
                              />
                            )}
                            {field.type === "CHECKBOX" && (
                              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, height: 32 }}>
                                <input
                                  type="checkbox"
                                  checked={customFieldValues[field.id] === "true"}
                                  onChange={(e) => {
                                    const val = e.target.checked ? "true" : "false";
                                    setCustomFieldValues(prev => ({ ...prev, [field.id]: val }));
                                    handleUpdateCustomField(field.id, val);
                                  }}
                                />
                                Yes
                              </label>
                            )}
                            {field.type === "DROPDOWN" && field.options && (
                              <select
                                className="filter-select w-full"
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => {
                                  setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }));
                                  handleUpdateCustomField(field.id, e.target.value);
                                }}
                              >
                                <option value="">— Select —</option>
                                {JSON.parse(field.options).map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>

                      <hr style={{ border: 0, borderTop: "1px solid var(--border-color)", margin: 0 }} />
                    </>
                  )}

                  {/* Dates */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--text-tertiary)" }}>Reporter:</span>
                      <strong style={{ color: "var(--text-secondary)" }}>{task?.reporter?.name}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--text-tertiary)" }}>Created:</span>
                      <strong style={{ color: "var(--text-secondary)" }}>
                        {task ? formatInTimezone(task.createdAt, orgTimezone) : "-"}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--text-tertiary)" }}>Updated:</span>
                      <strong style={{ color: "var(--text-secondary)" }}>
                        {task ? formatInTimezone(task.updatedAt, orgTimezone) : "-"}
                      </strong>
                    </div>
                  </div>

                  {/* Delete button */}
                  {canDelete && (
                    <div style={{ marginTop: "auto", paddingTop: 16 }}>
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this task?")) {
                            const res = await fetch(`/api/tasks?taskId=${taskId}`, { method: "DELETE" });
                            if (res.ok) {
                              onUpdate();
                              onClose();
                            } else {
                              const errorData = await res.json();
                              alert(errorData.error || "Failed to delete task.");
                            }
                          }
                        }}
                        className="btn btn-danger"
                        style={{ width: "100%" }}
                      >
                        🗑️ Delete Task
                      </button>
                    </div>
                  )}
              </div>
              )}

            </div>
          )}
        </div>

        {/* IMAGE LIGHTBOX PREVIEW MODAL */}
        {previewImage && (
          <div
            className="modal-overlay"
            style={{ zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="modal-card"
              style={{
                maxWidth: "90vw",
                width: "auto",
                maxHeight: "90vh",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                boxShadow: "var(--shadow-xl)",
                backgroundColor: "var(--bg-secondary)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 12, gap: 16 }}>
                <h4 style={{ margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontSize: 16, fontWeight: 700 }}>
                  👁️ {previewImage.name}
                </h4>
                <button
                  className="modal-close"
                  onClick={() => setPreviewImage(null)}
                  style={{ fontSize: 24, cursor: "pointer", background: "none", border: "none", padding: 0, color: "var(--text-secondary)" }}
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "var(--bg-primary)",
                  borderRadius: "var(--border-radius)",
                  padding: 10,
                  overflow: "auto",
                  maxHeight: "70vh",
                  border: "1px solid var(--border-color)",
                  width: "100%"
                }}
              >
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "var(--border-radius-sm)" }}
                />
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "flex-end", width: "100%" }}>
                <a
                  href={previewImage.url}
                  download={previewImage.name}
                  className="btn btn-primary"
                  style={{ padding: "6px 16px", fontSize: 13 }}
                >
                  Download File
                </a>
                <button
                  className="btn btn-outline"
                  onClick={() => setPreviewImage(null)}
                  style={{ padding: "6px 16px", fontSize: 13 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
