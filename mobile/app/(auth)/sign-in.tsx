import { SignInScreen } from "../../src/features/auth/SignInScreen";
import { WelcomeGate } from "../../src/features/auth/WelcomeGate";

export default function SignInRoute() {
  return (
    <WelcomeGate>
      <SignInScreen />
    </WelcomeGate>
  );
}
