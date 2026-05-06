import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


export function getInitials(name) {
  if (!name) {
    return Math.random().toString(36).substring(2, 4).toUpperCase()
  }

  const parts = name.trim().split(/\s+/)

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  if (parts.length === 1) {
    const word = parts[0]
    if (word.length >= 2) {
      return (word[0] + word[word.length - 1]).toUpperCase()
    }
    return word[0].toUpperCase()
  }

  return Math.random().toString(36).substring(2, 4).toUpperCase()
}