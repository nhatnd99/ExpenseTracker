import React from 'react'
import { Receipt } from 'lucide-react'
import { resolveIconComponent } from '@/constants/categoryIcons'

export interface CategoryIconRendererProps {
  icon?: string
  size?: number
  className?: string
}

/**
 * Universal Category Icon Renderer:
 * Handles Lucide Icon names, item IDs, or direct emojis seamlessly.
 * Never leaks raw text names like "Utensils" into the UI.
 */
export const CategoryIconRenderer: React.FC<CategoryIconRendererProps> = ({
  icon,
  size = 18,
  className = '',
}) => {
  if (!icon) {
    return <Receipt size={size} className={className} />
  }

  const iconComponent = resolveIconComponent(icon)
  if (iconComponent) {
    return React.createElement(iconComponent, { size, className })
  }

  // Check if it's an emoji (e.g. 🍔, ☕, 🛒)
  const isEmoji = /\p{Extended_Pictographic}/u.test(icon)
  if (isEmoji) {
    return (
      <span style={{ fontSize: `${size}px`, lineHeight: 1 }} className={className}>
        {icon}
      </span>
    )
  }

  // Safe fallback if it's an unrecognized text string: render Receipt icon instead of breaking layout with raw text
  return <Receipt size={size} className={className} />
}
