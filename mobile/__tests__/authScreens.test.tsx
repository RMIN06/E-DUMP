import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SignInScreen } from "../src/features/auth/SignInScreen";
import { NameScreen } from "../src/features/auth/NameScreen";
import { BlockedScreen } from "../src/features/auth/BlockedScreen";
import { MeScreen } from "../src/features/auth/MeScreen";
import { AuthGate, SessionRedirect } from "../src/features/auth/AuthGate";
import { sessionActions, useSession } from "../src/lib/session";
import { ApiError } from "../src/api/transport";
import { theme } from "../src/theme/tokens";
import { clearDownloads } from "../src/lib/files";

jest.mock("../src/lib/files", () => ({ clearDownloads: jest.fn() }));

jest.mock("../src/lib/session", () => ({
  useSession: jest.fn(),
  sessionActions: {
    login: jest.fn(),
    restore: jest.fn(),
    updateName: jest.fn(),
    signOut: jest.fn(),
  },
}));
jest.mock("../src/api/cache", () => ({
  privateCache: { start: jest.fn(), stop: jest.fn() },
}));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const Stack = ({ children }: { children: React.ReactNode }) => children;
  Stack.Screen = function MockScreen({ name }: { name: string }) {
    return React.createElement(Text, null, name);
  };
  Stack.Protected = function MockProtected({
    guard,
    children,
  }: {
    guard: boolean;
    children: React.ReactNode;
  }) {
    return guard ? children : null;
  };
  return {
    router: { replace: jest.fn(), push: jest.fn() },
    Stack,
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, null, href),
  };
});

const state = { status: "signedOut" as const, accessToken: null, user: null };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue(state);
  jest.mocked(sessionActions.login).mockResolvedValue(undefined);
  jest.mocked(sessionActions.updateName).mockResolvedValue(undefined);
  jest.mocked(sessionActions.restore).mockResolvedValue(undefined);
  jest.mocked(sessionActions.signOut).mockResolvedValue(undefined);
});

describe("AUTH-1: sign-in screen", () => {
  test("invalid address shows inline error without a request", async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Student email"),
      "someone@gmail.com",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByText("Use your student email, like l25xxxx@lhr.nu.edu.pk"),
    ).toBeTruthy();
    expect(sessionActions.login).not.toHaveBeenCalled();
  });
  test("valid email uses normalized value and the specified native field options", async () => {
    await render(<SignInScreen />);
    const field = screen.getByLabelText("Student email");
    expect(field.props).toMatchObject({
      keyboardType: "email-address",
      autoCapitalize: "none",
      autoCorrect: false,
      textContentType: "emailAddress",
      returnKeyType: "go",
      autoFocus: true,
    });
    await fireEvent.changeText(field, " L250001@LHR.NU.EDU.PK ");
    await fireEvent(field, "submitEditing");
    expect(sessionActions.login).toHaveBeenCalledWith("l250001@lhr.nu.edu.pk");
  });
  test.each(["invalid_email", "rate_limited", "account_disabled", "network"])(
    "handles %s",
    async (code) => {
      jest
        .mocked(sessionActions.login)
        .mockRejectedValue(
          code === "network"
            ? new Error("offline")
            : new ApiError(
                code === "rate_limited" ? 429 : 403,
                code,
                "failure",
              ),
        );
      await render(<SignInScreen />);
      await fireEvent.changeText(
        screen.getByLabelText("Student email"),
        "l250001@lhr.nu.edu.pk",
      );
      await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
      if (code === "invalid_email")
        expect(
          screen.getByText(
            "Use your student email, like l25xxxx@lhr.nu.edu.pk",
          ),
        ).toBeTruthy();
      if (code === "rate_limited")
        expect(
          screen.getByText("Too many attempts. Wait a minute."),
        ).toBeTruthy();
      if (code === "network") {
        expect(
          screen.getByText("Can't reach the server. Try again."),
        ).toBeTruthy();
        await fireEvent.press(
          screen.getByRole("button", { name: "Try again" }),
        );
        expect(sessionActions.login).toHaveBeenCalledTimes(2);
      }
      if (code === "account_disabled")
        expect(
          screen.queryByText("Can't reach the server. Try again."),
        ).toBeNull();
    },
  );
  test("working state disables a second submit", async () => {
    let complete: () => void = () => {};
    jest.mocked(sessionActions.login).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    await render(<SignInScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Student email"),
      "l250001@lhr.nu.edu.pk",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    const working = screen.getByRole("button", { name: "Working…" });
    expect(working.props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });
    await fireEvent(screen.getByLabelText("Student email"), "submitEditing");
    expect(sessionActions.login).toHaveBeenCalledTimes(1);
    await act(() => complete());
  });
  test("field focus uses an underline and errors wrap at body scale", async () => {
    await render(<SignInScreen />);
    const field = screen.getByLabelText("Student email");
    await fireEvent(field, "focus", {});
    expect(StyleSheet.flatten(field.props.style)).toMatchObject({
      borderBottomWidth: 2,
      borderBottomColor: theme.moss,
    });
    await fireEvent(field, "blur", {});
    expect(StyleSheet.flatten(field.props.style)).toMatchObject({
      borderBottomWidth: 1,
      borderBottomColor: theme.olive,
    });
  });
});

