'use client'

import Link from 'next/link'
import clsx from 'clsx'

type LogoLinkProps = {
  className?: string
}

export default function LogoLink({ className }: LogoLinkProps) {
  return (
    <Link
      href="/"
      className={clsx(
        'flex items-center gap-2 py-1',
        'focus:outline-none focus-visible:ring-0',
        'hover:bg-transparent',
        className
      )}
    >
      <img
        src="/evconduit-logo-full.svg"
        alt="EVConduit"
        className="h-8 w-auto"
      />
    </Link>
  )
}
