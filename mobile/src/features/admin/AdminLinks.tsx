import { router } from "expo-router";
import { useAdminReports } from "../../api/admin";
import { useFocusRead } from "../../api/useFocusRead";
import { Heading } from "../../components/Heading";
import { TextAction } from "../../components/TextAction";

export function AdminLinks() {
  const reports = useAdminReports();
  useFocusRead(reports);
  return (
    <>
      <Heading variant="h2">Admin</Heading>
      <TextAction
        row
        label="Users"
        onPress={() => router.push("/admin/users")}
      />
      <TextAction
        row
        label={
          reports.data ? `Reports (${reports.data.length} open)` : "Reports"
        }
        onPress={() => router.push("/admin/reports")}
      />
    </>
  );
}
