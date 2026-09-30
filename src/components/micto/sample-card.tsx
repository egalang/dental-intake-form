"use client";

/**
 * @title Sample Card
 * @description A professional LGU component.
 * @categories 
*/
import * as React from "react"
import { cn } from "@/lib/utils"

export interface SampleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
}

export const SampleCard = React.forwardRef<
  HTMLDivElement,
  SampleCardProps
>(({ className, title, description, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-all hover:shadow-md",
      className
    )}
    {...props}
  >
    <div className="space-y-1.5">
      {title && (
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
    {children && <div className="mt-4">{children}</div>}
  </div>
))
SampleCard.displayName = "SampleCard"
