export function AppFooter() {
  return (
    <footer className="border-t border-border/40 bg-background/50 py-4 px-6 text-xs text-muted-foreground">
      <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} Tendenci — Todos os direitos reservados</span>
      </div>
    </footer>
  );
}
