import { MeScreen } from "../../src/features/auth/MeScreen";
import { NotificationControl } from "../../src/features/notifications/NotificationControl";
import { AdminLinks } from "../../src/features/admin/AdminLinks";

export default function MeRoute() {
  return (
    <MeScreen notifications={<NotificationControl />} admin={<AdminLinks />} />
  );
}
