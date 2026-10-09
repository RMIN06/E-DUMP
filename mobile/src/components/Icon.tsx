import {
  BookOpen,
  CalendarDays,
  UserRound,
  ChevronLeft,
  Ellipsis,
  Bell,
} from "lucide-react-native";
import { layout } from "../theme/spacing";
import { useTheme } from "../theme/tokens";

const icons = {
  updates: Bell,
  subjects: BookOpen,
  schedule: CalendarDays,
  me: UserRound,
  back: ChevronLeft,
  overflow: Ellipsis,
};
export function Icon({
  name,
  active = false,
}: {
  name: keyof typeof icons;
  active?: boolean;
}) {
  const theme = useTheme();
  const Glyph = icons[name];
  return (
    <Glyph
      size={layout.iconSize}
      strokeWidth={layout.iconStroke}
      color={active ? theme.moss : theme.boneMuted}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
