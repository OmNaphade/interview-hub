import React from 'react'

const SkeletonLoader = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4" />
            <div className="h-4 bg-gray-300 rounded w-1/2" />
          </div>
        ))}
    </div>
  )
}

export default SkeletonLoader
