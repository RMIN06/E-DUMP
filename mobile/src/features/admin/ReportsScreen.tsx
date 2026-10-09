import { useRef, useState } from "react";
import { router } from "expo-router";
import { api } from "../../api/client";
import { useAdminReports, type AdminReport } from "../../api/admin";
import { useFocusRead } from "../../api/useFocusRead";
import { queryClient } from "../../api/queryClient";
import { relativeTime } from "../../lib/format";
import { Screen } from "../../components/Screen";
import { Heading } from "../../components/Heading";
import { Row } from "../../components/Row";
import { Text } from "../../components/Text";
import { Sheet } from "../../components/Sheet";
import { TextAction } from "../../components/TextAction";
import { EmptyState } from "../../components/EmptyState";
import { ErrorLine } from "../../components/ErrorLine";

export function ReportsScreen() {
  const query = useAdminReports();
  useFocusRead(query);
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flight = useRef(false);
  const resolve = async (action: "remove_material" | "dismiss") => {
    if (!selected || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(null);
    try {
      await api<void>(`/admin/reports/${selected.id}`, {
        method: "PATCH",
        body: { action },
      });
      for (const key of [
        "admin-reports",
        "subjects",
        "subject",
        "materials",
        "material",
      ])
        void queryClient.invalidateQueries({ queryKey: [key] });
      setSelected(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Couldn't resolve report.",
      );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen>
      <TextAction label="Me" onPress={() => router.back()} />
      <Heading>Reports</Heading>
      {query.isPending ? <Text tone="muted">Loading reports…</Text> : null}
      {query.isError ? (
        <ErrorLine
          message="Couldn't load reports."
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data?.map((item) => (
        <Row
          key={item.id}
          title={item.material_title}
          meta={`${item.reason.replaceAll("_", " ")} · ${item.reporter_name} · ${relativeTime(item.created_at)}`}
          onPress={() => {
            setSelected(item);
            setError(null);
          }}
        />
      ))}
      {query.data?.length === 0 ? (
        <EmptyState
          title="No open reports"
          message="Reported material will appear here."
        />
      ) : null}
      <Sheet
        visible={Boolean(selected)}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
      >
        <Heading variant="h2">{selected?.material_title}</Heading>
        <Text>{selected?.reason.replaceAll("_", " ")}</Text>
        <Text variant="caption" tone="muted">
          Reported by {selected?.reporter_name}
        </Text>
        {selected?.note ? <Text selectable>{selected.note}</Text> : null}
        {selected?.material_removed ? (
          <Text>Material already removed.</Text>
        ) : (
          <TextAction
            label="Open material"
            disabled={busy}
            onPress={() => {
              if (selected) {
                router.push(`/material/${selected.material_id}`);
                setSelected(null);
              }
            }}
          />
        )}
        <TextAction
          label="Remove material"
          destructive
          disabled={busy}
          onPress={() => void resolve("remove_material")}
        />
        <TextAction
          label="Dismiss"
          disabled={busy}
          onPress={() => void resolve("dismiss")}
        />
        {error ? <ErrorLine message={error} /> : null}
      </Sheet>
    </Screen>
  );
}
