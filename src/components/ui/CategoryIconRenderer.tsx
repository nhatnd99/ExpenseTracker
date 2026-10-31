import React from 'react'
import { ICON_MAP } from '@/constants/categoryIcons'

export interface CategoryIconRendererProps {
  icon?: string
  size?: number
  className?: string
}

/**
 * Universal Category Icon Renderer:
 * Handles Lucide Icon names, item IDs, or direct emojis seamlessly.
 */
export const CategoryIconRenderer: React.FC<CategoryIconRendererProps> = ({
  icon,
  size = 18,
  className = '',
}) => {
  if (!icon) {
    return <span className={className}>📁</span>
  }

  const Component = ICON_MAP[icon]
  if (Component) {
    return <Component size={size} className={className} />
  }

  // Fallback to emoji / character display
  return (
    <span style={{ fontSize: `${size}px`, lineHeight: 1 }} className={className}>
      {icon}
    </span>
  )
}

