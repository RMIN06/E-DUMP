import { useLocalSearchParams } from "expo-router";
import { SubjectMaterialsScreen } from "../../src/features/materials/SubjectMaterialsScreen";
import { UpdatesScreen } from "../../src/features/announcements/UpdatesScreen";

export default function SubjectRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <SubjectMaterialsScreen
      updates={(onMaterials) => (
        <UpdatesScreen subjectSlug={slug} onMaterials={onMaterials} />
      )}
    />
  );
}
