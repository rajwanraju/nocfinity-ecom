/**
 * Full document navigation.
 *
 * Auth transitions must not use the client router: the proxy redirects guarded
 * routes to `/login` for guests, and the router caches that redirect when the
 * destination was prefetched while signed out. A client-side navigation after
 * sign-in therefore replays the cached redirect and strands the user on the
 * sign-in page. A full load also guarantees every server component sees the
 * httpOnly session cookie that was just set.
 */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
