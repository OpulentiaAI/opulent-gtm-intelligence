"use client"

import { useEffect } from "react"

/**
 * Opens every collapsed <details> element before printing so print output is
 * complete, then restores the previous collapsed state afterwards.
 */
export function PrintDetails() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = []
    const beforePrint = () => {
      opened = Array.from(document.querySelectorAll<HTMLDetailsElement>("details:not([open])"))
      for (const element of opened) element.open = true
    }
    const afterPrint = () => {
      for (const element of opened) element.open = false
      opened = []
    }
    window.addEventListener("beforeprint", beforePrint)
    window.addEventListener("afterprint", afterPrint)
    return () => {
      window.removeEventListener("beforeprint", beforePrint)
      window.removeEventListener("afterprint", afterPrint)
    }
  }, [])
  return null
}
