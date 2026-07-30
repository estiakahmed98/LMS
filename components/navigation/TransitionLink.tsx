"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useRouteTransition } from "@/components/providers/RouteTransitionProvider";

type TransitionLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children: ReactNode;
  };

export default function TransitionLink({
  children,
  onClick,
  target,
  ...props
}: TransitionLinkProps) {
  const { start } = useRouteTransition();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === "_blank"
    ) {
      return;
    }

    const destination = new URL(event.currentTarget.href);
    if (
      destination.origin !== window.location.origin ||
      destination.href === window.location.href
    ) {
      return;
    }

    start();
  }

  return (
    <Link {...props} target={target} onClick={handleClick}>
      {children}
    </Link>
  );
}
