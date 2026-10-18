"use client";
import { useRef } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SceneImage } from "./Motion";
const scenes = [
  {
    src: "/images/home/why-b.webp",
    en: "Room for the everyday.",
    ar: "مساحة ليومك.",
    body: "Morning coffee. A long conversation. A little time with nowhere else to be.",
    arBody: "قهوة الصباح، وحديث طويل، ووقت تستمتع به دون عجلة.",
  },
  {
    src: "/images/owners/hero-4k/support_luxury_interior-4k.webp",
    en: "A softer landing.",
    ar: "وصول أكثر راحة.",
    body: "A quiet room at the end of a full day. Sometimes, that’s the best part of going away.",
    arBody: "غرفة هادئة في نهاية يوم حافل. أحياناً، هذا أجمل ما في الرحلة.",
  },
  {
    src: "/images/home/interior-suite.webp",
    en: "Make the day your own.",
    ar: "اجعل اليوم لك.",
    body: "Open the curtains. Take your time. There’s a whole city outside, whenever you’re ready.",
    arBody: "افتح الستائر، وخذ وقتك. مدينة كاملة تنتظرك حين تكون مستعداً.",
  },
];
function RoomPanel({
  scene,
  index,
  ar,
}: {
  scene: (typeof scenes)[number];
  index: number;
  ar: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -45]);
  return (
    <section
      ref={ref}
      className="story-room-panel"
      style={{ top: `${100 + index * 18}px`, zIndex: index + 1 }}
    >
      <motion.div
        className="story-room-surface"
        style={{ scale: reduced ? 1 : scale, y: reduced ? 0 : y }}
      >
        <SceneImage src={scene.src} alt={ar ? scene.ar : scene.en} />
        <div className="story-room-copy">
          <h3>{ar ? scene.ar : scene.en}</h3>
          <p>{ar ? scene.arBody : scene.body}</p>
          {index === 2 && (
            <Link href="/gallery" className="story-link">
              {ar ? "ألق نظرة بالداخل" : "Look inside"}
              <ArrowUpRight size={20} />
            </Link>
          )}
        </div>
        <span className="story-room-caption">
          {ar ? "صور للإلهام" : "An inside perspective · Editorial collection"}
        </span>
      </motion.div>
    </section>
  );
}
export default function RoomSequence() {
  const ar = useLocale() === "ar";
  return (
    <div className="story-room-sequence">
      <div className="story-room-heading">
        <p className="story-context">
          {ar ? "وقت لك" : "Space to be yourself"}
        </p>
        <h2>{ar ? "ليس مجرد مكان للنوم." : "More than somewhere to sleep."}</h2>
      </div>
      {scenes.map((scene, index) => (
        <RoomPanel key={scene.src} scene={scene} index={index} ar={ar} />
      ))}
    </div>
  );
}
