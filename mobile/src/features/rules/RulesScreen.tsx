import { Linking } from "react-native";
import { Screen } from "../../components/Screen";
import { Heading } from "../../components/Heading";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { Button } from "../../components/Button";
import { ErrorLine } from "../../components/ErrorLine";

export const supportEmails = ["l250716@lhr.nu.edu.pk"] as const;
export function RulesScreen({
  onContinue,
  onClose,
  working = false,
  error,
}: {
  onContinue?(): void;
  onClose?(): void;
  working?: boolean;
  error?: string | null;
}) {
  return (
    <Screen
      title="Rules"
      action={
        onClose ? (
          <TextAction onAccent label="Back to Me" onPress={onClose} />
        ) : null
      }
    >
      <Text>Course-related material only.</Text>
      <Text>
        Upload only what you are allowed to share. Do not upload leaked papers
        or solutions during an ongoing quiz or exam.
      </Text>
      <Text>Admins may remove anything without notice.</Text>
      <Text>Repeated violations lead to a disabled account.</Text>
      <Heading variant="h2">Your data</Heading>
      <Text>
        We store your name, student email, push token and class content to
        operate this app. Other students see your name on uploads; admins can
        see emails. Expo processes push tokens to deliver alerts. We collect no
        location, contacts or advertising data.
      </Text>
      <Text>
        Delete account in Me removes your account, devices and sessions. Uploads
        remain as Former member. Delete your own files first if you want them
        removed too.
      </Text>
      <Heading variant="h2">Contact</Heading>
      <Text>For support, deletion help or copyright takedown requests:</Text>
      {supportEmails.map((email) => (
        <TextAction
          key={email}
          label={email}
          onPress={() => {
            void Linking.openURL(`mailto:${email}`).catch(() => undefined);
          }}
        />
      ))}
      {error ? <ErrorLine message={error} /> : null}
      {onContinue ? (
        <Button label="Continue" loading={working} onPress={onContinue} />
      ) : null}
    </Screen>
  );
}
