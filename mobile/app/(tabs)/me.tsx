import { MeScreen } from "../../src/features/auth/MeScreen";
import { NotificationControl } from "../../src/features/notifications/NotificationControl";

export default function MeRoute() {
  return <MeScreen notifications={<NotificationControl />} />;
}
