// The real `server-only` package throws when imported outside a React Server
// Component graph (it has no `react-server` export condition under Vitest).
// Alias it to this empty module so server-only helpers can be unit tested.
export {}
