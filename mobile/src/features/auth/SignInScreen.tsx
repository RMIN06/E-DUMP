import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "../../components/Button";
import { ErrorLine } from "../../components/ErrorLine";
import { Field } from "../../components/Field";
import { Screen } from "../../components/Screen";
import { ApiError } from "../../api/transport";
import { emailMessage, studentEmail } from "../../lib/email";
import { sessionActions } from "../../lib/session";
import { space } from "../../theme/spacing";

export function SignInScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const inFlight = useRef(false);
  const submit = async () => {
    if (inFlight.current) return;
    const normalized = studentEmail(email);
    setError(null);
    setFieldError(null);
    if (!normalized) {
      setFieldError(emailMessage);
      return;
    }
    inFlight.current = true;
    setWorking(true);
    try {
      await sessionActions.login(normalized);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "invalid_email")
        setFieldError(emailMessage);
      else if (!(
        failure instanceof ApiError && failure.code === "account_disabled"
      ))
        setError(
          failure instanceof ApiError && failure.code === "rate_limited"
            ? "Too many attempts. Wait a minute."
            : "Can't reach the server. Try again.",
        );
    } finally {
      inFlight.current = false;
      setWorking(false);
    }
  };
  return (
    <Screen
      title="BCS-3E"
      subtitle="Class material and alerts, in one place."
      keepFormEndVisible
    >
      <View style={styles.form}>
        <Field
          label="Student email"
          value={email}
          onChangeText={setEmail}
          error={fieldError}
          placeholder="l25xxxx@lhr.nu.edu.pk"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          editable={!working}
          autoFocus
        />
        {error ? (
          <ErrorLine message={error} onRetry={() => void submit()} />
        ) : null}
        <Button
          label="Continue"
          loading={working}
          onPress={() => void submit()}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  form: { gap: space.xl },
});
