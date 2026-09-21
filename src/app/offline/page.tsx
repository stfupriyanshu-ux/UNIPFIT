export default function Offline() {
  return (
    <main className="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold">You're offline</h1>
        <p className="mt-2 text-muted">Check-ins need a connection so they can be saved. Reconnect and try again.</p>
      </div>
    </main>
  );
}
