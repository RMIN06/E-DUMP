import { useEffect, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { RefreshControl, StyleSheet, View } from "react-native";
import { useSubject } from "../../api/subjects";
import {
  useMaterials,
  type Material,
  type MaterialKind,
} from "../../api/materials";
import { useFocusRead } from "../../api/useFocusRead";
import { Screen } from "../../components/Screen";
import { Heading } from "../../components/Heading";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { Field } from "../../components/Field";
import { Row } from "../../components/Row";
import { FilterText } from "../../components/FilterText";
import { ErrorLine } from "../../components/ErrorLine";
import { EmptyState } from "../../components/EmptyState";
import { ProgressLine } from "../../components/ProgressLine";
import { fileSize, relativeTime } from "../../lib/format";
import { space } from "../../theme/spacing";
import { useTheme } from "../../theme/tokens";
import { queryClient } from "../../api/queryClient";
import { kindLabel, kindOptions } from "./options";
import { useOpenFile } from "./hooks/useOpenFile";

const kinds = [{ value: "all" as const, label: "All" }, ...kindOptions];
export function SubjectMaterialsScreen({
  updates,
}: {
  updates?: (onMaterials: () => void) => ReactNode;
}) {
  const [showUpdates, setShowUpdates] = useState(false);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const subject = useSubject(slug);
  useFocusRead(subject);
  const [kind, setKind] = useState<MaterialKind | "all">("all");
  const [chapter, setChapter] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQ(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useMaterials(slug, { kind, chapter, q });
  useFocusRead(query);
  const theme = useTheme();
  const opening = useOpenFile();
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const chapters = query.data?.pages[0]?.chapters ?? [];
  const upload = () => router.push(`/upload/${slug}`);
  const details = (item: Material) => {
    queryClient.setQueryData(["material", item.id], item);
    router.push(`/material/${item.id}`);
  };
  const header = (
    <View style={styles.header}>
      <TextAction label="Back to Subjects" onPress={() => router.back()} />
      <View style={styles.title}>
        <Heading>{subject.data?.short_name ?? "Subject"}</Heading>
        <TextAction label="Upload" onPress={upload} />
      </View>
      {subject.data ? (
        <Text variant="caption" tone="muted">
          {subject.data.teacher ?? "Credits and teacher to be added"} ·{" "}
          {subject.data.material_count}{" "}
          {subject.data.material_count === 1 ? "file" : "files"}
        </Text>
      ) : null}
      {updates ? (
        <FilterText
          label="Subject view"
          options={[
            { value: "material", label: "Material" },
            { value: "updates", label: "Updates" },
          ]}
          value="material"
          onChange={(value) => setShowUpdates(value === "updates")}
        />
      ) : null}
      <Field
        label="Search"
        placeholder="Search title, chapter or filename"
        value={search}
        onChangeText={setSearch}
        maxLength={100}
        returnKeyType="search"
        autoCorrect={false}
      />
      <FilterText<MaterialKind | "all">
        label="Material kind"
        options={kinds}
        value={kind}
        onChange={setKind}
      />
      <FilterText
        label="Chapter"
        options={[
          { value: "all", label: "Any chapter" },
          ...chapters.map((number) => ({
            value: String(number),
            label: String(number),
          })),
        ]}
        value={chapter}
        onChange={setChapter}
      />
      {query.isPending ? <ProgressLine label="Loading materials" /> : null}
      {query.isError ? (
        query.data ? (
          <Text variant="caption" tone="muted">
            Offline. Showing saved data.
          </Text>
        ) : (
          <ErrorLine
            message="Can't load materials. Try again."
            onRetry={() => void query.refetch()}
          />
        )
      ) : null}
    </View>
  );
  if (showUpdates && updates) return updates(() => setShowUpdates(false));
  return (
    <Screen
      footer={
        opening.progress !== null ? (
          <>
            <Text tone="muted">
              Downloading {Math.round(opening.progress * 100)}%
            </Text>
            <ProgressLine label="Download progress" value={opening.progress} />
            <TextAction label="Cancel download" onPress={opening.cancel} />
          </>
        ) : opening.error ? (
          <ErrorLine message={opening.error} />
        ) : null
      }
      list={{
        data: items,
        keyExtractor: (item: Material) => item.id,
        ListHeaderComponent: header,
        refreshControl: (
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={theme.moss}
            colors={[theme.moss]}
          />
        ),
        renderItem: ({ item }) => (
          <Row
            title={item.title}
            titleVariant="h3"
            accentPrefix={kindLabel(item.kind)}
            meta={[
              kindLabel(item.kind),
              item.chapter !== null ? `Ch ${item.chapter}` : null,
              fileSize(item.size_bytes),
              item.uploader_name,
              relativeTime(item.created_at),
            ]
              .filter(Boolean)
              .join(" · ")}
            onPress={() => void opening.open(item)}
            onDetails={() => details(item)}
            onLongPress={() => details(item)}
          />
        ),
        onEndReached: () => {
          if (query.hasNextPage && !query.isFetching)
            void query.fetchNextPage();
        },
        ListFooterComponent: query.isFetchingNextPage ? (
          <Text tone="muted">Loading more…</Text>
        ) : query.isFetchNextPageError ? (
          <ErrorLine
            message="Can't load more. Try again."
            onRetry={() => void query.fetchNextPage()}
          />
        ) : null,
        ListEmptyComponent:
          !query.isPending && (!query.isError || query.data) ? (
            <EmptyState
              title="No materials"
              message="Try another filter, or share the first file for this subject."
              action="Upload"
              onAction={upload}
            />
          ) : null,
        indicatorStyle: "white",
      }}
    />
  );
}
const styles = StyleSheet.create({
  header: { gap: space.lg, marginBottom: space.xl },
  title: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.lg,
  },
});
