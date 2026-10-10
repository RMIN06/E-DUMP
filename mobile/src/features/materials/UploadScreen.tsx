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
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const picked = useRef<DocumentPicker.DocumentPickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", kind: "notes", chapter: "", description: "" },
  });
  useEffect(
    () => () => {
      controller.current?.abort();
      if (picked.current)
        void removePickedFile(picked.current.uri).catch(() => undefined);
    },
    [],
  );
  const choose = async () => {
    setError(null);
    setDuplicate(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...mimeTypes],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
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
        setError("Choose a non-empty file no larger than 25 MB.");
        return;
      }
      if (picked.current) await removePickedFile(picked.current.uri);
      picked.current = asset;
      setFile(asset);
      form.setValue("title", asset.name.replace(/\.[^.]+$/, "").slice(0, 100), {
        shouldValidate: true,
      });
    } catch {
      setError("Couldn't choose a file. Try again.");
    }
  };
  const submit = form.handleSubmit(async (values) => {
    if (inFlight.current) return;
    if (!file) {
      setError("Choose one file to upload.");
      return;
    }
    inFlight.current = true;
    controller.current = new AbortController();
    setError(null);
    setDuplicate(null);
    setProgress(0);
    try {
      const fields: Record<string, string> = {
        title: values.title,
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
            uri: file.uri,
            filename: file.name,
            mimeType: file.mimeType ?? "application/octet-stream",
            fields,
            onProgress: setProgress,
          },
        },
      );
      queryClient.setQueryData(["material", item.id], item);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["materials", slug] }),
        queryClient.invalidateQueries({ queryKey: ["subjects"] }),
        queryClient.invalidateQueries({ queryKey: ["subject", slug] }),
      ]);
      router.back();
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        reason.code === "duplicate" &&
        typeof reason.details.existing_material_id === "string"
      )
        setDuplicate(reason.details.existing_material_id);
      setError(
        reason instanceof Error
          ? reason.message
          : "Can't upload while offline. Try again when connected.",
      );
    } finally {
      inFlight.current = false;
      controller.current = null;
      setProgress(null);
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
            router.back();
          }}
        />
      }
    >
      <View style={styles.section}>
        <Text variant="label">File</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={file ? "Choose another file" : "Choose file"}
          accessibilityState={{ disabled: progress !== null }}
          disabled={progress !== null}
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
            {file ? "Choose another file" : "Choose file"}
          </Text>
          <Text variant="caption" tone="muted">
            PDF, images, PPTX or DOCX · Up to 25 MB
          </Text>
        </Pressable>
        {file ? (
          <Text variant="body" tone="muted">
            {file.name} · {fileSize(file.size ?? 0)}
          </Text>
        ) : null}
      </View>
      <View style={styles.section}>
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
              editable={progress === null}
            />
          )}
        />
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
          <ProgressLine label="Upload progress" value={progress} />
        ) : null}
        {error ? <ErrorLine message={error} /> : null}
        {duplicate ? (
          <TextAction
            label="View existing material"
            onPress={() => router.replace(`/material/${duplicate}`)}
          />
        ) : null}
        <Button
          label="Upload"
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
