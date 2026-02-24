import React from 'react'
import clsx from 'clsx'

interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={clsx('animate-pulse bg-slate-700 rounded', className)}
        />
      ))}
    </>
  )
}

export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-1/3 mb-3" />
      <div className="h-3 bg-slate-700 rounded w-2/3 mb-2" />
      <div className="h-3 bg-slate-700 rounded w-1/2" />
    </div>
  )
}

export function SkeletonControlNav() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 animate-pulse">
          <div className="w-3 h-3 bg-slate-700 rounded-full flex-shrink-0" />
          <div className="h-3 bg-slate-700 rounded flex-1" />
        </div>
      ))}
    </div>
  )
}
