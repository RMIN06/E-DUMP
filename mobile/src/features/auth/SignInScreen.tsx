import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "../../components/Button";
import { ErrorLine } from "../../components/ErrorLine";
import { Field } from "../../components/Field";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
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
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    if (!challenge) return;
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [challenge, resendAt]);
  const submit = async (resend = false) => {
    if (inFlight.current) return;
    const normalized = studentEmail(email);
    setError(null);
    setFieldError(null);
    if (!normalized) {
      setFieldError(emailMessage);
      return;
    }
    if (challenge && !resend && !/^[0-9]{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    inFlight.current = true;
    setWorking(true);
    try {
      if (challenge && !resend) {
        await sessionActions.login(normalized, code, challenge);
      } else {
        const response = await sessionActions.requestCode(normalized);
        setChallenge(response.challenge_id);
        setCode("");
        setResendAt(Date.now() + response.retry_after * 1000);
      }
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "invalid_email")
        setFieldError(emailMessage);
      else if (
        failure instanceof ApiError &&
        failure.code === "account_disabled"
      )
        await sessionActions.block();
      else
        setError(
          failure instanceof ApiError && failure.code === "invalid_code"
            ? "Code is incorrect or expired. Request a new code if needed."
            : failure instanceof ApiError && failure.code === "rate_limited"
              ? failure.message
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
          editable={!working && !challenge}
          autoFocus
        />
        {challenge ? (
          <>
            <Text>
              We sent a 6-digit code to {email.trim().toLowerCase()}. It expires
              in 10 minutes.
            </Text>
            <Field
              key={challenge}
              label="Verification code"
              value={code}
              onChangeText={(value) => setCode(value.replace(/\s/g, ""))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={6}
              autoFocus
              editable={!working}
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />
          </>
        ) : null}
        {error ? (
          <ErrorLine message={error} onRetry={() => void submit()} />
        ) : null}
        <Button
          label={challenge ? "Verify and sign in" : "Send verification code"}
          loading={working}
          onPress={() => void submit()}
        />
        {challenge ? (
          <>
            <TextAction
              label={remaining ? `Resend code in ${remaining}s` : "Resend code"}
              disabled={working || remaining > 0}
              onPress={() => void submit(true)}
            />
            <TextAction
              label="Change email"
              disabled={working}
              onPress={() => {
                setChallenge(null);
                setCode("");
                setError(null);
                setFieldError(null);
              }}
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  form: { gap: space.xl },
});
