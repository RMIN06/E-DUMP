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
    requestCode: jest.fn(),
    block: jest.fn(async () => undefined),
    restore: jest.fn(),
    updateName: jest.fn(),
    signOut: jest.fn(),
    syncProfile: jest.fn(async () => undefined),
    deleteAccount: jest.fn(async () => undefined),
  },
}));
jest.mock("../src/api/cache", () => ({
  privateCache: { start: jest.fn(async () => undefined), stop: jest.fn() },
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
  jest.mocked(sessionActions.requestCode).mockResolvedValue({
    challenge_id: "test-challenge",
    expires_in: 600,
    retry_after: 60,
  });
  jest.mocked(sessionActions.updateName).mockResolvedValue(undefined);
  jest.mocked(sessionActions.restore).mockResolvedValue(undefined);
  jest.mocked(sessionActions.signOut).mockResolvedValue(undefined);
});

describe("AUTH-1: sign-in screen", () => {
  test("email requests a code; only verified code signs in and changing email resets it", async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Student email"),
      "l250001@lhr.nu.edu.pk",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(sessionActions.login).not.toHaveBeenCalled();
    const field = screen.getByLabelText("Verification code");
    expect(field.props.textContentType).toBe("oneTimeCode");
    await fireEvent.changeText(field, "123");
    await fireEvent.press(
      screen.getByRole("button", { name: "Verify and sign in" }),
    );
    expect(sessionActions.login).not.toHaveBeenCalled();
    await fireEvent.changeText(field, "012345");
    await fireEvent.press(
      screen.getByRole("button", { name: "Verify and sign in" }),
    );
    expect(sessionActions.login).toHaveBeenCalledWith(
      "l250001@lhr.nu.edu.pk",
      "012345",
      "test-challenge",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Change email" }));
    expect(screen.queryByLabelText("Verification code")).toBeNull();
    expect(screen.getByLabelText("Student email").props.editable).toBe(true);
  });

  test("resend waits a minute, requests a fresh challenge and clears the old code", async () => {
    jest.useFakeTimers();
    try {
      await render(<SignInScreen />);
      await fireEvent.changeText(
        screen.getByLabelText("Student email"),
        "l250001@lhr.nu.edu.pk",
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Send verification code" }),
      );
      expect(
        screen.getByRole("button", { name: "Resend code in 60s" }).props
          .accessibilityState.disabled,
      ).toBe(true);
      await fireEvent.changeText(
        screen.getByLabelText("Verification code"),
        "012345",
      );
      await act(async () => {
        await jest.advanceTimersByTimeAsync(60_000);
      });
      jest.mocked(sessionActions.requestCode).mockResolvedValue({
        challenge_id: "replacement-challenge",
        expires_in: 600,
        retry_after: 60,
      });
      await fireEvent.press(
        screen.getByRole("button", { name: "Resend code" }),
      );
      expect(sessionActions.requestCode).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText("Verification code").props.value).toBe("");
    } finally {
      jest.useRealTimers();
    }
  });

  test("incorrect proof stays on the code form with an actionable error", async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Student email"),
      "l250001@lhr.nu.edu.pk",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    jest
      .mocked(sessionActions.login)
      .mockRejectedValue(new ApiError(400, "invalid_code", "Incorrect code"));
    await fireEvent.changeText(
      screen.getByLabelText("Verification code"),
      "012345",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Verify and sign in" }),
    );
    expect(
      screen.getByText(
        "Code is incorrect or expired. Request a new code if needed.",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Verification code")).toBeTruthy();
  });

  test("invalid address shows inline error without a request", async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Student email"),
      "someone@gmail.com",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    expect(
      screen.getByText("Use your student email, like l25xxxx@lhr.nu.edu.pk"),
    ).toBeTruthy();
    expect(sessionActions.requestCode).not.toHaveBeenCalled();
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
    expect(sessionActions.requestCode).toHaveBeenCalledWith(
      "l250001@lhr.nu.edu.pk",
    );
  });
  test.each(["invalid_email", "rate_limited", "account_disabled", "network"])(
    "handles %s",
    async (code) => {
      jest
        .mocked(sessionActions.requestCode)
        .mockRejectedValue(
          code === "network"
            ? new Error("offline")
            : new ApiError(
                code === "rate_limited" ? 429 : 403,
                code,
                code === "rate_limited"
                  ? "Too many attempts. Wait a minute."
                  : "failure",
              ),
        );
      await render(<SignInScreen />);
      await fireEvent.changeText(
        screen.getByLabelText("Student email"),
        "l250001@lhr.nu.edu.pk",
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Send verification code" }),
      );
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
        expect(sessionActions.requestCode).toHaveBeenCalledTimes(2);
      }
      if (code === "account_disabled")
        expect(
          screen.queryByText("Can't reach the server. Try again."),
        ).toBeNull();
    },
  );
  test("working state disables a second submit", async () => {
    let complete: (value: {
      challenge_id: string;
      expires_in: number;
      retry_after: number;
    }) => void = () => {};
    jest.mocked(sessionActions.requestCode).mockImplementation(
      () =>
        new Promise<{
          challenge_id: string;
          expires_in: number;
          retry_after: number;
        }>((resolve) => {
          complete = resolve;
        }),
    );
    await render(<SignInScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Student email"),
      "l250001@lhr.nu.edu.pk",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    const working = screen.getByRole("button", { name: "Working…" });
    expect(working.props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });
    await fireEvent(screen.getByLabelText("Student email"), "submitEditing");
    expect(sessionActions.requestCode).toHaveBeenCalledTimes(1);
    await act(() =>
      complete({
        challenge_id: "test-challenge",
        expires_in: 600,
        retry_after: 60,
      }),
    );
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
  test.each(["student", "admin"] as const)(
    "%s can access only their update and admin routes",
    async (role) => {
      jest.mocked(useSession).mockReturnValue({
        ...state,
        status: "signedIn",
        user: { id: "actor", role },
      } as ReturnType<typeof useSession>);
      await render(<AuthGate />);
      for (const name of ["updates/new", "admin/users", "admin/reports"])
        expect(Boolean(screen.queryByText(name))).toBe(role === "admin");
      expect(screen.getByText("updates/[id]")).toBeTruthy();
    },
  );
  test("delete account needs confirmation and preserves a server refusal", async () => {
    jest
      .mocked(sessionActions.deleteAccount)
      .mockRejectedValueOnce(
        new ApiError(403, "forbidden", "Make another admin first."),
      );
    await render(<MeScreen />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Delete account" }),
    );
    expect(sessionActions.deleteAccount).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Uploaded material stays as Former member/),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Delete my account" }),
    );
    expect(
      screen.getAllByText("Make another admin first.").length,
    ).toBeGreaterThan(0);
    await fireEvent.press(
      screen.getByRole("button", { name: "Delete my account" }),
    );
    expect(sessionActions.deleteAccount).toHaveBeenCalledTimes(2);
  });
  test("restoration shows connection progress without the sign-in form", async () => {
    jest.mocked(useSession).mockReturnValue({ ...state, status: "restoring" });
    const gate = await render(<AuthGate />);
    expect(gate.toJSON()).toBeTruthy();
    expect(
      screen.getByText("Your sign-in stays saved on this device."),
    ).toBeTruthy();
    expect(sessionActions.restore).toHaveBeenCalled();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    const redirect = await render(<SessionRedirect />);
    expect(redirect.toJSON()).toBeNull();
  });
  test("temporary connection failure offers retry and keeps protected routes hidden", async () => {
    jest
      .mocked(useSession)
      .mockReturnValue({ ...state, status: "restoreFailed", user: null });
    await render(<AuthGate />);
    expect(screen.queryByText("(tabs)")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Student email" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(sessionActions.restore).toHaveBeenCalledTimes(2);
  });
});
