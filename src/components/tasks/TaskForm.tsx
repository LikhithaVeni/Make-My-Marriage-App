"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { FormAlert } from "@/components/auth/FormAlert";
import { problemMessage } from "@/components/members/problem-message";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/components/tasks/task-labels";
import { buttonClass } from "@/components/ui/ButtonLink";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { ApiError, patchJson, postJson } from "@/lib/api-client";
import type { TaskView } from "@/modules/tasks";

type Field =
  | "title"
  | "description"
  | "eventId"
  | "assigneeId"
  | "dueDate"
  | "priority"
  | "status";
type Values = Record<Field, string>;

/** Form order, for focusing the first field with a problem. */
const FIELDS: Field[] = [
  "title",
  "description",
  "eventId",
  "assigneeId",
  "dueDate",
  "priority",
  "status",
];

function valuesOf(task: TaskView): Values {
  return {
    title: task.title,
    description: task.description ?? "",
    eventId: task.event?.id ?? "",
    assigneeId: task.assignee?.id ?? "",
    dueDate: task.dueDate ?? "",
    priority: task.priority,
    status: task.status,
  };
}

interface TaskFormProps {
  /** The task being edited; none when adding one. */
  task?: TaskView;
  events: { id: string; name: string }[];
  assignees: { id: string; name: string; relationLabel: string | null }[];
  /** A new task's event, when added from an event's page. */
  defaultEventId?: string;
}

/** Add or edit a task (PRD "Tasks", key flow F3; API Design "Tasks"). */
export function TaskForm({
  task,
  events,
  assignees,
  defaultEventId,
}: TaskFormProps) {
  const router = useRouter();
  const saved = task ? valuesOf(task) : null;
  const [values, setValues] = useState<Values>(
    saved ?? {
      title: "",
      description: "",
      eventId: defaultEventId ?? "",
      assigneeId: "",
      dueDate: "",
      priority: "MEDIUM",
      status: "TODO",
    },
  );
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Edits send only what changed, so two people editing different fields
  // don't undo each other.
  const changes: Partial<Values> = {};
  for (const field of FIELDS) {
    const value = values[field].trim();
    if (saved ? value !== saved[field].trim() : value !== "") {
      changes[field] = value;
    }
  }
  if (!task) delete changes.status;
  const hasChanges = !task || Object.keys(changes).length > 0;
  const cancelHref = task
    ? `/tasks/${task.id}`
    : defaultEventId
      ? `/events/${defaultEventId}`
      : "/tasks";

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function onSubmit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (!hasChanges) return;
    setProblem(null);
    setPending(true);
    try {
      if (task) {
        await patchJson<TaskView>(`/api/v1/tasks/${task.id}`, changes);
        router.push(`/tasks/${task.id}`);
      } else {
        // The title is always sent, so an empty one is named by the server.
        const created = await postJson<TaskView>("/api/v1/tasks", {
          ...changes,
          title: values.title.trim(),
        });
        router.push(`/tasks/${created.id}`);
      }
      router.refresh();
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError && error.code === "VALIDATION_FAILED") {
        const fields = (error.details?.fields ?? {}) as Partial<
          Record<Field, string>
        >;
        setErrors(fields);
        const first = FIELDS.find((name) => fields[name]);
        if (first) document.getElementsByName(first)[0]?.focus();
        else setProblem(problemMessage(error));
      } else {
        setProblem(problemMessage(error));
      }
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {problem && <FormAlert title={problem} />}

      <TextField
        label="What needs doing"
        name="title"
        autoComplete="off"
        placeholder="e.g. Book the mehendi artist"
        value={values.title}
        error={errors.title}
        onChange={(event) => update("title", event.target.value)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Event"
          name="eventId"
          value={values.eventId}
          onChange={(value) => update("eventId", value)}
          error={errors.eventId}
          options={[
            { value: "", label: "General wedding task" },
            ...events.map((event) => ({ value: event.id, label: event.name })),
          ]}
        />
        <SelectField
          label="Assigned to"
          name="assigneeId"
          value={values.assigneeId}
          onChange={(value) => update("assigneeId", value)}
          error={errors.assigneeId}
          options={[
            { value: "", label: "Unassigned" },
            ...assignees.map((person) => ({
              value: person.id,
              label: person.relationLabel
                ? `${person.name} (${person.relationLabel})`
                : person.name,
            })),
          ]}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Due date (optional)"
          type="date"
          name="dueDate"
          value={values.dueDate}
          error={errors.dueDate}
          onChange={(event) => update("dueDate", event.target.value)}
        />
        <SelectField
          label="Priority"
          name="priority"
          value={values.priority}
          onChange={(value) => update("priority", value)}
          error={errors.priority}
          options={PRIORITY_ORDER.map((priority) => ({
            value: priority,
            label: PRIORITY_LABELS[priority].label,
          }))}
        />
      </div>

      {task && (
        <SelectField
          label="Status"
          name="status"
          value={values.status}
          onChange={(value) => update("status", value)}
          error={errors.status}
          options={STATUS_ORDER.map((status) => ({
            value: status,
            label: STATUS_LABELS[status].label,
          }))}
        />
      )}

      <TextAreaField
        label="Notes (optional)"
        name="description"
        maxLength={2000}
        value={values.description}
        onChange={(value) => update("description", value)}
        error={errors.description}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending || !hasChanges}
          aria-busy={pending}
          className={buttonClass()}
        >
          {pending ? "Saving…" : task ? "Save changes" : "Add task"}
        </button>
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