describe("AUTH-1/AUTH-4: name, disabled and profile screens", () => {
  test("clear downloads retries cache cleanup without signing out", async () => {
    jest
      .mocked(clearDownloads)
      .mockRejectedValueOnce(new Error("disk"))
      .mockResolvedValueOnce(undefined);
    await render(<MeScreen />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Clear downloads" }),
    );
    expect(
      screen.getByText("Couldn't clear downloads. Try again."),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(clearDownloads).toHaveBeenCalledTimes(2);
    expect(sessionActions.signOut).not.toHaveBeenCalled();
  });
  test("name validation, then successful save", async () => {
    await render(<NameScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Use 2–40 characters for your name.")).toBeTruthy();
    expect(sessionActions.updateName).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText("Name"), " Ali Raza ");
    await fireEvent(screen.getByLabelText("Name"), "submitEditing");
    expect(sessionActions.updateName).toHaveBeenCalledWith("Ali Raza");
    expect(router.replace).toHaveBeenCalledWith("/me");
  });
  test("name error offers retry", async () => {
    jest
      .mocked(sessionActions.updateName)
      .mockRejectedValue(new Error("offline"));
    await render(<NameScreen />);
    await fireEvent.changeText(screen.getByLabelText("Name"), "Ali Raza");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Can't save your name. Try again.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(sessionActions.updateName).toHaveBeenCalledTimes(2);
  });
  test("blocked screen explains how to recover and can sign out", async () => {
    await render(<BlockedScreen />);
    expect(screen.getByRole("header").props.children).toBe("Account disabled");
    expect(screen.getByText("Contact a class admin.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    expect(sessionActions.signOut).toHaveBeenCalled();
  });
  test("blocked sign-out failure offers retry", async () => {
    jest.mocked(sessionActions.signOut).mockRejectedValue(new Error("storage"));
    await render(<BlockedScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    expect(
      screen.getByText("Couldn't clear saved data. Try again."),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  });
  test("profile name edit and sign-out are the only M1 actions", async () => {
    await render(<MeScreen />);
    expect(screen.getByRole("header").props.children).toBe("Me");
    await fireEvent.press(screen.getByRole("button", { name: "Name" }));
    expect(router.push).toHaveBeenCalledWith("/name");
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    expect(sessionActions.signOut).toHaveBeenCalled();
    expect(screen.queryByText("Admin")).toBeNull();
  });
  test("profile clear-data errors offer retry", async () => {
    jest.mocked(sessionActions.signOut).mockRejectedValue(new Error("storage"));
    await render(<MeScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    expect(
      screen.getByText("Couldn't clear saved data. Try again."),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  });
});

describe("AUTH-2/AUTH-3: navigation authorization and restore gate", () => {
  test.each([
    ["signedOut", "/sign-in", "(auth)/sign-in"],
    ["needsName", "/name", "(auth)/name"],
    ["blocked", "/blocked", "(auth)/blocked"],
    ["signedIn", "/updates", "(tabs)"],
  ] as const)(
    "%s exposes only authorized screens",
    async (status, href, route) => {
      jest.mocked(useSession).mockReturnValue({ ...state, status });
      await render(<AuthGate />);
      expect(screen.getByText(route)).toBeTruthy();
      if (status !== "signedIn")
        expect(screen.queryByText("(tabs)")).toBeNull();
      for (const protectedRoute of [
        "subject/[slug]",
        "material/[id]",
        "upload/[slug]",
      ])
        expect(Boolean(screen.queryByText(protectedRoute))).toBe(
          status === "signedIn",
        );
      expect(SplashScreen.hideAsync).toHaveBeenCalled();
      await render(<SessionRedirect />);
      expect(screen.getByText(href)).toBeTruthy();
    },
  );
  test("splash remains during bounded session restore", async () => {
    jest.mocked(useSession).mockReturnValue({ ...state, status: "restoring" });
    const gate = await render(<AuthGate />);
    expect(gate.toJSON()).toBeNull();
    expect(sessionActions.restore).toHaveBeenCalled();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    const redirect = await render(<SessionRedirect />);
    expect(redirect.toJSON()).toBeNull();
  });
});
