import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

// GET: Fetch tasks with optional filters (sprint, epic, assignee, search)
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const boardId = url.searchParams.get("boardId");

    if (!boardId) {
      return NextResponse.json({ error: "boardId is required" }, { status: 400 });
    }

    const sprintId = url.searchParams.get("sprintId");
    const epicId = url.searchParams.get("epicId");
    const assigneeId = url.searchParams.get("assigneeId");
    const search = url.searchParams.get("search");

    // Build filter query
    const whereClause: any = { boardId };

    if (sprintId) {
      if (sprintId === "backlog") {
        whereClause.sprintId = null;
      } else {
        whereClause.sprintId = sprintId;
      }
    }

    if (epicId) {
      whereClause.epicId = epicId;
    }

    if (assigneeId) {
      whereClause.assigneeId = assigneeId;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const tasks = await db.task.findMany({
      where: whereClause,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
        epic: true,
        sprint: true,
        watchers: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, email: true } }
          }
        },
        customFields: {
          include: { customField: true }
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        attachments: true,
        outgoingLinks: { include: { targetTask: true } },
        incomingLinks: { include: { sourceTask: true } },
      },
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a task
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      taskType,
      priority,
      storyPoints,
      projectId,
      boardId,
      columnId,
      sprintId,
      epicId,
      assigneeId,
      watcherIds,
      customFieldValues,
    } = body;

    if (!title || !projectId || !boardId || !columnId) {
      return NextResponse.json(
        { error: "Title, Project ID, Board ID, and Column ID are required" },
        { status: 400 }
      );
    }

    // Check project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine task sequencing in database transaction to prevent race conditions
    const task = await db.$transaction(async (tx) => {
      // Find the last sequential task in the project
      const lastTask = await tx.task.findFirst({
        where: { projectId },
        orderBy: { number: "desc" },
      });

      const nextNumber = lastTask ? lastTask.number + 1 : 1;
      const code = `${project.key}-${nextNumber}`;

      // Create Task
      const newTask = await tx.task.create({
        data: {
          code,
          number: nextNumber,
          title,
          description: description || "",
          taskType: taskType || "TASK",
          priority: priority || "Medium",
          storyPoints: storyPoints ? parseInt(storyPoints) : null,
          projectId,
          boardId,
          columnId,
          sprintId: sprintId || null,
          epicId: epicId || null,
          reporterId: user.id,
          assigneeId: assigneeId || null,
          watchers: watcherIds?.length > 0 ? {
            create: watcherIds.map((id: string) => ({ userId: id }))
          } : undefined,
        },
      });

      // Create Task History entry for creation
      await tx.taskHistory.create({
        data: {
          taskId: newTask.id,
          userId: user.id,
          field: "creation",
          oldValue: null,
          newValue: "Task created",
        }
      });

      return newTask;
    });

    // Create custom field values
    if (customFieldValues && typeof customFieldValues === "object") {
      const entries = Object.entries(customFieldValues).filter(([, v]) => v !== "" && v !== null && v !== undefined);
      if (entries.length > 0) {
        await db.taskCustomFieldValue.createMany({
          data: entries.map(([customFieldId, value]) => ({
            taskId: task.id,
            customFieldId,
            value: String(value),
          })),
          skipDuplicates: true,
        });
      }
    }

    // Notify assignee if task was assigned to someone else
    if (task.assigneeId && task.assigneeId !== user.id) {
      await createNotification({
        userId: task.assigneeId,
        title: "New Task Assigned",
        message: `${user.name} assigned you the task: ${task.code} - ${task.title}`,
        taskId: task.id,
      });
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update task
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      taskId,
      title,
      description,
      taskType,
      priority,
      storyPoints,
      columnId,
      sprintId,
      epicId,
      assigneeId,
      watcherIds,
      customFieldValues,
      destinationIndex,
    } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
        customFields: { include: { customField: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: task.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle watchers first if provided
    if (watcherIds !== undefined) {
      // Delete existing watchers
      await db.taskWatcher.deleteMany({
        where: { taskId }
      });

      // Create new watchers
      if (watcherIds.length > 0) {
        await db.taskWatcher.createMany({
          data: watcherIds.map((id: string) => ({
            taskId,
            userId: id
          }))
        });
      }
    }

    // Handle custom field values if provided
    if (customFieldValues && typeof customFieldValues === "object") {
      for (const [customFieldId, value] of Object.entries(customFieldValues)) {
        if (value === "" || value === null || value === undefined) {
          await db.taskCustomFieldValue.deleteMany({ where: { taskId, customFieldId } });
        } else {
          await db.taskCustomFieldValue.upsert({
            where: { taskId_customFieldId: { taskId, customFieldId } },
            create: { taskId, customFieldId, value: String(value) },
            update: { value: String(value) },
          });
        }
      }
    }

    // Determine field changes for history
    const historyEntries: any[] = [];

    const checkField = (field: string, oldVal: any, newVal: any) => {
      if (newVal !== undefined && oldVal !== newVal) {
        historyEntries.push({
          taskId,
          userId: user.id,
          field,
          oldValue: oldVal ? String(oldVal) : null,
          newValue: newVal ? String(newVal) : null,
        });
      }
    };

    checkField("title", task.title, title);
    checkField("description", task.description, description);
    checkField("taskType", task.taskType, taskType);
    checkField("priority", task.priority, priority);
    checkField("storyPoints", task.storyPoints, storyPoints ? parseInt(storyPoints) : null);
    checkField("columnId", task.columnId, columnId);
    checkField("sprintId", task.sprintId, sprintId || null);
    checkField("epicId", task.epicId, epicId || null);
    checkField("assigneeId", task.assigneeId, assigneeId || null);

    // Handle custom field history
    if (customFieldValues && typeof customFieldValues === "object") {
      for (const [customFieldId, value] of Object.entries(customFieldValues)) {
        const existingField = task.customFields.find((cf: any) => cf.customFieldId === customFieldId);
        const oldVal = existingField ? existingField.value : null;
        const newVal = value === "" || value === null || value === undefined ? null : String(value);

        if (oldVal !== newVal) {
          const cfName = existingField?.customField?.name || `Custom Field ${customFieldId}`;
          historyEntries.push({
            taskId,
            userId: user.id,
            field: cfName,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      }
    }

    if (historyEntries.length > 0) {
      await db.taskHistory.createMany({ data: historyEntries });
    }

    // Perform update
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(taskType !== undefined && { taskType }),
        ...(priority !== undefined && { priority }),
        ...(storyPoints !== undefined && { storyPoints: storyPoints ? parseInt(storyPoints) : null }),
        ...(columnId !== undefined && { columnId }),
        ...(sprintId !== undefined && { sprintId: sprintId || null }),
        ...(epicId !== undefined && { epicId: epicId || null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      },
    });

    // Reorder sprint tasks if destinationIndex is supplied
    if (destinationIndex !== undefined) {
      const targetSprintId = sprintId !== undefined ? (sprintId || null) : task.sprintId;
      
      const siblingTasks = await db.task.findMany({
        where: {
          boardId: task.boardId,
          sprintId: targetSprintId,
        },
        orderBy: [
          { order: "asc" },
          { createdAt: "desc" },
        ],
      });

      const orderedSiblings = siblingTasks.filter((t) => t.id !== taskId);
      const insertIndex = Math.max(0, Math.min(destinationIndex, orderedSiblings.length));
      orderedSiblings.splice(insertIndex, 0, updatedTask);

      await db.$transaction(
        orderedSiblings.map((t, idx) =>
          db.task.update({
            where: { id: t.id },
            data: { order: idx },
          })
        )
      );
    }

    // Notify assignee of assignment or update
    const assigneeChanged = assigneeId !== undefined && assigneeId !== task.assigneeId;
    if (assigneeChanged) {
      if (updatedTask.assigneeId && updatedTask.assigneeId !== user.id) {
        await createNotification({
          userId: updatedTask.assigneeId,
          title: "Task Assigned",
          message: `${user.name} assigned you the task: ${updatedTask.code} - ${updatedTask.title}`,
          taskId: updatedTask.id,
        });
      }
    } else {
      // General task update notification to assignee
      if (updatedTask.assigneeId && updatedTask.assigneeId !== user.id) {
        await createNotification({
          userId: updatedTask.assigneeId,
          title: "Task Updated",
          message: `${user.name} updated the task: ${updatedTask.code} - ${updatedTask.title}`,
          taskId: updatedTask.id,
        });
      }
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove task
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const taskId = url.searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify membership and role
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: task.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Admins can delete any task; members can only delete tasks they are assigned to
    if (membership.role !== "ADMIN" && task.assigneeId !== user.id) {
      return NextResponse.json({ error: "Members can only delete their own tasks" }, { status: 403 });
    }

    await db.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
