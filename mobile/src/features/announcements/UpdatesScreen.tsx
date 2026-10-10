import { goBack } from "../../lib/navigation";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { RefreshControl, View, StyleSheet } from "react-native";
import { api } from "../../api/client";
import {
  useUpdates,
  useUpcoming,
  useUnreadCount,
  updateTypes,
  type Announcement,
} from "../../api/announcements";
import { useSubject, useSubjects } from "../../api/subjects";
import { queryClient } from "../../api/queryClient";
import { useFocusRead } from "../../api/useFocusRead";
import { Screen } from "../../components/Screen";
import { Heading } from "../../components/Heading";
import { Text } from "../../components/Text";
import { Row } from "../../components/Row";
import { FilterText } from "../../components/FilterText";
import { TextAction } from "../../components/TextAction";
import { ProgressLine } from "../../components/ProgressLine";
import { ErrorLine } from "../../components/ErrorLine";
import { EmptyState } from "../../components/EmptyState";
import { useSession } from "../../lib/session";
import { dueDate, relativeTime } from "../../lib/format";
import { space } from "../../theme/spacing";
import { useTheme } from "../../theme/tokens";

export function UpdatesScreen({
  subjectSlug,
  onMaterials,
}: {
  subjectSlug?: string;
  onMaterials?(): void;
}) {
  const [type, setType] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState(subjectSlug ?? "");
  const query = useUpdates(type, selectedSubject || undefined);
  const subjects = useSubjects();
  const upcoming = useUpcoming();
  const unread = useUnreadCount();
  const subject = useSubject(subjectSlug ?? "");
  const { user } = useSession();
  const theme = useTheme();
  const upcomingIds = new Set<string>();
  const upcomingItems = subjectSlug
    ? []
    : (upcoming.data ?? []).filter((item) => {
        if (type !== "all" && item.type !== type) return false;
        if (selectedSubject && item.subject_slug !== selectedSubject)
          return false;
        if (upcomingIds.has(item.id)) return false;
        upcomingIds.add(item.id);
        return true;
      });
  const renderedIds = new Set(upcomingIds);
  const updates = (
    query.data?.pages.flatMap((page) => page.items) ?? []
  ).filter((item) => {
    if (renderedIds.has(item.id)) return false;
    renderedIds.add(item.id);
    return true;
  });
  useFocusRead(query);
  useFocusRead(upcoming);
  useFocusEffect(
    useCallback(() => {
      void api<void>("/me/seen-updates", { method: "POST" })
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ["unread-updates"] }),
        )
        .catch(() => undefined);
    }, []),
  );
  const open = (item: Announcement) => {
    queryClient.setQueryData(["announcement", item.id], item);
    router.push(`/updates/${item.id}`);
  };
  const header = (
    <>
      {subjectSlug ? (
        <TextAction label="Subjects" onPress={() => goBack("/(tabs)/subjects")} />
      ) : null}

      {subjectSlug && onMaterials ? (
        <FilterText
          label="Subject view"
          options={[
            { value: "material", label: "Material" },
            { value: "updates", label: "Updates" },
          ]}
          value="updates"
          onChange={(value) => {
            if (value === "material") onMaterials();
          }}
        />
      ) : null}
      {!subjectSlug && unread.data?.count ? (
        <Text variant="caption" tone="muted">
          {unread.data.count} new
        </Text>
      ) : null}
      <FilterText
        label="Update type"
        options={["all", ...updateTypes].map((value) => ({
          value,
          label: value.charAt(0).toUpperCase() + value.slice(1),
        }))}
        value={type}
        onChange={setType}
      />
      {subjectSlug ? (
        <FilterText
          label="Update subject"
          options={[
            { value: "", label: "All subjects" },
            ...(subjects.data?.map((item) => ({
              value: item.slug,
              label: item.short_name,
            })) ?? []),
          ]}
          value={selectedSubject}
          onChange={setSelectedSubject}
        />
      ) : null}
      {subjectSlug ? (
        <Text variant="caption" tone="muted">
          Updates for {subject.data?.short_name ?? subjectSlug}
        </Text>
      ) : null}
      {query.isError && query.data ? (
        <Text variant="caption" tone="muted">
          Offline. Showing saved data.
        </Text>
      ) : null}
      {upcomingItems.length ? (
        <>
          <Heading variant="h2">Coming up</Heading>
          {upcomingItems.map((item) => (
            <Row
              key={item.id}
              title={item.title}
              titleVariant="h3"
              accentPrefix={`${item.pinned ? "Pinned · " : ""}${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`}
              meta={`${item.pinned ? "Pinned · " : ""}${item.type.charAt(0).toUpperCase() + item.type.slice(1)}${item.subject_slug ? ` · ${item.subject_slug.toUpperCase()}` : ""} · ${item.author_name}`}
              trailing={item.due_at ? dueDate(item.due_at) : undefined}
              onPress={() => open(item)}
            />
          ))}
        </>
      ) : null}
      {query.isPending ? <ProgressLine label="Loading updates" /> : null}
      {query.isError && !query.data ? (
        <ErrorLine
          message="Couldn't load updates."
          onRetry={() => void query.refetch()}
        />
      ) : null}
    </>
  );
  return (
    <Screen
      title={subjectSlug ? (subject.data?.short_name ?? "Subject") : "Updates"}
      subtitle={
        subjectSlug ? "Course updates" : "Class announcements and deadlines"
      }
      action={
        user?.role === "admin" ? (
          <TextAction
            onAccent
            label="Post"
            onPress={() =>
              router.push({
                pathname: "/updates/new",
                params: subjectSlug ? { subject: subjectSlug } : {},
              })
            }
          />
        ) : null
      }
      list={{
        data: updates,
        keyExtractor: (item) => item.id,
        ListHeaderComponent: <View style={styles.header}>{header}</View>,
        renderItem: ({ item }) => (
          <Row
            title={item.title}
            titleVariant="h3"
            accentPrefix={`${item.pinned ? "Pinned · " : ""}${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`}
            meta={`${item.pinned ? "Pinned · " : ""}${item.type.charAt(0).toUpperCase() + item.type.slice(1)}${item.subject_slug ? ` · ${item.subject_slug.toUpperCase()}` : ""} · ${item.author_name} · ${relativeTime(item.created_at)}`}
            onPress={() => open(item)}
          />
        ),
        ListEmptyComponent:
          !query.isPending && !query.isError && !upcomingItems.length ? (
            <EmptyState
              title="Nothing here yet"
              message="Class updates will appear here."
            />
          ) : null,
        ListFooterComponent: query.isFetchingNextPage ? (
          <Text variant="caption">Loading more…</Text>
        ) : query.isFetchNextPageError ? (
          <ErrorLine
            message="Couldn't load more updates."
            onRetry={() => void query.fetchNextPage()}
          />
        ) : null,
        onEndReached: () => {
          if (query.hasNextPage && !query.isFetchingNextPage)
            void query.fetchNextPage();
        },
        refreshControl: (
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            tintColor={theme.moss}
            colors={[theme.moss]}
            onRefresh={() => {
              void query.refetch();
              void upcoming.refetch();
            }}
          />
        ),
      }}
    />
  );
}
const styles = StyleSheet.create({
  header: { gap: space.lg },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: space.lg },
});
