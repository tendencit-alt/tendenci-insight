import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SHORTCUT_REGISTRY } from "@/components/smart-shortcuts/shortcutRegistry";
import type { Shortcut } from "@/components/smart-shortcuts/types";

const SEQUENCE_TIMEOUT = 1200;

interface Options {
  onTrigger?: (shortcut: Shortcut) => void;
  enabled?: boolean;
}

/**
 * Global keyboard shortcuts:
 *  - "mod+k" combos
 *  - sequences like "n d", "g f"
 * Skipped while user types in inputs/textarea/contenteditable.
 */
export function useKeyboardShortcuts({ onTrigger, enabled = true }: Options = {}) {
  const navigate = useNavigate();
  const bufferRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const trigger = (shortcut: Shortcut) => {
      if (onTrigger) onTrigger(shortcut);
      else navigate(shortcut.route);
    };

    const resetBuffer = () => {
      bufferRef.current = "";
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      // Combo shortcuts (mod+key)
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod) {
        const combo = `mod+${e.key.toLowerCase()}`;
        const match = SHORTCUT_REGISTRY.find((s) => s.keys === combo);
        if (match) {
          e.preventDefault();
          trigger(match);
          resetBuffer();
        }
        return;
      }

      // Skip modifier-only / function keys
      if (e.altKey || e.shiftKey || e.key.length !== 1) return;

      const key = e.key.toLowerCase();
      bufferRef.current = bufferRef.current ? `${bufferRef.current} ${key}` : key;

      // Try matching the current buffer
      const match = SHORTCUT_REGISTRY.find((s) => s.keys === bufferRef.current);
      if (match) {
        e.preventDefault();
        trigger(match);
        resetBuffer();
        return;
      }

      // Is it a prefix of any sequence? keep buffer.
      const isPrefix = SHORTCUT_REGISTRY.some((s) =>
        s.keys?.startsWith(bufferRef.current + " ")
      );
      if (!isPrefix) {
        resetBuffer();
        return;
      }

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(resetBuffer, SEQUENCE_TIMEOUT);
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, navigate, onTrigger]);
}
