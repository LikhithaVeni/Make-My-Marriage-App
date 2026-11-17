"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";

import { FormAlert } from "@/components/auth/FormAlert";
import { problemMessage } from "@/components/members/problem-message";
import { buttonClass } from "@/components/ui/ButtonLink";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { ApiError, patchJson, postJson } from "@/lib/api-client";
import { CATEGORY_LABELS } from "@/lib/expense-labels";
import { paiseToInput, parseRupees } from "@/lib/format";
import type { ExpenseView } from "@/modules/expenses";

type Field =
  | "amountPaise"
  | "date"
  | "eventId"
  | "taskId"
  | "vendorId"
  | "category"
  | "description"
  | "paidBy"
  | "status"
  | "dueDate";
type Values = Record<Field, string>;

/** Form order, for focusing the first field with a problem. */
const FIELDS: Field[] = [
  "amountPaise",
  "date",
  "eventId",
  "taskId",
  "vendorId",
  "category",
  "status",
  "dueDate",
  "paidBy",
  "description",
];

function valuesOf(expense: ExpenseView): Values {
  return {
    amountPaise: paiseToInput(expense.amountPaise),
    date: expense.date,
    eventId: expense.event?.id ?? "",
    taskId: expense.task?.id ?? "",
    vendorId: expense.vendor?.id ?? "",
    category: expense.category,
    description: expense.description ?? "",
    paidBy: expense.paidBy,
    status: expense.status,
    dueDate: expense.dueDate ?? "",
  };
}

interface ExpenseFormProps {
  /** The expense being edited; none when adding one. */
  expense?: ExpenseView;
  events: { id: string; name: string }[];
  tasks: { id: string; title: string; eventId: string | null }[];
  vendors: { id: string; name: string }[];
  /** Organisers' names, offered for "Paid by". */
  organisers: string[];
  /** The signed-in organiser, the default "Paid by". */
  myName: string;
  /** Today in India, the default date. */
  today: string;
  /** A new expense's event, when added from an event's page. */
  defaultEventId?: string;
  /** A new expense's vendor, from a vendor's "Record payment". */
  defaultVendorId?: string;
}

/** Record or edit an expense (PRD "Expense fields", key flow F4). */
export function ExpenseForm({
  expense,
  events,
  tasks,
  vendors,
  organisers,
  myName,
  today,
  defaultEventId,
  defaultVendorId,
}: ExpenseFormProps) {
  const router = useRouter();
  const listId = useId();
  const saved = expense ? valuesOf(expense) : null;
  const [values, setValues] = useState<Values>(
    saved ?? {
      amountPaise: "",
      date: today,
      eventId: defaultEventId ?? "",
      taskId: "",
      vendorId: defaultVendorId ?? "",
      category: "",
      description: "",
      paidBy: myName,
      status: "PAID",
      dueDate: "",
    },
  );
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const changes: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = values[field].trim();
    if (saved ? value === saved[field].trim() : value === "") continue;
    changes[field] = field === "amountPaise" ? parseRupees(value) : value;
  }
  const hasChanges = !expense || Object.keys(changes).length > 0;
  // A task belongs to the chosen event, or is general.
  const eventTasks = tasks.filter(
    (task) => !task.eventId || task.eventId === values.eventId,
  );
  const cancelHref = expense
    ? `/expenses/${expense.id}`
    : defaultVendorId
      ? `/vendors/${defaultVendorId}`
      : defaultEventId
        ? `/events/${defaultEventId}`
        : "/expenses";

  function update(field: Field, value: string) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      // Changing the event drops a task that belongs to another event.
      if (field === "eventId") {
        const task = tasks.find((t) => t.id === current.taskId);
        if (task?.eventId && task.eventId !== value) next.taskId = "";
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function onSubmit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (!hasChanges) return;
    setProblem(null);
    // Rupees are checked here, so the server only ever gets whole paise.
    if (values.amountPaise.trim() && parseRupees(values.amountPaise) === null) {
      setErrors({ amountPaise: "Enter an amount like 45,000 or 1,500.50" });
      document.getElementsByName("amountPaise")[0]?.focus();
      return;
    }
    setPending(true);
    try {
      if (expense) {
        await patchJson<ExpenseView>(`/api/v1/expenses/${expense.id}`, changes);
        router.push(`/expenses/${expense.id}`);
      } else {
        // Required fields are always sent, so the server names missing ones.
        const created = await postJson<ExpenseView>("/api/v1/expenses", {
          ...changes,
          amountPaise: parseRupees(values.amountPaise) ?? undefined,
          date: values.date,
          eventId: values.eventId,
          category: values.category,
          paidBy: values.paidBy.trim(),
          status: values.status,
        });
        router.push(`/expenses/${created.id}`);
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

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Amount (₹)"
          name="amountPaise"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 45,000"
          value={values.amountPaise}
          error={errors.amountPaise}
          onChange={(event) => update("amountPaise", event.target.value)}
        />
        <TextField
          label="Date"
          type="date"
          name="date"
          value={values.date}
          error={errors.date}
          onChange={(event) => update("date", event.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Event"
          name="eventId"
          value={values.eventId}
          onChange={(value) => update("eventId", value)}
          error={errors.eventId}
          hint={events.length === 0 ? "Add an event first." : undefined}
          options={[
            { value: "", label: "Choose an event" },
            ...events.map((event) => ({ value: event.id, label: event.name })),
          ]}
        />
        <SelectField
          label="Category"
          name="category"
          value={values.category}
          onChange={(value) => update("category", value)}
          error={errors.category}
          options={[
            { value: "", label: "Choose a category" },
            ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Status"
          name="status"
          value={values.status}
          onChange={(value) => update("status", value)}
          error={errors.status}
          options={[
            { value: "PAID", label: "Paid" },
            { value: "PENDING", label: "Pending (still to pay)" },
          ]}
        />
        {values.status === "PENDING" ? (
          <TextField
            label="Due date"
            type="date"
            name="dueDate"
            value={values.dueDate}
            error={errors.dueDate}
            hint="Shows on the dashboard's pending payments."
            onChange={(event) => update("dueDate", event.target.value)}
          />
        ) : (
          <div aria-hidden="true" className="hidden sm:block" />
        )}
      </div>

      <TextField
        label={values.status === "PENDING" ? "Will be paid by" : "Paid by"}
        name="paidBy"
        list={listId}
        autoComplete="off"
        hint="An organiser's name, or anyone else."
        value={values.paidBy}
        error={errors.paidBy}
        onChange={(event) => update("paidBy", event.target.value)}
      />
      <datalist id={listId}>
        {organisers.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <SelectField
        label="Task (optional)"
        name="taskId"
        value={values.taskId}
        onChange={(value) => update("taskId", value)}
        error={errors.taskId}
        hint="Link it when the payment is for a tracked task."
        options={[
          { value: "", label: "No task" },
          ...eventTasks.map((task) => ({ value: task.id, label: task.title })),
        ]}
      />

      <SelectField
        label="Vendor (optional)"
        name="vendorId"
        value={values.vendorId}
        onChange={(value) => update("vendorId", value)}
        error={errors.vendorId}
        hint="Payments to a vendor show on their page, against the agreed cost."
        options={[
          { value: "", label: "No vendor" },
          ...vendors.map((vendor) => ({
            value: vendor.id,
            label: vendor.name,
          })),
        ]}
      />

      <TextAreaField
        label="Description (optional)"
        name="description"
        rows={2}
        maxLength={2000}
        placeholder="e.g. Decor advance"
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
          {pending ? "Saving…" : expense ? "Save changes" : "Add expense"}
        </button>
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
