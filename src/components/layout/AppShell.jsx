// AppShell.jsx - CFR Foundation layout wrapper
// Applies global background and text colors from foundation tokens

export default function AppShell({ children }) {
  return (
    <div className="min-h-dvh bg-app-bg text-text-primary">
      {children}
    </div>
  );
}
