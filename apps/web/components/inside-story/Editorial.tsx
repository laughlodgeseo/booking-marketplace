import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Reveal, SceneImage } from "./Motion";
export function PageHeading({
  title,
  intro,
  context,
}: {
  title: string;
  intro?: string;
  context?: string;
}) {
  return (
    <div className="story-page-head">
      <Reveal>
        {context && <p className="story-context">{context}</p>}
        <h1>{title}</h1>
      </Reveal>
      {intro && <p>{intro}</p>}
    </div>
  );
}
export function EditorialHero({
  title,
  intro,
  context,
  src,
  alt,
}: {
  title: string;
  intro: string;
  context: string;
  src: string;
  alt: string;
}) {
  return (
    <section className="story-editorial-hero">
      <SceneImage src={src} alt={alt} priority />
      <PageHeading title={title} intro={intro} context={context} />
    </section>
  );
}
export function NextRoute({
  title,
  label,
  href,
}: {
  title: string;
  label: string;
  href: string;
}) {
  return (
    <section className="story-next-route">
      <h2>{title}</h2>
      <Link className="story-link" href={href}>
        {label}
        <ArrowUpRight size={20} />
      </Link>
    </section>
  );
}
