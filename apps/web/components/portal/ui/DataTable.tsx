"use client";

import { useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ChevronRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { PortalCard } from "@/components/portal/ui/PortalCard";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";

const JsonDrawer = dynamic(
  () => import("@/components/portal/ui/JsonDrawer").then((mod) => mod.JsonDrawer),
  { ssr: false },
);

export type Column<Row> = {
  key: string;
  header: string;
  className?: string;
  render: (row: Row) => ReactNode;
};

type DesktopVariant = "cards" | "table";
type MobileVariant = "cards" | "scroll";

type MobileField<Row> = {
  key?: string;
  label: string;
  render: (row: Row) => ReactNode;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function EmptyTableState(props: { empty?: ReactNode; title: string; defaultDescription: string }) {
  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-3xl bg-warm-alt/68 p-7 text-center">
        <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft/24 text-brand">
          <Search className="h-4 w-4" />
        </span>
        <div className="text-sm font-semibold text-primary">{props.title}</div>
        <div className="mt-1 text-sm text-secondary">{props.empty ?? props.defaultDescription}</div>
      </div>
    </div>
  );
}

function DataRow<Row extends { id?: string }>(props: {
  row: Row;
  columns: Array<Column<Row>>;
  compact: boolean;
  clickable: boolean;
  rowActions?: (row: Row) => ReactNode;
  onRowClick?: (row: Row) => void;
  actionsLabel: string;
}) {
  return (
    <div
      role={props.clickable ? "button" : undefined}
      tabIndex={props.clickable ? 0 : undefined}
      onClick={() => props.onRowClick?.(props.row)}
      onKeyDown={(e) => {
        if (!props.clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onRowClick?.(props.row);
        }
      }}
      className={cn(
        "group grid grid-cols-12 gap-4 px-4 text-sm transition sm:px-5",
        props.compact ? "py-3" : "py-4",
        props.clickable
          ? "cursor-pointer hover:bg-accent-soft/22 focus-visible:ring-4 focus-visible:ring-brand/15"
          : "cursor-default",
      )}
    >
      {props.columns.map((c) => (
        <div key={c.key} className={c.className ?? "col-span-2"}>
          {c.render(props.row)}
        </div>
      ))}

      {props.rowActions ? (
        <div
          className="col-span-2 flex items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {props.rowActions(props.row)}
        </div>
      ) : (
        <div className="col-span-2 flex items-center justify-end">
          <ChevronRight className="h-4 w-4 text-muted transition group-hover:text-brand" />
        </div>
      )}
    </div>
  );
}

function MobileDataRow<Row extends { id?: string }>(props: {
  row: Row;
  primary: (row: Row) => ReactNode;
  secondaryFields: Array<MobileField<Row>>;
  clickable: boolean;
  rowActions?: (row: Row) => ReactNode;
  onRowClick?: (row: Row) => void;
  onMoreDetails: (row: Row) => void;
  moreDetailsLabel: string;
  openLabel: string;
}) {
  return (
    <article
      role={props.clickable ? "button" : undefined}
      tabIndex={props.clickable ? 0 : undefined}
      onClick={() => props.onRowClick?.(props.row)}
      onKeyDown={(e) => {
        if (!props.clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onRowClick?.(props.row);
        }
      }}
      className={cn(
        "rounded-2xl border border-line/55 bg-surface/92 p-4 shadow-sm transition",
        props.clickable
          ? "cursor-pointer hover:-translate-y-0.5 hover:bg-accent-soft/18 focus-visible:ring-4 focus-visible:ring-brand/14"
          : "cursor-default",
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-primary">{props.primary(props.row)}</div>
      </div>

      <div className="mt-3 grid gap-2.5">
        {props.secondaryFields.slice(0, 4).map((field, idx) => (
          <div key={field.key ?? `${field.label}_${idx}`} className="grid grid-cols-[110px_1fr] gap-2 text-sm">
            <div className="text-xs font-semibold tracking-wide text-muted">{field.label}</div>
            <div className="min-w-0 text-primary">{field.render(props.row)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {props.clickable ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onRowClick?.(props.row);
            }}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-accent-text shadow-sm hover:bg-brand-hover"
          >
            {props.openLabel}
          </button>
        ) : null}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onMoreDetails(props.row);
          }}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-line/45 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm hover:bg-accent-soft/22"
        >
          {props.moreDetailsLabel}
        </button>

        {props.rowActions ? (
          <div
            className="ml-auto flex flex-wrap items-center gap-2 [&_a]:inline-flex [&_a]:h-11 [&_a]:items-center [&_a]:rounded-2xl [&_a]:px-4 [&_a]:text-sm [&_button]:h-11 [&_button]:rounded-2xl [&_button]:px-4 [&_button]:text-sm"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {props.rowActions(props.row)}
          </div>
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-muted" />
        )}
      </div>
    </article>
  );
}

function MobileScrollTable<Row extends { id?: string }>(props: {
  rows: Row[];
  columns: Array<Column<Row>>;
  compact: boolean;
  clickable: boolean;
  rowActions?: (row: Row) => ReactNode;
  onRowClick?: (row: Row) => void;
  hideHeaderRow?: boolean;
  actionsLabel: string;
}) {
  return (
    <div className="p-4 lg:hidden">
      <div className="overflow-x-auto rounded-2xl border border-line/50 bg-warm-base/95 shadow-sm">
        <div className="min-w-[760px]">
          {props.hideHeaderRow ? null : (
            <div className="bg-warm-alt/55 px-5 py-3">
              <div className="grid grid-cols-12 gap-3 text-[12px] font-semibold tracking-wide text-muted">
                {props.columns.map((c) => (
                  <div key={c.key} className={c.className ?? "col-span-2"}>
                    {c.header}
                  </div>
                ))}
                {props.rowActions ? <div className="col-span-2 text-right">{props.actionsLabel}</div> : null}
              </div>
            </div>
          )}

          <div className="space-y-2 p-2">
            {props.rows.map((row, idx) => (
              <div key={row.id ?? `mrow_${idx}`} className="overflow-hidden rounded-2xl border border-line/40 bg-warm-alt/66">
                <DataRow
                  row={row}
                  columns={props.columns}
                  compact={props.compact}
                  clickable={props.clickable}
                  rowActions={props.rowActions}
                  onRowClick={props.onRowClick}
                  actionsLabel={props.actionsLabel}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataTable<Row extends { id?: string }>(props: {
  title: string;
  subtitle?: ReactNode;
  columns: Array<Column<Row>>;
  rows: Row[];
  empty?: ReactNode;
  rowActions?: (row: Row) => ReactNode;
  onRowClick?: (row: Row) => void;
  count?: number;
  headerRight?: ReactNode;
  compact?: boolean;
  variant?: DesktopVariant;
  hideHeaderRow?: boolean;
  mobileVariant?: MobileVariant;
  mobilePrimaryField?: (row: Row) => ReactNode;
  mobileSecondaryFields?: Array<MobileField<Row>>;
  mobileDetailsTitle?: string | ((row: Row) => string);
  mobileDetailsSubtitle?: string | ((row: Row) => string | undefined);
  mobileDetailsValue?: (row: Row) => unknown;
  mobileDetailsLabel?: string;
  renderMobileDetails?: (row: Row) => ReactNode;
}) {
  const tPortal = useTranslations("portal");
  const compact = props.compact === true;
  const variant: DesktopVariant = props.variant ?? "cards";
  const mobileVariant: MobileVariant = props.mobileVariant ?? "cards";
  const clickable = typeof props.onRowClick === "function";
  const moreDetailsLabel = props.mobileDetailsLabel ?? tPortal("table.moreDetails");
  const emptyTitle = tPortal("table.emptyTitle");
  const emptyDescription = tPortal("table.emptyDescription");
  const actionsLabel = tPortal("table.actions");
  const openLabel = tPortal("table.open");
  const [detailsRow, setDetailsRow] = useState<Row | null>(null);

  const mobilePrimary = useMemo(
    () => props.mobilePrimaryField ?? props.columns[0]?.render ?? (() => "—"),
    [props.mobilePrimaryField, props.columns],
  );

  const mobileSecondary = useMemo<Array<MobileField<Row>>>(() => {
    if (props.mobileSecondaryFields && props.mobileSecondaryFields.length > 0) {
      return props.mobileSecondaryFields;
    }
    return props.columns.slice(1, 4).map((column) => ({
      key: column.key,
      label: column.header,
      render: column.render,
    }));
  }, [props.columns, props.mobileSecondaryFields]);

  const detailsTitle =
    detailsRow === null
      ? ""
      : typeof props.mobileDetailsTitle === "function"
        ? props.mobileDetailsTitle(detailsRow)
        : props.mobileDetailsTitle ?? tPortal("table.detailsTitle", { title: props.title });

  const detailsSubtitle =
    detailsRow === null
      ? undefined
      : typeof props.mobileDetailsSubtitle === "function"
        ? props.mobileDetailsSubtitle(detailsRow)
        : props.mobileDetailsSubtitle;

  const detailsValue =
    detailsRow === null ? null : (props.mobileDetailsValue ? props.mobileDetailsValue(detailsRow) : detailsRow);

  return (
    <>
      <PortalCard padding="none" className="overflow-hidden">
        <div className="bg-warm-alt/66 px-4 py-4 sm:px-5">
          <SectionHeader
            title={props.title}
            subtitle={props.subtitle}
            count={props.count}
            right={props.headerRight}
          />
        </div>

        {props.rows.length === 0 ? (
          <EmptyTableState empty={props.empty} title={emptyTitle} defaultDescription={emptyDescription} />
        ) : (
          <>
            {mobileVariant === "cards" ? (
              <div className="p-4 lg:hidden">
                <div className="space-y-3">
                  {props.rows.map((row, idx) => (
                    <MobileDataRow
                      key={row.id ?? `mrow_${idx}`}
                      row={row}
                      primary={mobilePrimary}
                      secondaryFields={mobileSecondary}
                      clickable={clickable}
                      rowActions={props.rowActions}
                      onRowClick={props.onRowClick}
                      onMoreDetails={setDetailsRow}
                      moreDetailsLabel={moreDetailsLabel}
                      openLabel={openLabel}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <MobileScrollTable
                rows={props.rows}
                columns={props.columns}
                compact={compact}
                clickable={clickable}
                rowActions={props.rowActions}
                onRowClick={props.onRowClick}
                hideHeaderRow={props.hideHeaderRow}
                actionsLabel={actionsLabel}
              />
            )}

            <div className="hidden lg:block">
              {props.hideHeaderRow ? null : (
                <div className="bg-warm-alt/48 px-5 py-3">
                  <div className="grid grid-cols-12 gap-3 text-[12px] font-semibold tracking-wide text-muted">
                    {props.columns.map((c) => (
                      <div key={c.key} className={c.className ?? "col-span-2"}>
                        {c.header}
                      </div>
                    ))}
                    {props.rowActions ? <div className="col-span-2 text-right">{actionsLabel}</div> : null}
                  </div>
                </div>
              )}

              {variant === "table" ? (
                <div className="px-4 pb-4 sm:px-5">
                  {props.rows.map((row, idx) => (
                    <div key={row.id ?? `row_${idx}`} className="rounded-2xl bg-warm-alt/62">
                      <DataRow
                        row={row}
                        columns={props.columns}
                        compact={compact}
                        clickable={clickable}
                        rowActions={props.rowActions}
                        onRowClick={props.onRowClick}
                        actionsLabel={actionsLabel}
                      />
                      {idx < props.rows.length - 1 ? <div className="portal-divider mx-2" /> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 p-4 sm:p-5">
                  {props.rows.map((row, idx) => (
                    <div
                      key={row.id ?? `row_${idx}`}
                      className="overflow-hidden rounded-3xl border border-line/40 bg-warm-alt/66"
                    >
                      <DataRow
                        row={row}
                        columns={props.columns}
                        compact={compact}
                        clickable={clickable}
                        rowActions={props.rowActions}
                        onRowClick={props.onRowClick}
                        actionsLabel={actionsLabel}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </PortalCard>

      <JsonDrawer
        open={detailsRow !== null}
        onClose={() => setDetailsRow(null)}
        title={detailsTitle}
        subtitle={detailsSubtitle}
        json={detailsValue}
      >
        {detailsRow !== null ? props.renderMobileDetails?.(detailsRow) : null}
      </JsonDrawer>
    </>
  );
}
