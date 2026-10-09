import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { api } from "../../api/client";
import {
  useAnnouncement,
  getAttachmentDownload,
  type Attachment,
  type Announcement,
} from "../../api/announcements";
import { queryClient } from "../../api/queryClient";
import { useFocusRead } from "../../api/useFocusRead";
import { Screen } from "../../components/Screen";
import { Heading } from "../../components/Heading";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { Row } from "../../components/Row";
import { Sheet } from "../../components/Sheet";
import { ErrorLine } from "../../components/ErrorLine";
import { ProgressLine } from "../../components/ProgressLine";
import { useSession } from "../../lib/session";
import { downloadFile, openDocument, removeCachedFile } from "../../lib/files";
import { dueDate, relativeTime, fileSize } from "../../lib/format";
import { layout } from "../../theme/spacing";

export function AnnouncementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useAnnouncement(id);
  useFocusRead(query);
  const { user } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [image, setImage] = useState<{ uri: string; name: string } | null>(
    null,
  );
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const open = async (file: Attachment) => {
    if (controller.current) return;
    controller.current = new AbortController();
    setError(null);
    setProgress(0);
    try {
      const uri = await downloadFile(
        file,
        () => getAttachmentDownload(id, file.file_id),
        setProgress,
        controller.current.signal,
      );
      if (!controller.current.signal.aborted) {
        if (file.mime_type.startsWith("image/"))
          setImage({ uri, name: file.original_name });
        else await openDocument(uri, file.mime_type);
      }
    } catch (reason) {
      if (!controller.current?.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Couldn't open attachment.",
        );
    } finally {
      controller.current = null;
      setProgress(null);
    }
  };
  const change = async (remove = false) => {
    if (flight.current || !query.data) return;
    flight.current = true;
    setBusy(true);
    setError(null);
    try {
      if (remove) {
        await api<void>(`/announcements/${id}`, { method: "DELETE" });
        for (const file of query.data.attachments) await removeCachedFile(file);
        queryClient.removeQueries({ queryKey: ["announcement", id] });
      } else {
        const item = await api<Announcement>(`/announcements/${id}`, {
          method: "PATCH",
          body: { pinned: !query.data.pinned },
        });
        queryClient.setQueryData(["announcement", id], item);
      }
      for (const key of ["announcements", "upcoming", "unread-updates"])
        void queryClient.invalidateQueries({ queryKey: [key] });
      setConfirm(false);
      if (remove) router.back();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Couldn't save update.",
      );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  const item = query.data;
  return (
    <Screen>
      <TextAction label="Updates" onPress={() => router.back()} />
      {query.isPending ? (
        <ProgressLine value={0} label="Loading update" />
      ) : null}
      {query.isError ? (
        item ? (
          <Text variant="caption" tone="muted">
            Offline. Showing saved data.
          </Text>
        ) : (
          <ErrorLine
            message="Couldn't load update."
            onRetry={() => void query.refetch()}
          />
        )
      ) : null}
      {item ? (
        <>
          <Text variant="label" tone="accent">
            {item.pinned ? "Pinned · " : ""}
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
          <Heading>{item.title}</Heading>
          <Text variant="caption" tone="muted">
            {item.subject_slug ? `${item.subject_slug.toUpperCase()} · ` : ""}
            {item.author_name} · {relativeTime(item.created_at)}
          </Text>
          <Text selectable>{item.body}</Text>
          {item.due_at ? (
            <Text variant="bodyStrong" tone="accent">
              Due {dueDate(item.due_at)}
            </Text>
          ) : null}
          {item.attachments.map((file) => (
            <Row
              key={file.file_id}
              title={file.original_name}
              meta={fileSize(file.size_bytes)}
              onPress={() => void open(file)}
            />
          ))}
          {progress !== null ? (
            <>
              <ProgressLine value={progress} label="Downloading attachment" />
              <Text variant="caption">
                Downloading {Math.round(progress * 100)}%
              </Text>
              <TextAction
                label="Cancel download"
                onPress={() => controller.current?.abort()}
              />
            </>
          ) : null}
          {image ? (
            <>
              <Image
                source={{ uri: image.uri }}
                contentFit="contain"
                accessibilityLabel={image.name}
                style={styles.image}
              />
              <TextAction label="Close image" onPress={() => setImage(null)} />
            </>
          ) : null}
          {user?.role === "admin" ? (
            <>
              <TextAction
                label="Edit"
                disabled={busy}
                onPress={() =>
                  router.push({ pathname: "/updates/new", params: { id } })
                }
              />
              <TextAction
                label={item.pinned ? "Unpin" : "Pin"}
                disabled={busy}
                onPress={() => void change()}
              />
              <TextAction
                label="Delete"
                destructive
                disabled={busy}
                onPress={() => setConfirm(true)}
              />
            </>
          ) : null}
        </>
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
      <Sheet
        visible={confirm}
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
      >
        <Heading variant="h2">Delete update?</Heading>
        <Text>
          The update and its attachments will be removed for everyone.
        </Text>
        <TextAction
          label="Delete update"
          destructive
          disabled={busy}
          onPress={() => void change(true)}
        />
        {error ? <ErrorLine message={error} /> : null}
      </Sheet>
    </Screen>
  );
}
const styles = StyleSheet.create({
  image: { width: layout.columnWidth, aspectRatio: layout.fill },
});
