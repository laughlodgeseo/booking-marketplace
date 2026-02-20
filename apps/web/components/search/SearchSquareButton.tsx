"use client";

import { forwardRef } from "react";
import { Search } from "lucide-react";

type SearchSquareButtonProps = {
  active: boolean;
  onClick: () => void;
  className?: string;
};

const SearchSquareButton = forwardRef<HTMLButtonElement, SearchSquareButtonProps>(function SearchSquareButton(
  props,
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={props.onClick}
      aria-label="Search properties"
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 md:h-12 md:w-12",
        props.active
          ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700"
          : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300",
        props.className ?? "",
      ].join(" ")}
    >
      <Search className="h-4 w-4 md:h-5 md:w-5" />
    </button>
  );
});

export default SearchSquareButton;
