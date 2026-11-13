import type { ReactNode } from 'react'
import NavIcon from '../components/NavIcon'
import './info.css'

export interface InfoSection {
  readonly id: string
  readonly title: string
  readonly body: ReactNode
}

export interface InfoPageProps {
  readonly eyebrow: string
  readonly title: string
  readonly lede: string
  readonly updated: string
  readonly sections: readonly InfoSection[]
  readonly asideTitle: string
  readonly aside: ReactNode
}

/**
 * Shared shell for the supporting pages: an editorial column with a quiet
 * facts rail. Content is deliberately plain and claim-free.
 */
export default function InfoPage({
  eyebrow,
  title,
  lede,
  updated,
  sections,
  asideTitle,
  aside,
}: InfoPageProps) {
  return (
    <div className="page info">
      <header className="info__header">
        <p className="panel__eyebrow">{eyebrow}</p>
        <h1 className="page__title info__title">{title}</h1>
        <p className="page__lede">{lede}</p>
        <p className="info__updated">Last updated {updated}</p>
      </header>

      <div className="info__grid">
        <article className="info__body">
          {sections.map((section) => (
            <section className="info__section" key={section.id} aria-labelledby={section.id}>
              <h2 className="info__heading" id={section.id}>
                {section.title}
              </h2>
              <div className="prose">{section.body}</div>
            </section>
          ))}
        </article>

        <aside className="info__aside" aria-label={asideTitle}>
          <h2 className="info__aside-title">{asideTitle}</h2>
          {aside}
          <a className="info__back" href="#/">
            <NavIcon name="overview" />
            Back to the dashboard
          </a>
        </aside>
      </div>
    </div>
  )
}
