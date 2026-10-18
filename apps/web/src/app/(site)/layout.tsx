import type { ReactNode } from "react";
import FloatingHeader from "@/components/site/FloatingHeader";
import StoryExperience from "@/components/inside-story/StoryExperience";
import Footer from "@/components/site/Footer";
import { RouteArrival } from "@/components/inside-story/Motion";
import "@/components/inside-story/story.css";
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell inside-story">
      <StoryExperience />
      <div id="top" />
      <FloatingHeader />
      <main id="main-content" tabIndex={-1} className="story-main">
        <RouteArrival>{children}</RouteArrival>
      </main>
      <Footer />
    </div>
  );
}
