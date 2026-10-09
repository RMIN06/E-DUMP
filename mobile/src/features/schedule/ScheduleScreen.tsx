import { useEffect, useState } from "react";
import { router } from "expo-router";
import { AppState, RefreshControl, StyleSheet, View } from "react-native";
import { useSchedule, type ScheduleSlot } from "../../api/schedule";
import { useFocusRead } from "../../api/useFocusRead";
import { Screen } from "../../components/Screen";
import { Heading } from "../../components/Heading";
import { Text } from "../../components/Text";
import { FilterText } from "../../components/FilterText";
import { EmptyState } from "../../components/EmptyState";
import { ErrorLine } from "../../components/ErrorLine";
import { ScheduleRow } from "../../components/ScheduleRow";
import { classTime, karachiDay, karachiTime } from "../../lib/format";
import { space } from "../../theme/spacing";
import { useTheme } from "../../theme/tokens";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
  (label, index) => ({ value: String(index + 1), label }),
);

export function ScheduleScreen() {
  const query = useSchedule();
  useFocusRead(query);
  const theme = useTheme();
  const [now, setNow] = useState(() => new Date());
  const [day, setDay] = useState(() => String(karachiDay()));
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => setNow(new Date());
    const activate = (active: boolean) => {
      clearInterval(timer);
      if (active) {
        update();
        timer = setInterval(update, 60_000);
      }
    };
    activate(AppState.currentState === "active");
    const listener = AppState.addEventListener("change", (state) =>
      activate(state === "active"),
    );
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  const slots = (query.data ?? []).filter(
    (slot) => String(slot.weekday) === day,
  );
  const today = Number(day) === karachiDay(now);
  const time = karachiTime(now);
  const current = today
    ? slots.find((slot) => slot.start <= time && time < slot.end)
    : undefined;
  const next =
    today && !current ? slots.find((slot) => slot.start > time) : undefined;
  return (
    <Screen
      list={{
        data: slots,
        keyExtractor: (slot: ScheduleSlot) => slot.id,
        ListHeaderComponent: (
          <View style={styles.header}>
            <Heading>Schedule</Heading>
            <Text variant="caption" tone="muted">
              Class times · Asia/Karachi
            </Text>
            <FilterText
              options={days}
              value={day}
              onChange={setDay}
              label="Day of the week"
            />
            {query.isPending ? (
              <Text tone="muted">Loading schedule…</Text>
            ) : null}
            {query.isError ? (
              query.data ? (
                <Text variant="caption" tone="muted">
                  Offline. Showing saved data.
                </Text>
              ) : (
                <ErrorLine
                  message="Can't load schedule. Try again."
                  onRetry={() => void query.refetch()}
                />
              )
            ) : null}
          </View>
        ),
        renderItem: ({ item }) => (
          <ScheduleRow
            time={`${classTime(item.start)} – ${classTime(item.end)}`}
            title={item.subject_name}
            meta={`${item.venue} · ${item.teacher ?? "Teacher to be added"}`}
            status={
              item.id === current?.id
                ? "Now"
                : item.id === next?.id
                  ? "Next"
                  : undefined
            }
            onPress={() => router.push(`/subject/${item.subject_slug}`)}
          />
        ),
        refreshControl: (
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={theme.moss}
            colors={[theme.moss]}
          />
        ),
        ListEmptyComponent:
          !query.isPending && (!query.isError || query.data) ? (
            <EmptyState
              title="No classes"
              message="There are no scheduled classes on this day."
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
