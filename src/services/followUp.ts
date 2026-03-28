export async function runSafeFollowUp(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch {
    // The primary action already finished; this reconciliation refresh is best-effort only.
  }
}
