import { router } from "expo-router";
import { View, StyleSheet, RefreshControl } from "react-native";
import { useSubjects, type Subject } from "../../api/subjects";
import { Screen } from "../../components/Screen";
import { Heading } from "../../components/Heading";
import { Text } from "../../components/Text";
import { Row } from "../../components/Row";
import { ErrorLine } from "../../components/ErrorLine";
import { EmptyState } from "../../components/EmptyState";
import { ProgressLine } from "../../components/ProgressLine";
import { space } from "../../theme/spacing";
import { useTheme } from "../../theme/tokens";
import { useFocusRead } from "../../api/useFocusRead";

export function SubjectsScreen() {
  const query = useSubjects();
  useFocusRead(query);
  const theme = useTheme();
  const header = (
    <View style={styles.header}>
      <Heading>Subjects</Heading>
      <Text variant="caption" tone="muted">
        Seven courses this semester
      </Text>
      {query.isPending ? <ProgressLine label="Loading subjects" /> : null}
      {query.isError ? (
        query.data ? (
          <Text variant="caption" tone="muted">
            Offline. Showing saved data.
          </Text>
        ) : (
          <ErrorLine
            message="Can't load subjects. Try again."
            onRetry={() => void query.refetch()}
          />
        )
      ) : null}
    </View>
  );
  return (
    <Screen
      list={{
        data: query.data ?? [],
        keyExtractor: (item: Subject) => item.id,
        ListHeaderComponent: header,
        refreshControl: (
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={theme.moss}
            colors={[theme.moss]}
          />
        ),
        renderItem: ({ item }) => (
          <Row
            title={item.name}
            heading
            meta={
              item.teacher && item.credits !== null
                ? `${item.teacher} · ${item.credits} ${item.credits === 1 ? "credit" : "credits"}`
                : "Credits and teacher to be added"
            }
            trailing={`${item.material_count} files`}
            onPress={() => router.push(`/subject/${item.slug}`)}
          />
        ),
        ListEmptyComponent:
          !query.isPending && !query.isError ? (
            <EmptyState
              title="No subjects yet"
              message="Ask a class admin to load the semester subjects."
            />
          ) : null,
        indicatorStyle: "white",
      }}
    />
  );
}
const styles = StyleSheet.create({
  header: { gap: space.sm, marginBottom: space.xl },
});
