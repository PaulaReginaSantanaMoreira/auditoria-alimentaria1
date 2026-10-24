"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: "default" | "danger" | "warning" | "success";
  disabled?: boolean;
  separator?: boolean;
  title?: string;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
  align?: "left" | "right";
  iconName?: string;
  className?: string;
}

export function ActionMenu({
  items,
  label = "Opciones y acciones",
  align = "right",
  iconName = "more_vert",
  className = "",
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    bottom?: number;
    left: number;
    openUpwards: boolean;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 208; // w-52 = 13rem = 208px
    const estimatedHeight = 260; // Altura estimada do menu com 5-6 itens

    // Se o espaço abaixo for insuficiente e houver espaço acima, abre para cima (Drop-up)
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > 180;

    let left = align === "right" ? rect.right - menuWidth : rect.left;

    // Prevenção de overflow horizontal na viewport
    const viewportWidth = window.innerWidth;
    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    if (openUpwards) {
      setCoords({
        top: 0,
        bottom: window.innerHeight - rect.top + 6,
        left,
        openUpwards: true,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left,
        openUpwards: false,
      });
    }
  }, [align]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        updatePosition();
      }
      return next;
    });
  }, [updatePosition]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Reposicionar dinamicamente em caso de scroll ou resize da janela
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Fechar ao clicar fora ou ao pressionar Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  const activeItems = items.filter((item) => !item.disabled);

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={label}
        title={label}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          isOpen
            ? "bg-primary/10 dark:bg-emerald-950/70 text-primary dark:text-emerald-300 border border-primary/30 dark:border-emerald-500/50 shadow-xs ring-2 ring-primary/20"
            : "bg-surface-container/70 dark:bg-slate-800/90 hover:bg-surface-container-high dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 border border-slate-border dark:border-slate-700 hover:text-primary dark:hover:text-emerald-300 hover:border-primary/40 dark:hover:border-emerald-500/40 shadow-xs"
        }`}
      >
        <span className="material-symbols-outlined text-[20px] select-none font-medium">{iconName}</span>
      </button>

      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            aria-label={label}
            style={{
              position: "fixed",
              top: coords.openUpwards ? undefined : `${coords.top}px`,
              bottom: coords.openUpwards ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className={`w-52 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-slate-border dark:border-slate-800 shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-100 ${
              coords.openUpwards ? "origin-bottom-right" : "origin-top-right"
            }`}
          >
            {activeItems.map((item) => {
              const isDanger = item.variant === "danger";
              const isWarning = item.variant === "warning";
              const isSuccess = item.variant === "success";

              let variantClasses =
                "text-on-surface hover:bg-surface-container dark:hover:bg-slate-800/80";
              let iconClasses = "text-slate-subtext dark:text-slate-400";

              if (isDanger) {
                variantClasses = "text-alert-red hover:bg-alert-red-bg/25 dark:hover:bg-red-950/40";
                iconClasses = "text-alert-red";
              } else if (isWarning) {
                variantClasses =
                  "text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40";
                iconClasses = "text-amber-600 dark:text-amber-400";
              } else if (isSuccess) {
                variantClasses =
                  "text-status-pass hover:bg-status-pass-bg dark:hover:bg-emerald-950/40";
                iconClasses = "text-status-pass";
              }

              return (
                <React.Fragment key={item.id}>
                  {item.separator && (
                    <div
                      className="my-1 border-t border-slate-border/60 dark:border-slate-800"
                      role="separator"
                    />
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    title={item.title}
                    onClick={() => {
                      setIsOpen(false);
                      item.onClick();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors text-left cursor-pointer focus:outline-none focus:bg-surface-container dark:focus:bg-slate-800 ${variantClasses}`}
                  >
                    {item.icon && (
                      <span
                        className={`material-symbols-outlined text-[17px] shrink-0 ${iconClasses}`}
                      >
                        {item.icon}
                      </span>
                    )}
                    <span className="truncate">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
