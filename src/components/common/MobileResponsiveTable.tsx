import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from '@/components/ui/pagination';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { TableSkeleton } from '@/components/common/LoadingSpinner';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
  mobileLabel?: string; // Label to show in mobile card view
  hideOnMobile?: boolean; // Hide this column on mobile
}

export interface TableAction<T> {
  label: string;
  onClick: (item: T) => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: React.ReactNode;
  className?: string;
}

interface MobileResponsiveTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  title?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  getRowKey: (item: T) => string;
  expandedContent?: (item: T) => React.ReactNode;
  itemsPerPage?: number;
  className?: string;
  // Server-side pagination support (optional)
  serverSide?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function MobileResponsiveTable<T>({
  data = [],
  columns,
  actions,
  title,
  isLoading,
  emptyMessage = "لا توجد بيانات",
  emptyIcon,
  emptyAction,
  getRowKey,
  expandedContent,
  itemsPerPage = 10,
  className,
  serverSide = false,
  totalItems: totalItemsProp,
  currentPage: currentPageProp,
  onPageChange,
}: MobileResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  
  const {
    currentData: clientCurrentData,
    currentPage: clientCurrentPage,
    totalPages: clientTotalPages,
    goToPage: clientGoToPage,
    nextPage: clientNextPage,
    prevPage: clientPrevPage,
    canGoNext: clientCanGoNext,
    canGoPrev: clientCanGoPrev,
    startIndex: clientStartIndex,
    endIndex: clientEndIndex,
    totalItems: clientTotalItems
  } = usePagination({ data, itemsPerPage });

  // Derive pagination values depending on mode
  const totalItems = serverSide ? (totalItemsProp || 0) : clientTotalItems;
  const totalPages = serverSide ? Math.max(1, Math.ceil((totalItems || 0) / itemsPerPage)) : clientTotalPages;
  const currentPage = serverSide ? (currentPageProp || 1) : clientCurrentPage;
  const currentData = serverSide ? data : clientCurrentData;

  const goToPage = (page: number) => {
    if (serverSide) {
      onPageChange && onPageChange(page);
    } else {
      clientGoToPage(page);
    }
  };

  const nextPage = () => goToPage(Math.min(currentPage + 1, totalPages));
  const prevPage = () => goToPage(Math.max(currentPage - 1, 1));
  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  const startIndex = serverSide
    ? Math.min((currentPage - 1) * itemsPerPage + 1, Math.max(totalItems, 1))
    : clientStartIndex;
  const endIndex = serverSide
    ? Math.min(startIndex + (currentData?.length || 0) - 1, totalItems)
    : clientEndIndex;

  const toggleRowExpansion = (rowKey: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowKey)) {
      newExpanded.delete(rowKey);
    } else {
      newExpanded.add(rowKey);
    }
    setExpandedRows(newExpanded);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => goToPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
              size={isMobile ? 'sm' : 'default'}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => goToPage(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
            size={isMobile ? 'sm' : 'default'}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if current page is far from start
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => goToPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
              size={isMobile ? 'sm' : 'default'}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if current page is far from end
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => goToPage(totalPages)}
              isActive={currentPage === totalPages}
              className="cursor-pointer"
              size={isMobile ? 'sm' : 'default'}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }

    return items;
  };

  // Mobile card view
  const renderMobileCards = () => {
    return (
      <div className="space-y-4">
        {/* Render each item as collapsible card on mobile */}
        {currentData.map((item) => {
          const rowKey = getRowKey(item);
          const isExpanded = expandedRows.has(rowKey);
          return (
            <div key={rowKey} className="border rounded-md overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-muted/40">
                <div className="grid gap-1">
                  {/* Show first two columns as summary */}
                  <div className="text-sm font-medium">{columns[0]?.render(item)}</div>
                  {columns[1] && (
                    <div className="text-xs text-muted-foreground">{columns[1].render(item)}</div>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => toggleRowExpansion(rowKey)} aria-label={isExpanded ? 'إغلاق التفاصيل' : 'عرض التفاصيل'}>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-3 space-y-2">
                  {columns.slice(2).map((col) => (
                    <div key={col.key} className="text-sm">
                      {col.mobileLabel && (
                        <span className="text-muted-foreground">{col.mobileLabel}: </span>
                      )}
                      {col.render(item)}
                    </div>
                  ))}
                  {actions && actions.length > 0 && (
                    <div className="pt-2 flex gap-2 flex-wrap">
                      {actions.map((action) => (
                        <Button key={action.label} size={action.size || 'sm'} variant={action.variant || 'outline'} onClick={() => action.onClick(item)} aria-label={action.label}>
                          {action.icon}
                          <span className="sr-only sm:not-sr-only">{action.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDesktopTable = () => {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Expand column for mobile parity */}
              <TableHead className="w-[40px]">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
              {actions && <TableHead className="w-1/5">الإجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item) => {
              const rowKey = getRowKey(item);
              const isExpanded = expandedRows.has(rowKey);
              return (
                <React.Fragment key={rowKey}>
                  <TableRow>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleRowExpansion(rowKey)}
                        aria-label={isExpanded ? 'إغلاق التفاصيل' : 'عرض التفاصيل'}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render(item)}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {actions.map((action) => (
                            <Button
                              key={action.label}
                              variant={action.variant || 'outline'}
                              size={action.size || 'sm'}
                              onClick={() => action.onClick(item)}
                              aria-label={action.label}
                              className={action.className}
                            >
                              {action.icon}
                              <span className="sr-only sm:not-sr-only">{action.label}</span>
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedContent && isExpanded && (
                    <TableRow>
                      <TableCell 
                        colSpan={columns.length + (actions ? 1 : 0) + 1}
                        className="bg-muted/50 p-4"
                      >
                        {expandedContent(item)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <TableSkeleton rows={8} columns={(columns?.length || 0) + (actions ? 1 : 0) + 1} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-lg sm:text-xl">{title}</span>
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalItems} عنصر)
              </span>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {currentData.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            {emptyIcon && <div className="mb-2">{emptyIcon}</div>}
            <p className="text-muted-foreground">{emptyMessage}</p>
            {emptyAction && (
              <Button onClick={emptyAction.onClick} className="mx-auto" aria-label={emptyAction.label}>
                {emptyAction.icon}
                {emptyAction.label}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Render mobile cards or desktop table based on screen size */}
            {isMobile ? renderMobileCards() : renderDesktopTable()}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                <div className="text-sm text-muted-foreground order-2 sm:order-1">
                  عرض {startIndex} إلى {endIndex} من {totalItems} عنصر
                </div>
                <Pagination className="order-1 sm:order-2">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={prevPage}
                        className={cn(
                          "cursor-pointer",
                          !canGoPrev && "pointer-events-none opacity-50"
                        )}
                        size={isMobile ? 'sm' : 'default'}
                      >
                        {isMobile ? 'السابق' : 'السابق'}
                      </PaginationPrevious>
                    </PaginationItem>
                    {renderPaginationItems()}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={nextPage}
                        className={cn(
                          "cursor-pointer",
                          !canGoNext && "pointer-events-none opacity-50"
                        )}
                        size={isMobile ? 'sm' : 'default'}
                      >
                        {isMobile ? 'التالي' : 'التالي'}
                      </PaginationNext>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}