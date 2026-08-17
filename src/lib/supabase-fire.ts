/**
 * Supabase query builders are lazy thenables: they only send the request once
 * something calls `.then()`. Writing `void supabase.from(...).update(...)`
 * therefore silently sends nothing. Route every fire-and-forget write through
 * this helper so the request actually leaves the browser.
 */
export function fireAndForget(query: PromiseLike<unknown>, label = "supabase write"): void {
  void Promise.resolve(query).then(
    (result) => {
      const error = (result as { error?: { message?: string } } | null)?.error;
      if (error) console.error(`${label} failed:`, error.message ?? error);
    },
    (error) => console.error(`${label} failed:`, error),
  );
}
