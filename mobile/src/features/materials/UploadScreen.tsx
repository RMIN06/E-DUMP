import { goBack } from "../../lib/navigation";
import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View, Pressable } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { removePickedFile, pickedFileInfo } from "../../lib/pickedFiles";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../api/client";
import { ApiError } from "../../api/transport";
import { queryClient } from "../../api/queryClient";
import type { Material } from "../../api/materials";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { Field } from "../../components/Field";
import { FilterText } from "../../components/FilterText";
import { Button } from "../../components/Button";
import { ErrorLine } from "../../components/ErrorLine";
import { ProgressLine } from "../../components/ProgressLine";
import { Icon } from "../../components/Icon";
import { space, controls, layout } from "../../theme/spacing";
import { useTheme } from "../../theme/tokens";
import { fileSize } from "../../lib/format";
import { kindOptions } from "./options";

const formSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Add a title.")
    .max(100, "Use at most 100 characters."),
  kind: z.enum([
    "slides",
    "notes",
    "assignment",
    "past_paper",
    "book",
    "other",
  ]),
  chapter: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{1,2}$/.test(value),
      "Use a chapter from 0 to 99.",
    ),
  description: z.string().max(200, "Use at most 200 characters."),
});
type Values = z.infer<typeof formSchema>;
type ChosenFile = {
  asset: DocumentPicker.DocumentPickerAsset;
  title: string;
  status: "ready" | "uploaded" | "failed";
  error?: string;
  duplicate?: string;
};
const mimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function UploadScreen() {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [files, setFiles] = useState<ChosenFile[]>([]);
  const picked = useRef<DocumentPicker.DocumentPickerAsset[]>([]);
  const mounted = useRef(true);
  const picking = useRef(false);
  const [choosing, setChoosing] = useState(false);
  const [activeFile, setActiveFile] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", kind: "notes", chapter: "", description: "" },
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      for (const file of picked.current)
        void removePickedFile(file.uri).catch(() => undefined);
    };
  }, []);
  const choose = async () => {
    if (inFlight.current || picking.current) return;
    picking.current = true;
    setChoosing(true);
    setError(null);
    let selectedAssets: DocumentPicker.DocumentPickerAsset[] = [];
    let adopted = false;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...mimeTypes],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      selectedAssets = result.assets;
      const selected: ChosenFile[] = [];
      const rejected: string[] = [];
      for (const asset of result.assets) {
        asset.size ??= asset.file?.size;
        if (asset.size === undefined) {
          const info = await pickedFileInfo(asset.uri);
          if (info.exists && !info.isDirectory) asset.size = info.size;
        }
        if (!asset.mimeType) {
          const extension = asset.name.split(".").pop()?.toLowerCase();
          const types: Record<string, string> = {
            pdf: mimeTypes[0],
            png: mimeTypes[1],
            jpg: mimeTypes[2],
            jpeg: mimeTypes[2],
            webp: mimeTypes[3],
            pptx: mimeTypes[4],
            docx: mimeTypes[5],
          };
          asset.mimeType = types[extension ?? ""];
        }
        if (!asset.size || asset.size > 25 * 1024 * 1024) {
          await removePickedFile(asset.uri);
          rejected.push(
            `${asset.name}: choose a non-empty file no larger than 25 MB.`,
          );
          continue;
        }
        if (
          !asset.mimeType ||
          !mimeTypes.includes(asset.mimeType as (typeof mimeTypes)[number])
        ) {
          await removePickedFile(asset.uri);
          rejected.push(`${asset.name}: choose PDF, images, PPTX or DOCX.`);
          continue;
        }
        selected.push({
          asset,
          title: asset.name.replace(/\.[^.]+$/, "").slice(0, 100),
          status: "ready",
        });
      }
      if (!mounted.current) {
        for (const file of selected)
          void removePickedFile(file.asset.uri).catch(() => undefined);
        return;
      }
      if (selected.length) {
        for (const file of picked.current)
          void removePickedFile(file.uri).catch(() => undefined);
        picked.current = selected.map((file) => file.asset);
        adopted = true;
        setFiles(selected);
        form.setValue("title", selected[0]?.title ?? "", {
          shouldValidate: true,
        });
      }
      if (rejected.length) setError(rejected.join("\n"));
    } catch {
      if (mounted.current) setError("Couldn't choose files. Try again.");
    } finally {
      if (!adopted)
        for (const asset of selectedAssets)
          void removePickedFile(asset.uri).catch(() => undefined);
      picking.current = false;
      if (mounted.current) setChoosing(false);
    }
  };
  const submit = form.handleSubmit(async (values) => {
    if (inFlight.current || picking.current) return;
    if (!files.length) {
      setError("Choose files to upload.");
      return;
    }
    const titles = files.map((file, index) =>
      formSchema.shape.title.safeParse(index === 0 ? values.title : file.title),
    );
    if (titles.some((title) => !title.success)) {
      setFiles((current) =>
        current.map((file, index) => ({
          ...file,
          error: titles[index]?.error?.issues[0]?.message,
        })),
      );
      return;
    }
    inFlight.current = true;
    controller.current = new AbortController();
    setError(null);
    setProgress(0);
    let completed = files.filter((file) => file.status === "uploaded").length;
    try {
      for (const [index, file] of files.entries()) {
        if (file.status === "uploaded") continue;
        if (!mounted.current || controller.current.signal.aborted) break;
        setActiveFile(index + 1);
        setProgress(0);
        setFiles((current) =>
          current.map((entry, i) =>
            i === index
              ? { ...entry, error: undefined, duplicate: undefined }
              : entry,
          ),
        );
        try {
          const fields: Record<string, string> = {
            title: index === 0 ? values.title : file.title.trim(),
            kind: values.kind,
          };
          if (values.chapter !== "")
            fields.chapter = String(Number(values.chapter));
          if (values.description.trim())
            fields.description = values.description.trim();
          const item = await api<Material>(
            `/subjects/${encodeURIComponent(slug)}/materials`,
            {
              method: "POST",
              signal: controller.current.signal,
              upload: {
                uri: file.asset.uri,
                file: file.asset.file,
                filename: file.asset.name,
                mimeType: file.asset.mimeType ?? "application/octet-stream",
                fields,
                onProgress: setProgress,
              },
            },
          );
          if (!mounted.current) break;
          queryClient.setQueryData(["material", item.id], item);
          completed += 1;
          setFiles((current) =>
            current.map((entry, i) =>
              i === index ? { ...entry, status: "uploaded" } : entry,
            ),
          );
        } catch (reason) {
          if (!mounted.current || controller.current.signal.aborted) break;
          const duplicate =
            reason instanceof ApiError &&
            reason.code === "duplicate" &&
            typeof reason.details.existing_material_id === "string"
              ? reason.details.existing_material_id
              : undefined;
          const message =
            reason instanceof Error
              ? reason.message
              : "Upload failed. Try again.";
          setFiles((current) =>
            current.map((entry, i) =>
              i === index
                ? { ...entry, status: "failed", error: message, duplicate }
                : entry,
            ),
          );
        }
      }
      if (!mounted.current) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["materials", slug] }),
        queryClient.invalidateQueries({ queryKey: ["subjects"] }),
        queryClient.invalidateQueries({ queryKey: ["subject", slug] }),
      ]);
      if (completed === files.length && !controller.current.signal.aborted)
        goBack("/(tabs)/subjects");
      else if (files.length > 1)
        setError(
          `${completed} of ${files.length} files uploaded. Retry the remaining files.`,
        );
    } catch {
      if (mounted.current)
        setError(
          "Couldn't refresh material. Return to the subject and try again.",
        );
    } finally {
      inFlight.current = false;
      controller.current = null;
      if (mounted.current) setProgress(null);
    }
  });
  return (
    <Screen
      title="Upload"
      subtitle="Share course material with BCS-3E."
      action={
        <TextAction
          onAccent
          label={progress === null ? "Close" : "Cancel upload"}
          onPress={() => {
            controller.current?.abort();
            goBack("/(tabs)/subjects");
          }}
        />
      }
    >
      <View style={styles.section}>
        <Text variant="label">Files</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={files.length ? "Change files" : "Choose files"}
          accessibilityState={{ disabled: progress !== null || choosing }}
          disabled={progress !== null || choosing}
          onPress={() => void choose()}
          style={({ pressed }) => [
            styles.filePicker,
            {
              backgroundColor: pressed ? theme.accentSoft : theme.surfaceFocus,
            },
          ]}
        >
          <Icon name="upload" active size={layout.featureIconSize} />
          <Text variant="bodyStrong">
            {choosing
              ? "Choosing files…"
              : files.length
                ? "Change files"
                : "Choose files"}
          </Text>
          <Text variant="caption" tone="muted">
            PDF, images, PPTX or DOCX · Up to 25 MB per file
          </Text>
        </Pressable>
        {files.map((file, index) => (
          <View key={file.asset.uri} style={styles.choice}>
            <Text variant="body" tone="muted">
              {file.asset.name} · {fileSize(file.asset.size ?? 0)}
              {file.status === "uploaded" ? " · Uploaded" : ""}
            </Text>
            {file.error ? <ErrorLine message={file.error} /> : null}
            {file.duplicate ? (
              <TextAction
                label={
                  files.length === 1
                    ? "View existing material"
                    : `View existing ${file.asset.name}`
                }
                disabled={progress !== null}
                onPress={() => router.replace(`/material/${file.duplicate}`)}
              />
            ) : null}
            {index === 0 ? (
              <Controller
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <Field
                    label="Title"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    maxLength={100}
                    editable={
                      progress === null && files[0]?.status !== "uploaded"
                    }
                  />
                )}
              />
            ) : (
              <Field
                label={`Title for ${file.asset.name}`}
                value={file.title}
                maxLength={100}
                editable={progress === null && file.status !== "uploaded"}
                onChangeText={(title) =>
                  setFiles((current) =>
                    current.map((entry, i) =>
                      i === index
                        ? { ...entry, title, error: undefined }
                        : entry,
                    ),
                  )
                }
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <View style={styles.choice}>
          <Text variant="caption" tone="muted">
            Type
          </Text>
          <Controller
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FilterText
                label="Material type"
                options={kindOptions}
                value={field.value}
                onChange={(value) => {
                  if (progress === null) field.onChange(value);
                }}
              />
            )}
          />
        </View>
        <Controller
          control={form.control}
          name="chapter"
          render={({ field, fieldState }) => (
            <Field
              label="Chapter (optional)"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
              maxLength={2}
              editable={progress === null}
            />
          )}
        />
      </View>
      <View style={styles.section}>
        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <>
              <Field
                label="Note (optional)"
                multiline
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
                maxLength={200}
                editable={progress === null}
              />
              <Text variant="caption" tone="muted">
                {field.value.length}/200
              </Text>
            </>
          )}
        />
        {progress !== null ? (
          <>
            {files.length > 1 ? (
              <Text variant="caption">
                Uploading file {activeFile} of {files.length}
              </Text>
            ) : null}
            <ProgressLine label="Upload progress" value={progress} />
          </>
        ) : null}
        {error ? <ErrorLine message={error} /> : null}
        <Button
          label="Upload"
          disabled={choosing || !files.length}
          loadingLabel={`Uploading ${Math.round((progress ?? 0) * 100)}%`}
          loading={progress !== null}
          onPress={() => void submit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm, paddingBottom: space.lg },
  section: { gap: space.lg, paddingBottom: space.lg },
  choice: { gap: space.sm },
  filePicker: {
    minHeight: controls.uploadHeight,
    padding: space.xl,
    borderRadius: controls.panelRadius,
    gap: space.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
