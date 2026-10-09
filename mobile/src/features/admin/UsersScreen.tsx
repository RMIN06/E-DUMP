import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { api } from "../../api/client";
import { useAdminUsers, type AdminUser, type UserPatch } from "../../api/admin";
import { useFocusRead } from "../../api/useFocusRead";
import { queryClient } from "../../api/queryClient";
import { useSession } from "../../lib/session";
import { relativeTime } from "../../lib/format";
import { Screen } from "../../components/Screen";
import { Heading } from "../../components/Heading";
import { Row } from "../../components/Row";
import { Text } from "../../components/Text";
import { Field } from "../../components/Field";
import { Sheet } from "../../components/Sheet";
import { TextAction } from "../../components/TextAction";
import { EmptyState } from "../../components/EmptyState";
import { ErrorLine } from "../../components/ErrorLine";

export function UsersScreen() {
  const { user } = useSession();
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flight = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text), 250);
    return () => clearTimeout(timer);
  }, [text]);
  const query = useAdminUsers(search);
  useFocusRead(query);
  const change = async (body: UserPatch) => {
    if (!selected || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(null);
    try {
      await api<AdminUser>(`/admin/users/${selected.id}`, {
        method: "PATCH",
        body,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelected(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Couldn't change account.",
      );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen>
      <TextAction label="Me" onPress={() => router.back()} />
      <Heading>Users</Heading>
      <Field
        label="Search users"
        placeholder="Name or email"
        value={text}
        onChangeText={setText}
        maxLength={100}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {query.isPending ? <Text tone="muted">Loading users…</Text> : null}
      {query.isError ? (
        <ErrorLine
          message="Couldn't load users."
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data?.map((item) => (
        <Row
          key={item.id}
          title={item.name ?? "Name not set"}
          meta={`${item.email} · Last sign-in ${relativeTime(item.last_login_at)}`}
          trailing={`${item.role === "admin" ? "Admin" : "Student"}${item.is_active ? "" : " · Disabled"}`}
          onPress={() => {
            setSelected(item);
            setError(null);
          }}
          onLongPress={() => {
            setSelected(item);
            setError(null);
          }}
        />
      ))}
      {query.data?.length === 0 ? (
        <EmptyState
          title="No matching users"
          message="Try another name or email."
        />
      ) : null}
      <Sheet
        visible={Boolean(selected)}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
      >
        <Heading variant="h2">{selected?.name ?? "Name not set"}</Heading>
        <Text>{selected?.email}</Text>
        {selected ? (
          <Text variant="caption" tone="muted">
            Last sign-in {relativeTime(selected.last_login_at)}
          </Text>
        ) : null}
        {selected?.id === user?.id ? (
          <Text>You cannot remove your own admin access.</Text>
        ) : (
          <>
            <TextAction
              label={selected?.role === "admin" ? "Remove admin" : "Make admin"}
              disabled={busy}
              onPress={() =>
                void change({
                  role: selected?.role === "admin" ? "student" : "admin",
                })
              }
            />
            <TextAction
              label={selected?.is_active ? "Disable" : "Enable"}
              destructive={selected?.is_active}
              disabled={busy}
              onPress={() => void change({ is_active: !selected?.is_active })}
            />
          </>
        )}
        {error ? <ErrorLine message={error} /> : null}
      </Sheet>
    </Screen>
  );
}
