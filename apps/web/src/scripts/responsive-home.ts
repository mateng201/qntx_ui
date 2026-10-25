/** Exactly one controller is mounted. Unmount before crossing the desktop / narrow-Web boundary. */
export function initializeResponsiveHome(): () => void {
  const desktop = matchMedia("(min-width: 761px)");
  let dispose: (() => void) | undefined;
  let revision = 0;
  let stopped = false;

  async function mount(): Promise<void> {
    const current = ++revision;
    dispose?.();
    dispose = undefined;
    if (desktop.matches) {
      const root = document.querySelector<HTMLElement>("[data-narrative]");
      const { initializeScrollNarrative } = await import("./scroll-narrative");
      if (!stopped && current === revision && root !== null) {
        dispose = initializeScrollNarrative(root);
      }
    } else {
      const { initializeMobileWebNavigation } = await import("./mobile-web-navigation");
      if (!stopped && current === revision) {
        dispose = initializeMobileWebNavigation();
      }
    }
  }

  function remount(): void {
    // Avoid carrying a desktop document offset into the fixed-height narrow site.
    scrollTo({ top: 0, left: 0, behavior: "instant" });
    void mount();
  }

  desktop.addEventListener("change", remount);
  void mount();
  return () => {
    stopped = true;
    revision += 1;
    desktop.removeEventListener("change", remount);
    dispose?.();
  };
}
