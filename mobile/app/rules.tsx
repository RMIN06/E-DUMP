import { goBack } from "../src/lib/navigation";
import { RulesScreen } from "../src/features/rules/RulesScreen";
export default function RulesRoute() {
  return <RulesScreen onClose={() => goBack("/(tabs)/me")} />;
}
