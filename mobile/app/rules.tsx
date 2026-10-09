import { router } from "expo-router";
import { RulesScreen } from "../src/features/rules/RulesScreen";
export default function RulesRoute() {
  return <RulesScreen onClose={() => router.back()} />;
}
