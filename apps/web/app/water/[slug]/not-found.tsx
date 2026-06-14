import Link from 'next/link'
import { BackButton } from '@/components/shell/BackButton'

export default function WaterNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BackButton className="mb-4 md:hidden" />
      <section className="rounded-2xl bg-surface-container-low p-6 sm:p-8">
        <h1 className="font-headline text-3xl italic text-primary">Water not found</h1>
        <p className="mt-3 font-body text-on-surface-variant">
          We don&rsquo;t have a page for that water yet. It may have moved, or the link may be
          incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center font-label text-sm font-semibold tracking-wide text-primary transition-colors hover:text-primary-container"
        >
          Back to all waters
        </Link>
      </section>
    </div>
  )
}
