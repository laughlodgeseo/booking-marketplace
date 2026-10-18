import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import RouteHero from "./RouteHero";
import { Reveal } from "./Motion";
export function PageHeading({
  title,
  intro,
}: {
  title: string;
  intro?: string;
  context?: string;
}) {
  return (
    <div className="story-page-head">
      <Reveal>
        <h1>{title}</h1>
      </Reveal>
      {intro && <p>{intro}</p>}
    </div>
  );
}
export function EditorialHero(props: {
  title: string;
  intro: string;
  context?: string;
  src: string;
  alt: string;
  mode?: "services" | "owners" | "about";
}) {
  return (
    <RouteHero
      title={props.title}
      intro={props.intro}
      src={props.src}
      alt={props.alt}
      mode={props.mode || "about"}
    />
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
