import { goBack } from "../../lib/navigation";
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { useMaterial, type ReportReason } from "../../api/materials";
import { api } from "../../api/client";
import { queryClient } from "../../api/queryClient";
import { useFocusRead } from "../../api/useFocusRead";
import { Screen } from "../../components/Screen";
import { Heading } from "../../components/Heading";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { Field } from "../../components/Field";
import { FilterText } from "../../components/FilterText";
import { Button } from "../../components/Button";
import { ErrorLine } from "../../components/ErrorLine";
import { ProgressLine } from "../../components/ProgressLine";
import { Sheet } from "../../components/Sheet";
import { useSession } from "../../lib/session";
import { cachedFile, removeCachedFile } from "../../lib/files";
import { fileSize, relativeTime } from "../../lib/format";
import { layout } from "../../theme/spacing";
import { kindLabel, reportOptions } from "./options";
import { useOpenFile } from "./hooks/useOpenFile";

export function MaterialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMaterial(id);
  useFocusRead(query);
  const item = query.data;
  const { user } = useSession();
  const opening = useOpenFile(false);
  const [uri, setUri] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"report" | "delete" | null>(null);
  const [reason, setReason] = useState<ReportReason>("wrong_subject");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  useEffect(() => {
    let active = true;
    if (item?.mime_type.startsWith("image/"))
      void cachedFile(item)
        .then((value) => {
          if (active) setUri(value);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [item]);
  const act = async () => {
    if (!item || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (sheet === "report") {
        await api(`/materials/${id}/report`, {
          method: "POST",
          body: { reason, note: note.trim() || null },
        });
        setReported(true);
        setSheet(null);
      } else if (sheet === "delete") {
        await api(`/materials/${id}`, { method: "DELETE" });
        await removeCachedFile(item);
        queryClient.removeQueries({ queryKey: ["material", id] });
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["materials", item.subject_slug],
          }),
          queryClient.invalidateQueries({ queryKey: ["subjects"] }),
          queryClient.invalidateQueries({
            queryKey: ["subject", item.subject_slug],
          }),
        ]);
        setSheet(null);
        goBack("/(tabs)/subjects");
      }
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Can't save while offline. Try again when connected.",
      );
    } finally {
      setBusy(false);
    }
  };
  const open = async () => {
    if (!item) return;
    await opening.open(item);
    if (item.mime_type.startsWith("image/")) {
      try {
        setUri(await cachedFile(item));
      } catch {
        setError("Couldn't display the image. Try again.");
      }
    }
  };
  return (
    <Screen
      title={item?.title ?? "Material"}
      action={
        <TextAction onAccent label="Back" onPress={() => goBack("/(tabs)/subjects")} />
      }
    >
      {item ? (
        <>
          <Text variant="caption" tone="muted">
            {[
              kindLabel(item.kind),
              item.chapter !== null ? `Ch ${item.chapter}` : null,
              fileSize(item.size_bytes),
              item.uploader_name,
              relativeTime(item.created_at),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text tone="muted">{item.original_name}</Text>
          {item.description ? <Text>{item.description}</Text> : null}
          {query.isError ? (
            <Text variant="caption" tone="muted">
              Offline. Showing saved data.
            </Text>
          ) : null}
          {uri ? (
            <Image
              source={{ uri }}
              contentFit="contain"
              accessible
              accessibilityLabel={item.title}
              style={styles.image}
            />
          ) : null}
          <Button
            label={uri ? "Open image" : "Open file"}
            disabled={opening.progress !== null}
            onPress={() => void open()}
          />
          {opening.progress !== null ? (
            <>
              <ProgressLine
                label="Download progress"
                value={opening.progress}
              />
              <Text tone="muted">
                Downloading {Math.round(opening.progress * 100)}%
              </Text>
              <TextAction label="Cancel download" onPress={opening.cancel} />
            </>
          ) : null}
          {opening.error ? <ErrorLine message={opening.error} /> : null}
          {reported ? (
            <Text tone="muted">Report sent.</Text>
          ) : (
            <TextAction
              label="Report material"
              onPress={() => {
                setError(null);
                setSheet("report");
              }}
            />
          )}
          {user?.role === "admin" || user?.id === item.uploader_id ? (
            <TextAction
              label="Delete material"
              destructive
              onPress={() => {
                setError(null);
                setSheet("delete");
              }}
            />
          ) : null}
        </>
      ) : query.isError ? (
        <ErrorLine
          message="Can't load material. Try again."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Text tone="muted">Loading material…</Text>
      )}
      <Sheet
        visible={sheet !== null}
        onClose={() => {
          if (!busy) setSheet(null);
        }}
      >
        <Heading>
          {sheet === "report" ? "Report material" : "Delete material"}
        </Heading>
        {sheet === "report" ? (
          <>
            <FilterText
              label="Report reason"
              options={reportOptions}
              value={reason}
              onChange={(value) => {
                if (!busy) setReason(value);
              }}
            />
            <Field
              label="Note (optional)"
              multiline
              maxLength={200}
              value={note}
              onChangeText={setNote}
              editable={!busy}
            />
            <Text variant="caption" tone="muted">
              {note.length}/200
            </Text>
          </>
        ) : (
          <Text>
            Remove this material and its file for everyone in the class?
          </Text>
        )}
        {error ? <ErrorLine message={error} /> : null}
        <Button
          label={
            busy ? "Working…" : sheet === "report" ? "Send report" : "Delete"
          }
          loading={busy}
          onPress={() => void act()}
        />
      </Sheet>
    </Screen>
  );
}
const styles = StyleSheet.create({
  image: { width: layout.columnWidth, aspectRatio: layout.fill },
});
