export default {
  async scheduled() {
    const response = await fetch("https://edump-api.onrender.com/readyz", {
      // Workers supports manual/follow, not the browser's "error" mode.
      // A redirect fails the readiness check below rather than being followed.
      redirect: "manual",
      signal: AbortSignal.timeout(75_000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok || (await response.json()).status !== "ok") {
      throw new Error(`API readiness failed: HTTP ${response.status}`);
    }
    console.log("API readiness passed.");
  },
};
