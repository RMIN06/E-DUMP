import { useCallback, useEffect, useRef, useState } from "react";
import { Switch, View, StyleSheet } from "react-native";
import { controls, space } from "../../theme/spacing";
import { useFocusEffect } from "expo-router";
import { api } from "../../api/client";
import {
  disableNotifications,
  notificationsEnabled,
  pushProjectId,
  registerNotifications,
} from "../../lib/notifications";
import { useTheme } from "../../theme/tokens";
import { Text } from "../../components/Text";
import { ErrorLine } from "../../components/ErrorLine";

export function NotificationControl() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const flight = useRef(false);
  const theme = useTheme();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      void notificationsEnabled()
        .then((value) => {
          if (mounted.current) setEnabled(value);
        })
        .catch(() => undefined);
    }, []),
  );
  const toggle = async (value: boolean) => {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(null);
    try {
      if (value) await registerNotifications(api, true);
      else await disableNotifications(api);
      if (mounted.current) setEnabled(value);
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Couldn't change notifications.",
        );
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <>
      <View style={[styles.setting, { backgroundColor: theme.surface }]}>
        <Text>Notifications</Text>
        <Switch
          accessibilityLabel="Notifications"
          value={enabled}
          disabled={busy || !pushProjectId()}
          onValueChange={(value) => void toggle(value)}
          trackColor={{ false: theme.olive, true: theme.moss }}
          thumbColor={theme.bone}
        />
      </View>
      {!pushProjectId() ? (
        <Text variant="caption" tone="muted">
          Notifications will be available after the preview is configured.
        </Text>
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
    </>
  );
}
const styles = StyleSheet.create({
  setting: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    padding: space.lg,
    borderRadius: controls.panelRadius,
  },
});
