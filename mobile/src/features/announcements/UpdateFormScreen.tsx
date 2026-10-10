import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Platform, Switch } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as FS from "expo-file-system/legacy";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../api/client";
import {
  useAnnouncement,
  updateTypes,
  type Announcement,
  type Attachment,
  type AnnouncementWrite,
} from "../../api/announcements";
import { useSubjects } from "../../api/subjects";
import { queryClient } from "../../api/queryClient";
import { Screen } from "../../components/Screen";
import { Field } from "../../components/Field";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { FilterText } from "../../components/FilterText";
import { Button } from "../../components/Button";
import { ErrorLine } from "../../components/ErrorLine";
import { ProgressLine } from "../../components/ProgressLine";
import { dueDate, fileSize } from "../../lib/format";
import { useTheme } from "../../theme/tokens";

const schema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(100),
  body: z.string().trim().min(1, "Add the update text.").max(2000),
  type: z.enum(updateTypes),
});
type Values = z.infer<typeof schema>;
const mimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function UpdateFormScreen() {
  const { id = "", subject = "" } = useLocalSearchParams<{
    id?: string;
    subject?: string;
  }>();
  const existing = useAnnouncement(id);
  const subjects = useSubjects();
  const [slug, setSlug] = useState(subject);
  const [due, setDue] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const uploading = useRef<AbortController | null>(null);
  const saveFlight = useRef(false);
  const initialized = useRef(false);
  const theme = useTheme();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "", type: "general" },
  });
  useEffect(() => {
    if (existing.data && !initialized.current) {
      initialized.current = true;
      form.reset({
        title: existing.data.title,
        body: existing.data.body,
        type: existing.data.type,
      });
      setSlug(existing.data.subject_slug ?? "");
      setDue(existing.data.due_at ? new Date(existing.data.due_at) : null);
      setAttachments(existing.data.attachments);
    }
  }, [existing.data, form]);
  useEffect(() => () => uploading.current?.abort(), []);
  const addFile = async () => {
    if (uploading.current || saveFlight.current || attachments.length >= 3)
      return;
    uploading.current = new AbortController();
    setError(null);
    let pickedUri: string | undefined;
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const file = picked.assets[0];
      pickedUri = file.uri;
      let size = file.size;
      if (size === undefined) {
        const info = await FS.getInfoAsync(file.uri);
        if (info.exists && !info.isDirectory) size = info.size;
      }
      if (size === undefined || size <= 0 || size > 25 * 1024 * 1024)
        throw new Error("Choose a file up to 25 MB.");
      const extension = file.name.split(".").pop()?.toLowerCase();
      const mime =
        file.mimeType ??
        (
          {
            pdf: mimeTypes[0],
            png: mimeTypes[1],
            jpg: mimeTypes[2],
            jpeg: mimeTypes[2],
            webp: mimeTypes[3],
            pptx: mimeTypes[4],
            docx: mimeTypes[5],
          } as Record<string, string>
        )[extension ?? ""];
      if (!mime || !mimeTypes.includes(mime))
        throw new Error("Choose PDF, DOCX, PPTX, PNG, JPG or WEBP.");
      setProgress(0);
      const attached = await api<Attachment>("/announcements/attachments", {
        method: "POST",
        signal: uploading.current.signal,
        upload: {
          uri: file.uri,
          filename: file.name,
          mimeType: mime,
          fields: {},
          onProgress: setProgress,
        },
      });
      setAttachments((current) => [...current, attached]);
    } catch (reason) {
      if (!uploading.current?.signal.aborted)
        setError(
          reason instanceof Error ? reason.message : "Couldn't add file.",
        );
    } finally {
      if (pickedUri)
        void FS.deleteAsync(pickedUri, { idempotent: true }).catch(
          () => undefined,
        );
      uploading.current = null;
      setProgress(null);
    }
  };
  const save = form.handleSubmit(async (values) => {
    if (saveFlight.current || uploading.current) return;
    saveFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const body: AnnouncementWrite = {
        ...values,
        subject_slug: slug || null,
        due_at: due?.toISOString() ?? null,
        file_ids: attachments.map((file) => file.file_id),
      };
      const item = await api<Announcement>(
        id ? `/announcements/${id}?notify=${notify}` : "/announcements",
        { method: id ? "PATCH" : "POST", body },
      );
      queryClient.setQueryData(["announcement", item.id], item);
      for (const key of ["announcements", "upcoming", "unread-updates"])
        void queryClient.invalidateQueries({ queryKey: [key] });
      router.replace(`/updates/${item.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Couldn't publish update.",
      );
    } finally {
      saveFlight.current = false;
      setSaving(false);
    }
  });
  const busy = saving || progress !== null;
  return (
    <Screen
      title={id ? "Edit update" : "New update"}
      keepFormEndVisible
      action={
        <TextAction
          onAccent
          label="Updates"
          disabled={busy}
          onPress={() => router.back()}
        />
      }
    >
      {id && existing.isPending ? (
        <ProgressLine value={0} label="Loading update" />
      ) : null}
      {id && existing.isError ? (
        <ErrorLine
          message="Couldn't load update."
          onRetry={() => void existing.refetch()}
        />
      ) : null}
      <Text variant="label">Type</Text>
      <FilterText
        label="Update type"
        options={updateTypes.map((value) => ({
          value,
          label: value.charAt(0).toUpperCase() + value.slice(1),
        }))}
        value={form.watch("type")}
        onChange={(value) => {
          if (!busy) form.setValue("type", value);
        }}
      />
      <Text variant="label">Subject</Text>
      <FilterText
        label="Update subject"
        options={[
          { value: "", label: "All subjects" },
          ...(subjects.data?.map((item) => ({
            value: item.slug,
            label: item.short_name,
          })) ?? []),
        ]}
        value={slug}
        onChange={(value) => {
          if (!busy) setSlug(value);
        }}
      />
      {subjects.isError ? (
        <ErrorLine
          message="Couldn't load subjects."
          onRetry={() => void subjects.refetch()}
        />
      ) : null}
      <Controller
        control={form.control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field
            label="Title"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            maxLength={100}
            editable={!busy}
            error={form.formState.errors.title?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="body"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field
            label="Body"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            maxLength={2000}
            editable={!busy}
            error={form.formState.errors.body?.message}
          />
        )}
      />
      <Text variant="caption" tone="muted">
        {form.watch("body").length}/2000
      </Text>
      <TextAction
        label={due ? `Due ${dueDate(due.toISOString())}` : "Set due date"}
        disabled={busy}
        onPress={() => setPicker("date")}
      />
      {due ? (
        <TextAction
          label="Clear due date"
          disabled={busy}
          onPress={() => setDue(null)}
        />
      ) : null}
      {picker ? (
        <>
          <DateTimePicker
            value={due ?? new Date()}
            mode={picker}
            timeZoneName="Asia/Karachi"
            is24Hour={false}
            themeVariant="dark"
            onChange={(event, date) => {
              if (event.type === "dismissed") {
                setPicker(null);
                return;
              }
              if (date) setDue(date);
              if (Platform.OS === "android")
                setPicker(picker === "date" ? "time" : null);
            }}
          />
          {Platform.OS === "ios" ? (
            <TextAction
              label={picker === "date" ? "Set time" : "Done"}
              onPress={() => setPicker(picker === "date" ? "time" : null)}
            />
          ) : null}
        </>
      ) : null}
      <Text variant="label">Attachments ({attachments.length}/3)</Text>
      {attachments.map((file) => (
        <TextAction
          key={file.file_id}
          label={`Remove ${file.original_name} (${fileSize(file.size_bytes)})`}
          disabled={busy}
          onPress={() =>
            setAttachments((current) =>
              current.filter((item) => item.file_id !== file.file_id),
            )
          }
        />
      ))}
      <TextAction
        label="Add file"
        disabled={busy || attachments.length >= 3}
        onPress={() => void addFile()}
      />
      {progress !== null ? (
        <>
          <ProgressLine value={progress} label="Uploading attachment" />
          <Text variant="caption">Uploading {Math.round(progress * 100)}%</Text>
          <TextAction
            label="Cancel upload"
            onPress={() => uploading.current?.abort()}
          />
        </>
      ) : null}
      {id ? (
        <>
          <Text>Notify again</Text>
          <Switch
            accessibilityLabel="Notify again"
            value={notify}
            disabled={busy}
            onValueChange={setNotify}
            trackColor={{ false: theme.olive, true: theme.moss }}
            thumbColor={theme.bone}
          />
        </>
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
      <Button
        label={saving ? "Saving…" : id ? "Save" : "Publish"}
        disabled={busy || Boolean(id && !existing.data)}
        onPress={() => void save()}
      />
    </Screen>
  );
}
